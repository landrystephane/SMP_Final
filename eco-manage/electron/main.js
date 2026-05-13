const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const crypto = require('crypto');
const { initDb, db } = require('./database/db');
const { startApiServer } = require('./api-server');
const isDev = !app.isPackaged;

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

  // Seed SuperAdmin
  const superadmin = db.prepare('SELECT * FROM users WHERE username = ?').get('superadmin');
  if (!superadmin) {
    const hash = crypto.createHash('sha256').update('superadmin').digest('hex');
    db.prepare('INSERT INTO users (username, password, full_name, role, school_id) VALUES (?, ?, ?, ?, ?)')
      .run('superadmin', hash, 'Super Développeur', 'SUPERADMIN', 1);
  }

  // Seed Founder
  const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hash = crypto.createHash('sha256').update('admin').digest('hex');
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
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  return db.prepare('SELECT id, username, full_name as fullName, role, school_id as schoolId, assigned_classes as assignedClasses FROM users WHERE username = ? AND password = ?')
    .get(username, hash) || null;
});

// System Admin
handleIPC('db:getSchools', async () => {
    return db.prepare('SELECT * FROM schools').all();
});

handleIPC('db:addSchool', async (event, school) => {
    const { name, address, contact_email, contact_phone } = school;
    return db.prepare('INSERT INTO schools (name, address, contact_email, contact_phone) VALUES (?, ?, ?, ?)').run(name, address, contact_email, contact_phone);
});

// Students
handleIPC('db:getStudents', async (event, schoolId) => {
  const sid = schoolId || 1;
  return db.prepare('SELECT * FROM students WHERE school_id = ?').all(sid);
});

