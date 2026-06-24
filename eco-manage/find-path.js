const { Client } = require('ssh2');

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('pm2 jlist', (err, stream) => {
    if (err) throw err;
    let data = '';
    stream.on('close', (code, signal) => {
      console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
      const processes = JSON.parse(data);
      const app = processes.find(p => p.name.includes('eco-manage') || p.name === 'server' || p.name.includes('school'));
      if (app) {
         console.log('App found at:', app.pm2_env.pm_cwd);
      } else {
         console.log('App not found in pm2 list. Listing raw output:', data);
      }
      conn.end();
    }).on('data', (d) => {
      data += d;
    }).stderr.on('data', (d) => {
      console.log('STDERR: ' + d);
    });
  });
}).connect({
  host: '2.24.15.119',
  port: 22,
  username: 'root',
  password: process.env.VPS_PASSWORD
});
