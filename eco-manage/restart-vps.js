const { Client } = require('ssh2');
const fs = require('fs');

const VPS_HOST = process.env.VPS_HOST || '2.24.15.119';
const VPS_USER = process.env.VPS_USER || 'root';
const VPS_PASSWORD = process.env.VPS_PASSWORD;
const VPS_KEY_PATH = process.env.VPS_KEY_PATH;

if (!VPS_PASSWORD && !VPS_KEY_PATH) {
  console.error('❌ Erreur: Définir VPS_PASSWORD ou VPS_KEY_PATH en variable d\'environnement.');
  console.error('   Exemple: set VPS_PASSWORD=monMotDePasse && node restart-vps.js');
  process.exit(1);
}

const connConfig = {
  host: VPS_HOST,
  port: 22,
  username: VPS_USER,
};
if (VPS_KEY_PATH) {
  connConfig.privateKey = fs.readFileSync(VPS_KEY_PATH);
} else {
  connConfig.password = VPS_PASSWORD;
}

const conn = new Client();
conn.on('ready', () => {
  console.log('Client :: ready');
  conn.exec('cd /var/www/saas && pm2 restart eco-hub-saas', (err, stream) => {
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
}).connect(connConfig);
