const Database = require('better-sqlite3');
const db = new Database(process.env.APPDATA + '\\eco-manage\\school.db');
console.log(db.prepare("PRAGMA table_info(students)").all());
console.log(db.prepare("PRAGMA table_info(classes)").all());
console.log(db.prepare("PRAGMA table_info(payments)").all());
console.log(db.prepare("PRAGMA table_info(tuition_fees)").all());
