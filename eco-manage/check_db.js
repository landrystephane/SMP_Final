const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

const userDataPath = path.join(os.homedir(), 'AppData', 'Roaming', 'eco-manage');
const dbPath = path.join(userDataPath, 'school.db');

console.log('Database path:', dbPath);

if (!fs.existsSync(dbPath)) {
    console.log('Database file does not exist at this path.');
    process.exit(1);
}

const db = new Database(dbPath);
try {
    const columns = db.prepare(`PRAGMA table_info(schools)`).all();
    console.log('Schools columns:');
    columns.forEach(c => console.log(` - ${c.name} (${c.type})`));
} catch (e) {
    console.error('Error reading schools table:', e.message);
}
db.close();
