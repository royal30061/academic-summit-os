const fs = require('fs');
let s = fs.readFileSync('tune.js', 'utf8');
function sub(from, to, label) {
  if (s.indexOf(to) > -1) { console.log('tune.js: ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log('tune.js: ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  s = s.split(from).join(to);
  console.log('tune.js: ' + label + ' applied');
}
/* 1: a string is not a Node - insertAdjacentHTML is the honest tool */
sub("d.appendChild(W.zumaImg ? W.zumaImg('read', 44) : document.createTextNode(''));",
    "if (W.zumaImg) d.insertAdjacentHTML('beforeend', W.zumaImg('read', 44));",
    'zuma enters as HTML, not as a fake Node');
/* 2: home2 v3 already owns the target strip - tune defers to it */
sub("if (!m.querySelector('[data-tgt-strip]')) {",
    "if (!m.querySelector('[data-tgt-strip]') && (m.textContent || '').indexOf('not a figure, a habit') < 0) {",
    'defer to the native strip');
/* 3: the cleanup pass - dedupe strips, silence the stuttering subtitle */
sub("var goB = W.go;",
    "function cleanHome() {\n" +
    "  var m = $('main'); if (!m) return;\n" +
    "  var grad = m.querySelector('button.grad');\n" +
    "  if (grad) {\n" +
    "    var big = null, small = null;\n" +
    "    Array.prototype.forEach.call(grad.querySelectorAll('div'), function (d2) {\n" +
    "      var st = d2.getAttribute('style') || '';\n" +
    "      if (st.indexOf('22px') > -1) big = d2;\n" +
    "      if (st.indexOf('13px') > -1) small = d2;\n" +
    "    });\n" +
    "    if (big && small && big.textContent.trim() === small.textContent.trim()) small.style.display = 'none';\n" +
    "  }\n" +
    "  var strips = [];\n" +
    "    Array.prototype.forEach.call(m.querySelectorAll('.card, button'), function (n) {\n" +
    "    if ((n.textContent || '').indexOf('not a figure, a habit') > -1 && !n.querySelector('.card')) strips.push(n);\n" +
    "  });\n" +
    "  for (var i = 1; i < strips.length; i++) if (strips[i].parentNode) strips[i].parentNode.removeChild(strips[i]);\n" +
    "}\n" +
    "var goB = W.go;",
    'cleanHome defined');
sub("setTimeout(function () { if (v === 'home') tuneHome(); if (v === 'traj') tuneResults(); }, 160);",
    "setTimeout(function () { if (v === 'home') { tuneHome(); cleanHome(); } if (v === 'traj') tuneResults(); }, 160);",
    'cleanup wired to home');
fs.writeFileSync('tune.js', s);
