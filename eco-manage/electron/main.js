const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { initDb, db, dbPath } = require('./database/db');
const { startApiServer } = require('./api-server');
const isDev = !app.isPackaged;

let loggedInUser = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 850,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  win.loadURL(
    isDev
      ? 'http://localhost:5173'
      : `file://${path.join(__dirname, '../dist/index.html')}`
  );
}

app.whenReady().then(() => {
  initDb();
  startApiServer();

  // Seed initial school
  const school = db.prepare('SELECT * FROM schools WHERE id = 1').get();
  if (!school) {
    db.prepare('INSERT INTO schools (id, name, address) VALUES (1, ?, ?)').run('Complexe Scolaire Bilingue Eco-Manage', 'Yaoundé, Cameroun');
  }

  // Seed default classes for the initial school if none exist
  const classCountForSchool1 = db.prepare('SELECT COUNT(*) as count FROM classes WHERE school_id = 1').get().count;
  if (classCountForSchool1 === 0) {
      const standardClasses = [
          // Francophone Maternelle
          { name: 'Petite Section', code: 'PS', section: 'FRANCOPHONE', level: 'MATERNELLE' },
          { name: 'Moyenne Section', code: 'MS', section: 'FRANCOPHONE', level: 'MATERNELLE' },
          { name: 'Grande Section', code: 'GS', section: 'FRANCOPHONE', level: 'MATERNELLE' },
          // Francophone Primaire
          { name: 'SIL', code: 'SIL', section: 'FRANCOPHONE', level: 'PRIMAIRE' },
          { name: 'CP', code: 'CP1', section: 'FRANCOPHONE', level: 'PRIMAIRE' },
          { name: 'CE1', code: 'CE1', section: 'FRANCOPHONE', level: 'PRIMAIRE' },
          { name: 'CE2', code: 'CE2', section: 'FRANCOPHONE', level: 'PRIMAIRE' },
          { name: 'CM1', code: 'CM1', section: 'FRANCOPHONE', level: 'PRIMAIRE' },
          { name: 'CM2', code: 'CM2', section: 'FRANCOPHONE', level: 'PRIMAIRE' },
          // Anglophone Nursery
          { name: 'Nursery 1', code: 'N1', section: 'ANGLOPHONE', level: 'MATERNELLE' },
          { name: 'Nursery 2', code: 'N2', section: 'ANGLOPHONE', level: 'MATERNELLE' },
          { name: 'Nursery 3', code: 'N3', section: 'ANGLOPHONE', level: 'MATERNELLE' },
          // Anglophone Primaire
          { name: 'Class 1', code: 'CL1', section: 'ANGLOPHONE', level: 'PRIMAIRE' },
          { name: 'Class 2', code: 'CL2', section: 'ANGLOPHONE', level: 'PRIMAIRE' },
          { name: 'Class 3', code: 'CL3', section: 'ANGLOPHONE', level: 'PRIMAIRE' },
          { name: 'Class 4', code: 'CL4', section: 'ANGLOPHONE', level: 'PRIMAIRE' },
          { name: 'Class 5', code: 'CL5', section: 'ANGLOPHONE', level: 'PRIMAIRE' },
          { name: 'Class 6', code: 'CL6', section: 'ANGLOPHONE', level: 'PRIMAIRE' },
      ];
      const insertClass = db.prepare('INSERT INTO classes (school_id, name, code, section, level) VALUES (1, ?, ?, ?, ?)');
      const classTx = db.transaction(() => {
          for (const cls of standardClasses) {
              insertClass.run(cls.name, cls.code, cls.section, cls.level);
          }
      });
      classTx();
      console.log('Seeded standard classes for School 1');
  }

  // Seed default Maternelle classes for School 1 if they don't exist in existing database
  const maternelCount = db.prepare("SELECT COUNT(*) as count FROM classes WHERE school_id = 1 AND level = 'MATERNELLE'").get().count;
  if (maternelCount === 0) {
      const nurseryClasses = [
          { name: 'Petite Section', code: 'PS', section: 'FRANCOPHONE', level: 'MATERNELLE' },
          { name: 'Moyenne Section', code: 'MS', section: 'FRANCOPHONE', level: 'MATERNELLE' },
          { name: 'Grande Section', code: 'GS', section: 'FRANCOPHONE', level: 'MATERNELLE' },
          { name: 'Nursery 1', code: 'N1', section: 'ANGLOPHONE', level: 'MATERNELLE' },
          { name: 'Nursery 2', code: 'N2', section: 'ANGLOPHONE', level: 'MATERNELLE' },
          { name: 'Nursery 3', code: 'N3', section: 'ANGLOPHONE', level: 'MATERNELLE' },
      ];
      const insertClass = db.prepare('INSERT INTO classes (school_id, name, code, section, level) VALUES (1, ?, ?, ?, ?)');
      const nurseryTx = db.transaction(() => {
          for (const cls of nurseryClasses) {
              insertClass.run(cls.name, cls.code, cls.section, cls.level);
          }
      });
      nurseryTx();
      console.log('Seeded default Maternelle classes for School 1');
  }

  // Seed SuperAdmin
  const superadmin = db.prepare('SELECT * FROM users WHERE username = ?').get('superadmin');
  if (!superadmin) {
    const hash = bcrypt.hashSync('superadmin', 10);
    db.prepare('INSERT INTO users (username, password, full_name, role, school_id) VALUES (?, ?, ?, ?, ?)')
      .run('superadmin', hash, 'Super Développeur', 'SUPERADMIN', 1);
  }

  // Seed Founder
  const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hash = bcrypt.hashSync('admin', 10);
    db.prepare('INSERT INTO users (username, password, full_name, role, school_id) VALUES (?, ?, ?, ?, ?)')
      .run('admin', hash, 'Fondateur École', 'FOUNDER', 1);
  }

  // Seed Installments
  const instCount = db.prepare('SELECT COUNT(*) as count FROM installments').get().count;
  if (instCount === 0) {
      db.prepare('INSERT INTO installments (name, display_order) VALUES (?, ?)').run('1ERE TRANCHE', 1);
      db.prepare('INSERT INTO installments (name, display_order) VALUES (?, ?)').run('2E TRANCHE', 2);
      db.prepare('INSERT INTO installments (name, display_order) VALUES (?, ?)').run('3E TRANCHE', 3);
  }

  // Seed Bus Routes
  const routeCount = db.prepare('SELECT COUNT(*) as count FROM bus_routes WHERE school_id = 1').get().count;
  if (routeCount === 0) {
      db.prepare('INSERT INTO bus_routes (name, bus_number, school_id) VALUES (?, ?, ?)').run('Route Nord (Bastos/Golf)', 'BUS-001-CE', 1);
      db.prepare('INSERT INTO bus_routes (name, bus_number, school_id) VALUES (?, ?, ?)').run('Route Sud (Ahala/Mvan)', 'BUS-002-CE', 1);
  }

  createWindow();
});

