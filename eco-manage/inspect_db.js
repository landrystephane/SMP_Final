const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');

app.whenReady().then(() => {
    const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'eco-manage');
    const dbPath = path.join(userDataPath, 'school.db');
    console.log('Database path:', dbPath);

    const db = new Database(dbPath);
    try {
        const users = db.prepare("SELECT id, username, role, assigned_classes, school_id, full_name FROM users WHERE full_name LIKE '%Souley%'").all();
        console.log('Users matching Souley:');
        console.log(JSON.stringify(users, null, 2));

        const classes = db.prepare("SELECT id, name, code, main_teacher_id, school_id FROM classes WHERE main_teacher_id IS NOT NULL").all();
        console.log('Classes with main_teacher_id:');
        console.log(JSON.stringify(classes, null, 2));
    } catch (e) {
        console.error('Error:', e.message);
    }
    db.close();
    app.exit(0);
});
