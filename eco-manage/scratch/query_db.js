const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

app.whenReady().then(() => {
    const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'enspd-project');
    const dbPath = path.join(userDataPath, 'school.db');
    console.log('Database path:', dbPath);

    const db = new Database(dbPath);
    try {
        const schools = db.prepare("SELECT * FROM schools").all();
        console.log('=== SCHOOLS ===');
        console.log(schools);

        const counts = {
            users: db.prepare("SELECT COUNT(*) as c FROM users").get().c,
            classes: db.prepare("SELECT COUNT(*) as c FROM classes").get().c,
            students: db.prepare("SELECT COUNT(*) as c FROM students").get().c,
            grades: db.prepare("SELECT COUNT(*) as c FROM grades").get().c,
        };
        console.log('=== TABLE COUNTS ===');
        console.log(counts);

        const users = db.prepare("SELECT id, username, role, assigned_classes, school_id, full_name FROM users").all();
        console.log('=== ALL USERS ===');
        console.log(users);

        const classes = db.prepare("SELECT id, name, code, section, level, main_teacher_id, assistant_teacher_id, school_id FROM classes").all();
        console.log('=== ALL CLASSES ===');
        console.log(classes);

        const students = db.prepare("SELECT id, matricule, first_name, last_name, gender, class_id, school_id FROM students").all();
        console.log('=== ALL STUDENTS ===');
        console.log(students);

        const grades = db.prepare("SELECT id, student_id, subject_id, class_id, term, month, score, validated FROM grades").all();
        console.log('=== ALL GRADES ===');
        console.log(grades);

    } catch (e) {
        console.error('Error:', e.message);
    }
    db.close();
    app.exit(0);
});
