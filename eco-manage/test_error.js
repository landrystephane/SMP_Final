const Database = require('better-sqlite3');
const db = new Database(':memory:');
db.prepare('CREATE TABLE students (id INTEGER PRIMARY KEY)').run();
try {
    db.prepare('SELECT s.id FROM students s WHERE s.school_id = 1').all();
} catch (e) {
    console.error("ERROR TEXT 1:", e.message);
}
try {
    db.prepare('SELECT id FROM students WHERE school_id = 1').all();
} catch (e) {
    console.error("ERROR TEXT 2:", e.message);
}
