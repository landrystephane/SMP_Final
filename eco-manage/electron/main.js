const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { initDb, db } = require('./database/db');
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

  if (isDev) {
    win.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  initDb();

  // Seed admin if not exists
  const admin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin');
  if (!admin) {
    db.prepare('INSERT INTO users (username, password, full_name, role) VALUES (?, ?, ?, ?)')
      .run('admin', 'admin', 'Super Admin', 'FOUNDER');
  }

  createWindow();
});

// IPC Handlers for actual persistence
ipcMain.handle('auth:login', async (event, { username, password }) => {
  try {
    const user = db.prepare('SELECT id, username, full_name as fullName, role FROM users WHERE username = ? AND password = ?')
      .get(username, password);
    return user || null;
  } catch (error) {
    console.error('Login error:', error);
    return null;
  }
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
