const fs = require('fs');
let s = fs.readFileSync('doors.js', 'utf8');
function sub(from, to, label) {
  if (s.indexOf(to) > -1) { console.log('doors.js: ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log('doors.js: ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  s = s.split(from).join(to);
  console.log('doors.js: ' + label + ' applied');
}
/* 1: the amputated string, reattached (line 41) */
sub("+ '\"' + class=\"bn", "+ '\" class=\"bn", 'string reattached');
/* 2: the lecturer glyphs, born at last (S exists in v2) */
sub("var ICONS = {",
  "var ICONX = {\n" +
  "  roster: S + '<path d=\"M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2\"/><circle cx=\"10\" cy=\"7\" r=\"4\"/><path d=\"M23 21v-2a4 4 0 0 0-3-3.87\"/><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/></svg>',\n" +
  "  reps: S + '<path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"/><path d=\"M9 10l2 2 4-4\"/></svg>',\n" +
  "  prof: S + '<path d=\"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/></svg>'\n" +
  "};\n" +
  "var ICONS = {",
  'ICONX defined');
/* 3: CHART alias for the fallback chain */
sub("};\nvar ORDER", "};\nvar CHART = ICONS.traj;\nvar ORDER", 'CHART aliased');
/* 4: the ? is guaranteed to exist, whatever coach.js decides */
sub("var ren = { acad: 'Study',",
  "var fb = Array.from(document.querySelectorAll('button')).find(function (x) { return (x.textContent || '').trim() === '?'; });\n" +
  "  if (!fb && U) {\n" +
  "    fb = document.createElement('button');\n" +
  "    fb.type = 'button'; fb.textContent = '?';\n" +
  "    fb.setAttribute('aria-label', 'Help and tips');\n" +
  "    document.body.appendChild(fb);\n" +
  "    fb.style.cssText = 'position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 92px);width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#059669,#0d9488);color:#fff;font-size:37px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 26px rgba(5,150,105,.45);z-index:60;cursor:pointer;border:none';\n" +
  "    fb.onclick = function () { if (W.coachShow) W.coachShow(); };\n" +
  "  }\n" +
  "  var ren = { acad: 'Study',",
  'FAB guaranteed');
fs.writeFileSync('doors.js', s);
