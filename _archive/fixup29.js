const fs = require('fs');
function sub(file, from, to, label) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
sub('doors.js', "var ICON = { home: 'h', study: 'g', traj: 'up', att: 'c', fin: 'w' };",
  "var ICON = { home: 'h', study: 'g', traj: 'up', att: 'c', fin: 'w' };\nvar CHART = '<svg viewBox=\"0 0 24 24\" class=\"w-5 h-5\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 17l6-6 4 3 8-8\"/><path d=\"M14 6h7v7\"/></svg>';",
  'chart glyph defined');
sub('doors.js', "ic(ICON[v], 'w-5 h-5')", "(v === 'traj' ? CHART : ic(ICON[v], 'w-5 h-5'))", 'results door wears the chart');
