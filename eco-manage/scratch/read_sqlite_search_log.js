const fs = require('fs');
const path = require('path');
const readline = require('readline');

const logFile = 'C:\\Users\\LANDRY TOUOTAP\\.gemini\\antigravity\\brain\\0d38ce12-7186-4f63-933a-803d330eb15b\\.system_generated\\tasks\\task-2646.log';

if (!fs.existsSync(logFile)) {
    console.error("Log file does not exist.");
    process.exit(1);
}

const fileStream = fs.createReadStream(logFile);
const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
});

rl.on('line', (line) => {
    if (line.includes('SQLite DB:') && !line.includes('Mozilla') && !line.includes('Zoom') && !line.includes('WhatsApp')) {
        console.log(line);
    }
});
