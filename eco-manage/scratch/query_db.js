const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  const cmd = `node -e "
    const Database = require('/var/www/saas/node_modules/better-sqlite3');
    const db = new Database('/var/opt/eco-hub-data/school.db');
    const classes = db.prepare('SELECT id, name, code FROM classes').all();
    console.log(classes);
  "`;
  conn.exec(cmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', (code, signal) => {
      conn.end();
    }).on('data', (data) => {
      console.log('STDOUT: ' + data.toString());
    }).stderr.on('data', (data) => {
      console.log('STDERR: ' + data.toString());
    });
  });
}).connect({
  host: '2.24.15.119',
  port: 22,
  username: 'root',
  password: 'Eco-Manage12'
});
