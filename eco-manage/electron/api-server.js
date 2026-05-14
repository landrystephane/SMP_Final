const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { db } = require('./database/db');

function startApiServer() {
  const app = express();
  const port = 3001;

  app.use(cors());
  app.use(bodyParser.json());

  // Security Middleware: Validate Activation Keys
  const validateMobileKey = (req, res, next) => {
    const key = req.headers['x-activation-key'];
    if (!key) return res.status(401).send('Missing activation key');

    const keyExists = db.prepare('SELECT * FROM mobile_access_keys WHERE access_key = ? AND status != "REVOKED"').get(key);
    if (!keyExists) return res.status(403).send('Invalid or revoked key');
    next();
  };

  // Mobile endpoints
  app.get('/api/students', validateMobileKey, (req, res) => {
    const students = db.prepare('SELECT * FROM students').all();
    res.json(students);
  });

  app.post('/api/sync/bulk', validateMobileKey, (req, res) => {
    const { grades = [], attendance = [] } = req.body;

    const checkGradeLock = db.prepare('SELECT locked FROM grades WHERE student_id = ? AND subject_id = ? AND term = ? AND month = ?');
    const upsertGrade = db.prepare(`
      INSERT INTO grades (student_id, subject_id, class_id, term, month, score, teacher_id, locked)
      VALUES (@student_id, @subject_id, @class_id, @term, @month, @score, @teacher_id, 1)
      ON CONFLICT(student_id, subject_id, class_id, term, month) DO UPDATE SET
      score = excluded.score,
      locked = 1,
      updated_at = CURRENT_TIMESTAMP
      WHERE locked = 0
    `);

    const upsertAttendance = db.prepare(`
      INSERT INTO attendance (student_id, date, status, hours_absent, recorded_by)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(student_id, date) DO UPDATE SET
          status = excluded.status,
          hours_absent = excluded.hours_absent,
          recorded_by = excluded.recorded_by
    `);

    const transaction = db.transaction(() => {
      for (const g of grades) {
        const existing = checkGradeLock.get(g.student_id, g.subject_id, g.term, g.month);
        if (existing && existing.locked === 1) continue; // Skip locked grades instead of failing entire batch
        upsertGrade.run(g);
      }
      for (const a of attendance) {
          upsertAttendance.run(a.student_id, a.date, a.status, a.hours_absent, a.recorded_by);
      }
    });

    try {
      transaction();
      res.json({ success: true, processedGrades: grades.length, processedAttendance: attendance.length });
    } catch (err) {
      res.status(400).json({ success: false, error: err.message });
    }
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`Mobile API Server running on port ${port}`);
  });
}

module.exports = { startApiServer };
