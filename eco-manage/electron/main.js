const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { initDb, db, dbPath } = require('./database/db');
const { startApiServer } = require('./api-server');
const isDev = !app.isPackaged;

let loggedInUser = null;

function getActiveSchoolId(schoolId) {
  if (schoolId && schoolId !== 0) return Number(schoolId);
  if (loggedInUser && loggedInUser.schoolId) return Number(loggedInUser.schoolId);
  
  try {
    const firstSchool = db.prepare('SELECT id FROM schools WHERE deleted_at IS NULL ORDER BY id ASC LIMIT 1').get();
    if (firstSchool) return firstSchool.id;
  } catch (e) {
    console.error("Error fetching fallback school:", e.message);
  }
  return 1;
}

function permanentlyDeleteSchool(schoolId) {
  const deleteSchoolTx = db.transaction((id) => {
      // 1. Delete grandchild records referencing route_id (from bus_routes)
      db.prepare('DELETE FROM transport_points WHERE route_id IN (SELECT id FROM bus_routes WHERE school_id = ?)').run(id);
      db.prepare('DELETE FROM transport_logs WHERE route_id IN (SELECT id FROM bus_routes WHERE school_id = ?)').run(id);

      // 2. Delete grandchild records referencing class_id (from classes)
      db.prepare('DELETE FROM class_subjects WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)').run(id);
      db.prepare('DELETE FROM class_installment_fees WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)').run(id);
      db.prepare('DELETE FROM tuition_fees WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)').run(id);

      // 3. Delete grandchild records referencing user_id (from users)
      db.prepare('DELETE FROM mobile_access_keys WHERE assigned_to_user_id IN (SELECT id FROM users WHERE school_id = ?)').run(id);

      // 4. Delete child records directly containing school_id or referencing students/users/classes
      db.prepare('DELETE FROM grades WHERE school_id = ?').run(id);
      db.prepare('DELETE FROM payments WHERE student_id IN (SELECT id FROM students WHERE school_id = ?)').run(id);
      db.prepare('DELETE FROM attendance WHERE student_id IN (SELECT id FROM students WHERE school_id = ?)').run(id);
      db.prepare('DELETE FROM schedules WHERE school_id = ?').run(id);
      db.prepare('DELETE FROM tickets WHERE school_id = ?').run(id);
      db.prepare('DELETE FROM announcements WHERE school_id = ?').run(id);
      db.prepare('DELETE FROM bus_routes WHERE school_id = ?').run(id);
      db.prepare('DELETE FROM students WHERE school_id = ?').run(id);
      db.prepare('DELETE FROM classes WHERE school_id = ?').run(id);
      db.prepare('DELETE FROM school_subjects WHERE school_id = ?').run(id);
      db.prepare('DELETE FROM users WHERE school_id = ? AND role != "SUPERADMIN"').run(id);
      db.prepare('DELETE FROM school_year_archives WHERE school_id = ?').run(id);

      // 5. Finally delete the school
      return db.prepare('DELETE FROM schools WHERE id = ?').run(id);
  });
  deleteSchoolTx(schoolId);
}

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

  // Self-healing / Seeding of default administration accounts to avoid lockouts
  try {
    // 1. SuperAdmin
    const superadmin = db.prepare('SELECT * FROM users WHERE username = ?').get('superadmin');
    const superadminHash = bcrypt.hashSync('superadmin', 10);
    if (!superadmin) {
      console.log("[Seeding] Superadmin user does not exist. Creating...");
      db.prepare('INSERT INTO users (username, password, full_name, role, school_id) VALUES (?, ?, ?, ?, ?)')
        .run('superadmin', superadminHash, 'Super Développeur', 'SUPERADMIN', 1);
    } else {
      if (!bcrypt.compareSync('superadmin', superadmin.password)) {
        console.log("[Security] Resetting superadmin password to default 'superadmin'");
        db.prepare('UPDATE users SET password = ? WHERE username = ?').run(superadminHash, 'superadmin');
      }
    }

    // 2. Founder (admin)
    const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
    const adminHash = bcrypt.hashSync('admin', 10);
    if (!admin) {
      console.log("[Seeding] Admin (founder) user does not exist. Creating...");
      db.prepare('INSERT INTO users (username, password, full_name, role, school_id) VALUES (?, ?, ?, ?, ?)')
        .run('admin', adminHash, 'Fondateur École', 'FOUNDER', 1);
    } else {
      if (!bcrypt.compareSync('admin', admin.password)) {
        console.log("[Security] Resetting admin password to default 'admin'");
        db.prepare('UPDATE users SET password = ? WHERE username = ?').run(adminHash, 'admin');
      }
    }
  } catch (err) {
    console.error("Failed to verify/reset default administrative credentials:", err.message);
  }

  // Automatic clean up of soft-deleted schools older than 30 days
  try {
    const expiredSchools = db.prepare("SELECT id FROM schools WHERE deleted_at IS NOT NULL AND deleted_at < datetime('now', '-30 days')").all();
    for (const school of expiredSchools) {
        console.log(`[CleanUp] Permanently deleting expired school ID: ${school.id}`);
        permanentlyDeleteSchool(school.id);
    }
  } catch (err) {
      console.error('Failed to run automatic cleanup of deleted schools:', err);
  }
  startApiServer();

  // Check if seeding has already been completed once
  let isSeeded = false;
  try {
    const seededSetting = db.prepare("SELECT value FROM settings WHERE key = 'initial_seeding_done'").get();
    isSeeded = seededSetting ? seededSetting.value === 'true' : false;
  } catch (e) {
    console.error("Error reading initial_seeding_done setting:", e.message);
  }

  // Check overall counts to avoid re-seeding school 1 if database is already in use
  const schoolCount = db.prepare('SELECT COUNT(*) as count FROM schools').get().count;
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

  if (!isSeeded && schoolCount === 0 && userCount === 0) {
    // Seed initial school
    db.prepare('INSERT INTO schools (id, name, address) VALUES (1, ?, ?)').run('Complexe Scolaire Bilingue Eco-Manage', 'Yaoundé, Cameroun');

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
            { name: 'CP', code: 'CP', section: 'FRANCOPHONE', level: 'PRIMAIRE' },
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

    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('initial_seeding_done', 'true')").run();
  }

  createWindow();
});

