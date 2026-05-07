const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const crypto = require('crypto');
const { initDb, db } = require('./database/db');
const { startApiServer } = require('./api-server');
const isDev = !app.isPackaged;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
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

  // if (isDev) {
  //   win.webContents.openDevTools();
  // }
}

app.whenReady().then(() => {
  initDb();
  startApiServer();

  // Seed admin if not exists
  const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!admin) {
    const hash = crypto.createHash('sha256').update('admin').digest('hex');
    db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)')
      .run('admin', hash, 'Super Admin', 'FOUNDER');
  }

  createWindow();

  // Seed Classes if empty
  const classesCount = db.prepare('SELECT COUNT(*) as count FROM classes').get().count;
  if (classesCount === 0) {
    const defaultClasses = [
      ['SIL A', 'FRANCOPHONE', 'PRIMAIRE'],
      ['SIL B', 'FRANCOPHONE', 'PRIMAIRE'],
      ['CP A', 'FRANCOPHONE', 'PRIMAIRE'],
      ['CP B', 'FRANCOPHONE', 'PRIMAIRE'],
      ['CE1 A', 'FRANCOPHONE', 'PRIMAIRE'],
      ['CE2 A', 'FRANCOPHONE', 'PRIMAIRE'],
      ['CM1 A', 'FRANCOPHONE', 'PRIMAIRE'],
      ['CM2 A', 'FRANCOPHONE', 'PRIMAIRE'],
      ['Class 1', 'ANGLOPHONE', 'PRIMAIRE'],
      ['Class 2', 'ANGLOPHONE', 'PRIMAIRE'],
      ['Class 3', 'ANGLOPHONE', 'PRIMAIRE'],
      ['Class 4', 'ANGLOPHONE', 'PRIMAIRE'],
      ['Class 5', 'ANGLOPHONE', 'PRIMAIRE'],
      ['Class 6', 'ANGLOPHONE', 'PRIMAIRE'],
      ['Petite Section', 'FRANCOPHONE', 'MATERNELLE'],
      ['Moyenne Section', 'FRANCOPHONE', 'MATERNELLE'],
      ['Grande Section', 'FRANCOPHONE', 'MATERNELLE'],
      ['Pre-Nursery', 'ANGLOPHONE', 'MATERNELLE'],
      ['Nursery 1', 'ANGLOPHONE', 'MATERNELLE'],
      ['Nursery 2', 'ANGLOPHONE', 'MATERNELLE'],
    ];
    const insertClass = db.prepare('INSERT INTO classes (name, section, level) VALUES (?, ?, ?)');
    defaultClasses.forEach(c => insertClass.run(c));
  }

  // Initial Seed for subjects if empty
  const subjectsCount = db.prepare('SELECT COUNT(*) as count FROM subjects').get().count;
  if (subjectsCount === 0) {
    const defaultSubjects = [
      // PRIMAIRE - Francophone
      ['Langue Française', 'Langues et Communication', 'PRIMAIRE', 'FRANCOPHONE', 5],
      ['Mathématiques', 'Sciences et Techno', 'PRIMAIRE', 'FRANCOPHONE', 4],
      ['Sciences Humaines', 'Milieu Physique et Humain', 'PRIMAIRE', 'FRANCOPHONE', 2],
      ['Développement Personnel', 'Vie Courante', 'PRIMAIRE', 'FRANCOPHONE', 2],
      ['Activités Pratiques', 'Arts et Culture', 'PRIMAIRE', 'FRANCOPHONE', 1],

      // PRIMARY - Anglophone
      ['English Language', 'Languages & Communication', 'PRIMAIRE', 'ANGLOPHONE', 5],
      ['Mathematics', 'Science & Tech', 'PRIMAIRE', 'ANGLOPHONE', 4],
      ['Social Studies', 'Human Environment', 'PRIMAIRE', 'ANGLOPHONE', 2],
      ['Personal Development', 'Life Skills', 'PRIMAIRE', 'ANGLOPHONE', 2],
      ['Vocational Activities', 'Arts & Culture', 'PRIMAIRE', 'ANGLOPHONE', 1],

      // MATERNELLE - Francophone
      ['Activités Langagières', 'Langage et Communication', 'MATERNELLE', 'FRANCOPHONE', 1],
      ['Éveil Scientifique', 'Éveil Scientifique et Technologique', 'MATERNELLE', 'FRANCOPHONE', 1],
      ['Développement de la Personnalité', 'Milieu Physique et Humain', 'MATERNELLE', 'FRANCOPHONE', 1],
      ['Activités Créatrices', 'Arts et Culture', 'MATERNELLE', 'FRANCOPHONE', 1],
      ['Motricité', 'Éducation Physique', 'MATERNELLE', 'FRANCOPHONE', 1],

      // MATERNELLE - Anglophone
      ['Language Activities', 'Language & Communication', 'MATERNELLE', 'ANGLOPHONE', 1],
      ['Scientific Awakening', 'Scientific & Technological Awakening', 'MATERNELLE', 'ANGLOPHONE', 1],
      ['Personality Development', 'Human & Physical Environment', 'MATERNELLE', 'ANGLOPHONE', 1],
      ['Creative Activities', 'Arts & Culture', 'MATERNELLE', 'ANGLOPHONE', 1],
      ['Motor Skills', 'Physical Education', 'MATERNELLE', 'ANGLOPHONE', 1],
    ];
    const insert = db.prepare('INSERT INTO subjects (name, domain, level, section, coefficient) VALUES (?, ?, ?, ?, ?)');
    defaultSubjects.forEach(s => insert.run(s));
  }
});

