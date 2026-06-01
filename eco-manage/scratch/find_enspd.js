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
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        for (const t of tables) {
            try {
                const rows = db.prepare(`SELECT * FROM ${t.name}`).all();
                for (const row of rows) {
                    const rowStr = JSON.stringify(row);
                    if (rowStr.includes('ENSPD') || rowStr.includes('Souley') || rowStr.includes('TAPTAP')) {
                        console.log(`Match in table ${t.name}:`, row);
                    }
                }
            } catch (e) {
                console.error(`Error reading ${t.name}:`, e.message);
            }
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
    db.close();
    app.exit(0);
});
