const { Client } = require('ssh2');
const fs = require('fs');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.sftp((err, sftp) => {
    if (err) throw err;
    const remotePath = '/var/www/saas/update.zip';
    console.log('Uploading update.zip...');
    sftp.fastPut('update.zip', remotePath, (err) => {
      if (err) throw err;
      console.log('Upload complete. Executing unzip and restart...');
      const cmd = `cd /var/www/saas && apt-get install -y unzip || true && unzip -o update.zip && rm update.zip && npm install && npm run build && pm2 restart eco-hub-saas`;
      conn.exec(cmd, (err, stream) => {
        if (err) throw err;
        stream.on('close', (code, signal) => {
          console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
          conn.end();
        }).on('data', (data) => {
          console.log('STDOUT: ' + data);
        }).stderr.on('data', (data) => {
          console.log('STDERR: ' + data);
        });
      });
    });
  });
}).connect({
  host: '2.24.15.119',
  port: 22,
  username: 'root',
  password: 'Eco-Manage12'
});
