const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

app.whenReady().then(() => {
    const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'eco-manage', 'school.db');
    const db = new Database(dbPath);
    try {
        const users = db.prepare("SELECT id, username, role, assigned_classes, school_id, full_name FROM users WHERE role = 'TEACHER'").all();
        console.log('=== TEACHERS ===');
        console.log(JSON.stringify(users, null, 2));

        const classes = db.prepare("SELECT id, name, code, main_teacher_id, assistant_teacher_id, school_id FROM classes WHERE main_teacher_id IS NOT NULL").all();
        console.log('=== CLASSES WITH TEACHERS ===');
        console.log(JSON.stringify(classes, null, 2));

        const students = db.prepare("SELECT id, first_name, last_name, gender, class_id FROM students").all();
        console.log('=== ALL STUDENTS ===');
        console.log(JSON.stringify(students, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
    db.close();
    app.exit(0);
});
