const fs = require('fs');
let s = fs.readFileSync('doors.js', 'utf8');
const from = "+ '\"' class=\"bn";
const to = "+ '\" class=\"bn";
const n = s.split(from).length - 1;
if (n === 0 && s.indexOf(to) > -1) console.log('doors.js: already healed');
else if (n === 1) { fs.writeFileSync('doors.js', s.split(from).join(to)); console.log('doors.js: one character heals the amputated string'); }
else { console.log('PATTERN COUNT ' + n + ' - STOP; paste lines 45-49 to Royal'); process.exitCode = 1; }
