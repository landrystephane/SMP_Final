const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

let dbPath;

// Determine if running inside Electron or as a standard Node.js process (Cloud)
if (process.versions && process.versions.electron) {
    const { app } = require('electron');
    const userDataPath = app.getPath('userData');
    dbPath = path.join(userDataPath, 'school.db');
} else {
    // Web Server / Cloud mode
    // Use an environment variable, or default to a local 'data' folder
    const dataDir = process.env.DATA_DIR || path.join(__dirname, '..', '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    dbPath = path.join(dataDir, 'school.db');
}

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
        // One-shot: Harmonize class code CP1 to CP
        const cpDone = db.prepare("SELECT value FROM settings WHERE key = 'migration_cp1_done'").get();
        if (!cpDone) {
            db.prepare("UPDATE classes SET code = 'CP' WHERE code = 'CP1'").run();
            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_cp1_done', 'true')").run();
            console.log(`[Migration] Harmonized class code CP1 to CP`);
        }

        // One-shot: Ensure all class codes end with the current year
        const currentYear = new Date().getFullYear().toString().slice(-2);
        const yearKey = `migration_year_codes_${currentYear}`;
        const yearDone = db.prepare("SELECT value FROM settings WHERE key = ?").get(yearKey);
        if (!yearDone) {
            const classes = db.prepare('SELECT id, code FROM classes').all();
            db.transaction(() => {
                for (const c of classes) {
                    if (!c.code.endsWith(currentYear)) {
                        const baseCode = c.code.replace(/\d+$/, '');
                        db.prepare('UPDATE classes SET code = ? WHERE id = ?').run(baseCode + currentYear, c.id);
                    }
                }
            })();
            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, 'true')").run(yearKey);
            console.log(`[Migration] Appended year ${currentYear} to class codes`);
        }
    } catch (e) {
        console.error(`[Migration] Classes table migration failed:`, e.message);
    }

    // 3.5.5 One-shot: Fix student matricules with duplicated years
    try {
        const matDone = db.prepare("SELECT value FROM settings WHERE key = 'migration_matricule_fix_done'").get();
        if (!matDone) {
            const students = db.prepare('SELECT id, matricule FROM students').all();
            db.transaction(() => {
                for (const s of students) {
                    if (s.matricule) {
                        const match = s.matricule.match(/^(\d{2})([A-Z]+)(\d{2})(\d{4})$/);
                        if (match && match[1] === match[3]) {
                            const newMatricule = `${match[1]}${match[2]}${match[4]}`;
                            db.prepare('UPDATE students SET matricule = ? WHERE id = ?').run(newMatricule, s.id);
                        }
                    }
                }
            })();
            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_matricule_fix_done', 'true')").run();
            console.log(`[Migration] Fixed duplicated years in student matricules`);
        }
    } catch (e) {
        console.error(`[Migration] Student matricules migration failed:`, e.message);
    }

    // 3.6 Tuition Fees Migration
    try {
        const tuitionCols = db.prepare(`PRAGMA table_info(tuition_fees)`).all();
        if (!tuitionCols.find(c => c.name === 'transport_fee')) {
            db.prepare(`ALTER TABLE tuition_fees ADD COLUMN transport_fee REAL DEFAULT 0`).run();
        }
        if (!tuitionCols.find(c => c.name === 'exam_fee')) {
            db.prepare(`ALTER TABLE tuition_fees ADD COLUMN exam_fee REAL DEFAULT 0`).run();
        }
    } catch (e) {
        console.error(`[Migration] Tuition fees migration failed:`, e.message);
    }
    // 3.7 Attendance table migration for schedule_id
    try {
        const attCols = db.prepare(`PRAGMA table_info(attendance)`).all();
        if (!attCols.find(c => c.name === 'schedule_id')) {
            console.log(`[Migration] Migrating attendance table for schedule_id`);
            db.prepare(`ALTER TABLE attendance RENAME TO attendance_old`).run();
            db.exec(fs.readFileSync(schemaPath, 'utf8')); // Recreate the new attendance table
            db.prepare(`
                INSERT INTO attendance (id, student_id, date, status, hours_absent, recorded_by, notes, school_id)
                SELECT id, student_id, date, status, hours_absent, recorded_by, notes, school_id FROM attendance_old
            `).run();
            db.prepare(`DROP TABLE attendance_old`).run();
        }
    } catch (e) {
        console.error(`[Migration] Attendance table migration failed:`, e.message);
    }

    // 4. Student Table Migration: Add parent_name, status if missing
    try {
        const studentCols = db.prepare(`PRAGMA table_info(students)`).all();
        if (!studentCols.find(c => c.name === 'parent_name')) {
            db.prepare(`ALTER TABLE students ADD COLUMN parent_name TEXT`).run();
        }
        if (!studentCols.find(c => c.name === 'status')) {
            console.log(`[Migration] Adding status to students`);
            db.prepare(`ALTER TABLE students ADD COLUMN status TEXT DEFAULT 'ACTIVE'`).run();
        }
        if (!studentCols.find(c => c.name === 'has_transport')) {
            console.log(`[Migration] Adding has_transport to students`);
            db.prepare(`ALTER TABLE students ADD COLUMN has_transport INTEGER DEFAULT 0`).run();
        }
        if (!studentCols.find(c => c.name === 'transport_point_id')) {
            console.log(`[Migration] Adding transport_point_id to students`);
            db.prepare(`ALTER TABLE students ADD COLUMN transport_point_id INTEGER`).run();
        }
    } catch (e) {
        console.error(`[Migration] Student table migration failed:`, e.message);
    }

    // 5. User Table Migration: Add matricule, civility, section, gender, phone if missing
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
        if (!userCols.find(c => c.name === 'phone')) {
            console.log(`[Migration] Adding phone to users`);
            db.prepare(`ALTER TABLE users ADD COLUMN phone TEXT`).run();
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
                const escapedDef = def ? def.replace(/'/g, "''") : '';
                db.prepare(`ALTER TABLE schools ADD COLUMN ${name} TEXT DEFAULT '${escapedDef}'`).run();
            }
        };
        addCol('motto', '');
        addCol('bp', '');
        addCol('contact_email', '');
        addCol('contact_phone', '');
        addCol('logo', '');
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
        addCol('timetable_slots', '[{"label":"08:00 - 10:00","start":"08:00","end":"10:00","isBreak":false},{"label":"10:00 - 12:00","start":"10:00","end":"12:00","isBreak":false},{"label":"12:00 - 13:00","start":"12:00","end":"13:00","isBreak":true},{"label":"13:00 - 15:00","start":"13:00","end":"15:00","isBreak":false},{"label":"15:00 - 17:00","start":"15:00","end":"17:00","isBreak":false}]');
        addCol('honor_title_text', "TABLEAU D'HONNEUR");
        if (!schoolCols.find(c => c.name === 'honor_roll_threshold')) {
            console.log(`[Migration] Adding honor_roll_threshold to schools`);
            db.prepare(`ALTER TABLE schools ADD COLUMN honor_roll_threshold REAL DEFAULT 15.0`).run();
        }
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

    // 6.6. Grade overrides Table Migration
    try {
        db.prepare(`
            CREATE TABLE IF NOT EXISTS grade_overrides (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacher_id INTEGER,
                class_id INTEGER,
                term INTEGER,
                month TEXT,
                deadline DATE NOT NULL,
                granted_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (teacher_id) REFERENCES users(id),
                FOREIGN KEY (class_id) REFERENCES classes(id),
                FOREIGN KEY (granted_by) REFERENCES users(id)
            )
        `).run();
    } catch (e) {
        console.error(`[Migration] grade_overrides migration failed:`, e.message);
    }

    // 6.7. Schools Table Migration: Add deleted_at and is_active if missing
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
        
        // SaaS Subscription Migration
        if (!schoolCols.find(c => c.name === 'subscription_end_date')) {
            console.log(`[Migration] Adding subscription_end_date to schools`);
            // Set existing schools to have 1 year of free trial by default from today
            db.prepare(`ALTER TABLE schools ADD COLUMN subscription_end_date DATE DEFAULT NULL`).run();
            db.prepare(`UPDATE schools SET subscription_end_date = date('now', '+1 year') WHERE subscription_end_date IS NULL`).run();
        }
        if (!schoolCols.find(c => c.name === 'subscription_status')) {
            console.log(`[Migration] Adding subscription_status to schools`);
            db.prepare(`ALTER TABLE schools ADD COLUMN subscription_status TEXT DEFAULT 'ACTIVE'`).run();
        }
    } catch (e) {
        console.error(`[Migration] Schools deletion and active columns migration failed:`, e.message);
    }

    // 6.7. Payments Table Migration: Add depositor_name if missing
    try {
        const paymentCols = db.prepare(`PRAGMA table_info(payments)`).all();
        if (!paymentCols.find(c => c.name === 'depositor_name')) {
            console.log(`[Migration] Adding depositor_name to payments`);
            db.prepare(`ALTER TABLE payments ADD COLUMN depositor_name TEXT DEFAULT ''`).run();
        }
    } catch (e) {
        console.error(`[Migration] Payments depositor_name column migration failed:`, e.message);
    }

    // 6.8. Tickets Table Migration: Add receiver_id, request_type, request_data if missing
    try {
        const ticketCols = db.prepare(`PRAGMA table_info(tickets)`).all();
        if (!ticketCols.find(c => c.name === 'receiver_id')) {
            console.log(`[Migration] Adding receiver_id to tickets`);
            db.prepare(`ALTER TABLE tickets ADD COLUMN receiver_id INTEGER`).run();
        }
        if (!ticketCols.find(c => c.name === 'request_type')) {
            console.log(`[Migration] Adding request_type to tickets`);
            db.prepare(`ALTER TABLE tickets ADD COLUMN request_type TEXT`).run();
        }
        if (!ticketCols.find(c => c.name === 'request_data')) {
            console.log(`[Migration] Adding request_data to tickets`);
            db.prepare(`ALTER TABLE tickets ADD COLUMN request_data TEXT`).run();
        }
    } catch (e) {
        console.error(`[Migration] Tickets column migration failed:`, e.message);
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

    // 7.1. Report Templates Table Migration
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS report_templates (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                school_id INTEGER UNIQUE,
                header_image TEXT,
                watermark_image TEXT,
                footer_image TEXT,
                primary_color TEXT DEFAULT '#0f172a',
                secondary_color TEXT DEFAULT '#f59e0b',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (school_id) REFERENCES schools(id)
            );
        `);
        console.log(`[Migration] Report Templates table verified/created`);
    } catch (e) {
        console.error(`[Migration] Report Templates table failed:`, e.message);
    }

    // 7.1.1. footer_image_position column ('footer' | 'stamp')
    try {
        const rtCols = db.prepare(`PRAGMA table_info(report_templates)`).all();
        if (!rtCols.find(c => c.name === 'footer_image_position')) {
            console.log(`[Migration] Adding footer_image_position to report_templates`);
            db.prepare(`ALTER TABLE report_templates ADD COLUMN footer_image_position TEXT DEFAULT 'footer'`).run();
        }
    } catch (e) {
        console.error(`[Migration] report_templates footer_image_position failed:`, e.message);
    }

    // 7.2. Transport Attendance Migration
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS transport_attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id INTEGER,
                route_id INTEGER,
                date DATE NOT NULL,
                direction TEXT NOT NULL,
                status TEXT NOT NULL,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                recorded_by INTEGER,
                FOREIGN KEY (student_id) REFERENCES students(id),
                FOREIGN KEY (route_id) REFERENCES bus_routes(id),
                FOREIGN KEY (recorded_by) REFERENCES users(id)
            );
        `);
        console.log(`[Migration] Transport Attendance table verified/created`);
    } catch (e) {
        console.error(`[Migration] Transport Attendance table failed:`, e.message);
    }

    // 7.3. School Transport config Migration
    try {
        const schoolCols = db.prepare(`PRAGMA table_info(schools)`).all();
        if (!schoolCols.find(c => c.name === 'transport_fee_model')) {
            console.log(`[Migration] Adding transport_fee_model to schools`);
            db.prepare(`ALTER TABLE schools ADD COLUMN transport_fee_model TEXT DEFAULT 'ANNUAL'`).run();
        }
        if (!schoolCols.find(c => c.name === 'transport_fee_amount')) {
            console.log(`[Migration] Adding transport_fee_amount to schools`);
            db.prepare(`ALTER TABLE schools ADD COLUMN transport_fee_amount REAL DEFAULT 0`).run();
        }
    } catch (e) {
        console.error(`[Migration] School transport columns failed:`, e.message);
    }

    // 8. Seed default global subjects if none exist in the database, and link them to school 1
    try {
        const seededSetting = db.prepare("SELECT value FROM settings WHERE key = 'initial_seeding_done'").get();
        const isSeeded = seededSetting ? seededSetting.value === 'true' : false;

        // Check overall counts to avoid re-seeding school 1 if database is already in use
        const schoolCount = db.prepare('SELECT COUNT(*) as count FROM schools').get().count;
        const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;

        if (!isSeeded && schoolCount === 0 && userCount === 0) {
            console.log(`[Migration] Seeding default School 1`);
            db.prepare('INSERT INTO schools (id, name, address) VALUES (1, ?, ?)').run('Complexe Scolaire Bilingue Eco-Manage', 'Yaoundé, Cameroun');

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
            }
            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('initial_seeding_done', 'true')").run();
        } else {
            // Check if existing subjects are linked to School 1, if not link them active
            const schoolCount = db.prepare('SELECT COUNT(*) as count FROM schools WHERE id = 1 AND deleted_at IS NULL').get().count;
            if (schoolCount > 0) {
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
        }
    } catch (e) {
        console.error(`[Migration] Subject seeding/linking failed:`, e.message);
    }

    // 9. New migrations for School Management evolutions
    try {
        // Schools table columns: requires_subject_code, allow_founder_term_edit, term_structure
        const schoolCols = db.prepare(`PRAGMA table_info(schools)`).all();
        if (!schoolCols.find(c => c.name === 'requires_subject_code')) {
            console.log(`[Migration] Adding requires_subject_code to schools`);
            db.prepare(`ALTER TABLE schools ADD COLUMN requires_subject_code INTEGER DEFAULT 1`).run();
        }
        if (!schoolCols.find(c => c.name === 'allow_founder_term_edit')) {
            console.log(`[Migration] Adding allow_founder_term_edit to schools`);
            db.prepare(`ALTER TABLE schools ADD COLUMN allow_founder_term_edit INTEGER DEFAULT 0`).run();
        }
        if (!schoolCols.find(c => c.name === 'term_structure')) {
            console.log(`[Migration] Adding term_structure to schools`);
            db.prepare(`ALTER TABLE schools ADD COLUMN term_structure TEXT DEFAULT '[{"term_id":1,"name":"1ER TRIMESTRE","sequences":[{"id":1,"name":"Séquence 1"},{"id":2,"name":"Séquence 2"}]},{"term_id":2,"name":"2E TRIMESTRE","sequences":[{"id":3,"name":"Séquence 3"},{"id":4,"name":"Séquence 4"}]},{"term_id":3,"name":"3E TRIMESTRE","sequences":[{"id":5,"name":"Séquence 5"},{"id":6,"name":"Séquence 6"}]}]'`).run();
        }

        // Classes table columns: grading_scale_id
        const classCols = db.prepare(`PRAGMA table_info(classes)`).all();
        if (!classCols.find(c => c.name === 'grading_scale_id')) {
            console.log(`[Migration] Adding grading_scale_id to classes`);
            db.prepare(`ALTER TABLE classes ADD COLUMN grading_scale_id INTEGER`).run();
        }

        // Grades table columns: letter_score
        const gradeCols = db.prepare(`PRAGMA table_info(grades)`).all();
        if (!gradeCols.find(c => c.name === 'letter_score')) {
            console.log(`[Migration] Adding letter_score to grades`);
            db.prepare(`ALTER TABLE grades ADD COLUMN letter_score TEXT`).run();
        }

        // Notifications table columns: request_type, request_data, action_status
        const notifCols = db.prepare(`PRAGMA table_info(notifications)`).all();
        if (!notifCols.find(c => c.name === 'request_type')) {
            console.log(`[Migration] Adding request_type to notifications`);
            db.prepare(`ALTER TABLE notifications ADD COLUMN request_type TEXT`).run();
        }
        if (!notifCols.find(c => c.name === 'request_data')) {
            console.log(`[Migration] Adding request_data to notifications`);
            db.prepare(`ALTER TABLE notifications ADD COLUMN request_data TEXT`).run();
        }
        if (!notifCols.find(c => c.name === 'action_status')) {
            console.log(`[Migration] Adding action_status to notifications`);
            db.prepare(`ALTER TABLE notifications ADD COLUMN action_status TEXT DEFAULT 'PENDING'`).run();
        }

        // Create new tables
        db.exec(`
            CREATE TABLE IF NOT EXISTS pending_subjects (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                school_id INTEGER,
                name TEXT NOT NULL,
                domain TEXT NOT NULL,
                level TEXT NOT NULL,
                section TEXT NOT NULL,
                activation_code TEXT NOT NULL,
                status TEXT DEFAULT 'PENDING',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (school_id) REFERENCES schools(id)
            );

            CREATE TABLE IF NOT EXISTS class_teacher_subjects (
                class_id INTEGER,
                subject_id INTEGER,
                teacher_id INTEGER,
                PRIMARY KEY (class_id, subject_id, teacher_id),
                FOREIGN KEY (class_id) REFERENCES classes(id),
                FOREIGN KEY (subject_id) REFERENCES subjects(id),
                FOREIGN KEY (teacher_id) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS grading_scales (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                school_id INTEGER,
                name TEXT NOT NULL,
                is_numerical INTEGER DEFAULT 0,
                min_value REAL,
                max_value REAL,
                FOREIGN KEY (school_id) REFERENCES schools(id)
            );

            CREATE TABLE IF NOT EXISTS grading_scale_options (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                scale_id INTEGER,
                symbol TEXT NOT NULL,
                min_range REAL,
                max_range REAL,
                numeric_equivalent REAL NOT NULL,
                description TEXT,
                FOREIGN KEY (scale_id) REFERENCES grading_scales(id)
            );
        `);
        console.log(`[Migration] New evolution tables verified/created successfully`);
    } catch (e) {
        console.error(`[Migration] New school evolutions migration failed:`, e.message);
    }

    // 10. Add school_id to installments table
    try {
        const instCols = db.prepare(`PRAGMA table_info(installments)`).all();
        if (!instCols.find(c => c.name === 'school_id')) {
            console.log(`[Migration] Adding school_id to installments`);
            db.prepare(`ALTER TABLE installments ADD COLUMN school_id INTEGER DEFAULT 1`).run();
        }
    } catch (e) {
        console.error(`[Migration] Installments school_id failed:`, e.message);
    }

    // 11. Create unique index on (school_id, username) for users
    try {
        const idxDone = db.prepare("SELECT value FROM settings WHERE key = 'migration_unique_username_done'").get();
        if (!idxDone) {
            const dupes = db.prepare(`
                SELECT school_id, username, COUNT(*) as cnt
                FROM users GROUP BY school_id, username HAVING cnt > 1
            `).all();
            if (dupes.length > 0) {
                console.log(`[Migration] Found ${dupes.length} duplicate username(s), appending suffix...`);
                for (const d of dupes) {
                    const rows = db.prepare('SELECT id FROM users WHERE school_id = ? AND username = ? ORDER BY id').all(d.school_id, d.username);
                    for (let i = 1; i < rows.length; i++) {
                        db.prepare('UPDATE users SET username = ? WHERE id = ?').run(`${d.username}_${i}`, rows[i].id);
                    }
                }
            }
            try {
                db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_users_school_username ON users(school_id, username)').run();
                console.log(`[Migration] Created UNIQUE index on users(school_id, username)`);
            } catch (e2) {
                console.error(`[Migration] Unique index creation failed:`, e2.message);
            }
            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('migration_unique_username_done', 'true')").run();
        }
    } catch (e) {
        console.error(`[Migration] Unique username migration failed:`, e.message);
    }

    // Performance indexes
    try {
        db.exec(`
            CREATE INDEX IF NOT EXISTS idx_students_school ON students(school_id);
            CREATE INDEX IF NOT EXISTS idx_students_class ON students(class_id);
            CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
            CREATE INDEX IF NOT EXISTS idx_grades_class ON grades(class_id);
            CREATE INDEX IF NOT EXISTS idx_payments_student ON payments(student_id);
            CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance(student_id);
            CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
            CREATE INDEX IF NOT EXISTS idx_classes_school ON classes(school_id);
            CREATE INDEX IF NOT EXISTS idx_users_school ON users(school_id);
            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_notifications_school ON notifications(school_id);
            CREATE INDEX IF NOT EXISTS idx_expenses_school ON expenses(school_id);
            CREATE INDEX IF NOT EXISTS idx_bus_routes_school ON bus_routes(school_id);
            CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
        `);
        console.log('[Migration] Performance indexes created/verified');
    } catch(e) { console.error('Index creation error:', e.message); }

    // School access code
    try {
        const schoolCols = db.prepare("PRAGMA table_info(schools)").all();
        if (!schoolCols.find(c => c.name === 'access_code')) {
            db.prepare("ALTER TABLE schools ADD COLUMN access_code TEXT").run();
            // Generate codes for existing schools
            const schools = db.prepare("SELECT id, name FROM schools").all();
            for (const s of schools) {
                const code = s.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X') + s.id.toString().padStart(3, '0');
                db.prepare("UPDATE schools SET access_code = ? WHERE id = ?").run(code, s.id);
            }
            console.log('[Migration] School access codes generated');
        }
    } catch(e) { console.error('Access code migration error:', e.message); }

    // School subdomain slug
    try {
        const schoolColsSlug = db.prepare("PRAGMA table_info(schools)").all();
        if (!schoolColsSlug.find(c => c.name === 'slug')) {
            db.prepare("ALTER TABLE schools ADD COLUMN slug TEXT").run();
            const existing = db.prepare("SELECT id, access_code, name FROM schools").all();
            for (const s of existing) {
                const base = (s.access_code || s.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
                db.prepare("UPDATE schools SET slug = ? WHERE id = ?").run(base, s.id);
            }
            console.log('[Migration] slug column added to schools');
        }
    } catch(e) { console.error('slug migration error:', e.message); }

    // Consolidate SECRETARY role into SG (Secretaire General now covers all Secretary permissions)
    try {
        db.prepare("UPDATE users SET role = 'SG' WHERE role = 'SECRETARY'").run();
    } catch(e) { console.error('SECRETARY to SG role migration error:', e.message); }

    // Per-school disabled modules (SuperAdmin can silently grey out modules per school)
    try {
        const schoolCols2 = db.prepare("PRAGMA table_info(schools)").all();
        if (!schoolCols2.find(c => c.name === 'disabled_modules')) {
            db.prepare("ALTER TABLE schools ADD COLUMN disabled_modules TEXT DEFAULT '[]'").run();
            console.log('[Migration] disabled_modules column added to schools');
        }
    } catch(e) { console.error('disabled_modules migration error:', e.message); }

    // Internal staff messaging (1-to-1 messages between staff accounts)
    try {
        db.exec(`
            CREATE TABLE IF NOT EXISTS internal_messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                school_id INTEGER NOT NULL,
                sender_id INTEGER NOT NULL,
                receiver_id INTEGER NOT NULL,
                message TEXT NOT NULL,
                is_read INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (school_id) REFERENCES schools(id),
                FOREIGN KEY (sender_id) REFERENCES users(id),
                FOREIGN KEY (receiver_id) REFERENCES users(id)
            );
            CREATE INDEX IF NOT EXISTS idx_internal_messages_participants ON internal_messages(school_id, sender_id, receiver_id);
        `);
        console.log('[Migration] internal_messages table verified/created');
    } catch(e) { console.error('internal_messages migration error:', e.message); }

    // Per-user module permissions (NULL = no restriction, inherit role defaults)
    try {
        const userCols = db.prepare("PRAGMA table_info(users)").all();
        if (!userCols.find(c => c.name === 'allowed_modules')) {
            db.prepare("ALTER TABLE users ADD COLUMN allowed_modules TEXT DEFAULT NULL").run();
            console.log('[Migration] allowed_modules column added to users');
        }
    } catch(e) { console.error('allowed_modules migration error:', e.message); }

    // Noutcha Bilingual School — official bulletin subjects seed
    // Inserted once based on the real bulletin photos. Idempotent (check by name+level+section).
    try {
        const noutchaSeeded = db.prepare("SELECT value FROM settings WHERE key = 'noutcha_subjects_v1_seeded'").get();
        if (!noutchaSeeded) {
            console.log('[Migration] Seeding Noutcha official bulletin subjects...');

            const officialSubjects = [
                // ──────────────────────────────────────────────────────────────────
                // MATERNELLE · FRANCOPHONE
                // ──────────────────────────────────────────────────────────────────
                { name: 'Expression orale',                          domain: 'Langue et Communication',                    level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Chants et récits',                          domain: 'Langue et Communication',                    level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Expression gestuelle',                      domain: 'Langue et Communication',                    level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Lecture/écriture',                          domain: 'Langue et Communication',                    level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Graphisme',                                 domain: 'Langue et Communication',                    level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Langue nationale',                          domain: 'Langue et Communication',                    level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Éducation sensorielle et perceptive',       domain: 'Éveil scientifique et technologique',        level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Initiation aux mathématiques',              domain: 'Éveil scientifique et technologique',        level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'TIC',                                       domain: 'Éveil scientifique et technologique',        level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Sciences et technologie',                   domain: 'Éveil scientifique et technologique',        level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Vie courante',                              domain: 'Vie courante',                               level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Création artistique',                       domain: 'Création artistique et activités manuelles', level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Activités manuelles',                       domain: 'Création artistique et activités manuelles', level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Activités de la motricité',                 domain: 'Motricité',                                  level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Conduite',                                  domain: 'Savoir être',                                level: 'MATERNELLE', section: 'FRANCOPHONE' },
                { name: 'Propreté',                                  domain: 'Savoir être',                                level: 'MATERNELLE', section: 'FRANCOPHONE' },

                // ──────────────────────────────────────────────────────────────────
                // MATERNELLE · ANGLOPHONE
                // ──────────────────────────────────────────────────────────────────
                { name: 'Oral expression',                           domain: 'Literacy and Communication',                  level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Poetry and Rhyme',                         domain: 'Literacy and Communication',                  level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Sign language and gesture',                domain: 'Literacy and Communication',                  level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Reading',                                  domain: 'Literacy and Communication',                  level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Initiation to written language',           domain: 'Literacy and Communication',                  level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Pre-letter formation',                     domain: 'Literacy and Communication',                  level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'National language and culture',            domain: 'Literacy and Communication',                  level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Initiation to mathematics',                domain: 'Science and Technological Skill Development', level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Sensory and Perceptive Education',         domain: 'Science and Technological Skill Development', level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Sciences and Technology',                  domain: 'Science and Technological Skill Development', level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'I.C.T.',                                   domain: 'Science and Technological Skill Development', level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Practical Life Activities',                domain: 'Practical Life Skills',                       level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Drawing, colouring',                       domain: 'Arts and Craft',                              level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Painting',                                 domain: 'Arts and Craft',                              level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Hand work/manual activities',             domain: 'Arts and Craft',                              level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Physical education and sport',            domain: 'Motor Skills',                                level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Conduct',                                  domain: 'Attitudes',                                   level: 'MATERNELLE', section: 'ANGLOPHONE' },
                { name: 'Appearance',                               domain: 'Attitudes',                                   level: 'MATERNELLE', section: 'ANGLOPHONE' },

                // ──────────────────────────────────────────────────────────────────
                // PRIMAIRE · FRANCOPHONE
                // ──────────────────────────────────────────────────────────────────
                { name: 'Communiquer en Français',                              domain: 'Langues et Communication',  level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Communiquer en Anglais',                               domain: 'Langues et Communication',  level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Pratiquer une langue nationale',                       domain: 'Langues et Communication',  level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Communiquer en mathématiques',                         domain: 'Sciences et Technologie',   level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Utiliser les notions de base en sciences et technologies', domain: 'Sciences et Technologie', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Utiliser les concepts de base et outils TIC',          domain: 'Sciences et Technologie',   level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Pratiquer les valeurs citoyennes',                     domain: 'Développement Personnel',   level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Pratiquer les valeurs sociales',                       domain: 'Développement Personnel',   level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: "L'autonomie, l'esprit d'initiative et d'entrepreneuriat", domain: 'Développement Personnel', level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Pratiquer les activités physiques et sportives',       domain: 'Développement Physique',    level: 'PRIMAIRE', section: 'FRANCOPHONE' },
                { name: 'Pratiquer les activités artistiques',                  domain: 'Culture et Arts',           level: 'PRIMAIRE', section: 'FRANCOPHONE' },

                // ──────────────────────────────────────────────────────────────────
                // PRIMAIRE · ANGLOPHONE
                // ──────────────────────────────────────────────────────────────────
                { name: 'Communicate in English language',                domain: 'Languages and Communication', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'Communicate in French language',                 domain: 'Languages and Communication', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'Communicate in at least one national language',  domain: 'Languages and Communication', level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'Use basic notion in Mathematics',                domain: 'Sciences and Technology',     level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'Use basic notion in Science and Technology',     domain: 'Sciences and Technology',     level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'I.C.T.',                                         domain: 'Sciences and Technology',     level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'Practice social values',                         domain: 'Personal Development',        level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'Vocational studies',                             domain: 'Personal Development',        level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'Practice physical and sport activities',         domain: 'Physical Development',        level: 'PRIMAIRE', section: 'ANGLOPHONE' },
                { name: 'Practice artistic education',                    domain: 'Culture and Arts',            level: 'PRIMAIRE', section: 'ANGLOPHONE' },
            ];

            const checkSubj = db.prepare('SELECT id FROM subjects WHERE name = ? AND level = ? AND section = ?');
            const insertSubj = db.prepare('INSERT INTO subjects (name, domain, level, section) VALUES (?, ?, ?, ?)');
            const insertSchoolSubj = db.prepare('INSERT OR IGNORE INTO school_subjects (school_id, subject_id, is_active) VALUES (?, ?, 1)');
            const allSchools = db.prepare("SELECT id FROM schools WHERE deleted_at IS NULL AND is_active = 1").all();

            const seedTx = db.transaction(() => {
                for (const s of officialSubjects) {
                    let existing = checkSubj.get(s.name, s.level, s.section);
                    if (!existing) {
                        const res = insertSubj.run(s.name, s.domain, s.level, s.section);
                        const newId = res.lastInsertRowid;
                        for (const school of allSchools) {
                            insertSchoolSubj.run(school.id, newId);
                        }
                    } else {
                        // Subject exists — make sure it's linked to all schools
                        for (const school of allSchools) {
                            insertSchoolSubj.run(school.id, existing.id);
                        }
                    }
                }
            });
            seedTx();

            db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('noutcha_subjects_v1_seeded', 'true')").run();
            console.log(`[Migration] Noutcha bulletin subjects seeded (${officialSubjects.length} subjects)`);
        }
    } catch(e) { console.error('[Migration] Noutcha subjects seeding failed:', e.message); }

    // Migration: absence_justifications table
    try {
        const ajCols = db.prepare("PRAGMA table_info(absence_justifications)").all();
        if (ajCols.length === 0) {
            db.prepare(`
                CREATE TABLE IF NOT EXISTS absence_justifications (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    attendance_id INTEGER NOT NULL,
                    student_id INTEGER NOT NULL,
                    school_id INTEGER NOT NULL,
                    parent_user_id INTEGER NOT NULL,
                    teacher_user_id INTEGER,
                    parent_message TEXT NOT NULL,
                    attachment_base64 TEXT,
                    status TEXT DEFAULT 'PENDING',
                    teacher_response TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    reviewed_at DATETIME,
                    FOREIGN KEY (attendance_id) REFERENCES attendance(id),
                    FOREIGN KEY (student_id) REFERENCES students(id),
                    FOREIGN KEY (school_id) REFERENCES schools(id)
                )
            `).run();
            console.log('[Migration] absence_justifications table created');
        }
    } catch(e) { console.error('[Migration] absence_justifications:', e.message); }

    // Migration: week_start_date in schedules (weekly programme feature)
    try {
        const schedCols = db.prepare("PRAGMA table_info(schedules)").all();
        if (!schedCols.find(c => c.name === 'week_start_date')) {
            db.prepare("ALTER TABLE schedules ADD COLUMN week_start_date DATE").run();
            console.log('[Migration] week_start_date added to schedules');
        }
    } catch(e) { console.error('[Migration] week_start_date:', e.message); }

    // Migration: archive_snapshot in school_year_archives (full year capture)
    try {
        const archCols = db.prepare("PRAGMA table_info(school_year_archives)").all();
        if (!archCols.find(c => c.name === 'archive_snapshot')) {
            db.prepare("ALTER TABLE school_year_archives ADD COLUMN archive_snapshot TEXT").run();
            console.log('[Migration] archive_snapshot added to school_year_archives');
        }
    } catch(e) { console.error('[Migration] archive_snapshot:', e.message); }

    // Migration: seed default installments (1ÈRE/2ÈME/3ÈME TRANCHE) for school 1 if none exist
    try {
        const globalInstCount = db.prepare("SELECT COUNT(*) as cnt FROM installments WHERE school_id = 1 OR school_id IS NULL").get().cnt;
        if (globalInstCount === 0) {
            const stmtInst = db.prepare('INSERT INTO installments (name, display_order, school_id) VALUES (?, ?, 1)');
            db.transaction(() => {
                stmtInst.run('1ÈRE TRANCHE', 1);
                stmtInst.run('2ÈME TRANCHE', 2);
                stmtInst.run('3ÈME TRANCHE', 3);
            })();
            console.log('[Migration] Seeded 3 default installments for school 1');
        }
    } catch(e) { console.error('[Migration] Default installments seeding failed:', e.message); }

    console.log('Database initialized and migrated at:', dbPath);
}

module.exports = {
    db,
    initDb,
    dbPath
};
