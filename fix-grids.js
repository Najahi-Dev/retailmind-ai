const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx')) results.push(file);
    }
  });
  return results;
}

const files = walk('./app');

let totalModified = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const original = content;

  content = content.replace(/className="grid grid-cols-2 lg:grid-cols-4/g, 'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4');
  content = content.replace(/className="grid grid-cols-2 md:grid-cols-3/g, 'className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3');
  content = content.replace(/className="grid grid-cols-2 md:grid-cols-4/g, 'className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4');
  content = content.replace(/className="grid grid-cols-3 gap/g, 'className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap');
  content = content.replace(/className="grid grid-cols-2 gap/g, 'className="grid grid-cols-1 sm:grid-cols-2 gap');
  content = content.replace(/className="grid grid-cols-2 p-1/g, 'className="grid grid-cols-1 sm:grid-cols-2 p-1');
  
  if (original !== content) {
    fs.writeFileSync(file, content);
    console.log(`Modified: ${file}`);
    totalModified++;
  }
});

console.log(`\nFixed ${totalModified} files.`);
