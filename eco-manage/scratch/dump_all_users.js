const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

app.whenReady().then(() => {
    const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'eco-manage', 'school.db');
    const db = new Database(dbPath);
    try {
        const users = db.prepare("SELECT * FROM users").all();
        const students = db.prepare("SELECT * FROM students").all();
        const data = { users, students };
        fs.writeFileSync(path.join(__dirname, 'dump_users_students.json'), JSON.stringify(data, null, 2), 'utf8');
        console.log('Wrote dump_users_students.json');
    } catch (e) {
        console.error('Error:', e.message);
    }
    db.close();
    app.exit(0);
});