// IPC Handlers
ipcMain.handle('auth:login', async (event, { username, password }) => {
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  return db.prepare('SELECT id, username, full_name as fullName, role FROM users WHERE username = ? AND password = ?')
    .get(username, hash) || null;
});

ipcMain.handle('db:getStudents', async () => {
  return db.prepare('SELECT * FROM students').all();
});

ipcMain.handle('db:addStudent', async (event, student) => {
  const { firstName, lastName, birthDate, birthPlace, gender, parentContact, emergencyContact, medicalInfo, address, section, classId } = student;
  const matricule = `MAT-${Date.now()}`;
  return db.prepare(`
    INSERT INTO students (matricule, first_name, last_name, birth_date, birth_place, gender, parent_contact, emergency_contact, medical_info, address, section, class_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(matricule, firstName, lastName, birthDate, birthPlace, gender, parentContact, emergencyContact, medicalInfo, address, section, classId);
});

ipcMain.handle('db:getGrades', async (event, { classId, term }) => {
  return db.prepare('SELECT * FROM grades WHERE class_id = ? AND term = ?').all(classId, term);
});

ipcMain.handle('db:saveGrades', async (event, grades) => {
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
      if (existing && existing.locked === 1) {
        throw new Error(`Grade for student ${g.student_id} is locked.`);
      }
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

ipcMain.handle('db:unlockGrades', async (event, { classId, term, month }) => {
  return db.prepare('UPDATE grades SET locked = 0 WHERE class_id = ? AND term = ? AND month = ?').run(classId, term, month);
});

ipcMain.handle('db:getPayments', async () => {
  return db.prepare('SELECT p.*, s.first_name, s.last_name FROM payments p JOIN students s ON p.student_id = s.id').all();
});

ipcMain.handle('db:addPayment', async (event, payment) => {
  const { studentId, amount, type, userId } = payment;
  const receiptNumber = `RCP-${Date.now()}`;
  return db.prepare(`
    INSERT INTO payments (student_id, amount, payment_type, received_by, receipt_number)
    VALUES (?, ?, ?, ?, ?)
  `).run(studentId, amount, type, userId, receiptNumber);
});

ipcMain.handle('db:getTickets', async () => {
  return db.prepare('SELECT t.*, u.full_name as sender_name FROM tickets t JOIN users u ON t.sender_id = u.id').all();
});

ipcMain.handle('db:sendTicket', async (event, ticket) => {
  const { senderId, role, subject, message } = ticket;
  return db.prepare(`
    INSERT INTO tickets (sender_id, receiver_role, subject, message)
    VALUES (?, ?, ?, ?)
  `).run(senderId, role, subject, message);
});

ipcMain.handle('db:getSubjects', async () => {
  return db.prepare('SELECT * FROM subjects').all();
});

ipcMain.handle('db:addSubject', async (event, subject) => {
  const { name, domain, level, section, coefficient } = subject;
  return db.prepare(`
    INSERT INTO subjects (name, domain, level, section, coefficient)
    VALUES (?, ?, ?, ?, ?)
  `).run(name, domain, level, section, coefficient);
});

ipcMain.handle('db:getClasses', async () => {
  return db.prepare('SELECT * FROM classes').all();
});

ipcMain.handle('db:getUsers', async () => {
  return db.prepare('SELECT id, username, full_name as fullName, role FROM users').all();
});

ipcMain.handle('db:addUser', async (event, user) => {
  const { username, password, fullName, role, classId } = user;
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const result = db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)')
    .run(username, hash, fullName, role);

  if (classId && role === 'TEACHER') {
      db.prepare('UPDATE classes SET main_teacher_id = ? WHERE id = ?').run(result.lastInsertRowid, classId);
  }
  return result;
});

ipcMain.handle('db:changePassword', async (event, { userId, newPassword }) => {
  const hash = crypto.createHash('sha256').update(newPassword).digest('hex');
  return db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hash, userId);
});

ipcMain.handle('db:getTuitionFees', async () => {
  return db.prepare(`
    SELECT c.id as classId, c.name as className, COALESCE(t.total_fee, 0) as totalFee
    FROM classes c
    LEFT JOIN tuition_fees t ON c.id = t.class_id
  `).all();
});

ipcMain.handle('db:updateTuitionFee', async (event, { classId, totalFee }) => {
  return db.prepare(`
    INSERT INTO tuition_fees (class_id, total_fee)
    VALUES (?, ?)
    ON CONFLICT(class_id) DO UPDATE SET total_fee = excluded.total_fee
  `).run(classId, totalFee);
});

ipcMain.handle('db:getSetting', async (event, key) => {
  return db.prepare('SELECT value FROM settings WHERE key = ?').get(key)?.value || null;
});

ipcMain.handle('db:setSetting', async (event, { key, value }) => {
  return db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').run(key, value);
});

ipcMain.handle('db:getDashboardStats', async (event, section) => {
  const whereSection = section ? "WHERE section = ?" : "";
  const params = section ? [section] : [];

  const totalStudents = db.prepare(`SELECT COUNT(*) as count FROM students ${whereSection}`).get(...params).count;
  const boys = db.prepare(`SELECT COUNT(*) as count FROM students WHERE gender = 'M' ${section ? 'AND section = ?' : ''}`).get(...params).count;
  const girls = db.prepare(`SELECT COUNT(*) as count FROM students WHERE gender = 'F' ${section ? 'AND section = ?' : ''}`).get(...params).count;

  const totalRevenue = db.prepare(`
    SELECT SUM(p.amount) as total
    FROM payments p
    JOIN students s ON p.student_id = s.id
    ${whereSection}
  `).get(...params).total || 0;

  const totalTuitionDue = db.prepare(`
    SELECT SUM(t.total_fee) as total
    FROM tuition_fees t
    JOIN students s ON s.class_id = t.class_id
    ${whereSection}
  `).get(...params).total || 0;

  const classStats = db.prepare(`
    SELECT c.name as level, AVG(g.score) as avg,
    (COUNT(CASE WHEN g.score >= 10 THEN 1 END) * 100.0 / NULLIF(COUNT(*), 0)) as passRate
    FROM classes c
    LEFT JOIN grades g ON g.class_id = c.id
    ${whereSection}
    GROUP BY c.id
  `).all(...params);

  return {
    totalStudents,
    genderDist: { boys, girls },
    totalRevenue,
    totalTuitionDue,
    classStats: classStats.map(c => ({
        ...c,
        avg: c.avg || 0,
        passRate: c.passRate || 0
    }))
  };
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
