const fs = require('fs');
const path = require('path');

const rootDir = 'C:\\Users\\LANDRY TOUOTAP\\AppData\\Roaming';
console.log('Searching AppData\\Roaming for files containing "TAPTAP" or "Souley"...');

function searchDir(dir) {
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);

            // Skip large system caches
            if (file.name === 'Cache' || file.name === 'Code Cache' || file.name === 'GPUCache' || file.name === 'blob_storage') {
                continue;
            }

            if (file.isDirectory()) {
                searchDir(fullPath);
            } else if (file.isFile()) {
                try {
                    const stats = fs.statSync(fullPath);
                    if (stats.size > 0 && stats.size < 100 * 1024 * 1024) { // Ignore empty or >100MB files
                        const content = fs.readFileSync(fullPath);
                        if (content.includes('TAPTAP') || content.includes('Souley') || content.includes('LANDRY')) {
                            console.log(`Matched: ${fullPath} (${stats.size} bytes)`);
                        }
                    }
                } catch (e) {}
            }
        }
    } catch (e) {}
}

searchDir(rootDir);
console.log('Search finished.');
