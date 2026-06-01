const fs = require('fs');
const path = require('path');

const rootDir = 'C:\\Users\\LANDRY TOUOTAP\\Desktop';
console.log('Searching Desktop recursively for SQLite files...');

function searchDir(dir) {
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);

            if (file.name === 'node_modules' || file.name === '.git') {
                continue;
            }

            if (file.isDirectory()) {
                searchDir(fullPath);
            } else if (file.isFile()) {
                try {
                    const fd = fs.openSync(fullPath, 'r');
                    const buffer = Buffer.alloc(16);
                    fs.readSync(fd, buffer, 0, 16, 0);
                    fs.closeSync(fd);
                    if (buffer.toString('utf-8', 0, 15) === 'SQLite format 3') {
                        const stats = fs.statSync(fullPath);
                        console.log(`FOUND SQLITE DB: ${fullPath} (${stats.size} bytes)`);
                    }
                } catch (e) {}
            }
        }
    } catch (e) {}
}

searchDir(rootDir);
console.log('Desktop search finished.');
