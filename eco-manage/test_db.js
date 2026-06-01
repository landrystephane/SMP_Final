const Database = require('better-sqlite3');
const db = new Database('electron/database/school_manager.sqlite');
try {
  console.log(db.prepare('SELECT id, username, full_name as fullName, role, assigned_classes as assignedClasses, matricule, civility, section, gender, phone, is_active FROM users').all());
} catch (e) {
  console.error('ERROR:', e.message);
}
