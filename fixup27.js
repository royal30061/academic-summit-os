const fs = require('fs');
function sub(file, from, to, label) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
var Q = String.fromCharCode(34);
var FROM3 = "{ '&': '&', '<': '<', '>': '>', " + "'" + Q + "': '" + Q + "'" + " }";
var TO3 = "{ '&': '&amp;', '<': '&lt;', '>': '&gt;', " + "'" + Q + "': '&quot;'" + " }";
sub('home2.js', FROM3, TO3, 'real escaping');
sub('home2.js', "esc(c.code) + (c.units ? ' | ' + esc(c.units) + ' units' : '')",
  "(c.title ? esc(c.code) + (c.units ? ' | ' + esc(c.units) + ' units' : '') : (c.units ? esc(c.units) + ' units' : ''))",
  'subtitle unstutters');
sub('home2.js', "esc(c.code.replace(/[^A-Za-z]/g, '').slice(0, 3))",
  "esc(c.code.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase())",
  'chips in caps');
sub('zuma.js', "var src = (W.ZUMA_IMG || {})[MAP[pose] || 'welcome'];",
  "var src = (W.ZUMA_IMG || {})[MAP[pose] || 'welcome'];\n  var flip = (MAP[pose] === 'notice') ? 'transform:scaleX(-1);' : '';",
  'flip var');
sub('zuma.js', "px;object-fit:contain\">", "px;object-fit:contain;' + flip + '\">", 'flip applied');
