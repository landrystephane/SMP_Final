-- Database Schema for Eco-Manage

-- Roles: FOUNDER, DIRECTOR, SECRETARY, BURSAR, TEACHER
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Sections: FRANCOPHONE, ANGLOPHONE
-- Levels: MATERNELLE, PRIMAIRE
CREATE TABLE IF NOT EXISTS classes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL, -- e.g., SIL, CP, Class 1
    section TEXT NOT NULL, -- 'FRANCOPHONE' or 'ANGLOPHONE'
    level TEXT NOT NULL, -- 'MATERNELLE' or 'PRIMAIRE'
    main_teacher_id INTEGER, -- Enseignant titulaire
    assistant_teacher_id INTEGER, -- Second enseignant (ex: pour la maternelle bilingue)
    FOREIGN KEY (main_teacher_id) REFERENCES users(id),
    FOREIGN KEY (assistant_teacher_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    domain TEXT NOT NULL, -- e.g., Langue Française, Mathématiques
    level TEXT NOT NULL, -- MATERNELLE, PRIMAIRE
    coefficient INTEGER DEFAULT 1
);

CREATE TABLE IF NOT EXISTS class_subjects (
    class_id INTEGER,
    subject_id INTEGER,
    PRIMARY KEY (class_id, subject_id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id)
);

CREATE TABLE IF NOT EXISTS students (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    matricule TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    birth_place TEXT,
    gender TEXT,
    parent_contact TEXT,
    address TEXT,
    class_id INTEGER,
    section TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (class_id) REFERENCES classes(id)
);

-- Grade locking mechanism: locked = 1 means only DIRECTOR can modify
CREATE TABLE IF NOT EXISTS grades (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    subject_id INTEGER,
    class_id INTEGER,
    month TEXT NOT NULL, -- e.g., 'Octobre'
    term INTEGER NOT NULL, -- 1, 2, or 3
    score REAL,
    max_score REAL DEFAULT 20.0,
    locked INTEGER DEFAULT 0,
    teacher_id INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    amount REAL NOT NULL,
    payment_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    payment_type TEXT NOT NULL, -- e.g., 'Scolarité', 'Frais d'inscription'
    received_by INTEGER,
    receipt_number TEXT UNIQUE NOT NULL,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (received_by) REFERENCES users(id)
);

-- Evaluation Periods (controlled by Director)
CREATE TABLE IF NOT EXISTS evaluation_periods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    term INTEGER NOT NULL, -- 1, 2, 3
    name TEXT NOT NULL, -- e.g., 'Trimestre 1'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    is_active INTEGER DEFAULT 1,
    can_teachers_edit INTEGER DEFAULT 0
);

-- Attendance
CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id INTEGER,
    date DATE NOT NULL,
    status TEXT NOT NULL, -- 'PRESENT', 'ABSENT', 'LATE'
    justification TEXT,
    recorded_by INTEGER,
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (recorded_by) REFERENCES users(id)
);

-- Validation Workflow Tracking
CREATE TABLE IF NOT EXISTS validation_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    class_id INTEGER,
    term INTEGER,
    status TEXT NOT NULL, -- 'PENDING', 'VALIDATED_BY_DIRECTOR', 'READY_FOR_PRINT'
    validated_by INTEGER,
    validated_at DATETIME,
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (validated_by) REFERENCES users(id)
);

-- Ticketing System (for internal requests like unlocking grades)
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_role TEXT, -- e.g., 'DIRECTOR'
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'OPEN', -- 'OPEN', 'CLOSED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id)
);

-- Messaging System (Internal and future Parent communication)
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER,
    receiver_id INTEGER,
    content TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
);

-- Transport / Bus Tracking (Placeholder for geoloc)
CREATE TABLE IF NOT EXISTS transport_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    driver_id INTEGER,
    bus_number TEXT,
    last_latitude REAL,
    last_longitude REAL,
    last_update DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (driver_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
);
