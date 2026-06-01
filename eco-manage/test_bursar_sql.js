const Database = require('better-sqlite3');
const db = new Database(process.env.APPDATA + '\\eco-manage\\school.db');
const schoolId = 1;

try {
  const students = db.prepare(`
    SELECT s.id, s.class_id, s.scholarship_reduction, c.name as class_name, c.level as class_level
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.school_id = ?
  `).all(schoolId);
  console.log("students count:", students.length);

  const tuitionFees = db.prepare(`
    SELECT t.* 
    FROM tuition_fees t
    JOIN classes c ON t.class_id = c.id
    WHERE c.school_id = ?
  `).all(schoolId);
  console.log("tuition fees count:", tuitionFees.length);

  const payments = db.prepare(`
    SELECT p.student_id, SUM(p.amount) as total_paid 
    FROM payments p
    JOIN students s ON p.student_id = s.id
    WHERE p.payment_type = 'Scolarité' AND s.school_id = ?
    GROUP BY p.student_id
  `).all(schoolId);
  console.log("payments count:", payments.length);

} catch (e) {
  console.error("SQL ERROR:", e);
}
