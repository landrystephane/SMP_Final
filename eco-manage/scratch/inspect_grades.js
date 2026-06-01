const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

app.whenReady().then(() => {
    const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'Electron');
    const dbPath = path.join(userDataPath, 'school.db');
    console.log('Database path:', dbPath);

    const db = new Database(dbPath);
    try {
        const teachers = db.prepare("SELECT id, username, role, assigned_classes, school_id, full_name FROM users WHERE role = 'TEACHER'").all();
        console.log('Teachers:');
        console.log(JSON.stringify(teachers, null, 2));

        const classes = db.prepare("SELECT id, school_id, name, code, main_teacher_id FROM classes").all();
        console.log('All Classes:');
        console.log(JSON.stringify(classes, null, 2));

        const students = db.prepare("SELECT id, first_name, last_name, class_id, school_id FROM students").all();
        console.log('All Students:');
        console.log(JSON.stringify(students, null, 2));

        const grades = db.prepare("SELECT * FROM grades").all();
        console.log('All Grades:');
        console.log(JSON.stringify(grades, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
    db.close();
    app.exit(0);
});
