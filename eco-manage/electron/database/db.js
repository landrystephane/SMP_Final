const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const userDataPath = app.getPath('userData');
const dbPath = path.join(userDataPath, 'school.db');
const schemaPath = path.join(__dirname, 'schema.sql');

if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);

function initDb() {
    // 1. Ensure tables exist
    const schema = fs.readFileSync(schemaPath, 'utf8');
    db.exec(schema);

    // 2. Migration: Add school_id to all relevant tables if missing
    const tables = ['users', 'classes', 'subjects', 'students', 'grades', 'payments', 'attendance', 'schedules', 'bus_routes', 'tickets'];
    tables.forEach(table => {
        try {
            const columns = db.prepare(`PRAGMA table_info(${table})`).all();
            if (!columns.find(c => c.name === 'school_id')) {
                console.log(`[Migration] Adding school_id to ${table}`);
                db.prepare(`ALTER TABLE ${table} ADD COLUMN school_id INTEGER DEFAULT 1`).run();
            }
        } catch (e) {
            // Table might not exist yet if schema failed, but db.exec should have created it
            console.error(`[Migration] Failed for ${table}:`, e.message);
        }
    });

    // 3. User Table Migration: Add assigned_classes if missing
    try {
        const userCols = db.prepare(`PRAGMA table_info(users)`).all();
        if (!userCols.find(c => c.name === 'assigned_classes')) {
            console.log(`[Migration] Adding assigned_classes to users`);
            db.prepare(`ALTER TABLE users ADD COLUMN assigned_classes TEXT`).run();
        }
    } catch (e) {
        console.error(`[Migration] User table migration failed:`, e.message);
    }

    console.log('Database initialized and migrated at:', dbPath);
}

module.exports = {
    db,
    initDb
};
