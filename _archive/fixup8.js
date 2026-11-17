const fs = require('fs');
let s = fs.readFileSync('academics.js', 'utf8');
const from = "units released)</div>' + blocks + '</div>';";
const to = "units released)</div>' + (typeof undoCount === 'function' && undoCount() ? '<button class=\"btn2 w-full np\" onclick=\"undoImport()\">Undo last import</button>' : '') + blocks + '</div>';";
if (s.indexOf('Undo last import') > -1) console.log('already present');
else if (s.split(from).length - 1 === 1) { fs.writeFileSync('academics.js', s.split(from).join(to)); console.log('undo button inserted'); }
else console.log('ANCHOR COUNT ' + (s.split(from).length - 1) + ' - not touching');
