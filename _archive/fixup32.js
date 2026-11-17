const fs = require('fs');
function subFile(file, from, to, label) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
/* ---- tune.js: address helpers + role-aware welcome (splice the whole old welcome) ---- */
let t = fs.readFileSync('tune.js', 'utf8');
const wStart = t.indexOf('function welcome() {');
const wEndMark = 'scrubX(sh);';
const wEnd = t.indexOf(wEndMark, wStart);
if (wStart === -1 || wEnd === -1) { console.log('tune.js: WELCOME SPLICE ANCHOR MISSING'); process.exitCode = 1; }
else if (t.indexOf('function address()') === -1) {
  const NEW =
    "function surname() {\n" +
    "  var parts = ((U.name || (U.profile && U.profile.name) || '') + '').trim().split(/\\s+/);\n" +
    "  return parts.length > 1 ? parts[parts.length - 1] : (parts[0] || 'there');\n" +
    "}\n" +
    "function address() {\n" +
    "  var raw = (U.lecTitle || (U.lec && U.lec.title) || (U.profile && U.profile.title) || '') + '';\n" +
    "  var map = { sir: 'Sir', ma: 'Ma', dr: 'Dr', prof: 'Prof' };\n" +
    "  var m = map[raw.toLowerCase()];\n" +
    "  if (m === 'Sir' || m === 'Ma') return m;\n" +
    "  if (m) return m + ' ' + surname();\n" +
    "  if (raw) return raw + ' ' + surname();\n" +
    "  return surname();\n" +
    "}\n" +
    "W.askAddress = function (v) { U.lecTitle = v; save(); closeSheet(); lsSet('as_welc_last', '0'); W._welcThisOpen = 0; setTimeout(welcome, 400); };\n" +
    "function fabRule() {\n" +
    "  var f = Array.from(document.querySelectorAll('button')).find(function (b) { return (b.textContent || '').trim() === '?'; });\n" +
    "  if (f) f.style.display = (U && U.role === 'lecturer') ? 'none' : '';\n" +
    "}\n" +
    "function welcome() {\n" +
    "  if (!sheetFree() || studiedToday() || !hourPassed('as_welc_last')) return;\n" +
    "  var sh = $('sheet'); if (!sh) return;\n" +
    "  lsSet('as_welc_last', String(Date.now()));\n" +
    "  W._welcThisOpen = 1;\n" +
    "  var hr = new Date().getHours();\n" +
    "  var gr = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';\n" +
    "  var lec = U.role === 'lecturer';\n" +
    "  if (lec && !U.lecTitle && !lsGet('as_addr_asked')) {\n" +
    "    lsSet('as_addr_asked', '1');\n" +
    "    sh.innerHTML = '<div class=\"fixed inset-0 flex flex-col\" style=\"background:var(--card);z-index:9995\">' +\n" +
    "      '<div class=\"flex-1 grid place-items-center p-6\">' + (W.zumaImg ? W.zumaImg('welcome', 180) : '') + '</div>' +\n" +
    "      '<div class=\"space-y-3 px-7 text-left\" style=\"padding-bottom:calc(env(safe-area-inset-bottom,0px) + 26px)\">' +\n" +
    "      '<div class=\"font-extrabold text-2xl\">How should I call you?</div>' +\n" +
    "      '<p class=\"text-sm\" style=\"color:var(--mut)\">Zuma likes to greet properly.</p>' +\n" +
    "      '<div class=\"grid grid-cols-4 gap-2\">' + ['Dr', 'Prof', 'Sir', 'Ma'].map(function (x) {\n" +
    "        return '<button type=\"button\" class=\"btn2 py-3\" onclick=\"askAddress(\\'' + x.toLowerCase() + '\\')\">' + x + '</button>';\n" +
    "      }).join('') + '</div>' +\n" +
    "      '<button type=\"button\" class=\"btn2 w-full\" onclick=\"askAddress(\\'\\')\">Use my name</button>' +\n" +
    "      '</div></div>';\n" +
    "    scrubX(sh);\n" +
    "    return;\n" +
    "  }\n" +
    "  var who = lec ? address() : (((U.name || (U.profile && U.profile.name) || '') + '').trim().split(/\\s+/)[0] || 'there');\n" +
    "  var c = lec ? null : nextCourse();\n" +
    "  sh.innerHTML = '<div class=\"fixed inset-0 flex flex-col\" style=\"background:var(--card);z-index:9995\">' +\n" +
    "    '<div class=\"flex-1 grid place-items-center p-6\">' + (W.zumaImg ? W.zumaImg('welcome', 200) : '') + '</div>' +\n" +
    "    '<div class=\"space-y-3 px-7 text-left\" style=\"padding-bottom:calc(env(safe-area-inset-bottom,0px) + 26px)\">' +\n" +
    "    '<div class=\"font-extrabold text-2xl\">' + gr + ', ' + esc(who) + '.</div>' +\n" +
    "    '<p class=\"text-sm\" style=\"color:var(--mut)\">' + (lec ? 'Your console is ready. The class moves when you say.' : (c ? 'Today we start with ' + esc(c.code) + '. I have been waiting at the trailhead.' : 'I have been waiting at the trailhead.')) + '</p>' +\n" +
    "    (lec ? '<button type=\"button\" class=\"btn w-full py-3\" onclick=\"closeSheet();go(\\'home\\')\">Open attendance console</button>'\n" +
    "         : '<button type=\"button\" class=\"btn w-full py-3\" onclick=\"closeSheet();go(\\'sess\\')\">Start today\\'s session</button>') +\n" +
    "    '<button type=\"button\" class=\"btn2 w-full\" onclick=\"closeSheet()\">Just browse</button>' +\n" +
    "    '</div></div>';\n" +
    "  scrubX(sh);\n" +
    "}";
  t = t.slice(0, wStart) + NEW + t.slice(wEnd + wEndMark.length);
  console.log('tune.js: welcome replaced with role-aware version');
}
subFile('tune.js', "W.zumaRemind = function () {",
  "W.zumaRemind = function () {\n  if (U && U.role === 'lecturer') return;", 'remind skips lecturers');
