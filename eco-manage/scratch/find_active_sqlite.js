const fs = require('fs');
const path = require('path');
const os = require('os');

const rootDir = os.homedir();
console.log('Searching for recently modified SQLite databases in:', rootDir);

const results = [];
const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000;

function searchDir(dir, depth = 0) {
    if (depth > 8) return;
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);

            // Skip common large dirs
            if (file.name === 'Cache' || file.name === 'Code Cache' || file.name === 'GPUCache' || 
                file.name === 'blob_storage' || file.name === 'Microsoft' || file.name === 'Google' ||
                file.name === 'node_modules' || file.name === '.git' || file.name === 'AppData/Local/Temp') {
                continue;
            }

            if (file.isDirectory()) {
                searchDir(fullPath, depth + 1);
            } else if (file.isFile()) {
                try {
                    const stats = fs.statSync(fullPath);
                    if (stats.size > 0 && stats.mtimeMs >= fifteenMinutesAgo) {
                        // Check SQLite header
                        const fd = fs.openSync(fullPath, 'r');
                        const buffer = Buffer.alloc(16);
                        fs.readSync(fd, buffer, 0, 16, 0);
                        fs.closeSync(fd);
                        if (buffer.toString('utf-8', 0, 15) === 'SQLite format 3') {
                            results.push({
                                path: fullPath,
                                size: stats.size,
                                modified: stats.mtime
                            });
                        }
                    }
                } catch (e) {}
            }
        }
    } catch (e) {}
}

searchDir(rootDir);
console.log('Search finished.');
console.log('Active SQLite DBs:', results);
fs.writeFileSync(path.join(__dirname, 'active_dbs.json'), JSON.stringify(results, null, 2), 'utf8');
process.exit(0);
