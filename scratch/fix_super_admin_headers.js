const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '../app/super-admin');

const files = [
  'approvals/page.tsx',
  'billing/page.tsx',
  'health/page.tsx',
  'integrations/page.tsx',
  'notifications/page.tsx',
  'plans/page.tsx',
  'purchase-orders/page.tsx',
  'reports/page.tsx',
  'support/page.tsx'
];

for (const file of files) {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) continue;
  
  let content = fs.readFileSync(p, 'utf8');
  let modified = false;

  // We are looking for:
  // 1. <div className="flex justify-between items-start"> OR <div className="flex justify-between items-center">
  // 2. The banner div
  // 3. The closing </div> of the banner div
  
  const regex = /<div className="flex justify-between items-(?:start|center)(?: bg-muted\/30 p-4 rounded-lg border)?">\s*<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r([^"]+)"([\s\S]*?)<\/div>\s*<\/div>/;

  content = content.replace(regex, (match, gradientRest, innerContent) => {
    modified = true;
    return `<div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 w-full bg-gradient-to-r${gradientRest}"${innerContent}</div>\n        <div className="relative z-10 flex items-center gap-3">`;
  });

  if (modified) {
    fs.writeFileSync(p, content, 'utf8');
    console.log(`Fixed: ${file}`);
  }
}