const userDataPath = app.getPath('userData');
const logPath = path.join(userDataPath, 'error.log');

const logErrorToFile = (channel, error, args) => {
  const timestamp = new Date().toISOString();
  let safeArgs = '';
  try {
    safeArgs = JSON.stringify(args, (key, value) => {
      if (key.toLowerCase().includes('password') || key.toLowerCase().includes('hash')) {
        return '***';
      }
      return value;
    });
  } catch (e) {
    safeArgs = '[Unable to stringify args]';
  }
  const logMessage = `[${timestamp}] [Channel: ${channel}] Args: ${safeArgs} | Error: ${error.stack || error.message}\n`;
  try {
    fs.appendFileSync(logPath, logMessage, 'utf8');
  } catch (err) {
    console.error('Failed to write to error log:', err);
  }
};

// IPC Handlers wrapper for logging
const handleIPC = (channel, handler) => {
  ipcMain.handle(channel, async (event, ...args) => {
    try {
      return await handler(event, ...args);
    } catch (error) {
      console.error(`[IPC Error] ${channel}:`, error.message);
      logErrorToFile(channel, error, args);
      return { error: error.message };
    }
  });
};

handleIPC('db:getErrorLogs', async () => {
    if (loggedInUser?.role !== 'SUPERADMIN') throw new Error('Unauthorized');
    if (fs.existsSync(logPath)) {
        return fs.readFileSync(logPath, 'utf8');
    }
    return 'Aucun journal d\'erreurs détecté.';
});

handleIPC('db:clearErrorLogs', async () => {
    if (loggedInUser?.role !== 'SUPERADMIN') throw new Error('Unauthorized');
    if (fs.existsSync(logPath)) {
        fs.writeFileSync(logPath, '', 'utf8');
    }
    return true;
});

// Auth
handleIPC('auth:restoreSession', async (event, user) => {
    loggedInUser = user;
    return true;
});

handleIPC('auth:login', async (event, { username, password }) => {
  const user = db.prepare('SELECT id, username, password as hash, full_name as fullName, role, school_id as schoolId, assigned_classes as assignedClasses, matricule, civility, section, gender FROM users WHERE username = ? OR matricule = ?').get(username, username);
  
  if (!user) return null;

  // Block login if school is deleted or suspended
  if (user.role !== 'SUPERADMIN') {
      const school = db.prepare('SELECT deleted_at, is_active FROM schools WHERE id = ?').get(user.schoolId);
      if (school) {
          if (school.deleted_at !== null) {
              throw new Error("Cet établissement a été supprimé. Accès refusé.");
          }
          if (school.is_active === 0) {
              throw new Error("L'accès de cet établissement a été temporairement suspendu. Veuillez contacter l'administrateur.");
          }
      }
  }

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

      // Deadline notification check
      try {
          if (user.role === 'TEACHER') {
              const periodEndSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('period_end');
              if (periodEndSetting && periodEndSetting.value) {
                  const endDate = new Date(periodEndSetting.value);
                  endDate.setHours(23, 59, 59, 999);
                  const now = new Date();
                  const diffTime = endDate.getTime() - now.getTime();
                  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                  
                  if (diffDays >= 0 && diffDays <= 3) {
                      // Only insert if not already warned today
                      const todayDateStr = now.toISOString().split('T')[0];
                      const recentNotif = db.prepare("SELECT id FROM notifications WHERE recipient_id = ? AND title = 'Délai de saisie imminent' AND DATE(created_at) = ?").get(user.id, todayDateStr);
                      if (!recentNotif) {
                          db.prepare(`
                              INSERT INTO notifications (school_id, recipient_id, title, message, type)
                              VALUES (?, ?, ?, ?, ?)
                          `).run(user.schoolId, user.id, 'Délai de saisie imminent', `Attention: Il vous reste ${diffDays} jour(s) pour terminer la saisie de vos notes (jusqu'au ${periodEndSetting.value}).`, 'SYSTEM');
                      }
                  }
              }
          }
      } catch (err) {
          console.error("Erreur check deadline login:", err);
      }

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
    return db.prepare('SELECT * FROM schools WHERE deleted_at IS NULL').all();
});

