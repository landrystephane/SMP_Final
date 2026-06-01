const fs = require('fs');
const path = require('path');
const readline = require('readline');

const logFile = path.join('C:', 'Users', 'LANDRY TOUOTAP', '.gemini', 'antigravity', 'brain', '0d38ce12-7186-4f63-933a-803d330eb15b', '.system_generated', 'logs', 'transcript.jsonl');

if (!fs.existsSync(logFile)) {
    console.error("Log file does not exist at:", logFile);
    process.exit(1);
}

const fileStream = fs.createReadStream(logFile);
const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
});

rl.on('line', (line) => {
    if (line.includes('Users matching Souley') || line.includes('inspect_db.js')) {
        console.log('--- FOUND LINE ---');
        console.log(line.substring(0, 1000));
    }
});
