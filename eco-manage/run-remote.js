const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  const remoteCmd = `cd /var/www/saas && node -e "const db = require('better-sqlite3')('/var/opt/eco-hub-data/school.db'); const queries = [
            'DELETE FROM grades WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)',
            'DELETE FROM class_subjects WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)',
            'DELETE FROM class_teacher_subjects WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)',
            'DELETE FROM grade_overrides WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)',
            'DELETE FROM class_subject_validation WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)',
            'DELETE FROM class_installment_fees WHERE class_id IN (SELECT id FROM classes WHERE school_id = ?)',
            'DELETE FROM transport_attendance WHERE route_id IN (SELECT id FROM bus_routes WHERE school_id = ?)',
            'DELETE FROM transport_logs WHERE route_id IN (SELECT id FROM bus_routes WHERE school_id = ?)',
            'DELETE FROM transport_points WHERE route_id IN (SELECT id FROM bus_routes WHERE school_id = ?)',
            'DELETE FROM mobile_access_keys WHERE assigned_to_user_id IN (SELECT id FROM users WHERE school_id = ?)',
            'DELETE FROM grading_scale_options WHERE scale_id IN (SELECT id FROM grading_scales WHERE school_id = ?)',
            'DELETE FROM attendance WHERE school_id = ?',
            'DELETE FROM payments WHERE school_id = ?',
            'DELETE FROM tickets WHERE school_id = ?',
            'DELETE FROM announcements WHERE school_id = ?',
            'DELETE FROM notifications WHERE school_id = ?',
            'DELETE FROM archives WHERE school_id = ?',
            'DELETE FROM report_templates WHERE school_id = ?',
            'DELETE FROM expenses WHERE school_id = ?',
            'DELETE FROM saas_subscriptions WHERE school_id = ?',
            'DELETE FROM pending_subjects WHERE school_id = ?',
            'DELETE FROM tuition_fees WHERE school_id = ?',
            'DELETE FROM school_installment_deadlines WHERE school_id = ?',
            'DELETE FROM school_subjects WHERE school_id = ?',
            'DELETE FROM schedules WHERE school_id = ?',
            'DELETE FROM evaluation_schedules WHERE school_id = ?',
            'DELETE FROM students WHERE school_id = ?',
            'DELETE FROM bus_routes WHERE school_id = ?',
            'DELETE FROM classes WHERE school_id = ?',
            'DELETE FROM grading_scales WHERE school_id = ?',
            'DELETE FROM subjects WHERE school_id = ?',
            'DELETE FROM users WHERE school_id = ?',
            'DELETE FROM schools WHERE id = ?'
        ];
db.transaction(() => { for (const q of queries) { console.log('Running: ' + q); db.prepare(q).run(1); } })();"`;
  conn.exec(remoteCmd, (err, stream) => { 
    if (err) throw err;
    let out = '';
    stream.on('close', () => { console.log('RESULT:', out); conn.end(); }).on('data', d => { out += d.toString(); }).stderr.on('data', d => console.log('ERR:', d.toString())); 
  }); 
}).connect({host: '2.24.15.119', port: 22, username: 'root', password: 'Eco-Manage12'});