handleIPC('db:getDeletedSchools', async () => {
    if (loggedInUser?.role !== 'SUPERADMIN') throw new Error('Unauthorized');
    return db.prepare('SELECT * FROM schools WHERE deleted_at IS NOT NULL').all();
});

handleIPC('db:addSchool', async (event, school) => {
    const { name, address, contact_email, contact_phone, bp, motto } = school;
    const info = db.prepare('INSERT INTO schools (name, address, contact_email, contact_phone, bp, motto) VALUES (?, ?, ?, ?, ?, ?)').run(name, address, contact_email, contact_phone, bp, motto);
    const newSchoolId = info.lastInsertRowid;

    const transaction = db.transaction(() => {
        // Create a default founder for this school
        const hash = bcrypt.hashSync('admin', 10);
        db.prepare('INSERT INTO users (username, password, full_name, role, school_id) VALUES (?, ?, ?, ?, ?)')
          .run(`admin_${newSchoolId}`, hash, `Fondateur ${name}`, 'FOUNDER', newSchoolId);
    });
    transaction();

    return { success: true, id: newSchoolId };
});

handleIPC('db:updateSchool', async (event, school) => {
    const { id, name, address, contact_email, contact_phone, bp, motto } = school;
    return db.prepare('UPDATE schools SET name = ?, address = ?, contact_email = ?, contact_phone = ?, bp = ?, motto = ? WHERE id = ?')
        .run(name, address, contact_email, contact_phone, bp, motto, id);
});

handleIPC('db:deleteSchool', async (event, { id, password }) => {
    if (loggedInUser?.role !== 'SUPERADMIN') throw new Error('Unauthorized');
    
    // Verify password
    const superadmin = db.prepare('SELECT password FROM users WHERE id = ?').get(loggedInUser.id);
    if (!superadmin || !bcrypt.compareSync(password, superadmin.password)) {
        return { error: 'Mot de passe incorrect' };
    }

    // Soft delete
    db.prepare("UPDATE schools SET deleted_at = datetime('now') WHERE id = ?").run(id);
    return { success: true };
});

handleIPC('db:restoreSchool', async (event, id) => {
    if (loggedInUser?.role !== 'SUPERADMIN') throw new Error('Unauthorized');
    db.prepare("UPDATE schools SET deleted_at = NULL WHERE id = ?").run(id);
    return { success: true };
});

handleIPC('db:permanentlyDeleteSchool', async (event, { id, password }) => {
    if (loggedInUser?.role !== 'SUPERADMIN') throw new Error('Unauthorized');
    
    // Verify password
    const superadmin = db.prepare('SELECT password FROM users WHERE id = ?').get(loggedInUser.id);
    if (!superadmin || !bcrypt.compareSync(password, superadmin.password)) {
        return { error: 'Mot de passe incorrect' };
    }

    permanentlyDeleteSchool(id);
    return { success: true };
});

