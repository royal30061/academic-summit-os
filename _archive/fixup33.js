const fs = require('fs');
function subFile(file, from, to, label) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
/* ---- doors.js: role-aware nav + safe lecturer routing ---- */
subFile('doors.js', "var ORDER = ['home', 'study', 'traj', 'att', 'fin'];",
  "var ORDER = (U && U.role === 'lecturer') ? ['home', 'roster', 'reps', 'prof'] : ['home', 'study', 'traj', 'att', 'fin'];",
  'lecturer order');
subFile('doors.js', "var LABEL = { home: 'Home', study: 'Study', traj: 'Results', att: 'Attend', fin: 'Finance' };",
  "var LABEL = { home: 'Home', study: 'Study', traj: 'Results', att: 'Attend', fin: 'Finance', roster: 'Roster', reps: 'Records', prof: 'Profile' };",
  'lecturer labels');
subFile('doors.js', "var CHART = '<svg viewBox=\"0 0 24 24\" class=\"w-5 h-5\"",
  "var ICONX = {\n" +
  "  roster: S0 + '<path d=\"M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2\"/><circle cx=\"10\" cy=\"7\" r=\"4\"/><path d=\"M23 21v-2a4 4 0 0 0-3-3.87\"/><path d=\"M16 3.13a4 4 0 0 1 0 7.75\"/></svg>',\n" +
  "  reps: S0 + '<path d=\"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z\"/><path d=\"M9 10l2 2 4-4\"/></svg>',\n" +
  "  prof: S0 + '<path d=\"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2\"/><circle cx=\"12\" cy=\"7\" r=\"4\"/></svg>'\n" +
  "};\n" +
  "var CHART = '<svg viewBox=\"0 0 24 24\" class=\"w-5 h-5\"",
  'lecturer glyphs');
subFile('doors.js', "var S = '<svg viewBox=\"0 0 24 24\" style=\"width:20px;height:20px\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">';",
  "var S = '<svg viewBox=\"0 0 24 24\" style=\"width:20px;height:20px\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\">';\nvar S0 = S;",
  'S0 alias');
subFile('doors.js', "ICONS[v] + '<span class=\"text-[10px] font-bold\">' + LABEL[v] + '</span></button>';",
  "(ICONX[v] || ICONS[v] || CHART) + '<span class=\"text-[10px] font-bold\">' + LABEL[v] + '</span></button>';",
  'glyph fallback chain');
subFile('doors.js', "return '<button type=\"button\" data-n=\"' + v + '\" onclick=\"go(\\'' + v + '\\')\"",
  "return '<button type=\"button\" data-n=\"' + v + '\" onclick=\"' + ((U && U.role === 'lecturer') ? 'lectGo(\\'' + v + '\\')' : 'go(\\'' + v + '\\')') + '\"'",
  'lecturer safe routing');
subFile('doors.js', "function paint() {",
  "W.lectGo = function (k) {\n" +
  "  var m = { home: ['home'], roster: ['roster'], reps: ['reps', 'req', 'home'], prof: ['prof', 'profile', 'home'] };\n" +
  "  var c = m[k] || ['home'];\n" +
  "  for (var i = 0; i < c.length; i++) if (V[c[i]]) { W.go(c[i]); return; }\n" +
  "  W.go('home');\n" +
  "};\n" +
  "function paint() {",
  'lectGo resolver');
/* ---- tune.js: the ? returns to lecturers ---- */
subFile('tune.js', "if (f) f.style.display = (U && U.role === 'lecturer') ? 'none' : '';",
  "if (f) f.style.display = '';",
  'question mark for lecturers');
/* ---- coach.js: lecturer tip - how to reach the profile ---- */
subFile('coach.js', "{ id: 'profile', title: 'Teaching profile',",
  "{ id: 'profnav', title: 'Your profile', pitch: 'Tap the avatar with your initials at the top-right - your teaching courses, roster tools and account settings all live behind it.', cta: 'Open profile', go: function () { go('prof'); } },\n    { id: 'profile', title: 'Teaching profile',",
  'profile-access tip');
