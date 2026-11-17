const fs = require('fs');
let s = fs.readFileSync('home.js', 'utf8');
const a = "onclick=\"go(\\'acad\\')\"";
const b = 'onclick="cgpaBreakdown()"';
const n = s.split(a).length - 1;
if (s.indexOf(b) > -1) console.log('already applied');
else if (n === 1) { fs.writeFileSync('home.js', s.split(a).join(b)); console.log('cgpa card now opens the breakdown'); }
else console.log('ANCHOR COUNT ' + n + ' - not touching');
