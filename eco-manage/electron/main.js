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
  return db.prepare('SELECT * FROM students WHERE school_id = ?').all(schoolId);
});

handleIPC('db:addStudent', async (event, student) => {
  const { firstName, lastName, birthDate, birthPlace, gender, parentContact, emergencyContact, medicalInfo, address, neighborhood, section, classId, schoolId } = student;
  const matricule = `MAT-${Date.now()}`;
  return db.prepare(`
    INSERT INTO students (matricule, first_name, last_name, birth_date, birth_place, gender, parent_contact, emergency_contact, medical_info, address, neighborhood, section, class_id, school_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(matricule, firstName, lastName, birthDate, birthPlace, gender, parentContact, emergencyContact, medicalInfo, address, neighborhood, section, classId, schoolId);
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
  return db.prepare(`
    SELECT p.*, s.first_name, s.last_name, s.class_id, i.name as installment_name
    FROM payments p
    JOIN students s ON p.student_id = s.id
    LEFT JOIN installments i ON p.installment_id = i.id
    WHERE s.school_id = ?
  `).all(schoolId);
});

handleIPC('db:addPayment', async (event, payment) => {
  const { studentId, amount, type, userId, installmentId } = payment;
  const receiptNumber = `RCP-${Date.now()}`;
  return db.prepare(`
    INSERT INTO payments (student_id, amount, payment_type, received_by, receipt_number, installment_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(studentId, amount, type, userId, receiptNumber, installmentId);
});

handleIPC('db:getTuitionFees', async (event, schoolId) => {
  return db.prepare(`
    SELECT c.id as classId, c.name as className, COALESCE(t.total_fee, 0) as totalFee, COALESCE(t.registration_fee, 0) as registrationFee
    FROM classes c
    LEFT JOIN tuition_fees t ON c.id = t.class_id
    WHERE c.school_id = ?
  `).all(schoolId);
});

handleIPC('db:getInstallments', async () => {
    return db.prepare('SELECT * FROM installments ORDER BY display_order').all();
});

handleIPC('db:getClassInstallmentFees', async (event, schoolId) => {
    return db.prepare('SELECT cif.* FROM class_installment_fees cif JOIN classes c ON cif.class_id = c.id WHERE c.school_id = ?').all(schoolId);
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
handleIPC('db:getSubjects', async (event, schoolId) => {
  return db.prepare('SELECT * FROM subjects WHERE school_id = ?').all(schoolId);
});

handleIPC('db:getClasses', async (event, schoolId) => {
  return db.prepare('SELECT * FROM classes WHERE school_id = ?').all(schoolId);
});

handleIPC('db:getSchedules', async (event, schoolId) => {
    return db.prepare('SELECT * FROM schedules WHERE school_id = ?').all(schoolId);
});

handleIPC('db:updateSchedule', async (event, schedule) => {
    const { id, class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, school_id } = schedule;
    if (id) {
        return db.prepare(`UPDATE schedules SET class_id=?, teacher_id=?, subject_id=?, day_of_week=?, start_time=?, end_time=?, type=? WHERE id=?`).run(class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, id);
    } else {
        return db.prepare(`INSERT INTO schedules (class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, school_id) VALUES (?,?,?,?,?,?,?,?)`).run(class_id, teacher_id, subject_id, day_of_week, start_time, end_time, type, school_id);
    }
});

// Transport
handleIPC('db:getBusRoutes', async (event, schoolId) => {
    return db.prepare('SELECT * FROM bus_routes WHERE school_id = ?').all(schoolId);
});

handleIPC('db:getRouteStudents', async (event, routeId) => {
    return db.prepare('SELECT * FROM students WHERE bus_route_id = ?').all(routeId);
});

handleIPC('db:logTransport', async (event, log) => {
    const { route_id, event_type, latitude, longitude } = log;
    return db.prepare(`INSERT INTO transport_logs (route_id, event_type, latitude, longitude) VALUES (?, ?, ?, ?)`).run(route_id, event_type, latitude, longitude);
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
handleIPC('db:saveAttendance', async (event, { studentId, date, status, recorded_by }) => {
    return db.prepare(`
        INSERT INTO attendance (student_id, date, status, recorded_by)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(student_id, date) DO UPDATE SET status = excluded.status
    `).run(studentId, date, status, recorded_by);
});

handleIPC('db:getUsers', async (event, schoolId) => {
  return db.prepare('SELECT id, username, full_name as fullName, role, assigned_classes as assignedClasses FROM users WHERE school_id = ?').all(schoolId);
});

handleIPC('db:addUser', async (event, user) => {
  const { username, password, fullName, role, schoolId, assignedClasses } = user;
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  return db.prepare('INSERT INTO users (username, password, full_name, role, school_id, assigned_classes) VALUES (?, ?, ?, ?, ?, ?)')
    .run(username, hash, fullName, role, schoolId, JSON.stringify(assignedClasses || []));
});

handleIPC('db:getDashboardStats', async (event, { schoolId, section }) => {
  const whereSect = section ? "AND section = ?" : "";
  const params = section ? [schoolId, section] : [schoolId];

  const totalStudents = db.prepare(`SELECT COUNT(*) as count FROM students WHERE school_id = ? ${whereSect}`).get(...params).count;
  const boys = db.prepare(`SELECT COUNT(*) as count FROM students WHERE gender = 'M' AND school_id = ? ${whereSect}`).get(...params).count;
  const girls = db.prepare(`SELECT COUNT(*) as count FROM students WHERE gender = 'F' AND school_id = ? ${whereSect}`).get(...params).count;

  const totalRevenue = db.prepare(`
    SELECT SUM(p.amount) as total
    FROM payments p
    JOIN students s ON p.student_id = s.id
    WHERE s.school_id = ? ${whereSect}
  `).get(...params).total || 0;

  const totalTuitionDue = db.prepare(`
    SELECT SUM(t.total_fee) as total
    FROM tuition_fees t
    JOIN students s ON s.class_id = t.class_id
    WHERE s.school_id = ? ${whereSect}
  `).get(...params).total || 0;

  const classStats = db.prepare(`
    SELECT c.name as level, AVG(g.score) as avg,
    (COUNT(CASE WHEN g.score >= 10 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as passRate
    FROM classes c
    LEFT JOIN grades g ON g.class_id = c.id
    WHERE c.school_id = ? ${whereSect}
    GROUP BY c.id
  `).all(...params);

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
