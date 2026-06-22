const { Client } = require('ssh2'); 
const conn = new Client(); 
conn.on('ready', () => { 
  const remoteCmd = `cd /var/www/saas && node -e "const db = require('better-sqlite3')('/var/opt/eco-hub-data/school.db'); console.log(JSON.stringify(db.prepare('SELECT id, name, code FROM classes').all()));"`;
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
  password: 'Eco-Manage12'
});
