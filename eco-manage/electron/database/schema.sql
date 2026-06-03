-- Database Schema for Eco-Manage

-- Schools (Multi-school support)
CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    motto TEXT,
    address TEXT,
    bp TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    logo TEXT,
    primary_color TEXT DEFAULT '#1e293b',
    secondary_color TEXT DEFAULT '#f59e0b',
    receipt_sig_title TEXT DEFAULT 'Signature de l''Économe',
    bulletin_sig_left TEXT DEFAULT 'L''ENSEIGNANT (TEACHER)',
    bulletin_sig_middle TEXT DEFAULT 'PARENT / GUARDIAN',
    bulletin_sig_right TEXT DEFAULT 'LE DIRECTEUR (HEADMASTER)',
    header_french TEXT DEFAULT 'MINISTÈRE DE L''ÉDUCATION DE BASE',
    header_english TEXT DEFAULT 'MINISTRY OF BASIC EDUCATION',
    bulletin_pdf_use_custom INTEGER DEFAULT 0,
    bulletin_pdf_template TEXT DEFAULT '',
    bulletin_pdf_mapping TEXT DEFAULT '{}',
    timetable_slots TEXT DEFAULT '[{"label":"08:00 - 10:00","start":"08:00","end":"10:00","isBreak":false},{"label":"10:00 - 12:00","start":"10:00","end":"12:00","isBreak":false},{"label":"12:00 - 13:00","start":"12:00","end":"13:00","isBreak":true},{"label":"13:00 - 15:00","start":"13:00","end":"15:00","isBreak":false},{"label":"15:00 - 17:00","start":"15:00","end":"17:00","isBreak":false}]',
    honor_roll_threshold REAL DEFAULT 15.0,
    transport_fee_model TEXT DEFAULT 'ANNUAL',
    transport_fee_amount REAL DEFAULT 0,
    deleted_at TEXT DEFAULT NULL,
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Roles: FOUNDER, DIRECTOR, SECRETARY, BURSAR, TEACHER, ADVISOR, DRIVER, SUPERADMIN
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    phone TEXT,
    assigned_classes TEXT, -- JSON string of class IDs for teachers
    is_active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Sections: FRANCOPHONE, ANGLOPHONE
-- Levels: MATERNELLE, PRIMAIRE
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    name TEXT NOT NULL, -- e.g., SIL, CP, Class 1
    code TEXT NOT NULL, -- e.g., SIL, CP1, CM2 (used for matricule)
    section TEXT NOT NULL, -- 'FRANCOPHONE' or 'ANGLOPHONE'
    level TEXT NOT NULL, -- 'MATERNELLE' or 'PRIMAIRE'
    main_teacher_id INTEGER,
    assistant_teacher_id INTEGER,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (main_teacher_id) REFERENCES users(id),
    FOREIGN KEY (assistant_teacher_id) REFERENCES users(id)
);

-- Global subjects registry
CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    level TEXT NOT NULL,
    section TEXT NOT NULL DEFAULT 'FRANCOPHONE'
);

