const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'eco-manage');
const dbPath = path.join(userDataPath, 'school.db');
console.log('Database path:', dbPath);

const db = new Database(dbPath);
try {
    const users = db.prepare("SELECT id, username, role, assigned_classes, school_id, full_name FROM users").all();
    console.log('=== USERS ===');
    console.log(JSON.stringify(users, null, 2));

    const classes = db.prepare("SELECT id, name, code, main_teacher_id, assistant_teacher_id, school_id FROM classes").all();
    console.log('=== CLASSES ===');
    console.log(JSON.stringify(classes, null, 2));

    const students = db.prepare("SELECT id, first_name, last_name, gender, class_id, school_id FROM students").all();
    console.log('=== STUDENTS ===');
    console.log(JSON.stringify(students, null, 2));
} catch (e) {
    console.error('Error:', e.message);
}
db.close();