// IPC Handlers wrapper for logging
const handleIPC = (channel, handler) => {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      console.error(`[IPC Error] ${channel}:`, error.message);
      return { error: error.message };
    }
  });
};

// Auth
handleIPC('auth:login', async (event, { username, password }) => {
  const user = db.prepare('SELECT id, username, password as hash, full_name as fullName, role, school_id as schoolId, assigned_classes as assignedClasses, matricule, civility, section, gender FROM users WHERE username = ? OR matricule = ?').get(username, username);
  
  if (!user) return null;

  // Fallback for existing SHA256 passwords
  let isValid = false;
  if (user.hash.length === 64 && !user.hash.startsWith('$2a$')) {
      const oldHash = crypto.createHash('sha256').update(password).digest('hex');
      isValid = (oldHash === user.hash);
      // Auto-migrate to bcrypt
      if (isValid) {
          const newHash = bcrypt.hashSync(password, 10);
          db.prepare('UPDATE users SET password = ? WHERE id = ?').run(newHash, user.id);
      }
  } else {
      isValid = bcrypt.compareSync(password, user.hash);
  }

  if (isValid) {
      delete user.hash;
      loggedInUser = user;
      return user;
  }
  return null;
});

handleIPC('auth:logout', async () => {
    loggedInUser = null;
    return true;
});

handleIPC('auth:switchSchool', async (event, schoolId) => {
    if (loggedInUser && loggedInUser.role === 'SUPERADMIN') {
        loggedInUser.schoolId = schoolId;
        return true;
    }
    throw new Error('Unauthorized');
});

// System Admin
handleIPC('db:getSchools', async () => {
    return db.prepare('SELECT * FROM schools').all();
});

handleIPC('db:addSchool', async (event, school) => {
    const { name, address, contact_email, contact_phone, bp, motto } = school;
    const info = db.prepare('INSERT INTO schools (name, address, contact_email, contact_phone, bp, motto) VALUES (?, ?, ?, ?, ?, ?)').run(name, address, contact_email, contact_phone, bp, motto);
    const newSchoolId = info.lastInsertRowid;

    // Auto-seed standard classes for the new instance
    const standardClasses = [
        // Francophone Maternelle
        { name: 'Petite Section', code: 'PS', section: 'FRANCOPHONE', level: 'MATERNELLE' },
        { name: 'Moyenne Section', code: 'MS', section: 'FRANCOPHONE', level: 'MATERNELLE' },
        { name: 'Grande Section', code: 'GS', section: 'FRANCOPHONE', level: 'MATERNELLE' },
        // Francophone Primaire
        { name: 'SIL', code: 'SIL', section: 'FRANCOPHONE', level: 'PRIMAIRE' },
        { name: 'CP', code: 'CP1', section: 'FRANCOPHONE', level: 'PRIMAIRE' },
        { name: 'CE1', code: 'CE1', section: 'FRANCOPHONE', level: 'PRIMAIRE' },
        { name: 'CE2', code: 'CE2', section: 'FRANCOPHONE', level: 'PRIMAIRE' },
        { name: 'CM1', code: 'CM1', section: 'FRANCOPHONE', level: 'PRIMAIRE' },
        { name: 'CM2', code: 'CM2', section: 'FRANCOPHONE', level: 'PRIMAIRE' },
        // Anglophone Nursery
        { name: 'Nursery 1', code: 'N1', section: 'ANGLOPHONE', level: 'MATERNELLE' },
        { name: 'Nursery 2', code: 'N2', section: 'ANGLOPHONE', level: 'MATERNELLE' },
        { name: 'Nursery 3', code: 'N3', section: 'ANGLOPHONE', level: 'MATERNELLE' },
        // Anglophone Primaire
        { name: 'Class 1', code: 'CL1', section: 'ANGLOPHONE', level: 'PRIMAIRE' },
        { name: 'Class 2', code: 'CL2', section: 'ANGLOPHONE', level: 'PRIMAIRE' },
        { name: 'Class 3', code: 'CL3', section: 'ANGLOPHONE', level: 'PRIMAIRE' },
        { name: 'Class 4', code: 'CL4', section: 'ANGLOPHONE', level: 'PRIMAIRE' },
        { name: 'Class 5', code: 'CL5', section: 'ANGLOPHONE', level: 'PRIMAIRE' },
        { name: 'Class 6', code: 'CL6', section: 'ANGLOPHONE', level: 'PRIMAIRE' },
    ];
    
    const insertClass = db.prepare('INSERT INTO classes (school_id, name, code, section, level) VALUES (?, ?, ?, ?, ?)');
    const transaction = db.transaction(() => {
        for (const cls of standardClasses) {
            insertClass.run(newSchoolId, cls.name, cls.code, cls.section, cls.level);
        }
    });
    transaction();

    return { success: true, id: newSchoolId };
});