handleIPC('db:addStudent', async (event, student) => {
  const { firstName, lastName, birthDate, birthPlace, gender, parentContact, emergencyContact, medicalInfo, address, neighborhood, section, classId, schoolId, entryYear } = student;
  const sid = schoolId || 1;
  const year = entryYear || new Date().getFullYear();
  const yearShort = year.toString().slice(-2);

  // Get class code
  const classObj = db.prepare('SELECT code FROM classes WHERE id = ?').get(classId);
  const classCode = classObj ? classObj.code : 'STUD';

  // Generate order number per class and year
  const lastStudent = db.prepare('SELECT MAX(order_number) as maxOrder FROM students WHERE class_id = ? AND registration_year = ?')
    .get(classId, year);
  const orderNumber = (lastStudent && lastStudent.maxOrder ? lastStudent.maxOrder : 0) + 1;

  // Format: YY + CLASS + OrderNumber (4 digits)
  const matricule = `${yearShort}${classCode}${orderNumber.toString().padStart(4, '0')}`;

  return db.prepare(`
    INSERT INTO students (matricule, registration_year, order_number, first_name, last_name, birth_date, birth_place, gender, parent_contact, emergency_contact, medical_info, address, neighborhood, section, class_id, school_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(matricule, year, orderNumber, firstName, lastName, birthDate, birthPlace, gender, parentContact, emergencyContact, medicalInfo, address, neighborhood, section, classId, sid);
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
    INSERT INTO grades (student_id, subject_id, class_id, term, month, score, teacher_id, locked)
    VALUES (@student_id, @subject_id, @class_id, @term, @month, @score, @teacher_id, 1)
    ON CONFLICT(student_id, subject_id, class_id, term, month) DO UPDATE SET
    score = excluded.score,
    locked = 1,
    updated_at = CURRENT_TIMESTAMP
    WHERE locked = 0
  `);

  const transaction = db.transaction((gradesList) => {
    for (const g of gradesList) {
      const existing = checkLock.get(g.student_id, g.subject_id, g.term, g.month);
      if (existing && existing.locked === 1) throw new Error(`Grade locked.`);
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
  return db.prepare('UPDATE grades SET locked = 0 WHERE class_id = ? AND term = ? AND month = ?').run(classId, term, month);
});

// Finance
handleIPC('db:getPayments', async (event, schoolId) => {
  const sid = schoolId || 1;
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
  const receiptNumber = `RCP-${Date.now()}`;

  const result = db.prepare(`
    INSERT INTO payments (student_id, amount, payment_type, received_by, receipt_number, installment_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(studentId, amount, type, userId, receiptNumber, installmentId);

  if (result.changes > 0) {
      return { success: true, receiptNumber };
  }
  return { success: false };
});

handleIPC('db:deletePayment', async (event, id) => {
    return db.prepare('DELETE FROM payments WHERE id = ?').run(id);
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
  return db.prepare('INSERT INTO subjects (name, domain, level, section) VALUES (?, ?, ?, ?)')
    .run(name, domain, level, section);
});

handleIPC('db:deleteGlobalSubject', async (event, id) => {
  return db.prepare('DELETE FROM subjects WHERE id = ?').run(id);
});

handleIPC('db:getSchoolSubjects', async (event, schoolId) => {
  const sid = schoolId || 1;
  return db.prepare(`
    SELECT s.*, ss.is_active
    FROM subjects s
    JOIN school_subjects ss ON s.id = ss.subject_id
    WHERE ss.school_id = ?
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
  const sid = schoolId || 1;
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

handleIPC('db:getRouteStudents', async (event, routeId) => {
    return db.prepare('SELECT * FROM students WHERE bus_route_id = ?').all(routeId);
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
handleIPC('db:saveAttendance', async (event, { studentId, date, hours, userId }) => {
    const status = hours > 0 ? 'ABSENT' : 'PRESENT';
    return db.prepare(`
        INSERT INTO attendance (student_id, date, status, hours_absent, recorded_by)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(student_id, date) DO UPDATE SET
            status = excluded.status,
            hours_absent = excluded.hours_absent,
            recorded_by = excluded.recorded_by
    `).run(studentId, date, status, hours, userId);
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
  return db.prepare('SELECT id, username, full_name as fullName, role, assigned_classes as assignedClasses FROM users WHERE school_id = ?').all(sid);
});

handleIPC('db:addUser', async (event, user) => {
  const { username, password, fullName, role, schoolId, assignedClasses } = user;
  const sid = schoolId || 1;
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  return db.prepare('INSERT INTO users (username, password, full_name, role, school_id, assigned_classes) VALUES (?, ?, ?, ?, ?, ?)')
    .run(username, hash, fullName, role, sid, JSON.stringify(assignedClasses || []));
});

handleIPC('db:changePassword', async (event, { userId, newPassword }) => {
  const hash = crypto.createHash('sha256').update(newPassword).digest('hex');
  return db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, userId);
});

// Ticketing
handleIPC('db:sendTicket', async (event, ticket) => {
  const { sender_id, receiver_role, subject, message, school_id } = ticket;
  const sid = school_id || 1;
  return db.prepare('INSERT INTO tickets (sender_id, receiver_role, subject, message, school_id) VALUES (?, ?, ?, ?, ?)')
    .run(sender_id, receiver_role, subject, message, sid);
});

handleIPC('db:getTickets', async (event, { userId, role, schoolId }) => {
  const sid = schoolId || 1;
  if (role === 'SUPERADMIN' || role === 'FOUNDER') {
      return db.prepare('SELECT t.*, u.full_name as sender_name FROM tickets t JOIN users u ON t.sender_id = u.id WHERE t.school_id = ?').all(sid);
  }
  return db.prepare('SELECT t.*, u.full_name as sender_name FROM tickets t JOIN users u ON t.sender_id = u.id WHERE t.school_id = ? AND (t.sender_id = ? OR t.receiver_role = ?)')
    .all(sid, userId, role);
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
  return db.prepare(`
    UPDATE students SET
      first_name = ?, last_name = ?, birth_date = ?, birth_place = ?, gender = ?,
      parent_contact = ?, emergency_contact = ?, medical_info = ?, address = ?, neighborhood = ?,
      section = ?, class_id = ?, scholarship_reduction = ?, has_moratoire = ?
    WHERE id = ?
  `).run(firstName, lastName, birthDate, birthPlace, gender, parentContact, emergencyContact, medicalInfo, address, neighborhood, section, classId, scholarshipReduction, hasMoratoire, id);
});

handleIPC('db:getDashboardStats', async (event, params) => {
  const schoolId = (params && params.schoolId) ? params.schoolId : 1;
  const section = (params && params.section) ? params.section : null;

  const whereSect = section ? "AND section = ?" : "";
  const queryParams = section ? [schoolId, section] : [schoolId];

  const totalStudents = db.prepare(`SELECT COUNT(*) as count FROM students WHERE school_id = ? ${whereSect}`).get(...queryParams).count;
  const boys = db.prepare(`SELECT COUNT(*) as count FROM students WHERE gender = 'M' AND school_id = ? ${whereSect}`).get(...queryParams).count;
  const girls = db.prepare(`SELECT COUNT(*) as count FROM students WHERE gender = 'F' AND school_id = ? ${whereSect}`).get(...queryParams).count;

  const totalRevenue = db.prepare(`
    SELECT SUM(p.amount) as total
    FROM payments p
    JOIN students s ON p.student_id = s.id
    WHERE s.school_id = ? ${whereSect}
  `).get(...queryParams).total || 0;

  const totalTuitionDue = db.prepare(`
    SELECT SUM(t.total_fee) as total
    FROM tuition_fees t
    JOIN students s ON s.class_id = t.class_id
    WHERE s.school_id = ? ${whereSect}
  `).get(...queryParams).total || 0;

  const classStats = db.prepare(`
    SELECT c.name as level, AVG(g.score) as avg,
    (COUNT(CASE WHEN g.score >= 10 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as passRate
    FROM classes c
    LEFT JOIN grades g ON g.class_id = c.id
    WHERE c.school_id = ? ${whereSect}
    GROUP BY c.id
  `).all(...queryParams);

  return {
    totalStudents,
    genderDist: { boys, girls },
    totalRevenue,
    totalTuitionDue,
    classStats: classStats.map(c => ({ ...c, avg: c.avg || 0, passRate: c.passRate || 0 })),
    financialAlerts: []
  };
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
