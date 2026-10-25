const fs = require('fs');
function sub(file, from, to, label) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
/* 1+2+4+5+6: the lighting rig, appended to the constitution */
sub('ui.js',
  "'.mk-burst span{font-size:34px;animation:mkPop .9s both}';",
  "'.mk-burst span{font-size:34px;animation:mkPop .9s both}' +\n" +
  "  'html::before,html::after{content:\"\";position:fixed;pointer-events:none;z-index:-1;border-radius:50%}' +\n" +
  "  'html::before{top:-140px;left:-140px;width:420px;height:420px;background:radial-gradient(circle,rgba(16,185,129,.08),transparent 65%)}' +\n" +
  "  'html::after{bottom:-160px;right:-160px;width:460px;height:460px;background:radial-gradient(circle,rgba(45,212,191,.06),transparent 65%)}' +\n" +
  "  '.dark::before{background:radial-gradient(circle,rgba(16,185,129,.14),transparent 65%)}' +\n" +
  "  '.dark::after{background:radial-gradient(circle,rgba(45,212,191,.10),transparent 65%)}' +\n" +
  "  '.card{box-shadow:0 8px 24px rgba(31,41,55,.06),inset 0 1px 0 rgba(255,255,255,.55)}' +\n" +
  "  '.dark .card{box-shadow:0 12px 32px rgba(0,0,0,.35),inset 0 1px 0 rgba(255,255,255,.04)}' +\n" +
  "  '.d-ring svg{filter:drop-shadow(0 0 5px rgba(16,185,129,.4))}' +\n" +
  "  '.d-ring circle.fg{stroke:url(#orbGrad) !important}' +\n" +
  "  '#main svg circle[stroke=\"#10b981\"]{stroke:url(#orbGrad)}' +\n" +
  "  '#main svg[viewBox=\"0 0 120 120\"]{filter:drop-shadow(0 0 10px rgba(16,185,129,.30))}' +\n" +
  "  '#main svg circle[stroke=\"#f59e0b\"]{filter:drop-shadow(0 0 6px rgba(245,158,11,.45))}' +\n" +
  "  '.btn:active,.btn2:active{box-shadow:0 0 0 3px rgba(52,211,153,.28),0 0 22px rgba(16,185,129,.35)}' +\n" +
  "  '.zuma svg{filter:drop-shadow(0 6px 12px rgba(31,41,55,.18))}' +\n" +
  "  '.dark .zuma svg{filter:drop-shadow(0 8px 16px rgba(0,0,0,.45))}';",
  'orblight css');
/* the shared gradient every ring borrows */
sub('ui.js',
  "document.head.appendChild(st);\n})();",
  "document.head.appendChild(st);\nvar _od = document.createElement('div');\n" +
  "_od.innerHTML = '<svg width=\"0\" height=\"0\" style=\"position:absolute\" aria-hidden=\"true\"><defs><linearGradient id=\"orbGrad\" x1=\"0%\" y1=\"0%\" x2=\"100%\" y2=\"100%\"><stop offset=\"0%\" stop-color=\"#10b981\"/><stop offset=\"100%\" stop-color=\"#22d3ee\"/></linearGradient></defs></svg>';\n" +
  "if (document.body && _od.firstChild) document.body.appendChild(_od.firstChild);\n})();",
  'orb gradient defs');
/* 3: the splash breathes once */
sub('splash.js',
  "'#as-splash.off{opacity:0;pointer-events:none}' +",
  "'#as-splash.off{opacity:0;pointer-events:none}' +\n" +
  "  '.as-orb{position:absolute;top:50%;left:50%;width:190px;height:190px;margin:-95px 0 0 -95px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#6ee7b7,#10b981 55%,rgba(16,185,129,0) 74%);box-shadow:0 0 70px rgba(16,185,129,.35);opacity:0;animation:asBreath 1.12s ease-out both;z-index:-1}' +\n" +
  "  '@keyframes asBreath{0%{transform:scale(.85);opacity:0}60%{opacity:.85}100%{transform:scale(1);opacity:.5}}' +",
  'orb breath css');
sub('splash.js',
  "d.innerHTML = '<div style=\"position:relative;display:flex;flex-direction:column;align-items:center;gap:14px\">' +",
  "d.innerHTML = '<div style=\"position:relative;display:flex;flex-direction:column;align-items:center;gap:14px\">' + '<span class=\"as-orb\"></span>' +",
  'orb element');