handleIPC('db:updateSchool', async (event, school) => {
    const { id, name, address, contact_email, contact_phone, bp, motto } = school;
    return db.prepare('UPDATE schools SET name = ?, address = ?, contact_email = ?, contact_phone = ?, bp = ?, motto = ? WHERE id = ?')
        .run(name, address, contact_email, contact_phone, bp, motto, id);
});

handleIPC('db:deleteSchool', async (event, id) => {
    if (loggedInUser?.role !== 'SUPERADMIN') throw new Error('Unauthorized');
    
    const deleteSchoolTx = db.transaction((schoolId) => {
        // 1. Delete grandchild records referencing route_id (from bus_routes)
        db.prepare('DELETE FROM transport_points WHERE route_id IN (SELECT id FROM bus_routes WHERE school_id = ?)').run(schoolId);
        db.prepare('DELETE FROM transport_logs WHERE route_id IN (SELECT id FROM bus_routes WHERE school_id = ?)').run(schoolId);

        // 2. Delete grandchild records referencing class_id (from classes)
        db.prepare('DELETE FROM class_subjects WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)').run(schoolId);
        db.prepare('DELETE FROM class_installment_fees WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)').run(schoolId);
        db.prepare('DELETE FROM tuition_fees WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)').run(schoolId);

        // 3. Delete grandchild records referencing user_id (from users)
        db.prepare('DELETE FROM mobile_access_keys WHERE assigned_to_user_id IN (SELECT id FROM users WHERE school_id = ?)').run(schoolId);

        // 4. Delete child records directly containing school_id or referencing students/users/classes
        db.prepare('DELETE FROM grades WHERE school_id = ?').run(schoolId);
        db.prepare('DELETE FROM payments WHERE student_id IN (SELECT id FROM students WHERE school_id = ?)').run(schoolId);
        db.prepare('DELETE FROM attendance WHERE student_id IN (SELECT id FROM students WHERE school_id = ?)').run(schoolId);
        db.prepare('DELETE FROM schedules WHERE school_id = ?').run(schoolId);
        db.prepare('DELETE FROM tickets WHERE school_id = ?').run(schoolId);
        db.prepare('DELETE FROM announcements WHERE school_id = ?').run(schoolId);
        db.prepare('DELETE FROM bus_routes WHERE school_id = ?').run(schoolId);
        db.prepare('DELETE FROM students WHERE school_id = ?').run(schoolId);
        db.prepare('DELETE FROM classes WHERE school_id = ?').run(schoolId);
        db.prepare('DELETE FROM school_subjects WHERE school_id = ?').run(schoolId);
        db.prepare('DELETE FROM users WHERE school_id = ?').run(schoolId);
        db.prepare('DELETE FROM school_year_archives WHERE school_id = ?').run(schoolId);

        // 5. Finally delete the school
        return db.prepare('DELETE FROM schools WHERE id = ?').run(schoolId);
    });

    return deleteSchoolTx(id);
});

// Students
handleIPC('db:getStudents', async (event, schoolId) => {
  let sid = schoolId || 1;
  if (loggedInUser && loggedInUser.role !== 'SUPERADMIN') sid = loggedInUser.schoolId;
  return db.prepare('SELECT * FROM students WHERE school_id = ?').all(sid);
});

