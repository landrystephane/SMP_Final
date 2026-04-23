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

  app.post('/api/grades', validateMobileKey, (req, res) => {
    // Logic for saving grades via mobile
    res.json({ success: true });
  });

  app.listen(port, '0.0.0.0', () => {
    console.log(`Mobile API Server running on port ${port}`);
  });
}

module.exports = { startApiServer };
