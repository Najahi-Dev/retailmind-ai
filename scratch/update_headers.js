const fs = require('fs');
const path = require('path');

const superAdminDir = path.join(__dirname, '../app/super-admin');

function traverseAndProcess(dir) {
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);
        
        if (stat.isDirectory()) {
            traverseAndProcess(itemPath);
        } else if (item === 'page.tsx') {
            processFile(itemPath);
        }
    }
}

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Look for a div that contains an h1 and a p.
    // Example:
    // <div>
    //   <h1 className="text-2xl font-bold tracking-tight">System Audit Trail</h1>
    //   <p className="text-muted-foreground">
    //     ...
    //   </p>
    // </div>
    //
    // Note: there are variations. Let's use a regex to match the wrapper <div> if it immediately precedes <h1
    
    const regex = /<div>\s*<h1 className="([^"]+)">([^<]+)<\/h1>\s*<p className="([^"]+)">([\s\S]*?)<\/p>\s*<\/div>/g;
    
    let modified = false;
    content = content.replace(regex, (match, h1Classes, title, pClasses, desc) => {
        modified = true;
        return `<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <h1 className="${h1Classes}">${title}</h1>
          <p className="text-indigo-200 mt-1">${desc.trim()}</p>
        </div>
      </div>`;
    });
    
    // Also try to catch headers that have no <p> tag, or slightly different formatting.
    // Let's see if we have other patterns.
    
    // Some might have `<div className="flex justify-between items-center mb-6">`
    // Let's do a second pass for `AdminBackupClient.tsx` since we also need to apply to it, wait, the user said "check other pages". `AdminBackupClient` is a component, but let's check its layout.
    // I will just manually edit the ones the regex misses if needed.
    
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    } else {
        console.log(`Skipped (No match found): ${filePath}`);
    }
}

traverseAndProcess(superAdminDir);
