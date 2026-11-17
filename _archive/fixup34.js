const fs = require('fs');
let s = fs.readFileSync('tune.js', 'utf8');
const bad = "scrubX(sh);\n}\n}\nW.zumaRemind";
const good = "scrubX(sh);\n}\nW.zumaRemind";
const n = s.split(bad).length - 1;
if (n === 1) { fs.writeFileSync('tune.js', s.split(bad).join(good)); console.log('stray brace removed'); }
else if (n === 0 && s.indexOf(good) > -1) console.log('already clean');
else { console.log('PATTERN COUNT ' + n + ' - stop and inspect by hand'); process.exitCode = 1; }
