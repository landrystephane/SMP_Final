const fs = require('fs');
const path = require('path');
const os = require('os');

const rootDir = path.join(os.homedir(), 'AppData', 'Roaming');
console.log('Searching for recently modified databases in AppData/Roaming:', rootDir);

const results = [];
const cutOffTime = new Date('2026-05-29T00:00:00.000Z').getTime(); // local time 02:00

function searchDir(dir, depth = 0) {
    if (depth > 6) return;
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);

            if (file.name === 'Cache' || file.name === 'Code Cache' || file.name === 'GPUCache' || 
                file.name === 'blob_storage' || file.name === 'Microsoft' || file.name === 'Google' ||
                file.name === 'node_modules' || file.name === '.git') {
                continue;
            }

            if (file.isDirectory()) {
                searchDir(fullPath, depth + 1);
            } else if (file.name.endsWith('.db') || file.name.endsWith('.sqlite') || file.name.endsWith('.sqlite3') || file.name.endsWith('.db3')) {
                try {
                    const stats = fs.statSync(fullPath);
                    if (stats.mtimeMs >= cutOffTime) {
                        results.push({
                            path: fullPath,
                            size: stats.size,
                            modified: stats.mtime
                        });
                    }
                } catch (e) {}
            }
        }
    } catch (e) {}
}

searchDir(rootDir);
console.log('Search finished.');
console.log('Recent DBs:', results);
fs.writeFileSync(path.join(__dirname, 'recent_roaming_dbs.json'), JSON.stringify(results, null, 2), 'utf8');
process.exit(0);