handleIPC('db:toggleSchoolStatus', async (event, { id, isActive }) => {
    if (loggedInUser?.role !== 'SUPERADMIN') throw new Error('Unauthorized');
    db.prepare('UPDATE schools SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
    return { success: true };
});

// Students
handleIPC('db:getStudents', async (event, schoolId) => {
  const sid = getActiveSchoolId(schoolId);
  return db.prepare('SELECT * FROM students WHERE school_id = ?').all(sid);
});

handleIPC('db:addStudent', async (event, student) => {
  const { firstName, lastName, birthDate, birthPlace, gender, parentName, parentContact, emergencyContact, medicalInfo, address, neighborhood, section, classId, schoolId, entryYear } = student;
  const sid = getActiveSchoolId(schoolId);
  const year = entryYear || new Date().getFullYear();
  const yearShort = year.toString().slice(-2);

  // Get class code
  const classObj = db.prepare('SELECT code FROM classes WHERE id = ? AND school_id = ?').get(classId, sid);
  if (!classObj) throw new Error('Classe introuvable ou non autorisée');
  const classCode = classObj.code;

  // Generate order number securely using transaction (global per school/year)
  let matricule = '';
  let orderNumber = 1;
  
  const transaction = db.transaction(() => {
    const existingStudents = db.prepare("SELECT order_number, matricule FROM students WHERE school_id = ? AND registration_year = ?").all(sid, year);
    let maxOrder = 0;
    for (const s of existingStudents) {
        if (s.order_number && s.order_number > maxOrder) {
            maxOrder = s.order_number;
        }
        if (s.matricule && s.matricule.length > 4) {
            const suffix = parseInt(s.matricule.slice(-4));
            if (!isNaN(suffix) && suffix > maxOrder) {
                maxOrder = suffix;
            }
        }
    }
    orderNumber = maxOrder + 1;
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
  const sid = getActiveSchoolId(schoolId);
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
  const sid = getActiveSchoolId(school_id);
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
  const sid = getActiveSchoolId(schoolId);
  return db.prepare(`
    SELECT p.*, s.first_name, s.last_name, s.class_id, i.name as installment_name
    FROM payments p
    JOIN students s ON p.student_id = s.id
    LEFT JOIN installments i ON p.installment_id = i.id
    WHERE s.school_id = ?
  `).all(sid);
});

handleIPC('db:addPayment', async (event, payment) => {
  const { studentId, amount, type, userId, installmentId, depositorName } = payment;
  const receiptNumber = `RCP-${crypto.randomUUID().slice(0,8).toUpperCase()}-${Date.now().toString().slice(-4)}`;

  const result = db.prepare(`
    INSERT INTO payments (student_id, amount, payment_type, received_by, receipt_number, installment_id, depositor_name)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(studentId, amount, type, userId, receiptNumber, installmentId, depositorName || '');

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
  const sid = getActiveSchoolId(schoolId);
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

handleIPC('db:addInstallment', async (event, name) => {
    const count = db.prepare('SELECT COUNT(*) as count FROM installments').get().count;
    return db.prepare('INSERT INTO installments (name, display_order) VALUES (?, ?)').run(name, count + 1);
});

handleIPC('db:deleteInstallment', async (event, id) => {
    db.prepare('DELETE FROM class_installment_fees WHERE installment_id = ?').run(id);
    return db.prepare('DELETE FROM installments WHERE id = ?').run(id);
});

handleIPC('db:getClassInstallmentFees', async (event, schoolId) => {
    const sid = getActiveSchoolId(schoolId);
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
  const existing = db.prepare('SELECT id FROM subjects WHERE UPPER(name) = UPPER(?) AND level = ? AND section = ?').get(name, level, section);
  if (existing) {
    throw new Error('Une matière avec ce nom existe déjà pour ce niveau et cette section.');
  }

  const result = db.prepare('INSERT INTO subjects (name, domain, level, section) VALUES (?, ?, ?, ?)')
    .run(name, domain, level, section);
  
  if (loggedInUser && loggedInUser.schoolId && loggedInUser.role !== 'SUPERADMIN') {
    db.prepare('INSERT OR IGNORE INTO school_subjects (school_id, subject_id, is_active) VALUES (?, ?, 1)')
      .run(loggedInUser.schoolId, result.lastInsertRowid);
  }
  return result;
});

handleIPC('db:updateGlobalSubject', async (event, subject) => {
  const { id, name, domain, level, section } = subject;
  const existing = db.prepare('SELECT id FROM subjects WHERE UPPER(name) = UPPER(?) AND level = ? AND section = ? AND id != ?').get(name, level, section, id);
  if (existing) {
    throw new Error('Une matière avec ce nom existe déjà pour ce niveau et cette section.');
  }

  return db.prepare('UPDATE subjects SET name = ?, domain = ?, level = ?, section = ? WHERE id = ?')
    .run(name, domain, level, section, id);
});

handleIPC('db:deleteGlobalSubject', async (event, id) => {
  const inUseGrades = db.prepare('SELECT COUNT(*) as count FROM grades WHERE subject_id = ?').get(id).count;
  if (inUseGrades > 0) {
    throw new Error('Impossible de supprimer cette matière : elle contient déjà des notes.');
  }

  const inUseClasses = db.prepare('SELECT COUNT(*) as count FROM class_subjects WHERE subject_id = ?').get(id).count;
  if (inUseClasses > 0) {
    throw new Error('Impossible de supprimer cette matière : elle est actuellement enseignée dans certaines classes.');
  }

  db.prepare('DELETE FROM school_subjects WHERE subject_id = ?').run(id);
  return db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
});

handleIPC('db:getSchoolSubjects', async (event, schoolId) => {
  const sid = getActiveSchoolId(schoolId);
  // Use LEFT JOIN to ensure we see all subjects even if not yet mapped to this school
  return db.prepare(`
    SELECT s.*, COALESCE(ss.is_active, 0) as is_active
    FROM subjects s
    LEFT JOIN school_subjects ss ON s.id = ss.subject_id AND ss.school_id = ?
  `).all(sid);
});

handleIPC('db:toggleSchoolSubject', async (event, { schoolId, subjectId, isActive }) => {
  const result = db.prepare(`
    INSERT INTO school_subjects (school_id, subject_id, is_active)
    VALUES (?, ?, ?)
    ON CONFLICT(school_id, subject_id) DO UPDATE SET is_active = excluded.is_active
  `).run(schoolId, subjectId, isActive ? 1 : 0);

  if (isActive) {
    const subject = db.prepare('SELECT name, level, section FROM subjects WHERE id = ?').get(subjectId);
    if (subject) {
      db.prepare(`
        INSERT INTO announcements (school_id, sender_id, target, title, content)
        VALUES (?, ?, 'STAFF', 'Nouvelle Matière Autorisée', ?)
      `).run(
        schoolId,
        loggedInUser ? loggedInUser.id : null,
        `La matière globale "${subject.name}" (${subject.level} - ${subject.section}) a été autorisée pour votre établissement. Vous pouvez dès à présent l'associer à vos classes.`
      );
    }
  }

  return result;
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
  const sid = getActiveSchoolId(schoolId);
  return db.prepare('SELECT * FROM classes WHERE school_id = ?').all(sid);
});

handleIPC('db:addClass', async (event, classData) => {
    const { name, code, section, level, mainTeacherId, assistantTeacherId, schoolId, baseClassId } = classData;
    const sid = getActiveSchoolId(schoolId);
    
    // Check if code is already taken in this school
    const existing = db.prepare('SELECT id FROM classes WHERE code = ? AND school_id = ?').get(code, sid);
    if (existing) {
        throw new Error('Une classe avec ce code existe déjà dans cet établissement.');
    }

    const info = db.prepare(`
        INSERT INTO classes (school_id, name, code, section, level, main_teacher_id, assistant_teacher_id)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(sid, name, code, section, level, mainTeacherId || null, assistantTeacherId || null);

    const newClassId = info.lastInsertRowid;

    if (baseClassId) {
        db.transaction(() => {
            // Duplicate class subjects
            const subjectsToCopy = db.prepare('SELECT subject_id, coefficient, is_optional FROM class_subjects WHERE class_id = ?').all(baseClassId);
            const insertSubject = db.prepare('INSERT INTO class_subjects (class_id, subject_id, coefficient, is_optional) VALUES (?, ?, ?, ?)');
            for (const sub of subjectsToCopy) {
                insertSubject.run(newClassId, sub.subject_id, sub.coefficient, sub.is_optional);
            }

            // Duplicate tuition_fees
            const tuitionToCopy = db.prepare('SELECT total_fee, registration_fee FROM tuition_fees WHERE class_id = ?').get(baseClassId);
            if (tuitionToCopy) {
                db.prepare('INSERT INTO tuition_fees (class_id, total_fee, registration_fee) VALUES (?, ?, ?)').run(newClassId, tuitionToCopy.total_fee, tuitionToCopy.registration_fee);
            }

            // Duplicate class_installment_fees
            const installmentsToCopy = db.prepare('SELECT installment_id, amount FROM class_installment_fees WHERE class_id = ?').all(baseClassId);
            const insertInstallment = db.prepare('INSERT INTO class_installment_fees (class_id, installment_id, amount) VALUES (?, ?, ?)');
            for (const inst of installmentsToCopy) {
                insertInstallment.run(newClassId, inst.installment_id, inst.amount);
            }
        })();
    }

    return { success: true, id: newClassId };
});

handleIPC('db:updateClass', async (event, classData) => {
    const { id, name, code, section, level, mainTeacherId, assistantTeacherId } = classData;
    
    const existing = db.prepare('SELECT id FROM classes WHERE code = ? AND id != ?').get(code, id);
    if (existing) {
        throw new Error('Une autre classe utilise déjà ce code.');
    }

    db.prepare(`
        UPDATE classes 
        SET name = ?, code = ?, section = ?, level = ?, main_teacher_id = ?, assistant_teacher_id = ?
        WHERE id = ?
    `).run(name, code, section, level, mainTeacherId || null, assistantTeacherId || null, id);
    
    return { success: true };
});

handleIPC('db:deleteClass', async (event, classId) => {
    // Prevent deletion if students are assigned
    const studentCount = db.prepare('SELECT COUNT(*) as count FROM students WHERE class_id = ?').get(classId).count;
    if (studentCount > 0) {
        throw new Error('Impossible de supprimer cette classe car des élèves y sont inscrits.');
    }

    db.transaction(() => {
        db.prepare('DELETE FROM class_subjects WHERE class_id = ?').run(classId);
        db.prepare('DELETE FROM tuition_fees WHERE class_id = ?').run(classId);
        db.prepare('DELETE FROM class_installment_fees WHERE class_id = ?').run(classId);
        db.prepare('DELETE FROM schedules WHERE class_id = ?').run(classId);
        db.prepare('DELETE FROM grades WHERE class_id = ?').run(classId);
        db.prepare('DELETE FROM classes WHERE id = ?').run(classId);
    })();

    return { success: true };
});

handleIPC('db:getSchedules', async (event, schoolId) => {
    const sid = getActiveSchoolId(schoolId);
    return db.prepare('SELECT * FROM schedules WHERE school_id = ?').all(sid);
});

handleIPC('db:updateSchedule', async (event, schedule) => {
    const { id, class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, school_id } = schedule;
    const sid = getActiveSchoolId(school_id);
    if (id) {
        return db.prepare(`UPDATE schedules SET class_id=?, teacher_id=?, subject_id=?, day_of_week=?, start_time=?, end_time=?, type=? WHERE id=?`).run(class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, id);
    } else {
        return db.prepare(`INSERT INTO schedules (class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, school_id) VALUES (?,?,?,?,?,?,?,?)`).run(class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, sid);
    }
});

// Transport
handleIPC('db:getBusRoutes', async (event, schoolId) => {
    const sid = getActiveSchoolId(schoolId);
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
  const sid = getActiveSchoolId(schoolId);
  return db.prepare('SELECT id, username, full_name as fullName, role, assigned_classes as assignedClasses, matricule, civility, section, gender FROM users WHERE school_id = ?').all(sid);
});

handleIPC('db:addUser', async (event, user) => {
  const { username, password, fullName, role, schoolId, assignedClasses, civility, section, gender, phone } = user;
  const sid = getActiveSchoolId(schoolId);
  
  const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (existingUsername) {
      throw new Error('Ce nom d\'utilisateur (identifiant) est déjà pris. Veuillez en choisir un autre.');
  }

  const hash = bcrypt.hashSync(password, 10);
  
  // Auto-generate staff matricule (incremental and duplicate-safe)
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
  
  const pattern = `${yearShort}${roleCode}%`;
  const existingUsers = db.prepare("SELECT matricule FROM users WHERE school_id = ? AND role = ? AND matricule LIKE ?").all(sid, role, pattern);
  let maxOrder = 0;
  for (const u of existingUsers) {
      if (u.matricule) {
          const suffix = parseInt(u.matricule.slice(5)); // after Year(2) + RoleCode(3)
          if (!isNaN(suffix) && suffix > maxOrder) {
              maxOrder = suffix;
          }
      }
  }
  const order = maxOrder + 1;
  const matricule = `${yearShort}${roleCode}${order.toString().padStart(4, '0')}`;

  db.prepare(`
    INSERT INTO users (username, password, full_name, role, school_id, assigned_classes, matricule, civility, section, gender, phone)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(username, hash, fullName, role, sid, JSON.stringify(assignedClasses || []), matricule, civility, section, gender, phone || null);
  
  return { success: true, matricule };
});

handleIPC('db:deleteUser', async (event, id) => {
  // Check if user is linked to grades
  const gradesCount = db.prepare('SELECT COUNT(*) as count FROM grades WHERE teacher_id = ?').get(id).count;
  if (gradesCount > 0) throw new Error('Impossible de supprimer cet utilisateur : des notes lui sont associées. Veuillez désactiver le compte.');

  // Check if user is linked to payments
  const paymentsCount = db.prepare('SELECT COUNT(*) as count FROM payments WHERE received_by = ?').get(id).count;
  if (paymentsCount > 0) throw new Error('Impossible de supprimer cet utilisateur : des paiements lui sont associés. Veuillez désactiver le compte.');

  // Check if user is linked to attendance
  const attendanceCount = db.prepare('SELECT COUNT(*) as count FROM attendance WHERE recorded_by = ?').get(id).count;
  if (attendanceCount > 0) throw new Error('Impossible de supprimer cet utilisateur : des présences lui sont associées. Veuillez désactiver le compte.');

  return db.prepare('DELETE FROM users WHERE id = ?').run(id);
});

handleIPC('db:toggleUserActive', async (event, { id, isActive }) => {
    return db.prepare('UPDATE users SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
});

handleIPC('db:updateUser', async (event, userToUpdate) => {
  const { id, username, fullName, role, phone, assignedClasses, civility, section, gender, password } = userToUpdate;
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
  const finalRole = role || existing.role;
  const finalPhone = phone !== undefined ? phone : existing.phone;
  const finalAssignedClasses = assignedClasses !== undefined ? JSON.stringify(assignedClasses) : existing.assigned_classes;
  const finalCivility = civility || existing.civility;
  const finalSection = section || existing.section;
  const finalGender = gender || existing.gender;

  if (password && password.trim()) {
      const hash = bcrypt.hashSync(password.trim(), 10);
      return db.prepare(`
        UPDATE users SET 
          username = ?, 
          full_name = ?, 
          role = ?, 
          phone = ?, 
          assigned_classes = ?, 
          civility = ?, 
          section = ?, 
          gender = ?, 
          password = ? 
        WHERE id = ?
      `).run(finalUsername, finalFullName, finalRole, finalPhone, finalAssignedClasses, finalCivility, finalSection, finalGender, hash, id);
  } else {
      return db.prepare(`
        UPDATE users SET 
          username = ?, 
          full_name = ?, 
          role = ?, 
          phone = ?, 
          assigned_classes = ?, 
          civility = ?, 
          section = ?, 
          gender = ? 
        WHERE id = ?
      `).run(finalUsername, finalFullName, finalRole, finalPhone, finalAssignedClasses, finalCivility, finalSection, finalGender, id);
  }
});

handleIPC('db:changePassword', async (event, { userId, newPassword }) => {
  const hash = crypto.createHash('sha256').update(newPassword).digest('hex');
  return db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, userId);
});

// Ticketing
handleIPC('db:sendTicket', async (event, ticket) => {
  const { sender_id, receiver_role, receiver_id, subject, message, school_id } = ticket;
  const sid = getActiveSchoolId(school_id);
  return db.prepare('INSERT INTO tickets (sender_id, receiver_role, receiver_id, subject, message, school_id) VALUES (?, ?, ?, ?, ?, ?)')
    .run(sender_id, receiver_role, receiver_id, subject, message, sid);
});

handleIPC('db:getTickets', async (event, { userId, role, schoolId }) => {
  const sid = getActiveSchoolId(schoolId);
  if (role === 'SUPERADMIN' || role === 'FOUNDER') {
      return db.prepare('SELECT t.*, u.full_name as sender_name FROM tickets t JOIN users u ON t.sender_id = u.id WHERE t.school_id = ? ORDER BY t.created_at DESC').all(sid);
  }
  return db.prepare('SELECT t.*, u.full_name as sender_name FROM tickets t JOIN users u ON t.sender_id = u.id WHERE t.school_id = ? AND (t.sender_id = ? OR t.receiver_role = ? OR t.receiver_id = ?) ORDER BY t.created_at DESC')
    .all(sid, userId, role, userId);
});

// Expenses (Décaissements)
handleIPC('db:createExpense', async (event, expense) => {
  const { amount, reason, requested_by, school_id } = expense;
  const sid = getActiveSchoolId(school_id);
  return db.prepare('INSERT INTO expenses (amount, reason, requested_by, school_id) VALUES (?, ?, ?, ?)')
    .run(amount, reason, requested_by, sid);
});

handleIPC('db:getExpenses', async (event, schoolId) => {
  const sid = getActiveSchoolId(schoolId);
  return db.prepare('SELECT e.*, u.full_name as requester_name, v.full_name as validator_name FROM expenses e JOIN users u ON e.requested_by = u.id LEFT JOIN users v ON e.validated_by = v.id WHERE e.school_id = ? ORDER BY e.created_at DESC').all(sid);
});

handleIPC('db:updateExpenseStatus', async (event, { expenseId, status, validatedBy }) => {
  return db.prepare('UPDATE expenses SET status = ?, validated_by = ? WHERE id = ?').run(status, validatedBy, expenseId);
});

// Notifications mapping to Messaging System
handleIPC('db:createNotification', async (event, notification) => {
  const { user_id, role, message, type, school_id } = notification;
  const sid = getActiveSchoolId(school_id);
  const systemId = 1; // System or superadmin

  if (role) {
      // Send as ticket to role
      return db.prepare('INSERT INTO tickets (sender_id, receiver_role, subject, message, school_id) VALUES (?, ?, ?, ?, ?)')
        .run(systemId, role, 'Alerte Système', message, sid);
  } else {
      // Send as ticket to specific user
      return db.prepare('INSERT INTO tickets (sender_id, receiver_id, subject, message, school_id) VALUES (?, ?, ?, ?, ?)')
        .run(systemId, user_id, 'Notification Système', message, sid);
  }
});

handleIPC('db:getNotifications', async (event, { userId, schoolId }) => {
  return []; // Deprecated, mapped to tickets
});

handleIPC('db:markNotificationRead', async (event, notificationId) => {
  return null;
});

handleIPC('db:getStudentDetails', async (event, studentId) => {
  const student = db.prepare('SELECT s.*, c.name as className FROM students s LEFT JOIN classes c ON s.class_id = c.id WHERE s.id = ?').get(studentId);
  const payments = db.prepare('SELECT p.*, i.name as installmentName FROM payments p LEFT JOIN installments i ON p.installment_id = i.id WHERE p.student_id = ?').all(studentId);
  const attendance = db.prepare('SELECT * FROM attendance WHERE student_id = ?').all(studentId);
  const grades = db.prepare('SELECT g.*, s.name as subjectName, s.domain FROM grades g JOIN subjects s ON g.subject_id = s.id WHERE g.student_id = ?').all(studentId);

  return { student, payments, attendance, grades };
});

handleIPC('db:updateStudent', async (event, student) => {
  const { id, firstName, lastName, birthDate, birthPlace, gender, parentName, parentContact, emergencyContact, medicalInfo, address, neighborhood, section, classId, scholarshipReduction, hasMoratoire } = student;
  const runResult = db.prepare(`
    UPDATE students SET
      first_name = COALESCE(?, first_name), 
      last_name = COALESCE(?, last_name), 
      birth_date = COALESCE(?, birth_date), 
      birth_place = COALESCE(?, birth_place), 
      gender = COALESCE(?, gender),
      parent_name = COALESCE(?, parent_name),
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
  `).run(firstName, lastName, birthDate, birthPlace, gender, parentName, parentContact, emergencyContact, medicalInfo, address, neighborhood, section, classId, scholarshipReduction, hasMoratoire ? 1 : 0, id);

  if (runResult.changes > 0 && parentContact && parentContact.trim()) {
      const studentInDb = db.prepare('SELECT parent_name, school_id FROM students WHERE id = ?').get(id);
      if (studentInDb) {
          const parentUsername = parentContact.trim();
          const existingParent = db.prepare('SELECT id FROM users WHERE username = ?').get(parentUsername);
          if (!existingParent) {
              const hash = bcrypt.hashSync(parentUsername, 10);
              db.prepare('INSERT INTO users (username, password, full_name, role, school_id) VALUES (?, ?, ?, ?, ?)')
                .run(parentUsername, hash, studentInDb.parent_name || 'Parent', 'PARENT', studentInDb.school_id || getActiveSchoolId());
          }
      }
  }
  return runResult;
});

handleIPC('db:getReportTemplate', async (event, schoolId) => {
  if (!schoolId) return null;
  return db.prepare('SELECT * FROM report_templates WHERE school_id = ?').get(schoolId);
});

handleIPC('db:saveReportTemplate', async (event, data) => {
  const { schoolId, headerImage, watermarkImage, footerImage, primaryColor, secondaryColor } = data;
  if (!schoolId) return { success: false, error: 'No school ID' };
  
  const existing = db.prepare('SELECT id FROM report_templates WHERE school_id = ?').get(schoolId);
  if (existing) {
    db.prepare(`
      UPDATE report_templates SET 
        header_image = ?, watermark_image = ?, footer_image = ?, primary_color = ?, secondary_color = ?
      WHERE school_id = ?
    `).run(headerImage, watermarkImage, footerImage, primaryColor || '#0f172a', secondaryColor || '#f59e0b', schoolId);
  } else {
    db.prepare(`
      INSERT INTO report_templates (school_id, header_image, watermark_image, footer_image, primary_color, secondary_color)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(schoolId, headerImage, watermarkImage, footerImage, primaryColor || '#0f172a', secondaryColor || '#f59e0b');
  }
  return { success: true };
});

handleIPC('db:getDashboardStats', async (event, params) => {
  const schoolId = getActiveSchoolId(params ? params.schoolId : null);
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
    const sid = getActiveSchoolId(schoolId);
    return db.prepare('SELECT * FROM school_year_archives WHERE school_id = ? ORDER BY created_at DESC').all(sid);
});

handleIPC('db:createSchoolYearArchive', async (event, { schoolId, yearName }) => {
    const sid = getActiveSchoolId(schoolId);
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

// Grade Overrides
handleIPC('db:getGradeOverrides', async (event, { teacherId, classId, term, month }) => {
    return db.prepare('SELECT * FROM grade_overrides WHERE teacher_id = ? AND class_id = ? AND term = ? AND month = ?').get(teacherId, classId, term, month);
});

handleIPC('db:addGradeOverride', async (event, { teacherId, classId, term, month, deadline, grantedBy }) => {
    return db.prepare('INSERT INTO grade_overrides (teacher_id, class_id, term, month, deadline, granted_by) VALUES (?, ?, ?, ?, ?, ?)').run(teacherId, classId, term, month, deadline, grantedBy);
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