subFile('tune.js', "setTimeout(function () { fabRule(); if (v === 'home' || v === 'study') cleanHome(); }, 160);",
  "setTimeout(function () { fabRule(); if (v === 'home' || v === 'study') cleanHome(); }, 160);", 'fabRule in go (noop if present)');
if (t.indexOf('fabRule(); if (v ===') === -1) {
  t = t.split("setTimeout(function () { if (v === 'home' || v === 'study') cleanHome(); }, 160);")
       .join("setTimeout(function () { fabRule(); if (v === 'home' || v === 'study') cleanHome(); }, 160);");
  console.log('tune.js: fabRule wired into go');
}
if (t.indexOf('setTimeout(function () { fabRule(); welcome(); }, 700);') === -1) {
  t = t.split('setTimeout(welcome, 700);').join('setTimeout(function () { fabRule(); welcome(); }, 700);');
  console.log('tune.js: fabRule wired into start');
}
fs.writeFileSync('tune.js', t);
/* ---- coach.js: the closing promise ---- */
subFile('coach.js', 'W.coachShow = function (force) {',
  "function closing() {\n" +
  "  var sh = $('sheet'); if (!sh) return;\n" +
  "  var lec = U.role === 'lecturer';\n" +
  "  sh.innerHTML = '<div class=\"fixed inset-0\" style=\"background:rgba(2,6,23,.45);z-index:9989\" onclick=\"closeSheet()\"></div>' +\n" +
  "    '<div class=\"fixed inset-x-0 bottom-0\" style=\"z-index:9990;background:var(--card);border-top:1px solid var(--bd);border-radius:28px 28px 0 0;box-shadow:0 -18px 50px rgba(0,0,0,.28);max-height:62vh;overflow-y:auto\">' +\n" +
  "    '<div style=\"width:44px;height:4px;border-radius:2px;background:var(--bd);margin:10px auto 0\"></div>' +\n" +
  "    '<div class=\"p-6 space-y-4\" style=\"padding-bottom:calc(env(safe-area-inset-bottom,0px) + 18px)\">' +\n" +
  "    '<div class=\"flex items-end gap-4\"><div class=\"flex-1 space-y-2 text-left\">' +\n" +
  "    '<div class=\"font-extrabold text-xl\">That\\'s the whole trail.</div>' +\n" +
  "    '<p class=\"text-sm\" style=\"color:var(--mut)\">' + (lec ? 'I\\'ll be waiting in your console when you need me.' : 'I\\'ll be waiting behind the ? for you when you need me.') + '</p></div>' +\n" +
  "    (W.zumaImg ? W.zumaImg('welcome', 96) : '') + '</div>' +\n" +
  "    '<button type=\"button\" class=\"btn w-full py-3\" onclick=\"closeSheet()\">Got it</button>' +\n" +
  "    '</div></div>';\n" +
  "}\n" +
  "W.coachShow = function (force) {", 'closing defined');
subFile('coach.js', "if (!t) t = (TIPS[U.role] || TIPS.student)[0];\n  if (!t) return;",
  "if (!t) { closing(); return; }", 'empty tour closes with the promise');
subFile('coach.js', "W.coachGo = function (id) { closeSheet(); var t = find(id); if (t) { markKnown(id); t.go(); } };",
  "W.coachGo = function (id) { closeSheet(); var t = find(id); if (t) { markKnown(id); t.go(); if (!listFor().length) setTimeout(function () { var sh = $('sheet'); if (sh && !sh.innerHTML.trim()) W.coachShow(); }, 600); } };",
  'last tip flows into the closing');
