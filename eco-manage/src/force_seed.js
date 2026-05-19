const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const userData = path.join(process.env.APPDATA, 'eco-manage');
const dbFile = path.join(userData, 'school.db');

try {
    const db = new Database(dbFile);
    console.log('Opening database:', dbFile);

    // 1. Ensure classes table has level column
    try {
        const classCols = db.prepare('PRAGMA table_info(classes)').all();
        if (!classCols.find(c => c.name === 'level')) {
            console.log('Adding level column to classes table...');
            db.prepare("ALTER TABLE classes ADD COLUMN level TEXT DEFAULT 'PRIMAIRE'").run();
        } else {
            console.log('Level column already exists.');
        }
    } catch (err) {
        console.error('Error adding level column:', err.message);
    }

    // 2. Seed Maternelle classes for school 1 if they don't exist
    const maternelCount = db.prepare("SELECT COUNT(*) as count FROM classes WHERE school_id = 1 AND level = 'MATERNELLE'").get().count;
    console.log('Current Maternelle classes count for school 1:', maternelCount);
    if (maternelCount === 0) {
        const nurseryClasses = [
            { name: 'Petite Section', code: 'PS', section: 'FRANCOPHONE', level: 'MATERNELLE' },
            { name: 'Moyenne Section', code: 'MS', section: 'FRANCOPHONE', level: 'MATERNELLE' },
            { name: 'Grande Section', code: 'GS', section: 'FRANCOPHONE', level: 'MATERNELLE' },
            { name: 'Nursery 1', code: 'N1', section: 'ANGLOPHONE', level: 'MATERNELLE' },
            { name: 'Nursery 2', code: 'N2', section: 'ANGLOPHONE', level: 'MATERNELLE' },
            { name: 'Nursery 3', code: 'N3', section: 'ANGLOPHONE', level: 'MATERNELLE' },
        ];
        const insertClass = db.prepare('INSERT INTO classes (school_id, name, code, section, level) VALUES (1, ?, ?, ?, ?)');
        const nurseryTx = db.transaction(() => {
            for (const cls of nurseryClasses) {
                insertClass.run(cls.name, cls.code, cls.section, cls.level);
            }
        });
        nurseryTx();
        console.log('Seeded default Maternelle classes successfully!');
    } else {
        console.log('Maternelle classes already seeded.');
    }
} catch (err) {
    console.error('General Error:', err.message);
}
process.exit(0);
