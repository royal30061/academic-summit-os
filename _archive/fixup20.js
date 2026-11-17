const fs = require('fs');
let s = fs.readFileSync('read.js', 'utf8');
const from = "out += '<div class=\"p-3 rounded-xl text-xs font-bold\" style=\"background:rgba(16,185,129,.12);color:#047857\">All done today.</div>';";
const to = "out += '<div class=\"p-3 rounded-xl text-xs font-bold flex items-center gap-3\" style=\"background:rgba(16,185,129,.12);color:#047857\">' + (W.zumaImg ? W.zumaImg('cheer', 48) : '') + '<span>All done today. Come back tomorrow.</span></div>';";
const n = s.split(from).length - 1;
if (s.indexOf("zumaImg('cheer', 48)") > -1) console.log('already applied');
else if (n === 1) { fs.writeFileSync('read.js', s.split(from).join(to)); console.log('all-done cheer seated'); }
else console.log('ANCHOR COUNT ' + n + ' - not touching');
