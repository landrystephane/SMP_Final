const { app } = require('electron');
const Database = require('better-sqlite3');
const path = require('path');
const os = require('os');
const fs = require('fs');

app.whenReady().then(() => {
    const appData = path.join(os.homedir(), 'AppData');
    console.log('Searching AppData recursively for SQLite databases containing data...');

    const results = [];

    function searchDir(dir, depth = 0) {
        if (depth > 6) return; // limit depth to avoid freezing
        try {
            const files = fs.readdirSync(dir, { withFileTypes: true });
            for (const file of files) {
                const fullPath = path.join(dir, file.name);

                if (file.name === 'Cache' || file.name === 'Code Cache' || file.name === 'GPUCache' || 
                    file.name === 'blob_storage' || file.name === 'Microsoft' || file.name === 'Google') {
                    continue;
                }

                if (file.isDirectory()) {
                    searchDir(fullPath, depth + 1);
                } else if (file.name.endsWith('.db') || file.name.endsWith('.sqlite') || file.name === 'school') {
                    try {
                        const fd = fs.openSync(fullPath, 'r');
                        const buffer = Buffer.alloc(15);
                        fs.readSync(fd, buffer, 0, 15, 0);
                        fs.closeSync(fd);
                        if (buffer.toString('utf-8') === 'SQLite format 3') {
                            const stats = fs.statSync(fullPath);
                            
                            // Let's query this db
                            const tempDb = new Database(fullPath);
                            try {
                                const tables = tempDb.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
                                const counts = {};
                                let totalRows = 0;
                                for (const t of tables) {
                                    const count = tempDb.prepare(`SELECT COUNT(*) as c FROM ${t.name}`).get().c;
                                    counts[t.name] = count;
                                    totalRows += count;
                                }
                                
                                results.push({
                                    path: fullPath,
                                    size: stats.size,
                                    modified: stats.mtime,
                                    tables: counts,
                                    totalRows
                                });
                            } catch (err) {
                                // Not a queryable DB or schema error
                            } finally {
                                tempDb.close();
                            }
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {}
    }

    searchDir(appData);
    
    // Also search the desktop and school management directories
    const desktopDir = path.join(os.homedir(), 'Desktop');
    searchDir(desktopDir);

    results.sort((a, b) => new Date(b.modified) - new Date(a.modified));

    fs.writeFileSync(path.join(__dirname, 'active_db_info.json'), JSON.stringify(results, null, 2), 'utf8');
    console.log('Search finished. Output written to active_db_info.json');
    app.exit(0);
});
