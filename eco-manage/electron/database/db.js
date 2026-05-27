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
    const tables = ['users', 'classes', 'subjects', 'students', 'grades', 'payments', 'attendance', 'schedules', 'bus_routes', 'tickets', 'announcements'];
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

    // 3.5. Classes Table Migration: Add level if missing
    try {
        const classCols = db.prepare(`PRAGMA table_info(classes)`).all();
        if (!classCols.find(c => c.name === 'level')) {
            console.log(`[Migration] Adding level to classes`);
            db.prepare(`ALTER TABLE classes ADD COLUMN level TEXT DEFAULT 'PRIMAIRE'`).run();
        }
    } catch (e) {
        console.error(`[Migration] Classes table migration failed:`, e.message);
    }


    // 4. Student Table Migration: Add parent_name if missing
    try {
        const studentCols = db.prepare(`PRAGMA table_info(students)`).all();
        if (!studentCols.find(c => c.name === 'parent_name')) {
            console.log(`[Migration] Adding parent_name to students`);
            db.prepare(`ALTER TABLE students ADD COLUMN parent_name TEXT`).run();
        }
        if (!studentCols.find(c => c.name === 'has_transport')) {
            console.log(`[Migration] Adding has_transport to students`);
            db.prepare(`ALTER TABLE students ADD COLUMN has_transport INTEGER DEFAULT 0`).run();
        }
    } catch (e) {
        console.error(`[Migration] Student table migration failed:`, e.message);
    }

    // 5. User Table Migration: Add matricule, civility, section, gender if missing
    try {
        const userCols = db.prepare(`PRAGMA table_info(users)`).all();
        if (!userCols.find(c => c.name === 'matricule')) {
            console.log(`[Migration] Adding matricule to users`);
            db.prepare(`ALTER TABLE users ADD COLUMN matricule TEXT`).run();
        }
        if (!userCols.find(c => c.name === 'civility')) {
            console.log(`[Migration] Adding civility to users`);
            db.prepare(`ALTER TABLE users ADD COLUMN civility TEXT`).run();
        }
        if (!userCols.find(c => c.name === 'section')) {
            console.log(`[Migration] Adding section to users`);
            db.prepare(`ALTER TABLE users ADD COLUMN section TEXT`).run();
        }
        if (!userCols.find(c => c.name === 'gender')) {
            console.log(`[Migration] Adding gender to users`);
            db.prepare(`ALTER TABLE users ADD COLUMN gender TEXT`).run();
        }
    } catch (e) {
        console.error(`[Migration] User additional columns failed:`, e.message);
    }

    // 6. Schools Table Migration: Add customization settings
    try {
        const schoolCols = db.prepare(`PRAGMA table_info(schools)`).all();
        const addCol = (name, def) => {
            if (!schoolCols.find(c => c.name === name)) {
                console.log(`[Migration] Adding ${name} to schools`);
                const escapedDef = def.replace(/'/g, "''");
                db.prepare(`ALTER TABLE schools ADD COLUMN ${name} TEXT DEFAULT '${escapedDef}'`).run();
            }
        };
        addCol('primary_color', '#1e293b');
        addCol('secondary_color', '#f59e0b');
        addCol('receipt_sig_title', "Signature de l'Économe");
        addCol('bulletin_sig_left', "L'ENSEIGNANT (TEACHER)");
        addCol('bulletin_sig_middle', "PARENT / GUARDIAN");
        addCol('bulletin_sig_right', "LE DIRECTEUR (HEADMASTER)");
        addCol('header_french', "MINISTÈRE DE L'ÉDUCATION DE BASE");
        addCol('header_english', "MINISTRY OF BASIC EDUCATION");
        addCol('bulletin_pdf_use_custom', '0');
        addCol('bulletin_pdf_template', '');
        addCol('bulletin_pdf_mapping', '{}');
    } catch (e) {
        console.error(`[Migration] School layout customization columns failed:`, e.message);
    }

    // 6.5. Grades Table Migration: Add validated if missing
    try {
        const gradeCols = db.prepare(`PRAGMA table_info(grades)`).all();
        if (!gradeCols.find(c => c.name === 'validated')) {
            console.log(`[Migration] Adding validated to grades`);
            db.prepare(`ALTER TABLE grades ADD COLUMN validated INTEGER DEFAULT 0`).run();
        }
    } catch (e) {
        console.error(`[Migration] Grades validation column migration failed:`, e.message);
    }

    // 6.6. Schools Table Migration: Add deleted_at and is_active if missing
    try {
        const schoolCols = db.prepare(`PRAGMA table_info(schools)`).all();
        if (!schoolCols.find(c => c.name === 'deleted_at')) {
            console.log(`[Migration] Adding deleted_at to schools`);
            db.prepare(`ALTER TABLE schools ADD COLUMN deleted_at TEXT DEFAULT NULL`).run();
        }
        if (!schoolCols.find(c => c.name === 'is_active')) {
            console.log(`[Migration] Adding is_active to schools`);
            db.prepare(`ALTER TABLE schools ADD COLUMN is_active INTEGER DEFAULT 1`).run();
        }
    } catch (e) {
        console.error(`[Migration] Schools deletion and active columns migration failed:`, e.message);
    }

    // 7. Archives Table Migration
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS school_year_archives (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                school_id INTEGER,
                year_name TEXT NOT NULL,
                total_students INTEGER,
                total_revenue REAL,
                average_grade REAL,
                backup_file_path TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (school_id) REFERENCES schools(id)
            );
        `);
        console.log(`[Migration] Archives table verified/created`);
    } catch (e) {
        console.error(`[Migration] Archives table failed:`, e.message);
    }

    // 8. Seed default global subjects if none exist in the database, and link them to school 1
    try {
        // Ensure school 1 exists first to avoid FK constraint failures
        const school = db.prepare('SELECT * FROM schools WHERE id = 1').get();
        if (!school) {
            console.log(`[Migration] Seeding default School 1`);
            db.prepare('INSERT INTO schools (id, name, address) VALUES (1, ?, ?)').run('Complexe Scolaire Bilingue Eco-Manage', 'Yaoundé, Cameroun');
        }

        const subjectCount = db.prepare('SELECT COUNT(*) as count FROM subjects').get().count;
        if (subjectCount === 0) {
            console.log(`[Migration] Seeding default subjects`);
            const defaultSubjects = [
                // Francophone Primaire
                { name: 'Mathématiques', domain: 'Sciences et Technologie', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Français (Récitation, Dictée)', domain: 'Langues et Communication', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Sciences de la Vie et de la Terre', domain: 'Sciences et Technologie', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Histoire & Géographie', domain: 'Sciences Humaines', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Éducation Civique & Morale', domain: 'Développement Personnel', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Arts Plastiques & Musique', domain: 'Culture & Arts', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Éducation Physique & Sportive', domain: 'Bien-être', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Anglais', domain: 'Langues et Communication', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'T.I.C.', domain: 'Sciences et Technologie', level: 'PRIMAIRE', section: 'FRANCOPHONE' },

                // Anglophone Primaire
                { name: 'Mathematics', domain: 'Sciences and Technology', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'English Language', domain: 'Languages and Communication', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'General Science', domain: 'Sciences and Technology', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'Social Studies & History', domain: 'Human Sciences', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'Citizenship Education & Morals', domain: 'Personal Development', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'Creative Arts & Music', domain: 'Culture & Arts', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'Physical Education & Sports', domain: 'Well-being', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'French Language', domain: 'Languages and Communication', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'I.C.T.', domain: 'Sciences and Technology', level: 'PRIMAIRE', section: 'ANGLOPHONE' },

                // Francophone Maternelle
                { name: 'Activités Sensorielles & Cognitives', domain: 'Éveil', level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Activités Langagières & Graphisme', domain: 'Langage & Communication', level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Activités Physiques & Artistiques', domain: 'Culture & Mouvement', level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Activités Socio-affectives', domain: 'Autonomie', level: 'MATERNELLE', section: 'FRANCOPHONE' },

                // Anglophone Nursery
                { name: 'Mathematical & Cognitive Activities', domain: 'Eveil', level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Language & Pre-Writing Skills', domain: 'Language & Communication', level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Physical & Creative Arts', domain: 'Culture & Movement', level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Social & Emotional Activities', domain: 'Autonomy', level: 'MATERNELLE', section: 'ANGLOPHONE' }
            ];

            const insertSubj = db.prepare('INSERT INTO subjects (name, domain, level, section) VALUES (?, ?, ?, ?)');
            const insertSchoolSubj = db.prepare('INSERT OR IGNORE INTO school_subjects (school_id, subject_id, is_active) VALUES (1, ?, 1)');
            
            const subjTx = db.transaction(() => {
                for (const s of defaultSubjects) {
                    const res = insertSubj.run(s.name, s.domain, s.level, s.section);
                    insertSchoolSubj.run(res.lastInsertRowid);
                }
            });
            subjTx();
            console.log(`[Migration] Seeded default subjects`);
        } else {
            // Check if existing subjects are linked to School 1, if not link them active
            const unlinked = db.prepare(`
                SELECT s.id FROM subjects s
                LEFT JOIN school_subjects ss ON s.id = ss.subject_id AND ss.school_id = 1
                WHERE ss.subject_id IS NULL
            `).all();
            if (unlinked.length > 0) {
                const insertSchoolSubj = db.prepare('INSERT OR IGNORE INTO school_subjects (school_id, subject_id, is_active) VALUES (1, ?, 1)');
                const linkTx = db.transaction(() => {
                    for (const row of unlinked) {
                        insertSchoolSubj.run(row.id);
                    }
                });
                linkTx();
                console.log(`[Migration] Auto-linked ${unlinked.length} unlinked subjects to School 1`);
            }
        }
    } catch (e) {
        console.error(`[Migration] Subject seeding/linking failed:`, e.message);
    }

    console.log('Database initialized and migrated at:', dbPath);
}

module.exports = {
    db,
    initDb,
    dbPath
};
