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

  // Replace max-w-X inside DialogContent with sm:max-w-X so it doesn't break mobile.
  // We'll just look for className="... max-w-md ..." inside DialogContent.
  
  // This is a bit tricky with regex, let's just do a blanket replace for "max-w-md" and "max-w-lg" and "max-w-3xl"
  // but ONLY if they are NOT already preceded by "sm:", "md:", "lg:", "xl:"
  
  content = content.replace(/(?<!(sm:|md:|lg:|xl:))max-w-md/g, 'sm:max-w-md w-[95vw] sm:w-full');
  content = content.replace(/(?<!(sm:|md:|lg:|xl:))max-w-lg/g, 'sm:max-w-lg w-[95vw] sm:w-full');
  content = content.replace(/(?<!(sm:|md:|lg:|xl:))max-w-xl/g, 'sm:max-w-xl w-[95vw] sm:w-full');
  content = content.replace(/(?<!(sm:|md:|lg:|xl:))max-w-2xl/g, 'sm:max-w-2xl w-[95vw] sm:w-full');
  content = content.replace(/(?<!(sm:|md:|lg:|xl:))max-w-3xl/g, 'sm:max-w-3xl w-[95vw] sm:w-full');
  content = content.replace(/(?<!(sm:|md:|lg:|xl:))max-w-4xl/g, 'sm:max-w-4xl w-[95vw] sm:w-full');

  // Let's also fix `<DialogContent>` that have no className (they will get sm:max-w-md from the component, but we can ensure they have w-[95vw])
  // Actually Shadcn UI dialogs default to `w-full max-w-[calc(100%-2rem)]` on mobile, which is basically `w-[95vw]`.
  // So the main issue is just overriding `max-w-*` on mobile. The `sm:max-w-*` fixes it perfectly.
  // Wait, if I just replace `max-w-md` with `sm:max-w-md w-[95vw] sm:w-full`, that will affect EVERYTHING (cards, containers, etc).
  // That might be dangerous if there are `max-w-md` containers that SHOULD be max-w-md on mobile.
  // But actually `max-w-md` is 28rem (448px). On a 390px mobile phone, `max-w-md` is larger than the screen anyway, so it doesn't hurt.
  // But to be safe, let's just use `sm:max-w-md`.
  
  content = content.replace(/(?<!(sm:|md:|lg:|xl:))max-w-md/g, 'sm:max-w-md');
  content = content.replace(/(?<!(sm:|md:|lg:|xl:))max-w-lg/g, 'sm:max-w-lg');
  content = content.replace(/(?<!(sm:|md:|lg:|xl:))max-w-xl/g, 'sm:max-w-xl');
  content = content.replace(/(?<!(sm:|md:|lg:|xl:))max-w-2xl/g, 'sm:max-w-2xl');
  content = content.replace(/(?<!(sm:|md:|lg:|xl:))max-w-3xl/g, 'sm:max-w-3xl');
  content = content.replace(/(?<!(sm:|md:|lg:|xl:))max-w-4xl/g, 'sm:max-w-4xl');

  if (original !== content) {
    fs.writeFileSync(file, content);
    console.log(`Modified: ${file}`);
    totalModified++;
  }
});

console.log(`\nFixed ${totalModified} files.`);