-- Which subjects are used by which school
CREATE TABLE IF NOT EXISTS school_subjects (
    school_id INTEGER,
    subject_id INTEGER,
    is_active INTEGER DEFAULT 1,
    PRIMARY KEY (school_id, subject_id),
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- Class-specific subject configuration (coefficients, optional status)
CREATE TABLE IF NOT EXISTS class_subjects (
    class_id INTEGER,
    subject_id INTEGER,
    coefficient INTEGER DEFAULT 1,
    is_optional INTEGER DEFAULT 0,
    PRIMARY KEY (class_id, subject_id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    matricule TEXT UNIQUE NOT NULL,
    registration_year INTEGER NOT NULL,
    order_number INTEGER NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    birth_place TEXT,
    gender TEXT,
    parent_name TEXT,
    parent_contact TEXT,
    emergency_contact TEXT,
    medical_info TEXT,
    photo TEXT,
    address TEXT,
    neighborhood TEXT,
    class_id INTEGER,
    section TEXT NOT NULL,
    bus_route_id INTEGER,
    scholarship_reduction REAL DEFAULT 0, -- Scholarship amount or percentage
    has_moratoire INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (bus_route_id) REFERENCES bus_routes(id)
);

CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    subject_id INTEGER,
    class_id INTEGER,
    month TEXT NOT NULL,
    term INTEGER NOT NULL,
    score REAL,
    max_score REAL DEFAULT 20.0,
    locked INTEGER DEFAULT 0,
    teacher_id INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(student_id, subject_id, class_id, term, month),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS installments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, -- 1ERE TRANCHE, 2E TRANCHE, 3E TRANCHE
    display_order INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS school_installment_deadlines (
    school_id INTEGER,
    installment_id INTEGER,
    deadline_date DATE,
    PRIMARY KEY (school_id, installment_id),
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (installment_id) REFERENCES installments(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    amount REAL NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    payment_type TEXT NOT NULL, -- 'Inscription', 'Scolarité', 'Transport', 'Examen'
    installment_id INTEGER, -- Specified which installment is being paid
    received_by INTEGER,
    receipt_number TEXT UNIQUE NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (received_by) REFERENCES users(id),
    FOREIGN KEY (installment_id) REFERENCES installments(id)
);

CREATE TABLE IF NOT EXISTS tuition_fees (
    class_id INTEGER PRIMARY KEY,
    total_fee REAL NOT NULL,
    registration_fee REAL DEFAULT 0,
    transport_fee REAL DEFAULT 0,
    exam_fee REAL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(class_id) REFERENCES classes(id)
);

CREATE TABLE IF NOT EXISTS class_installment_fees (
    class_id INTEGER,
    installment_id INTEGER,
    amount REAL NOT NULL,
    PRIMARY KEY (class_id, installment_id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (installment_id) REFERENCES installments(id)
);

-- Attendance tracking (Daily roll call)
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    date DATE NOT NULL,
    status TEXT NOT NULL, -- 'PRESENT', 'ABSENT', 'LATE'
    hours_absent INTEGER DEFAULT 0,
    recorded_by INTEGER,
    notes TEXT,
    UNIQUE(student_id, date),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Schedules (Pedagogical Advisor)
CREATE TABLE IF NOT EXISTS schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    class_id INTEGER,
    teacher_id INTEGER,
    subject_id INTEGER,
    day_of_week INTEGER, -- 1-5
    start_time TEXT, -- HH:MM
    end_time TEXT,
    type TEXT DEFAULT 'COURSE', -- 'COURSE', 'EVALUATION', 'HOLIDAY'
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

-- Transport
CREATE TABLE IF NOT EXISTS bus_routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    name TEXT NOT NULL, -- e.g., 'Route Nord - Quartier X'
    driver_id INTEGER,
    bus_number TEXT,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (driver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS transport_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER,
    name TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    estimated_time_from_start INTEGER, -- minutes
    FOREIGN KEY (route_id) REFERENCES bus_routes(id)
);

CREATE TABLE IF NOT EXISTS transport_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER,
    event_type TEXT, -- 'DEPARTURE', 'ARRIVAL', 'GPS_UPDATE'
    latitude REAL,
    longitude REAL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES bus_routes(id)
);

CREATE TABLE IF NOT EXISTS transport_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    route_id INTEGER,
    date DATE NOT NULL,
    direction TEXT NOT NULL, -- 'MORNING_PICKUP', 'EVENING_DROPOFF'
    status TEXT NOT NULL, -- 'PRESENT', 'ABSENT'
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    recorded_by INTEGER,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (route_id) REFERENCES bus_routes(id),
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Mobile Access Keys
CREATE TABLE IF NOT EXISTS mobile_access_keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    access_key TEXT UNIQUE NOT NULL,
    assigned_to_user_id INTEGER,
    assigned_to_name TEXT,
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'REVOKED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (assigned_to_user_id) REFERENCES users(id)
);

-- Grade overrides (Derogations for deadline)
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
);

-- System Settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Expenses (Décaissements)
CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER DEFAULT 1,
    amount REAL NOT NULL,
    reason TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'VALIDATED', 'REJECTED'
    requested_by INTEGER,
    validated_by INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (requested_by) REFERENCES users(id),
    FOREIGN KEY (validated_by) REFERENCES users(id)
);

-- System Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER DEFAULT 1,
    user_id INTEGER,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    type TEXT DEFAULT 'INFO', -- 'INFO', 'WARNING', 'ACTION_REQUIRED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Ticketing
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    sender_id INTEGER,
    receiver_role TEXT,
    receiver_id INTEGER,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- Announcements / Communiqués
CREATE TABLE IF NOT EXISTS announcements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    sender_id INTEGER,
    target TEXT NOT NULL, -- 'STAFF', 'PARENTS', 'ALL'
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Report Templates
CREATE TABLE IF NOT EXISTS report_templates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER UNIQUE,
    primary_color TEXT,
    secondary_color TEXT,
    header_image TEXT,
    footer_image TEXT,
    watermark_image TEXT,
    FOREIGN KEY (school_id) REFERENCES schools(id)
);
