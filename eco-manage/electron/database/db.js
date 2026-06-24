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
        // Harmonize class code CP1 to CP
        db.prepare("UPDATE classes SET code = 'CP' WHERE code = 'CP1'").run();
        console.log(`[Migration] Harmonized class code CP1 to CP`);

        // Ensure all class codes end with the current year (e.g. 26) as requested
        const currentYear = new Date().getFullYear().toString().slice(-2);
        const classes = db.prepare('SELECT id, code FROM classes').all();
        db.transaction(() => {
            for (const c of classes) {
                if (!c.code.endsWith(currentYear)) {
                    // Remove any trailing numbers (like old years) before appending
                    const baseCode = c.code.replace(/\d+$/, '');
                    db.prepare('UPDATE classes SET code = ? WHERE id = ?').run(baseCode + currentYear, c.id);
                }
            }
        })();
        console.log(`[Migration] Appended year ${currentYear} to class codes`);
    } catch (e) {
        console.error(`[Migration] Classes table migration failed:`, e.message);
    }

    // 3.5.5 Fix student matricules with duplicated years (e.g. 26SIL260001 -> 26SIL0001)
    try {
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
        console.log(`[Migration] Fixed duplicated years in student matricules`);
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

    console.log('Database initialized and migrated at:', dbPath);
}

module.exports = {
    db,
    initDb,
    dbPath
};
