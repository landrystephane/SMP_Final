const fs = require('fs');
const path = require('path');
const os = require('os');
const Database = require('better-sqlite3');

const rootDir = os.homedir();
console.log('Searching for database containing TAGNE in:', rootDir);

const results = [];

function searchDir(dir, depth = 0) {
    if (depth > 8) return;
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);

            // Skip common large dirs that are clearly irrelevant
            if (file.name === 'Cache' || file.name === 'Code Cache' || file.name === 'GPUCache' || 
                file.name === 'blob_storage' || file.name === 'Microsoft' || file.name === 'Google' ||
                file.name === 'node_modules' || file.name === '.git') {
                continue;
            }

            if (file.isDirectory()) {
                searchDir(fullPath, depth + 1);
            } else if (file.isFile()) {
                try {
                    const stats = fs.statSync(fullPath);
                    if (stats.size > 10 * 1024) { // Only inspect files > 10KB
                        // Read first 16 bytes to check SQLite header
                        const fd = fs.openSync(fullPath, 'r');
                        const buffer = Buffer.alloc(16);
                        fs.readSync(fd, buffer, 0, 16, 0);
                        fs.closeSync(fd);
                        
                        if (buffer.toString('utf-8', 0, 15) === 'SQLite format 3') {
                            // Check if this DB contains TAGNE in the users table
                            try {
                                const db = new Database(fullPath);
                                const user = db.prepare("SELECT id FROM users WHERE full_name LIKE '%TAGNE%'").get();
                                if (user) {
                                    results.push({
                                        path: fullPath,
                                        size: stats.size,
                                        modified: stats.mtime
                                    });
                                }
                                db.close();
                            } catch (e) {
                                // Table users might not exist or other error
                            }
                        }
                    }
                } catch (e) {}
            }
        }
    } catch (e) {}
}

searchDir(rootDir);
console.log('Search finished.');
console.log('Databases with TAGNE:', results);
fs.writeFileSync(path.join(__dirname, 'tagne_dbs.json'), JSON.stringify(results, null, 2), 'utf8');
process.exit(0);
