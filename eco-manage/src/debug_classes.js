const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const userData = path.join(process.env.APPDATA, 'eco-manage');
const dbFile = path.join(userData, 'school.db');

try {
    const db = new Database(dbFile);
    const classes = db.prepare('SELECT * FROM classes').all();
    const students = db.prepare('SELECT count(*) as count, class_id FROM students group by class_id').all();
    fs.writeFileSync('classes_dump.json', JSON.stringify({ classes, students }, null, 2));
    console.log('Dump completed successfully.');
} catch (err) {
    fs.writeFileSync('classes_dump.json', JSON.stringify({ error: err.message }, null, 2));
    console.error('Error:', err.message);
}
process.exit(0);
