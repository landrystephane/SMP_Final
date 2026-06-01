const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');

app.whenReady().then(() => {
    const userDataPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'eco-manage');
    const dbPath = path.join(userDataPath, 'school.db');
    const db = new Database(dbPath);
    console.log("Students:", JSON.stringify(db.prepare('SELECT id, first_name, parent_name, parent_contact, class_id FROM students WHERE school_id = 2').all(), null, 2));
    app.quit();
});
