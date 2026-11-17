const fs = require('fs');
let s = fs.readFileSync('read.js', 'utf8');
function sub(from, to, label) {
  if (s.indexOf(to) > -1) { console.log('read.js: ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log('read.js: ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  s = s.split(from).join(to);
  console.log('read.js: ' + label + ' applied');
}
sub("out += '<div class=\"p-3 rounded-xl text-xs font-bold\" style=\"background:rgba(16,185,129,.12);color:#047857\">' +",
    "out += '<div class=\"p-3 rounded-xl text-xs font-bold flex items-center gap-3\" style=\"background:rgba(16,185,129,.12);color:#047857\">' + (W.zumaImg ? W.zumaImg('cheer', 48) : '') +",
    'all-done row opens for Zuma');
sub("'All done today. Come back tomorrow.</div>';",
    "'<span>All done today. Come back tomorrow.</span></div>';",
    'all-done text wrapped');
fs.writeFileSync('read.js', s);
