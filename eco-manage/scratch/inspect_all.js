const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

app.whenReady().then(() => {
    const dbPath = path.join(os.homedir(), 'AppData', 'Roaming', 'eco-manage', 'school.db');
    console.log('Database path:', dbPath);

    const db = new Database(dbPath);
    try {
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const counts = {};
        for (const t of tables) {
            const count = db.prepare(`SELECT COUNT(*) as c FROM ${t.name}`).get().c;
            counts[t.name] = count;
        }
        console.log('Table Counts:', counts);
        fs.writeFileSync(path.join(__dirname, 'eco_manage_counts.json'), JSON.stringify(counts, null, 2), 'utf8');
    } catch (e) {
        console.error('Error:', e.message);
    }
    db.close();
    app.exit(0);
});
