const fs = require('fs');
function sub(from, to, label) {
  let s = fs.readFileSync('homeflow.js', 'utf8');
  if (s.indexOf(to) > -1) return console.log(label + ': already applied');
  if (s.indexOf(from) === -1) { console.log('ANCHOR MISSING: ' + label); process.exitCode = 1; return; }
  fs.writeFileSync('homeflow.js', s.split(from).join(to));
  console.log(label + ': applied');
}
sub(
"  var el = Array.from(m.querySelectorAll('div,button,p')).find(function (n) {\n" +
"    var tx = (n.textContent || '').trim();\n" +
"    return tx.indexOf('not a figure') > -1 || tx.indexOf('Target CGPA') === 0;\n" +
"  });",
"  var cands = Array.from(m.querySelectorAll('div,button,p')).filter(function (n) {\n" +
"    var tx = (n.textContent || '').trim();\n" +
"    return tx.indexOf('not a figure') > -1 || tx.indexOf('Target CGPA') === 0;\n" +
"  });\n" +
"  var el = m.querySelector('[data-hf-banner]') || cands.filter(function (n) {\n" +
"    return !cands.some(function (o) { return o !== n && n.contains(o); });\n" +
"  })[0];\n" +
"  if (el && el.querySelector('.grad')) el = null;",
'banner: innermost match only');
sub(
"if (v === 'home') { tagHome(); applyBanner(); gateDone(); }",
"if (v === 'home') { [tagHome, applyBanner, gateDone].forEach(function (f) { try { f(); } catch (e) { console.error('home patch failed:', f.name, e); } }); }",
'home patches isolated');
