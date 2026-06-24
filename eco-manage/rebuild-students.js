const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  const remoteCmd = `cd /var/www/saas && node -e "
const db = require('better-sqlite3')('/var/opt/eco-hub-data/school.db'); 
db.transaction(() => {
  // 1. Rename old table
  db.prepare('ALTER TABLE students RENAME TO students_old').run();
  
  // 2. Create new table without UNIQUE on matricule
  db.prepare(\\\`
    CREATE TABLE students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      matricule TEXT NOT NULL,
      registration_year INTEGER NOT NULL,
      order_number INTEGER NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      birth_date TEXT NOT NULL,
      birth_place TEXT,
      gender TEXT NOT NULL,
      parent_name TEXT,
      parent_contact TEXT,
      emergency_contact TEXT,
      medical_info TEXT,
      address TEXT,
      neighborhood TEXT,
      section TEXT NOT NULL,
      class_id INTEGER NOT NULL,
      school_id INTEGER NOT NULL,
      scholarship_reduction REAL DEFAULT 0,
      has_moratoire INTEGER DEFAULT 0,
      bus_route_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE,
      FOREIGN KEY (school_id) REFERENCES schools(id) ON DELETE CASCADE,
      FOREIGN KEY (bus_route_id) REFERENCES bus_routes(id) ON DELETE SET NULL,
      UNIQUE(school_id, matricule)
    )
  \\\`).run();

  // 3. Copy data
  db.prepare(\\\`
    INSERT INTO students (
      id, matricule, registration_year, order_number, first_name, last_name, 
      birth_date, birth_place, gender, parent_name, parent_contact, emergency_contact, 
      medical_info, address, neighborhood, section, class_id, school_id, 
      scholarship_reduction, has_moratoire, bus_route_id, created_at
    )
    SELECT 
      id, matricule, registration_year, order_number, first_name, last_name, 
      birth_date, birth_place, gender, parent_name, parent_contact, emergency_contact, 
      medical_info, address, neighborhood, section, class_id, school_id, 
      scholarship_reduction, has_moratoire, bus_route_id, created_at
    FROM students_old
  \\\`).run();

  // 4. Drop old table
  db.prepare('DROP TABLE students_old').run();
  console.log('Students table recreated successfully.');
})();
"`;
  conn.exec(remoteCmd, (err, stream) => { 
    if (err) throw err; 
    stream.on('data', d => console.log('STDOUT:', d.toString())); 
    stream.stderr.on('data', d => console.error('ERR:', d.toString())); 
    stream.on('close', () => conn.end()); 
  }); 
}).connect({
  host: '2.24.15.119', 
  port: 22, 
  username: 'root', 
  password: process.env.VPS_PASSWORD
});
