const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, '..'); // eco-manage
const destDir = 'C:\\Users\\LANDRY TOUOTAP\\Desktop\\School_Management\\eco-manage';

const filesToCopy = [
    'electron/main.js',
    'src/pages/AdvisorPortal.tsx',
    'src/pages/Tickets.tsx'
];

for (const file of filesToCopy) {
    const srcPath = path.join(srcDir, file);
    const destPath = path.join(destDir, file);
    try {
        fs.mkdirSync(path.dirname(destPath), { recursive: true });
        fs.copyFileSync(srcPath, destPath);
        console.log(`Successfully copied ${file} to ${destPath}`);
    } catch (e) {
        console.error(`Error copying ${file}:`, e.message);
    }
}
process.exit(0);
