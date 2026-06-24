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
    evaluation_periods TEXT DEFAULT '[{"id":1,"name":"1ER TRIMESTRE"},{"id":2,"name":"2E TRIMESTRE"},{"id":3,"name":"3E TRIMESTRE"}]',
    honor_roll_threshold REAL DEFAULT 15.0,
    transport_fee_model TEXT DEFAULT 'ANNUAL',
    transport_fee_amount REAL DEFAULT 0,
    subscription_end_date DATE,
    subscription_status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'EXPIRED', 'SUSPENDED'
    deleted_at TEXT DEFAULT NULL,
    is_active INTEGER DEFAULT 1,
    requires_subject_code INTEGER DEFAULT 1,
    allow_founder_term_edit INTEGER DEFAULT 0,
    term_structure TEXT DEFAULT '[{"term_id":1,"name":"1ER TRIMESTRE","sequences":[{"id":1,"name":"Séquence 1"},{"id":2,"name":"Séquence 2"}]},{"term_id":2,"name":"2E TRIMESTRE","sequences":[{"id":3,"name":"Séquence 3"},{"id":4,"name":"Séquence 4"}]},{"term_id":3,"name":"3E TRIMESTRE","sequences":[{"id":5,"name":"Séquence 5"},{"id":6,"name":"Séquence 6"}]}]',
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
    grading_scale_id INTEGER,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (main_teacher_id) REFERENCES users(id),
    FOREIGN KEY (assistant_teacher_id) REFERENCES users(id),
    FOREIGN KEY (grading_scale_id) REFERENCES grading_scales(id)
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
    status TEXT DEFAULT 'ACTIVE', -- 'ACTIVE', 'BLOCKED'
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
    letter_score TEXT,
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
    depositor_name TEXT DEFAULT '',
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
    schedule_id INTEGER DEFAULT 0,
    school_id INTEGER DEFAULT 1,
    notes TEXT,
    UNIQUE(student_id, date, schedule_id),
    FOREIGN KEY (student_id) REFERENCES students(id),
    FOREIGN KEY (recorded_by) REFERENCES users(id),
    FOREIGN KEY (schedule_id) REFERENCES schedules(id)
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

-- Evaluation Schedules (Pedagogical Advisor)
CREATE TABLE IF NOT EXISTS evaluation_schedules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    class_id INTEGER,
    subject_id INTEGER,
    teacher_id INTEGER,
    evaluation_period_id INTEGER, -- e.g. from evaluation_periods JSON in schools
    date DATE NOT NULL,
    start_time TEXT, -- HH:MM
    end_time TEXT,
    status TEXT DEFAULT 'PENDING_TEACHER', -- PENDING_TEACHER, APPROVED, PENDING_ADMIN, REJECTED, FORCED_APPROVED
    rejection_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
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
    request_type TEXT, -- e.g., 'GRADE_REACTIVATION', 'ABSENCE_JUSTIFICATION'
    request_data TEXT, -- JSON string containing parameters for resolving the request
    action_status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED', 'REJECTED'
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
    request_type TEXT,
    request_data TEXT,
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

-- SaaS Subscriptions (Payments from schools to the platform owner)
CREATE TABLE IF NOT EXISTS saas_subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT NOT NULL, -- 'CASH', 'ORANGE_MONEY', 'MTN_MOMO', 'CARD'
    transaction_id TEXT, -- For mobile money / card reference
    months_granted INTEGER NOT NULL, -- How many months did they pay for
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'VALIDATED', 'REJECTED'
    validated_by INTEGER, -- The SuperAdmin who validated the cash payment
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id),
    FOREIGN KEY (validated_by) REFERENCES users(id)
);

-- Subject creation activation requests
CREATE TABLE IF NOT EXISTS pending_subjects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    name TEXT NOT NULL,
    domain TEXT NOT NULL,
    level TEXT NOT NULL,
    section TEXT NOT NULL,
    activation_code TEXT NOT NULL,
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'APPROVED'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Precise Teacher Class Subject assignments
CREATE TABLE IF NOT EXISTS class_teacher_subjects (
    class_id INTEGER,
    subject_id INTEGER,
    teacher_id INTEGER,
    PRIMARY KEY (class_id, subject_id, teacher_id),
    FOREIGN KEY (class_id) REFERENCES classes(id),
    FOREIGN KEY (subject_id) REFERENCES subjects(id),
    FOREIGN KEY (teacher_id) REFERENCES users(id)
);

-- Custom Grading Scales per school
CREATE TABLE IF NOT EXISTS grading_scales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    school_id INTEGER,
    name TEXT NOT NULL,
    is_numerical INTEGER DEFAULT 0, -- 1 = numerical input with auto ranges, 0 = literal direct selection
    min_value REAL,
    max_value REAL,
    FOREIGN KEY (school_id) REFERENCES schools(id)
);

-- Grading options and range mappings
CREATE TABLE IF NOT EXISTS grading_scale_options (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scale_id INTEGER,
    symbol TEXT NOT NULL, -- e.g., 'NAD', 'ECA', 'NA'
    min_range REAL, -- e.g., 18.0 - NULL for is_numerical = 0
    max_range REAL, -- e.g., 20.0 - NULL for is_numerical = 0
    numeric_equivalent REAL NOT NULL, -- weight for computations (e.g., 20.0)
    description TEXT,
    FOREIGN KEY (scale_id) REFERENCES grading_scales(id)
);
