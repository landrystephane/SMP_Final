const fs = require('fs');
const path = require('path');
const os = require('os');

const rootDir = os.homedir();
console.log('Searching home directory recursively for school.db files...', rootDir);

const results = [];

function searchDir(dir, depth = 0) {
    if (depth > 6) return; // limit depth to avoid freezing
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);

            // Skip large system directories or caches
            if (file.name === 'Cache' || file.name === 'Code Cache' || file.name === 'GPUCache' || 
                file.name === 'blob_storage' || file.name === 'Microsoft' || file.name === 'Google' ||
                file.name === 'node_modules' || file.name === '.git' || file.name === 'AppData') {
                continue;
            }

            if (file.isDirectory()) {
                searchDir(fullPath, depth + 1);
            } else if (file.name === 'school.db' || file.name.endsWith('.db')) {
                try {
                    const fd = fs.openSync(fullPath, 'r');
                    const buffer = Buffer.alloc(16);
                    fs.readSync(fd, buffer, 0, 16, 0);
                    fs.closeSync(fd);
                    if (buffer.toString('utf-8', 0, 15) === 'SQLite format 3') {
                        const stats = fs.statSync(fullPath);
                        results.push({ path: fullPath, size: stats.size });
                    }
                } catch (e) {}
            }
        }
    } catch (e) {}
}

searchDir(rootDir);
console.log('Found databases:', results);
fs.writeFileSync(path.join(__dirname, 'all_home_dbs.json'), JSON.stringify(results, null, 2), 'utf8');
console.log('Finished.');
process.exit(0);
