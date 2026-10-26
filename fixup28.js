const fs = require('fs');
function sub(file, from, to, label) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
sub('splash.js', "Math.max(0, 1120 - (Date.now() - born))", "Math.max(0, 1250 - (Date.now() - born))", 'mountain breath 1.25s');
sub('doors.js', "var ICON = { home: 'h', study: 'g', traj: 'up', att: 'c', fin: 'w' };",
  "var ICON = { home: 'h', study: 'g', traj: 'up', att: 'c', fin: 'w' };\nvar RAWICON = { traj: '<svg viewBox=\"0 0 24 24\" width=\"20\" height=\"20\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 17l5-6 4 3 6-8\"/><path d=\"M14 6h4v4\"/></svg>' };",
  'chart icon defined');
sub('doors.js', "ic(ICON[v], 'w-5 h-5')", "(RAWICON[v] || ic(ICON[v], 'w-5 h-5'))", 'chart icon used');
sub('results-hub.js', "if (rTab === 'graph') sub.innerHTML = trajB();",
  "if (rTab === 'graph') sub.innerHTML = (U.semesters || []).length ? trajB() : noResultsYet();",
  'empty results state wired');
sub('results-hub.js', "function fillResults() {",
  "function noResultsYet() {\n  return '<div class=\"card p-6 space-y-3 text-center\">' + (W.zumaImg ? W.zumaImg('welcome', 96) : '') +\n    '<div class=\"font-extrabold\">No results yet - and that is fine.</div>' +\n    '<p class=\"text-xs text-slate-500\">This house holds your trajectory, your target and the detective. Start with your target, then bring your first result when it lands.</p>' +\n    '<div class=\"flex gap-2\"><button class=\"btn2 flex-1\" onclick=\"rTabSet(\\'tgt\\')\">Set my target</button><button class=\"btn flex-1\" onclick=\"rTabSet(\\'calc\\')\">Upload results</button></div></div>';\n}\nfunction fillResults() {",
  'empty results state added');
