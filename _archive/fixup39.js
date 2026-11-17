const fs = require('fs');
function subFile(file, from, to, label) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
subFile('plan.js', 'W.timerStart = function (code, sessions) {',
  'W.timerStart = function (code, sessions, minOverride) {', 'timerStart accepts minutes');
subFile('plan.js', 'var plan = U.studyPlan, ms = plan.focusMin * MIN;',
  'var plan = U.studyPlan, ms = (minOverride || +(localStorage.getItem("as_focus_min") || 0) || plan.focusMin) * MIN;',
  'timer opens at planned/remembered minutes');
subFile('home2.js', 'function home2() {',
  "function home2() {\nif (U && U.role === 'lecturer') return oldHome.apply(this, arguments);",
  'lecturers never see the student home');
subFile('read.js', "onclick=\"go(\\'prof\\')\" class=\"flex items-center gap-2.5 pl-2",
  "onclick=\"go(\\'aprof\\')\" class=\"flex items-center gap-2.5 pl-2", 'avatar opens academic profile');
subFile('tune.js', "if (!sheetFree() || studiedToday() || !hourPassed('as_welc_last')) return;",
  "if (!sheetFree() || (localStorage.getItem('as_welc_day') === new Date().toDateString())) return;",
  'welcome once per day');
subFile('tune.js', "lsSet('as_welc_last', String(Date.now()));",
  "lsSet('as_welc_last', String(Date.now())); lsSet('as_welc_day', new Date().toDateString());",
  'welcome day stamp');
