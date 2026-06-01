const fs = require('fs');
const path = require('path');
const os = require('os');

const rootDir = path.join(os.homedir(), 'AppData');
console.log('Searching AppData recursively for SQLite databases...');

function searchDir(dir) {
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);

            // Skip large system caches
            if (file.name === 'Cache' || file.name === 'Code Cache' || file.name === 'GPUCache' || file.name === 'blob_storage' || file.name === 'Microsoft' || file.name === 'Google') {
                continue;
            }

            if (file.isDirectory()) {
                searchDir(fullPath);
            } else if (file.isFile()) {
                const ext = path.extname(file.name).toLowerCase();
                if (['.db', '.sqlite', '.sqlite3', '.db3'].includes(ext)) {
                    // Check if it's a valid SQLite header
                    try {
                        const fd = fs.openSync(fullPath, 'r');
                        const buffer = Buffer.alloc(16);
                        fs.readSync(fd, buffer, 0, 16, 0);
                        fs.closeSync(fd);
                        if (buffer.toString('utf-8', 0, 15) === 'SQLite format 3') {
                            const stats = fs.statSync(fullPath);
                            console.log(`SQLite DB: ${fullPath} (${stats.size} bytes)`);
                        }
                    } catch (e) {}
                }
            }
        }
    } catch (e) {}
}

searchDir(rootDir);
console.log('Search finished.');
