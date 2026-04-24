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

  // Initial Seed for subjects if empty
  const subjectsCount = db.prepare('SELECT COUNT(*) as count FROM subjects').get().count;
  if (subjectsCount === 0) {
    const defaultSubjects = [
      // PRIMAIRE - Francophone
      ['Langue Française', 'Langues et Communication', 'PRIMAIRE', 5],
      ['Mathématiques', 'Sciences et Techno', 'PRIMAIRE', 4],
      ['Sciences Humaines', 'Milieu Physique et Humain', 'PRIMAIRE', 2],
      ['Développement Personnel', 'Vie Courante', 'PRIMAIRE', 2],
      ['Activités Pratiques', 'Arts et Culture', 'PRIMAIRE', 1],

      // PRIMARY - Anglophone
      ['English Language', 'Languages & Communication', 'PRIMAIRE', 5],
      ['Mathematics', 'Science & Tech', 'PRIMAIRE', 4],
      ['Social Studies', 'Human Environment', 'PRIMAIRE', 2],
      ['Personal Development', 'Life Skills', 'PRIMAIRE', 2],
      ['Vocational Activities', 'Arts & Culture', 'PRIMAIRE', 1],

      // MATERNELLE
      ['Activités Langagières', 'Langage et Communication', 'MATERNELLE', 1],
      ['Éveil Scientifique', 'Éveil Scientifique et Technologique', 'MATERNELLE', 1],
      ['Développement de la Personnalité', 'Milieu Physique et Humain', 'MATERNELLE', 1],
      ['Activités Créatrices', 'Arts et Culture', 'MATERNELLE', 1],
      ['Motricité', 'Éducation Physique', 'MATERNELLE', 1],
    ];
    const insert = db.prepare('INSERT INTO subjects (name, domain, level, coefficient) VALUES (?, ?, ?, ?)');
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
  const { firstName, lastName, birthDate, birthPlace, gender, parentContact, address, section, classId } = student;
  const matricule = `MAT-${Date.now()}`;
  return db.prepare(`
    INSERT INTO students (matricule, first_name, last_name, birth_date, birth_place, gender, parent_contact, address, section, class_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(matricule, firstName, lastName, birthDate, birthPlace, gender, parentContact, address, section, classId);
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
  const { name, domain, level, coefficient } = subject;
  return db.prepare(`
    INSERT INTO subjects (name, domain, level, coefficient)
    VALUES (?, ?, ?, ?)
  `).run(name, domain, level, coefficient);
});

ipcMain.handle('db:getClasses', async () => {
  return db.prepare('SELECT * FROM classes').all();
});

ipcMain.handle('db:getDashboardStats', async () => {
  const totalStudents = db.prepare('SELECT COUNT(*) as count FROM students').get().count;
  const boys = db.prepare('SELECT COUNT(*) as count FROM students WHERE gender = "M"').get().count;
  const girls = db.prepare('SELECT COUNT(*) as count FROM students WHERE gender = "F"').get().count;
  const totalRevenue = db.prepare('SELECT SUM(amount) as total FROM payments').get().total || 0;

  // Basic class performance (MOCK logic for now based on grades)
  const classStats = db.prepare(`
    SELECT c.name as level, AVG(g.score) as avg,
    (COUNT(CASE WHEN g.score >= 10 THEN 1 END) * 100.0 / COUNT(*)) as passRate
    FROM grades g
    JOIN classes c ON g.class_id = c.id
    GROUP BY g.class_id
  `).all();

  return {
    totalStudents,
    genderDist: { boys, girls },
    totalRevenue,
    classStats
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
