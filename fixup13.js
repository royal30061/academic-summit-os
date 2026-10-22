const fs = require('fs');
function sub(file, from, to, label) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
sub('streak.js', 'function strip() {',
  "function strip() { return '';   // merged into the single tappable streak button (read.js)",
  'strip suppressed');
sub('splash.js', "st.textContent =\n  '@keyframes asRise",
  "st.textContent =\n  '#splash,#app-splash,.splash-screen,#loading,.loader,[data-splash]{display:none!important}' +\n  '@keyframes asRise",
  'legacy splash blacklist');
