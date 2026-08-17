const fs = require('fs');
const path = require('path');

const superAdminDir = path.join(__dirname, '../app/super-admin');
const dashboardDir = path.join(__dirname, '../app/(dashboard)');

function traverseAndProcess(dir) {
    if (!fs.existsSync(dir)) return;
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            traverseAndProcess(itemPath);
        } else if (item.endsWith('.tsx')) {
            processFile(itemPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;

    // We look for any div containing: bg-gradient-to-r from-slate-900 ... overflow-hidden
    // followed by the glow div
    
    // Pattern to match the container div and its classes
    const regex1 = /className="([^"]*bg-gradient-to-r from-[a-z0-9\-]+ via-[a-z0-9\-]+ to-[a-z0-9\-]+[^"]* relative overflow-hidden)"/g;
    
    // We will replace the class of the wrapper, and then we will replace the inner glow with the cube pattern
    content = content.replace(regex1, (match, classes) => {
        // replace the gradient colors and border
        let newClasses = classes.replace(/from-[a-z0-9\-]+ via-[a-z0-9\-]+ to-[a-z0-9\-]+/, "from-indigo-900 via-purple-900 to-indigo-950");
        newClasses = newClasses.replace(/border-[a-z0-9\-]+\/[0-9]+/, "shadow-lg"); // replace border with shadow-lg
        
        modified = true;
        return `className="${newClasses}"`;
    });

    // Replace the blur glow div with the cubes texture
    const regex2 = /<div className="absolute top-0 right-0 w-80 h-80 bg-[a-z0-9\-]+\/10 rounded-full blur-3xl pointer-events-none" \/>/g;
    if (regex2.test(content)) {
        content = content.replace(regex2, `<div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>`);
        modified = true;
    }

    // Sometimes the glow div has a slightly different class or comment before it
    const regex3 = /\{\/\* Glow Effects \*\/\}\s*<div className="absolute top-0 right-0 w-80 h-80 bg-[a-z0-9\-]+\/10 rounded-full blur-3xl pointer-events-none" \/>/g;
    if (regex3.test(content)) {
        content = content.replace(regex3, `<div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>`);
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

traverseAndProcess(superAdminDir);
traverseAndProcess(dashboardDir);
