const fs = require('fs');
const path = require('path');

const rootDir = 'C:\\Users\\LANDRY TOUOTAP';
const extensions = ['.db', '.sqlite', '.sqlite3', '.db3'];
const ignoreDirs = ['node_modules', '.git', '.gradle', '.idea', 'AppData\\Local\\Microsoft', 'AppData\\Local\\Google', 'AppData\\Local\\Programs'];

console.log('Starting search for database files...');

function searchDir(dir) {
    try {
        const files = fs.readdirSync(dir, { withFileTypes: true });
        for (const file of files) {
            const fullPath = path.join(dir, file.name);
            const relativePath = path.relative(rootDir, fullPath);

            if (ignoreDirs.some(ignored => relativePath.startsWith(ignored) || file.name === ignored)) {
                continue;
            }

            if (file.isDirectory()) {
                searchDir(fullPath);
            } else if (file.isFile()) {
                const ext = path.extname(file.name).toLowerCase();
                if (extensions.includes(ext) || file.name === 'school.db') {
                    const stats = fs.statSync(fullPath);
                    console.log(`Found: ${fullPath} (${stats.size} bytes)`);
                }
            }
        }
    } catch (e) {
        // Ignore permission errors
    }
}

searchDir(rootDir);
console.log('Search finished.');
