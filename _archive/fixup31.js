const fs = require('fs');
let s = fs.readFileSync('tune.js', 'utf8');
function sub(from, to, label) {
  if (s.indexOf(to) > -1) { console.log('tune.js: ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log('tune.js: ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  s = s.split(from).join(to);
  console.log('tune.js: ' + label + ' applied');
}
/* 1: strip inline colours so the emerald rules own the strip */
sub("keep.classList.add('mk-strip');",
    "keep.classList.add('mk-strip');\n    keep.style.color = '';\n    Array.prototype.forEach.call(keep.querySelectorAll('*'), function (x) { x.style.color = ''; });",
    'inline colours cleared');
/* 2: a correct, mode-aware green rule, appended last so it wins */
sub("var goB = W.go;",
    "var st2 = document.createElement('style');\n" +
    "st2.textContent = '.mk-strip,.mk-strip *{color:#047857 !important}' +\n" +
    "  'html.dark .mk-strip,html.dark .mk-strip *,.dark .mk-strip,.dark .mk-strip *{color:#34d399 !important}';\n" +
    "document.head.appendChild(st2);\n" +
    "var goB = W.go;",
    'green rule, both modes');
/* 3: dedupe before the eye can vote - requestAnimationFrame, then the old timers */
sub("setTimeout(function () { if (v === 'home' || v === 'study') cleanHome(); }, 160);",
    "requestAnimationFrame(function () { if (v === 'home' || v === 'study') cleanHome(); });\n  setTimeout(function () { if (v === 'home' || v === 'study') cleanHome(); }, 160);",
    'dedupe before paint');
fs.writeFileSync('tune.js', s);