handleIPC('db:addStudent', async (event, student) => {
  const { firstName, lastName, birthDate, birthPlace, gender, parentName, parentContact, emergencyContact, medicalInfo, address, neighborhood, section, classId, schoolId, entryYear } = student;
  let sid = schoolId || 1;
  if (loggedInUser && loggedInUser.role !== 'SUPERADMIN') sid = loggedInUser.schoolId;
  const year = entryYear || new Date().getFullYear();
  const yearShort = year.toString().slice(-2);

  // Get class code
  const classObj = db.prepare('SELECT code FROM classes WHERE id = ? AND school_id = ?').get(classId, sid);
  if (!classObj) throw new Error('Classe introuvable ou non autorisée');
  const classCode = classObj.code;

  // Generate order number securely using transaction
  let matricule = '';
  let orderNumber = 1;
  
  const transaction = db.transaction(() => {
    const lastStudent = db.prepare('SELECT MAX(order_number) as maxOrder FROM students WHERE class_id = ? AND registration_year = ?').get(classId, year);
    orderNumber = (lastStudent && lastStudent.maxOrder ? lastStudent.maxOrder : 0) + 1;
    matricule = `${yearShort}${classCode}${orderNumber.toString().padStart(4, '0')}`;

    db.prepare(`
      INSERT INTO students (matricule, registration_year, order_number, first_name, last_name, birth_date, birth_place, gender, parent_name, parent_contact, emergency_contact, medical_info, address, neighborhood, section, class_id, school_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(matricule, year, orderNumber, firstName, lastName, birthDate, birthPlace, gender, parentName, parentContact, emergencyContact, medicalInfo, address, neighborhood, section, classId, sid);

    // Auto-create PARENT account
    if (parentContact && parentContact.trim()) {
      const parentUsername = parentContact.trim();
      const existingParent = db.prepare('SELECT id FROM users WHERE username = ?').get(parentUsername);
      if (!existingParent) {
        const hash = bcrypt.hashSync(parentUsername, 10);
        db.prepare('INSERT INTO users (username, password, full_name, role, school_id) VALUES (?, ?, ?, ?, ?)')
          .run(parentUsername, hash, parentName || 'Parent', 'PARENT', sid);
      }
    }
  });

  transaction();
  return { success: true, matricule };
});

handleIPC('db:deleteStudent', async (event, id) => {
    return db.prepare('DELETE FROM students WHERE id = ?').run(id);
});

// Announcements / Communiqués
handleIPC('db:getAnnouncements', async (event, schoolId) => {
  let sid = schoolId || 1;
  if (loggedInUser && loggedInUser.role !== 'SUPERADMIN') sid = loggedInUser.schoolId;
  return db.prepare(`
    SELECT a.*, u.full_name as sender_name 
    FROM announcements a 
    LEFT JOIN users u ON a.sender_id = u.id 
    WHERE a.school_id = ? 
    ORDER BY a.created_at DESC
  `).all(sid);
});

handleIPC('db:sendAnnouncement', async (event, announcement) => {
  const { sender_id, target, title, content, school_id } = announcement;
  let sid = school_id || 1;
  if (loggedInUser && loggedInUser.role !== 'SUPERADMIN') sid = loggedInUser.schoolId;
  return db.prepare(`
    INSERT INTO announcements (school_id, sender_id, target, title, content) 
    VALUES (?, ?, ?, ?, ?)
  `).run(sid, sender_id, target, title, content);
});

handleIPC('db:assignStudentToBus', async (event, { studentId, routeId }) => {
    return db.prepare('UPDATE students SET bus_route_id = ? WHERE id = ?').run(routeId, studentId);
});

// Grades
handleIPC('db:getGrades', async (event, { classId, term }) => {
  return db.prepare('SELECT * FROM grades WHERE class_id = ? AND term = ?').all(classId, term);
});

handleIPC('db:saveGrades', async (event, grades) => {
  const checkLock = db.prepare('SELECT locked FROM grades WHERE student_id = ? AND subject_id = ? AND term = ? AND month = ?');
  const upsert = db.prepare(`
    INSERT INTO grades (student_id, subject_id, class_id, term, month, score, teacher_id, locked, validated)
    VALUES (@student_id, @subject_id, @class_id, @term, @month, @score, @teacher_id, 0, 0)
    ON CONFLICT(student_id, subject_id, class_id, term, month) DO UPDATE SET
    score = excluded.score,
    locked = 0,
    validated = 0,
    updated_at = CURRENT_TIMESTAMP
    WHERE locked = 0
  `);

  const transaction = db.transaction((gradesList) => {
    for (const g of gradesList) {
      if (g.score == null) continue;
      const existing = checkLock.get(g.student_id, g.subject_id, g.term, g.month);
      if (existing && existing.locked === 1) throw new Error(`Note déjà verrouillée pour cet élève.`);
      upsert.run(g);
    }
  });

  try {
    transaction(grades);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

handleIPC('db:unlockGrades', async (event, { classId, term, month }) => {
  return db.prepare('UPDATE grades SET locked = 0, validated = 0 WHERE class_id = ? AND term = ? AND month = ?').run(classId, term, month);
});

// Pedagogy / Advisor validation
handleIPC('db:getClassSubjectsValidationStatus', async (event, { classId, term, month }) => {
  const subjects = db.prepare(`
    SELECT s.id, s.name, s.domain, cs.coefficient,
           (SELECT COUNT(*) FROM grades g WHERE g.class_id = ? AND g.subject_id = s.id AND g.term = ? AND g.month = ?) as gradeCount,
           (SELECT MIN(g.locked) FROM grades g WHERE g.class_id = ? AND g.subject_id = s.id AND g.term = ? AND g.month = ?) as isLocked,
           (SELECT MIN(g.validated) FROM grades g WHERE g.class_id = ? AND g.subject_id = s.id AND g.term = ? AND g.month = ?) as isValidated
    FROM class_subjects cs
    JOIN subjects s ON cs.subject_id = s.id
    WHERE cs.class_id = ?
  `).all(classId, term, month, classId, term, month, classId, term, month, classId);

  return subjects.map(s => ({
    id: s.id,
    name: s.name,
    domain: s.domain,
    coefficient: s.coefficient,
    hasGrades: s.gradeCount > 0,
    isLocked: s.isLocked === 1,
    isValidated: s.isValidated === 1
  }));
});

handleIPC('db:validateSubjectGrades', async (event, { classId, subjectId, term, month }) => {
  return db.prepare(`
    UPDATE grades
    SET validated = 1, locked = 1
    WHERE class_id = ? AND subject_id = ? AND term = ? AND month = ?
  `).run(classId, subjectId, term, month);
});

// Finance
handleIPC('db:getPayments', async (event, schoolId) => {
  let sid = schoolId || 1;
  if (loggedInUser && loggedInUser.role !== 'SUPERADMIN') sid = loggedInUser.schoolId;
  return db.prepare(`
    SELECT p.*, s.first_name, s.last_name, s.class_id, i.name as installment_name
    FROM payments p
    JOIN students s ON p.student_id = s.id
    LEFT JOIN installments i ON p.installment_id = i.id
    WHERE s.school_id = ?
  `).all(sid);
});

handleIPC('db:addPayment', async (event, payment) => {
  const { studentId, amount, type, userId, installmentId } = payment;
  const receiptNumber = `RCP-${crypto.randomUUID().slice(0,8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  const result = db.prepare(`
    INSERT INTO payments (student_id, amount, payment_type, received_by, receipt_number, installment_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(studentId, amount, type, userId, receiptNumber, installmentId);

  if (result.changes > 0) {
      if (type === 'Transport') {
          db.prepare('UPDATE students SET has_transport = 1 WHERE id = ?').run(studentId);
      }
      return { success: true, receiptNumber };
  }
  return { success: false };
});

handleIPC('db:deletePayment', async (event, id) => {
    const payment = db.prepare('SELECT student_id, payment_type FROM payments WHERE id = ?').get(id);
    const result = db.prepare('DELETE FROM payments WHERE id = ?').run(id);
    if (result.changes > 0 && payment && payment.payment_type === 'Transport') {
        const otherPayments = db.prepare('SELECT COUNT(*) as count FROM payments WHERE student_id = ? AND payment_type = "Transport"').get(payment.student_id);
        if (!otherPayments || otherPayments.count === 0) {
            db.prepare('UPDATE students SET has_transport = 0 WHERE id = ?').run(payment.student_id);
        }
    }
    return result;
});

handleIPC('db:getTuitionFees', async (event, schoolId) => {
  const sid = schoolId || 1;
  return db.prepare(`
    SELECT c.id as classId, c.name as className, COALESCE(t.total_fee, 0) as totalFee, COALESCE(t.registration_fee, 0) as registrationFee
    FROM classes c
    LEFT JOIN tuition_fees t ON c.id = t.class_id
    WHERE c.school_id = ?
  `).all(sid);
});

handleIPC('db:getInstallments', async () => {
    return db.prepare('SELECT * FROM installments ORDER BY display_order').all();
});

handleIPC('db:getClassInstallmentFees', async (event, schoolId) => {
    const sid = schoolId || 1;
    return db.prepare('SELECT cif.* FROM class_installment_fees cif JOIN classes c ON cif.class_id = c.id WHERE c.school_id = ?').all(sid);
});

handleIPC('db:updateTuitionFee', async (event, { classId, totalFee, registrationFee }) => {
  return db.prepare(`
    INSERT INTO tuition_fees (class_id, total_fee, registration_fee)
    VALUES (?, ?, ?)
    ON CONFLICT(class_id) DO UPDATE SET total_fee = excluded.total_fee, registration_fee = excluded.registration_fee
  `).run(classId, totalFee, registrationFee);
});

handleIPC('db:updateClassInstallmentFee', async (event, { classId, installmentId, amount }) => {
    return db.prepare(`
        INSERT INTO class_installment_fees (class_id, installment_id, amount)
        VALUES (?, ?, ?)
        ON CONFLICT(class_id, installment_id) DO UPDATE SET amount = excluded.amount
    `).run(classId, installmentId, amount);
});

// Pedagogy
handleIPC('db:getGlobalSubjects', async () => {
  return db.prepare('SELECT * FROM subjects').all();
});

handleIPC('db:addGlobalSubject', async (event, subject) => {
  const { name, domain, level, section } = subject;
  const result = db.prepare('INSERT INTO subjects (name, domain, level, section) VALUES (?, ?, ?, ?)')
    .run(name, domain, level, section);
  
  if (loggedInUser && loggedInUser.schoolId && loggedInUser.role !== 'SUPERADMIN') {
    db.prepare('INSERT OR IGNORE INTO school_subjects (school_id, subject_id, is_active) VALUES (?, ?, 1)')
      .run(loggedInUser.schoolId, result.lastInsertRowid);
  }
  return result;
});

handleIPC('db:deleteGlobalSubject', async (event, id) => {
  return db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
});

handleIPC('db:getSchoolSubjects', async (event, schoolId) => {
  const sid = schoolId || 1;
  // Use LEFT JOIN to ensure we see all subjects even if not yet mapped to this school
  return db.prepare(`
    SELECT s.*, COALESCE(ss.is_active, 0) as is_active
    FROM subjects s
    LEFT JOIN school_subjects ss ON s.id = ss.subject_id AND ss.school_id = ?
  `).all(sid);
});

handleIPC('db:toggleSchoolSubject', async (event, { schoolId, subjectId, isActive }) => {
  return db.prepare(`
    INSERT INTO school_subjects (school_id, subject_id, is_active)
    VALUES (?, ?, ?)
    ON CONFLICT(school_id, subject_id) DO UPDATE SET is_active = excluded.is_active
  `).run(schoolId, subjectId, isActive ? 1 : 0);
});

handleIPC('db:getClassSubjects', async (event, classId) => {
  return db.prepare(`
    SELECT s.*, cs.coefficient, cs.is_optional
    FROM subjects s
    JOIN class_subjects cs ON s.id = cs.subject_id
    WHERE cs.class_id = ?
  `).all(classId);
});

handleIPC('db:assignSubjectToClass', async (event, { classId, subjectId, coefficient, isOptional }) => {
  return db.prepare(`
    INSERT INTO class_subjects (class_id, subject_id, coefficient, is_optional)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(class_id, subject_id) DO UPDATE SET
      coefficient = excluded.coefficient,
      is_optional = excluded.is_optional
  `).run(classId, subjectId, coefficient || 1, isOptional ? 1 : 0);
});

handleIPC('db:removeSubjectFromClass', async (event, { classId, subjectId }) => {
  return db.prepare('DELETE FROM class_subjects WHERE class_id = ? AND subject_id = ?')
    .run(classId, subjectId);
});

handleIPC('db:getClasses', async (event, schoolId) => {
  const sid = schoolId || (loggedInUser ? loggedInUser.schoolId : 1);
  return db.prepare('SELECT * FROM classes WHERE school_id = ?').all(sid);
});

handleIPC('db:getSchedules', async (event, schoolId) => {
    const sid = schoolId || 1;
    return db.prepare('SELECT * FROM schedules WHERE school_id = ?').all(sid);
});

handleIPC('db:updateSchedule', async (event, schedule) => {
    const { id, class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, school_id } = schedule;
    const sid = school_id || 1;
    if (id) {
        return db.prepare(`UPDATE schedules SET class_id=?, teacher_id=?, subject_id=?, day_of_week=?, start_time=?, end_time=?, type=? WHERE id=?`).run(class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, id);
    } else {
        return db.prepare(`INSERT INTO schedules (class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, school_id) VALUES (?,?,?,?,?,?,?,?)`).run(class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, sid);
    }
});

// Transport
handleIPC('db:getBusRoutes', async (event, schoolId) => {
    const sid = schoolId || 1;
    return db.prepare('SELECT * FROM bus_routes WHERE school_id = ?').all(sid);
});

handleIPC('db:getTransportPoints', async (event, routeId) => {
    if (!routeId) return [];
    return db.prepare('SELECT * FROM transport_points WHERE route_id = ? ORDER BY estimated_time_from_start').all(routeId);
});

handleIPC('db:getRouteStudents', async (event, routeId) => {
    return db.prepare('SELECT * FROM students WHERE bus_route_id = ? AND has_transport = 1').all(routeId);
});

handleIPC('db:getParentStudents', async (event, parentPhone) => {
    return db.prepare('SELECT * FROM students WHERE parent_contact = ?').all(parentPhone);
});

handleIPC('db:logTransport', async (event, log) => {
    const { route_id, event_type, latitude, longitude } = log;
    return db.prepare(`INSERT INTO transport_logs (route_id, event_type, latitude, longitude) VALUES (?, ?, ?, ?)`).run(route_id, event_type, latitude, longitude);
});

// Mobile Keys
handleIPC('db:getMobileKeys', async () => {
    return db.prepare('SELECT * FROM mobile_access_keys').all();
});

handleIPC('db:generateMobileKey', async (event, { name, userId }) => {
    const key = `KEY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    return db.prepare('INSERT INTO mobile_access_keys (access_key, assigned_to_name, assigned_to_user_id) VALUES (?, ?, ?)')
        .run(key, name, userId);
});

handleIPC('db:revokeMobileKey', async (event, keyId) => {
    return db.prepare('UPDATE mobile_access_keys SET status = "REVOKED" WHERE id = ?').run(keyId);
});

// Settings
handleIPC('db:getSetting', async (event, key) => {
  const res = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return res ? res.value : null;
});

handleIPC('db:setSetting', async (event, { key, value }) => {
  return db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
});

// Attendance
handleIPC('db:saveAttendanceBulk', async (event, { records, userId }) => {
    const upsert = db.prepare(`
        INSERT INTO attendance (student_id, date, status, hours_absent, recorded_by)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(student_id, date) DO UPDATE SET
            status = excluded.status,
            hours_absent = excluded.hours_absent,
            recorded_by = excluded.recorded_by
    `);
    
    const transaction = db.transaction(() => {
        for (const r of records) {
            const status = r.hours > 0 ? 'ABSENT' : 'PRESENT';
            upsert.run(r.studentId, r.date, status, r.hours, userId);
        }
    });

    try {
        transaction();
        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
});

handleIPC('db:getAttendance', async (event, { classId, date }) => {
    return db.prepare(`
      SELECT a.*, s.first_name, s.last_name
      FROM attendance a
      JOIN students s ON a.student_id = s.id
      WHERE s.class_id = ? AND a.date = ?
    `).all(classId, date);
});

handleIPC('db:getUsers', async (event, schoolId) => {
  const sid = schoolId || 1;
  return db.prepare('SELECT id, username, full_name as fullName, role, assigned_classes as assignedClasses, matricule, civility, section, gender FROM users WHERE school_id = ?').all(sid);
});

handleIPC('db:addUser', async (event, user) => {
  const { username, password, fullName, role, schoolId, assignedClasses, civility, section, gender } = user;
  let sid = schoolId || 1;
  if (loggedInUser && loggedInUser.role !== 'SUPERADMIN') sid = loggedInUser.schoolId;
  
  const hash = bcrypt.hashSync(password, 10);
  
  // Auto-generate staff matricule
  const yearShort = new Date().getFullYear().toString().slice(-2);
  const roleCodes = {
      TEACHER: 'ENS',
      DRIVER: 'CHF',
      BURSAR: 'ECO',
      SECRETARY: 'SG',
      DIRECTOR: 'DIR',
      FOUNDER: 'FND'
  };
  const roleCode = roleCodes[role] || 'STF';
  
  // Count current staff of this role in this school to get order number
  const countObj = db.prepare("SELECT COUNT(*) as count FROM users WHERE school_id = ? AND role = ?").get(sid, role);
  const order = (countObj ? countObj.count : 0) + 1;
  const matricule = `${yearShort}${roleCode}${order.toString().padStart(4, '0')}`;

  db.prepare(`
    INSERT INTO users (username, password, full_name, role, school_id, assigned_classes, matricule, civility, section, gender)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(username, hash, fullName, role, sid, JSON.stringify(assignedClasses || []), matricule, civility, section, gender);
  
  return { success: true, matricule };
});

handleIPC('db:deleteUser', async (event, id) => {
  return db.prepare('DELETE FROM users WHERE id = ?').run(id);
});

handleIPC('db:updateUser', async (event, userToUpdate) => {
  const { id, username, fullName, password } = userToUpdate;
  if (!id) throw new Error("ID de l'utilisateur requis");

  const existing = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!existing) throw new Error("Utilisateur introuvable");

  // Check username uniqueness if changed
  if (username && username !== existing.username) {
      const taken = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?').get(username, id);
      if (taken) throw new Error("Ce nom d'utilisateur est déjà utilisé par un autre compte");
  }

  const finalUsername = username || existing.username;
  const finalFullName = fullName || existing.full_name;

  if (password && password.trim()) {
      const hash = bcrypt.hashSync(password.trim(), 10);
      return db.prepare('UPDATE users SET username = ?, full_name = ?, password = ? WHERE id = ?')
        .run(finalUsername, finalFullName, hash, id);
  } else {
      return db.prepare('UPDATE users SET username = ?, full_name = ? WHERE id = ?')
        .run(finalUsername, finalFullName, id);
  }
});

handleIPC('db:changePassword', async (event, { userId, newPassword }) => {
  const hash = crypto.createHash('sha256').update(newPassword).digest('hex');
  return db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, userId);
});

// Ticketing
handleIPC('db:sendTicket', async (event, ticket) => {
  const { sender_id, receiver_role, receiver_id, subject, message, school_id } = ticket;
  let sid = school_id || 1;
  if (loggedInUser && loggedInUser.role !== 'SUPERADMIN') sid = loggedInUser.schoolId;
  return db.prepare('INSERT INTO tickets (sender_id, receiver_role, receiver_id, subject, message, school_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(sender_id, receiver_role, receiver_id, subject, message, sid);
});

handleIPC('db:getTickets', async (event, { userId, role, schoolId }) => {
  let sid = schoolId || 1;
  if (loggedInUser && loggedInUser.role !== 'SUPERADMIN') sid = loggedInUser.schoolId;
  if (role === 'SUPERADMIN' || role === 'FOUNDER') {
      return db.prepare('SELECT t.*, u.full_name as sender_name FROM tickets t JOIN users u ON t.sender_id = u.id WHERE t.school_id = ? ORDER BY t.created_at DESC').all(sid);
  }
  return db.prepare('SELECT t.*, u.full_name as sender_name FROM tickets t JOIN users u ON t.sender_id = u.id WHERE t.school_id = ? AND (t.sender_id = ? OR t.receiver_role = ? OR t.receiver_id = ?) ORDER BY t.created_at DESC')
    .all(sid, userId, role, userId);
});

handleIPC('db:getStudentDetails', async (event, studentId) => {
  const student = db.prepare('SELECT s.*, c.name as className FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.id = ?').get(studentId);
  const payments = db.prepare('SELECT p.*, i.name as installmentName FROM payments p LEFT JOIN installments i ON p.installment_id = i.id WHERE p.student_id = ?').all(studentId);
  const attendance = db.prepare('SELECT * FROM attendance WHERE student_id = ?').all(studentId);
  const grades = db.prepare('SELECT g.*, s.name as subjectName FROM grades g JOIN subjects s ON g.subject_id = s.id WHERE g.student_id = ?').all(studentId);

  return { student, payments, attendance, grades };
});

handleIPC('db:updateStudent', async (event, student) => {
  const { id, firstName, lastName, birthDate, birthPlace, gender, parentContact, emergencyContact, medicalInfo, address, neighborhood, section, classId, scholarshipReduction, hasMoratoire } = student;
  const runResult = db.prepare(`
    UPDATE students SET
      first_name = COALESCE(?, first_name), 
      last_name = COALESCE(?, last_name), 
      birth_date = COALESCE(?, birth_date), 
      birth_place = COALESCE(?, birth_place), 
      gender = COALESCE(?, gender),
      parent_contact = COALESCE(?, parent_contact), 
      emergency_contact = COALESCE(?, emergency_contact), 
      medical_info = COALESCE(?, medical_info), 
      address = COALESCE(?, address), 
      neighborhood = COALESCE(?, neighborhood),
      section = COALESCE(?, section), 
      class_id = COALESCE(?, class_id), 
      scholarship_reduction = COALESCE(?, scholarship_reduction), 
      has_moratoire = COALESCE(?, has_moratoire)
    WHERE id = ?
  `).run(firstName, lastName, birthDate, birthPlace, gender, parentContact, emergencyContact, medicalInfo, address, neighborhood, section, classId, scholarshipReduction, hasMoratoire ? 1 : 0, id);

  if (runResult.changes > 0 && parentContact && parentContact.trim()) {
      const studentInDb = db.prepare('SELECT parent_name, school_id FROM students WHERE id = ?').get(id);
      if (studentInDb) {
          const parentUsername = parentContact.trim();
          const existingParent = db.prepare('SELECT id FROM users WHERE username = ?').get(parentUsername);
          if (!existingParent) {
              const hash = bcrypt.hashSync(parentUsername, 10);
              db.prepare('INSERT INTO users (username, password, full_name, role, school_id) VALUES (?, ?, ?, ?, ?)')
                .run(parentUsername, hash, studentInDb.parent_name || 'Parent', 'PARENT', studentInDb.school_id || 1);
          }
      }
  }
  return runResult;
});

handleIPC('db:getDashboardStats', async (event, params) => {
  const schoolId = (params && params.schoolId) ? params.schoolId : 1;
  const section = (params && params.section) ? params.section : null;
  const level = (params && params.level) ? params.level : null;

  let queryParams = [schoolId];
  let studentFilters = [];
  let classFilters = [];

  if (section) {
    studentFilters.push("s.section = ?");
    classFilters.push("c.section = ?");
    queryParams.push(section);
  }

  if (level && level !== 'ALL') {
    studentFilters.push("c.level = ?");
    classFilters.push("c.level = ?");
    queryParams.push(level);
  }

  const studentWhereStr = studentFilters.length > 0 ? "AND " + studentFilters.join(" AND ") : "";
  const classWhereStr = classFilters.length > 0 ? "AND " + classFilters.join(" AND ") : "";

  const totalStudents = db.prepare(`
    SELECT COUNT(*) as count 
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.school_id = ? ${studentWhereStr}
  `).get(...queryParams).count;

  const boys = db.prepare(`
    SELECT COUNT(*) as count 
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.gender = 'M' AND s.school_id = ? ${studentWhereStr}
  `).get(...queryParams).count;

  const girls = db.prepare(`
    SELECT COUNT(*) as count 
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.gender = 'F' AND s.school_id = ? ${studentWhereStr}
  `).get(...queryParams).count;

  const totalRevenue = db.prepare(`
    SELECT SUM(p.amount) as total
    FROM payments p
    JOIN students s ON p.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE s.school_id = ? ${studentWhereStr}
  `).get(...queryParams).total || 0;

  const totalTuitionDue = db.prepare(`
    SELECT SUM(t.total_fee) as total
    FROM tuition_fees t
    JOIN students s ON s.class_id = t.class_id
    JOIN classes c ON s.class_id = c.id
    WHERE s.school_id = ? ${studentWhereStr}
  `).get(...queryParams).total || 0;

  const classStats = db.prepare(`
    SELECT c.name as level, AVG(g.score) as avg,
    (COUNT(CASE WHEN g.score >= 10 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as passRate
    FROM classes c
    LEFT JOIN grades g ON g.class_id = c.id
    WHERE c.school_id = ? ${classWhereStr}
    GROUP BY c.id
  `).all(...(section || (level && level !== 'ALL') ? [schoolId, ...(section ? [section] : []), ...(level && level !== 'ALL' ? [level] : [])] : [schoolId]));

  return {
    totalStudents,
    genderDist: { boys, girls },
    totalRevenue,
    totalTuitionDue,
    classStats: classStats.map(c => ({ ...c, avg: c.avg || 0, passRate: c.passRate || 0 })),
    financialAlerts: []
  };
});

// Layout / Settings Customization
handleIPC('db:updateSchoolSettings', async (event, settings) => {
    const { 
        id, 
        name,
        motto,
        address,
        bp,
        contact_email,
        contact_phone,
        primary_color, 
        secondary_color, 
        receipt_sig_title, 
        bulletin_sig_left, 
        bulletin_sig_middle, 
        bulletin_sig_right, 
        header_french, 
        header_english,
        bulletin_pdf_use_custom,
        bulletin_pdf_template,
        bulletin_pdf_mapping
    } = settings;
    return db.prepare(`
        UPDATE schools SET
            name = ?,
            motto = ?,
            address = ?,
            bp = ?,
            contact_email = ?,
            contact_phone = ?,
            primary_color = ?,
            secondary_color = ?,
            receipt_sig_title = ?,
            bulletin_sig_left = ?,
            bulletin_sig_middle = ?,
            bulletin_sig_right = ?,
            header_french = ?,
            header_english = ?,
            bulletin_pdf_use_custom = ?,
            bulletin_pdf_template = ?,
            bulletin_pdf_mapping = ?
        WHERE id = ?
    `).run(
        name || '',
        motto || '',
        address || '',
        bp || '',
        contact_email || '',
        contact_phone || '',
        primary_color || '#1e293b',
        secondary_color || '#f59e0b',
        receipt_sig_title || "Signature de l'Économe",
        bulletin_sig_left || "L'ENSEIGNANT (TEACHER)",
        bulletin_sig_middle || "PARENT / GUARDIAN",
        bulletin_sig_right || "LE DIRECTEUR (HEADMASTER)",
        header_french || "MINISTÈRE DE L'ÉDUCATION DE BASE",
        header_english || "MINISTRY OF BASIC EDUCATION",
        bulletin_pdf_use_custom !== undefined && bulletin_pdf_use_custom !== null ? bulletin_pdf_use_custom : 0,
        bulletin_pdf_template || '',
        bulletin_pdf_mapping || '{}',
        id
    );
});

// Yearly Archiving & Backups
handleIPC('db:getSchoolArchives', async (event, schoolId) => {
    const sid = schoolId || 1;
    return db.prepare('SELECT * FROM school_year_archives WHERE school_id = ? ORDER BY created_at DESC').all(sid);
});

handleIPC('db:createSchoolYearArchive', async (event, { schoolId, yearName }) => {
    const sid = schoolId || 1;
    const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students WHERE school_id = ?').get(sid).count;
    const totalRevenue = db.prepare(`
        SELECT SUM(p.amount) as total
        FROM payments p
        JOIN students s ON p.student_id = s.id
        WHERE s.school_id = ?
    `).get(sid).total || 0;
    
    const avgObj = db.prepare(`
        SELECT AVG(g.score) as avg
        FROM grades g
        JOIN students s ON g.student_id = s.id
        WHERE s.school_id = ?
    `).get(sid);
    const averageGrade = avgObj && avgObj.avg ? avgObj.avg : 14.5;

    const backupsDir = path.join(app.getAppPath(), 'backups');
    if (!fs.existsSync(backupsDir)) {
        fs.mkdirSync(backupsDir, { recursive: true });
    }
    const backupFileName = `school_backup_${sid}_${yearName.replace(/[\/\s\\:]+/g, '_')}_${Date.now()}.db`;
    const backupFilePath = path.join(backupsDir, backupFileName);

    // Online backup execution
    await db.backup(backupFilePath);

    const result = db.prepare(`
        INSERT INTO school_year_archives (school_id, year_name, total_students, total_revenue, average_grade, backup_file_path)
        VALUES (?, ?, ?, ?, ?, ?)
    `).run(sid, yearName, totalStudents, totalRevenue, averageGrade, backupFilePath);

    return { success: true, id: result.lastInsertRowid, backupFilePath };
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
