const fs = require('fs');
let s = fs.readFileSync('core.js', 'utf8');
const MERGE = "function mergeInto(t, g) {\nvar have = {}, added = 0, conflict = 0, pend = {};\nt.courses = t.courses || []; t.pending = t.pending || [];\nt.courses.forEach(function (c) { have[c.code] = c; });\ng.courses.forEach(function (c) {\nvar o = have[c.code];\nif (!o) { t.courses.push(c); have[c.code] = c; added++; }\nelse if (o.score !== c.score) conflict++;\n});\nt.pending.concat(g.pending || []).forEach(function (p) { if (!have[p.code]) pend[p.code] = p; });\nt.pending = Object.keys(pend).map(function (k) { return pend[k]; });\nreturn { added: added, conflict: conflict };\n}\n";
let n = 0;
if (s.indexOf('function mergeInto') === -1) { s = s.replace(/function splitByPortal/, MERGE + 'function splitByPortal'); n++; console.log('mergeInto inserted'); }
if (s.indexOf('var stats = { added: 0, conflict: 0 };') === -1) {
  if (s.replace(/if \s*\(!built \|\| !built\.length\) return;/, 'var stats = { added: 0, conflict: 0 };\nif (!built || !built.length) return stats;') !== s) { s = s.replace(/if \s*\(!built \|\| !built\.length\) return;/, 'var stats = { added: 0, conflict: 0 };\nif (!built || !built.length) return stats;'); n++; console.log('stats declared'); }
  else console.log('ANCHOR STILL MISSING: stats line');
}
if (s.indexOf('return stats;') === -1) {
  const i = s.indexOf('if (blob'), j = s.indexOf('\n}', i);
  if (i > -1 && j > i) { s = s.slice(0, j) + '\nreturn stats;' + s.slice(j); n++; console.log('return stats inserted'); }
  else console.log('ANCHOR STILL MISSING: blob close');
}
if (s.indexOf('showToast(msg() + extra)') === -1) {
  const t = s.replace(/refreshCarry\(\); save\(\);(\s*)go\('home'\);(\s*)showToast\(msg\(\)\);/, 'verifyPortalGPAs();\nrefreshCarry(); save();$1go(\'home\');$2showToast(msg() + extra);');
  if (t !== s) { s = t; n++; console.log('verify+toast applied'); } else console.log('ANCHOR STILL MISSING: verify+toast');
}
fs.writeFileSync('core.js', s);
console.log('fixup3: ' + n + ' repairs applied');
