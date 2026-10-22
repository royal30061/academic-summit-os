const fs = require('fs');
let s = fs.readFileSync('pulse.js', 'utf8');
const a = "row.querySelector('.text-[11px]')";
const b = "row.querySelector('[class*=\"text-[11px]\"]')";
const n = s.split(a).length - 1;
if (s.indexOf(b) > -1) console.log('already fixed');
else if (n === 1) { fs.writeFileSync('pulse.js', s.split(a).join(b)); console.log('selector fixed'); }
else console.log('ANCHOR COUNT ' + n + ' - not touching');
