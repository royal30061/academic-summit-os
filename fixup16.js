const fs = require('fs');
let s = fs.readFileSync('ui.js', 'utf8');
const from = "if (Date.now() - t > 7 * 864e5 || localStorage.getItem('as_fab_used')) {";
const to = "if (false) {   // founder decision: the help button stays";
const n = s.split(from).length - 1;
if (s.indexOf(to) > -1) console.log('already applied');
else if (n === 1) { fs.writeFileSync('ui.js', s.split(from).join(to)); console.log('fab auto-hide disabled'); }
else console.log('ANCHOR COUNT ' + n + ' - not touching');
