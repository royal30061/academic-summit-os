const fs = require('fs');
function sub(file, from, to, label) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
/* 1: notice faces the words again */
sub('zuma.js', "var src = (W.ZUMA_IMG || {})[MAP[pose] || 'welcome'];",
  "var src = (W.ZUMA_IMG || {})[MAP[pose] || 'welcome'];\n  var flip = (MAP[pose] === 'notice') ? 'transform:scaleX(-1);' : '';",
  'flip var');
sub('zuma.js', "px;object-fit:contain\">",
  "px;object-fit:contain;' + flip + '\">",
  'flip applied');
/* 2: no stuttering hero subtitle */
sub('home2.js', "esc(c.code) + (c.units ? ' | ' + esc(c.units) + ' units' : '')",
  "(c.title ? esc(c.code) + (c.units ? ' | ' + esc(c.units) + ' units' : '') : (c.units ? esc(c.units) + ' units' : ''))",
  'subtitle fallback');
/* 3: esc that actually escapes */
sub('home2.js", "{ '&': '&', '<': '<', '>': '>', '\"': '\"' }",
  "{ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;' }",
  'real escaping');
/* 4: chips in caps */
sub('home2.js', "esc(c.code.replace(/[^A-Za-z]/g, '').slice(0, 3))",
  "esc(c.code.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase())",
  'chip caps');
/* 5: the tip returns to the home card */
sub('home2.js', "h += '<button class=\"card w-full flex items-center justify-between text-left\" onclick=\"h2go('att')\"",
  "h += (W.pickTip ? '<p class=\"text-xs\" style=\"color:var(--mut);font-style:italic\">' + W.pickTip() + '</p>' : '') + '<button class=\"card w-full flex items-center justify-between text-left\" onclick=\"h2go('att')\"",
  'time-aware tip on home');
/* 6: play opens the Reading page */
sub('home2.js', "onclick=\"' + (locked ? 'h2locked()' : 'h2go(\\'acad\\')') + '\"",
  "onclick=\"' + (locked ? 'h2locked()' : 'h2go(\\'read\\')') + '\"",
  'play door to Reading');
sub('home2.js', "var DOORS = { acad: ['academics', 'acad', 'courses', 'study'], att: ['attendance', 'att', 'attend'], plan: ['planner', 'plan'] };",
  "var DOORS = { acad: ['academics', 'acad', 'courses', 'study'], att: ['attendance', 'att', 'attend'], plan: ['planner', 'plan'], read: ['read'] };",
  'read door registered');
