-- Database Schema for Eco-Manage

-- Schools (Multi-school support)
CREATE TABLE IF NOT EXISTS schools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    address TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    logo TEXT,
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
    assigned_classes TEXT, -- JSON string of class IDs for teachers
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Sections: FRANCOPHONE, ANGLOPHONE
-- Levels: MATERNELLE, PRIMAIRE
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    name TEXT NOT NULL, -- e.g., SIL, CP, Class 1
    section TEXT NOT NULL, -- 'FRANCOPHONE' or 'ANGLOPHONE'
    level TEXT NOT NULL, -- 'MATERNELLE' or 'PRIMAIRE'
    main_teacher_id INTEGER,
    assistant_teacher_id INTEGER,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (main_teacher_id) REFERENCES users(id),
    FOREIGN KEY (assistant_teacher_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    level TEXT NOT NULL,
    section TEXT NOT NULL DEFAULT 'FRANCOPHONE',
    coefficient INTEGER DEFAULT 1,
    max_score REAL DEFAULT 20.0,
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    matricule TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    birth_place TEXT,
    gender TEXT,
    parent_contact TEXT,
    emergency_contact TEXT,
    medical_info TEXT,
    photo TEXT,
    address TEXT,
    neighborhood TEXT,
    class_id INTEGER,
    section TEXT NOT NULL,
    bus_route_id INTEGER,
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
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

CREATE TABLE IF NOT EXISTS class_installment_fees (
    class_id INTEGER,
    installment_id INTEGER,
    amount REAL NOT NULL,
    PRIMARY KEY (class_id, installment_id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (installment_id) REFERENCES installments(id)
);

-- Attendance (hours for pedagogy, status for daily)
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    date DATE NOT NULL,
    status TEXT NOT NULL, -- 'PRESENT', 'ABSENT', 'LATE'
    recorded_by INTEGER,
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

CREATE TABLE IF NOT EXISTS transport_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER,
    event_type TEXT, -- 'DEPARTURE', 'ARRIVAL', 'GPS_UPDATE'
    latitude REAL,
    longitude REAL,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (route_id) REFERENCES bus_routes(id)
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

-- System Settings
CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- Ticketing
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_role TEXT,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id)
);
