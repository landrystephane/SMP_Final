const { Client } = require('ssh2');
const fs = require('fs');

const VPS_HOST = process.env.VPS_HOST || '2.24.15.119';
const VPS_USER = process.env.VPS_USER || 'root';
const VPS_PASSWORD = process.env.VPS_PASSWORD;
const VPS_KEY_PATH = process.env.VPS_KEY_PATH;

if (!VPS_PASSWORD && !VPS_KEY_PATH) {
  console.error('Erreur: Définir VPS_PASSWORD ou VPS_KEY_PATH.');
  process.exit(1);
}

const connConfig = { host: VPS_HOST, port: 22, username: VPS_USER };
if (VPS_KEY_PATH) connConfig.privateKey = fs.readFileSync(VPS_KEY_PATH);
else connConfig.password = VPS_PASSWORD;

const remoteCmd = process.argv[2] || 'echo "Usage: node run-remote.js <command>"';

const conn = new Client();
conn.on('ready', () => {
  conn.exec(remoteCmd, (err, stream) => {
    if (err) throw err;
    stream.on('close', () => conn.end())
          .on('data', d => console.log('OUT:', d.toString()))
          .stderr.on('data', d => console.log('ERR:', d.toString()));
  });
}).connect(connConfig);
