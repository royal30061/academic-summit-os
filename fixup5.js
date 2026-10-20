const fs = require('fs');
let s = fs.readFileSync('home.js', 'utf8');
const re = /(Cumulative GPA[\s\S]{0,220}?)onclick="go\(\\'acad\\'\)"/;
if (s.indexOf('onclick="cgpaBreakdown()"') > -1) console.log('already applied');
else if (re.test(s)) { fs.writeFileSync('home.js', s.replace(re, '$1onclick="cgpaBreakdown()"')); console.log('cgpa card now opens the breakdown'); }
else console.log('ANCHOR MISSING');
