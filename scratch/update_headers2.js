const fs = require('fs');
const path = require('path');

const superAdminDir = path.join(__dirname, '../app/super-admin');
const dashboardDir = path.join(__dirname, '../app/(dashboard)'); // We also need to change the tenant dashboard!

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
    
    // The previous pattern we injected was:
    // <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
    // <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
    
    // We want to replace it with the purple pattern:
    // <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
    // <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
    
    let modified = false;

    // Pattern 1: Exact match of the dark slate we injected
    const slatePattern = /<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-indigo-500\/20 relative overflow-hidden">\s*<div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500\/10 rounded-full blur-3xl pointer-events-none" \/>/g;
    
    if (slatePattern.test(content)) {
        content = content.replace(slatePattern, `<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>`);
        modified = true;
    }

    // Pattern 2: The Tenant Dashboard pattern (DashboardClient.tsx)
    // <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-indigo-500/20 relative overflow-hidden">
    // <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
    const tenantPattern = /<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 rounded-xl shadow-xl border border-indigo-500\/20 relative overflow-hidden">\s*\{\/\* Glow Effects \*\/\}\s*<div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500\/10 rounded-full blur-3xl pointer-events-none" \/>/g;

    if (tenantPattern.test(content)) {
        content = content.replace(tenantPattern, `<div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 p-6 rounded-xl text-white shadow-lg overflow-hidden relative">
        {/* Glow Effects */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>`);
        modified = true;
    }

    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
}

traverseAndProcess(superAdminDir);
traverseAndProcess(dashboardDir);
