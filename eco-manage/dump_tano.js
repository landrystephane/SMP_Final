const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');

app.whenReady().then(() => {
    const userDataPath = path.join(require('os').homedir(), 'AppData', 'Roaming', 'eco-manage');
    const dbPath = path.join(userDataPath, 'school.db');
    const db = new Database(dbPath);
    console.log("User TANO:", JSON.stringify(db.prepare('SELECT id, full_name, school_id FROM users WHERE full_name LIKE \'%TANO%\'').all(), null, 2));
    app.quit();
});
