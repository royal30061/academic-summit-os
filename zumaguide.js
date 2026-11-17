/* Academic Summit - zumaguide.js v1: Zuma, your Academic Summit tour guide.
   The floating "?" opens a bottom panel: a personal greeting, a search box, and answers that say
   what a feature does, where it lives, the exact steps, and a button that takes you there.
   It knows which screen you are on. The answers live in the KB list at the top: edit a step there
   if a screen changes. Delete the script tag and the old "?" panel returns.
   Load near the end, after studyhub.js. */
(function () {
'use strict';
var W = window;
if (typeof document === 'undefined') return;
try { if (/[?&]zuma=off/.test(location.search)) return; } catch (e) {}

/* ---------- what Zuma knows (edit freely) ---------- */
var KB = [
  { id: 'upload', title: 'Upload your results', screen: 'results', keys: ['upload', 'import', 'results', 'portal', 'paste', 'scan', 'grades', 'add results', 'save results'],
    what: 'Reads the results page from your school portal and saves each course and grade, so your CGPA, trajectory and target use your real records.',
    where: 'Results, then Upload',
    steps: ['Tap Results in the bottom bar.', 'Open the Upload tab.', 'Copy your results page from the school portal and paste it in.', 'Check the courses and grades it found, then confirm.'],
    go: ['Results', 'Upload'], action: 'Open Upload' },
  { id: 'trajectory', title: 'GPA trajectory', screen: 'results', keys: ['trajectory', 'graph', 'chart', 'gpa', 'progress', 'semester', 'line', 'plot'],
    what: 'Shows how each course moved your GPA, with the all-A path as a dashed line so you can see where marks were lost.',
    where: 'Results, then Trajectory (also the GPA trajectory button on Home)',
    steps: ['Tap Results in the bottom bar.', 'Open the Trajectory tab.', 'Choose the level you want, such as 100L or 200L.', 'Tap a point to see the course and what it added.'],
    go: ['Results', 'Trajectory'], action: 'Open GPA Trajectory' },
  { id: 'cgpa', title: 'How your CGPA is calculated', screen: 'results', keys: ['calculate', 'cgpa', 'compute', 'average', 'work out', 'formula', 'how is'],
    what: 'Each grade is worth points (A is 5 down to F which is 0). Points times course units are added up and divided by your total units. Everything comes from results you saved.',
    where: 'The green card on Home, and Results, then Record',
    steps: ['Save your results first: Results, then Upload.', 'Your CGPA appears on the green card on Home.', 'Open Results, then Record to see the grades behind it.'],
    go: ['Results', 'Record'], action: 'Open Record' },
  { id: 'attendance', title: 'Mark attendance', screen: 'attend', keys: ['attendance', 'mark', 'attend', 'present', 'lecturer code', 'class', 'roll'],
    what: 'Records that you were in class, using the 5-digit code your lecturer calls out.',
    where: 'Attend in the bottom bar',
    steps: ['Tap Attend in the bottom bar.', 'Type the course code, for example POS 204.', 'Type the 5-digit code your lecturer calls out.', 'Tap Mark. Your record appears under My attendance.'],
    go: ['Attend'], action: 'Open Attend' },
  { id: 'course', title: 'See or add your courses', screen: 'study', keys: ['add', 'course', 'courses', 'register', 'registration', 'units', 'missing course'],
    what: 'Your courses come from your course registration and from results you import.',
    where: 'Study, then Courses',
    steps: ['Tap Study in the bottom bar.', 'Open Courses to see every registered course.', 'If a course is missing, import your results in Results, then Upload.'],
    go: ['Study', 'Courses'], action: 'Open Courses' },
  { id: 'timetable', title: 'Your timetable and campus events', screen: 'study', keys: ['timetable', 'schedule', 'lecture', 'lectures', 'venue', 'campus', 'event', 'events', 'next class'],
    what: 'Your weekly lecture timetable, a daily schedule, campus events and what is coming up.',
    where: 'Study, then Timetable & campus',
    steps: ['Tap Study in the bottom bar.', 'Open Timetable & campus.', 'Switch between Week and Day.', 'Tap Add a lecture to put a lecture on your timetable.'],
    go: ['Study', 'Timetable & campus'], action: 'Open Timetable' },
  { id: 'risk', title: 'Academic risk review', screen: 'home', keys: ['risk', 'warning', 'review', 'danger', 'neglect', 'threat', 'falling behind'],
    what: 'Points out courses and targets that need attention. What your records confirm is separated from what is only a prediction.',
    where: 'Home, under your CGPA card',
    steps: ['Open Home.', 'Under the green CGPA card, tap Risk review.'],
    go: ['Home', 'Risk review'], action: 'Open Risk review' },
  { id: 'weekly', title: 'Weekly report', screen: 'home', keys: ['weekly', 'report', 'week', 'summary', 'this week'],
    what: 'A summary of your week: sessions, study time, courses covered and what to focus on next.',
    where: 'Home, under your CGPA card',
    steps: ['Open Home.', 'Tap Weekly report.'],
    go: ['Home', 'Weekly report'], action: 'Open Weekly report' },
  { id: 'target', title: 'Set your target CGPA', screen: 'results', keys: ['target', 'goal', 'dream', 'aim', 'need', 'required', 'remaining'],
    what: 'Sets the CGPA you are aiming for and shows the average you need across your remaining units.',
    where: 'Results, then Target',
    steps: ['Tap Results in the bottom bar.', 'Open the Target tab.', 'Enter your target CGPA.'],
    go: ['Results', 'Target'], action: 'Open Target' },
  { id: 'detective', title: 'Result Detective', screen: 'results', keys: ['detective', 'portal changed', 'results missing', 'cgpa changed', 'not showing', 'missing grades', 'why did'],
    what: 'Works out what a changed portal CGPA means when your course grades are not showing yet.',
    where: 'Results, then Detective',
    steps: ['Tap Results in the bottom bar.', 'Open the Detective tab.', 'Enter your portal CGPA and follow the prompts.'],
    go: ['Results', 'Detective'], action: 'Open Detective' },
  { id: 'session', title: 'Start a study session', screen: 'study', keys: ['study', 'session', 'timer', 'focus', 'start', 'read', 'reading', 'revise', 'learn'],
    what: 'A focused timer for one course and topic. Only time the app is open and running counts, and 5 focused minutes keep your streak alive.',
    where: 'Study, then Today',
    steps: ['Tap Study in the bottom bar.', 'On Today, choose a course, a topic and how long.', 'Tap Start session.', 'When you finish, say how it went and save it.'],
    go: ['Study', 'Today'], action: 'Open Study' },
  { id: 'streak', title: 'Your study streak', screen: 'home', keys: ['streak', 'calendar', 'flame', 'consecutive', 'days in a row', 'missed day'],
    what: 'Counts the days in a row you studied. The streak calendar shows every active day, and a missed day can be made up.',
    where: 'The streak badge at the top of Home',
    steps: ['Open Home.', 'Tap the streak badge at the top, or the day streak chip.', 'In the calendar, tap a missed day from the last 7 days to make it up.'],
    go: ['Home'], action: 'Open Home' },
  { id: 'finance', title: 'Budget and spending', screen: 'finance', keys: ['budget', 'money', 'finance', 'expense', 'expenses', 'spending', 'allowance', 'cash'],
    what: 'Set your allowance, log what you spend and see what is left.',
    where: 'Finance in the bottom bar',
    steps: ['Tap Finance in the bottom bar.', 'Set your budget.', 'Log each expense as it happens.'],
    go: ['Finance'], action: 'Open Finance' },
  { id: 'theme', title: 'Light and dark mode', screen: 'home', keys: ['dark', 'light', 'theme', 'mode', 'night', 'brightness'],
    what: 'Switches the app between the warm light theme and the deep green dark theme.',
    where: 'The moon or sun icon at the top',
    steps: ['Tap the moon or sun icon at the top of any screen.'],
    go: null, action: null },
  { id: 'profile', title: 'Your profile', screen: 'home', keys: ['profile', 'avatar', 'name', 'account', 'initials', 'academic profile', 'log out', 'logout'],
    what: 'Your details, your academic profile and account options.',
    where: 'Your initials at the top right',
    steps: ['Tap your initials at the top right of Home.'],
    go: ['Home'], action: 'Open Home' }
];
var QUICK = {
  home: ['How do I check my GPA trajectory?', 'Where is my risk review?', 'How do I mark attendance?'],
  results: ['How do I upload my results?', 'How do I set a target CGPA?', 'What is the Result Detective?'],
  study: ['How do I see my timetable?', 'How do I start a study session?', 'How do I add a course?'],
  attend: ['How do I mark attendance?', 'Where is my streak?'],
  finance: ['How do I track my spending?', 'Where is my weekly report?'],
  any: ['How do I upload my results?', 'Where can I see my GPA trajectory?', 'How do I calculate my CGPA?', 'Where can I mark attendance?', 'How do I access my timetable?', 'Where can I see my academic risk report?']
};
var STOP = { the: 1, a: 1, an: 1, i: 1, my: 1, me: 1, do: 1, does: 1, how: 1, where: 1, what: 1, can: 1, is: 1, are: 1, to: 1, of: 1, on: 1, in: 1, for: 1, and: 1, or: 1, it: 1, see: 1, find: 1, check: 1, get: 1, open: 1, show: 1, want: 1, need: 1, please: 1, zuma: 1 };

/* ---------- helpers ---------- */
function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function vis(el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
function firstName() { try { return ((U.name || (U.profile && U.profile.name) || '') + '').trim().split(/\s+/)[0] || ''; } catch (e) { return ''; } }
function greet() { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }
function ctx() {
  try {
    var m = document.getElementById('main'), t = ((m && (m.innerText || m.textContent)) || '').slice(0, 500);
    if (/Results & Trajectory|GPA Trajectory|CGPA trajectory/i.test(t)) return 'results';
    if (/Mark attendance/i.test(t) && /My attendance/i.test(t)) return 'attend';
    if (/^\s*Study\b/.test(t) || /Timetable & campus/i.test(t)) return 'study';
    if (/Cumulative GPA|Good (morning|afternoon|evening)/i.test(t)) return 'home';
    if (/budget|expense|finance/i.test(t.slice(0, 120))) return 'finance';
  } catch (e) {}
  return 'any';
}
function search(q) {
  var text = norm(q).replace(/[^a-z0-9 &]/g, ' '), toks = text.split(' ').filter(function (w) { return w.length > 1 && !STOP[w]; }), c = ctx();
  if (!toks.length) return [];
  return KB.map(function (e) {
    var sc = 0, title = norm(e.title);
    e.keys.forEach(function (k) { if (k.indexOf(' ') > -1) { if (text.indexOf(k) > -1) sc += 4; } else if (toks.indexOf(k) > -1) sc += 3; else if (toks.some(function (t) { return t.length > 3 && k.length > 3 && (k.indexOf(t) === 0 || t.indexOf(k) === 0); })) sc += 2; });
    toks.forEach(function (t) { if (title.indexOf(t) > -1) sc += 2; });
    if (sc > 0 && e.screen === c) sc += 1;
    return { e: e, score: sc };
  }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; });
}

/* ---------- going there: tap the real buttons, in order ---------- */
function navBtn(label) {
  var bs = document.querySelectorAll('button,a,[role=button]');
  for (var i = 0; i < bs.length; i++) { var b = bs[i]; if (norm(b.textContent) === label && vis(b) && b.getBoundingClientRect().top > (W.innerHeight || 800) * 0.7) return b; }
  return null;
}
function clickExact(t) {
  t = norm(t); var els = document.querySelectorAll('button,[onclick],a,[role=button]'), exact = null, part = null, pl = 1e9;
  for (var i = 0; i < els.length; i++) {
    var el = els[i]; if (!vis(el) || (el.closest && el.closest('#zg-panel'))) continue; var x = norm(el.textContent);
    if (x === t) { exact = el; break; } if (x.indexOf(t) > -1 && x.length < pl) { part = el; pl = x.length; }
  }
  var hit = exact || part; if (hit) { hit.click(); return true; } return false;
}
function navTo(steps) {
  var i = 0, nb = navBtn(norm(steps[0]));
  if (nb) { nb.click(); i = 1; }
  (function next() { if (i >= steps.length) return; setTimeout(function () { if (!clickExact(steps[i - 0])) { /* the tab may already be showing */ } i++; next(); }, 280); })();
}

/* ---------- the panel ---------- */
var open = false, lastFocus = null;
function panelHtml(answerHtml) {
  var c = ctx(), name = firstName(), chips = (QUICK[c] || QUICK.any).concat(c === 'any' ? [] : []);
  var ctxLine = c === 'any' ? '' : '<div class="text-xs" style="color:var(--mut);margin:6px 0 2px">You are on ' + ({ home: 'Home', results: 'Results', study: 'Study', attend: 'Attend', finance: 'Finance' }[c]) + '. Popular here:</div>';
  return '<div id="zg-back" onclick="zgClose()" style="position:fixed;left:0;right:0;top:0;bottom:0;background:rgba(0,0,0,.45);z-index:99999"></div>' +
    '<div id="zg-panel" role="dialog" aria-modal="true" aria-label="Zuma, your tour guide" style="position:fixed;left:0;right:0;bottom:0;z-index:100000;max-height:82vh;overflow-y:auto;-webkit-overflow-scrolling:touch;border-radius:24px 24px 0 0;background:var(--card,#fff);color:inherit;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));box-shadow:0 -10px 40px rgba(0,0,0,.35)">' +
    '<div style="display:flex;align-items:flex-start;gap:10px"><div style="flex:none">' + (W.zumaImg ? W.zumaImg('welcome', 64) : '') + '</div>' +
    '<div style="flex:1;min-width:0;padding-top:4px"><div class="font-extrabold" style="font-size:15px;line-height:1.4">' + greet() + (name ? ', ' + esc(name) : '') + '. I\'m Zuma, your Academic Summit tour guide. What would you like to know today?</div></div>' +
    '<button onclick="zgClose()" aria-label="Close Zuma" style="flex:none;width:44px;height:44px;border-radius:50%;border:0;background:var(--sub);font-size:18px;font-weight:800;color:inherit">&times;</button></div>' +
    '<form onsubmit="return zgSearch()" style="display:flex;gap:8px;margin-top:12px"><input id="zg-in" type="search" enterkeyhint="search" autocomplete="off" aria-label="Ask Zuma a question" placeholder="Ask about any feature" class="inp" style="flex:1;min-width:0"><button type="submit" class="btn" style="min-height:44px;padding:0 16px">Search</button></form>' +
    '<div id="zg-out" aria-live="polite" style="margin-top:12px">' + (answerHtml || ctxLine + chipRow(chips)) + '</div></div>';
}
function chipRow(list) { return '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px">' + list.map(function (q) { return '<button class="btn2" style="min-height:40px;padding:0 12px;font-size:13px;text-align:left" onclick="zgAsk(\'' + esc(q).replace(/'/g, '&#39;') + '\')">' + esc(q) + '</button>'; }).join('') + '</div>'; }
function answerHtml(res, q) {
  if (!res.length) return '<div class="font-extrabold">I could not find that one.</div><div class="text-xs" style="color:var(--mut);margin:4px 0">Try a feature name, like timetable, attendance, trajectory or target. Or tap a question:</div>' + chipRow(QUICK.any);
  var e = res[0].e, rel = res.slice(1, 3).map(function (x) { return 'How do I use ' + x.e.title.toLowerCase() + '?'; });
  return '<div class="font-extrabold" style="font-size:16px">' + esc(e.title) + '</div>' +
    '<div class="text-sm" style="margin:6px 0">' + esc(e.what) + '</div>' +
    '<div class="text-xs font-extrabold" style="color:#059669">Where to find it</div><div class="text-sm" style="margin-bottom:6px">' + esc(e.where) + '</div>' +
    '<div class="text-xs font-extrabold" style="color:#059669">Steps</div><ol class="text-sm" style="margin:4px 0 10px;padding-left:20px">' + e.steps.map(function (s) { return '<li style="margin-bottom:4px">' + esc(s) + '</li>'; }).join('') + '</ol>' +
    (e.go ? '<button class="btn w-full" onclick="zgGo(\'' + e.id + '\')">' + esc(e.action || 'Take me there') + '</button>' : '') +
    (rel.length ? '<div class="text-xs" style="color:var(--mut);margin-top:10px">You might also ask:</div>' + chipRow(rel) : '');
}
function paintOut(html) { var o = document.getElementById('zg-out'); if (o) o.innerHTML = html; }
function build() {
  var host = document.getElementById('zg-host');
  if (!host) { host = document.createElement('div'); host.id = 'zg-host'; document.body.appendChild(host); }
  return host;
}
W.zgOpen = function () { if (open) return; open = true; lastFocus = document.activeElement; build().innerHTML = panelHtml(''); setTimeout(function () { var i = document.getElementById('zg-in'); if (i && i.focus) i.focus(); }, 60); };
W.zgClose = function () { open = false; var h = document.getElementById('zg-host'); if (h) h.innerHTML = ''; try { if (lastFocus && lastFocus.focus) lastFocus.focus(); } catch (e) {} };
W.zgSearch = function () { var i = document.getElementById('zg-in'), q = i ? i.value : ''; if (norm(q)) paintOut(answerHtml(search(q), q)); return false; };
W.zgAsk = function (q) { var i = document.getElementById('zg-in'); if (i) i.value = q; paintOut(answerHtml(search(q), q)); };
W.zgGo = function (id) { var e = KB.filter(function (x) { return x.id === id; })[0]; if (!e || !e.go) return; W.zgClose(); navTo(e.go); };
W.__zg = { search: search, ctx: ctx, panelHtml: panelHtml, answerHtml: answerHtml, KB: KB };

/* ---------- the "?" button: same place, now it opens Zuma, and it stays out of the way ---------- */
document.addEventListener('click', function (e) {
  try {
    var b = e.target && e.target.closest ? e.target.closest('button') : null;
    if (b && norm(b.textContent) === '?' && !(b.closest && b.closest('#zg-panel'))) { e.preventDefault(); e.stopImmediatePropagation(); W.zgOpen(); }
  } catch (err) {}
}, true);
document.addEventListener('keydown', function (e) { if (open && (e.key === 'Escape' || e.key === 'Esc')) W.zgClose(); });
try {
  var st = document.createElement('style');
  st.textContent = '.zg-fab{width:50px !important;height:50px !important;min-width:50px !important;font-size:20px !important;right:12px !important;bottom:calc(86px + env(safe-area-inset-bottom,0px)) !important;transition:opacity .25s}.zg-scrolling .zg-fab{opacity:.3}#main{padding-bottom:130px}';
  document.head.appendChild(st);
  var sc = null; window.addEventListener('scroll', function () { document.body.classList.add('zg-scrolling'); clearTimeout(sc); sc = setTimeout(function () { document.body.classList.remove('zg-scrolling'); }, 700); }, true);
  setInterval(function () { var bs = document.querySelectorAll('button'); for (var i = 0; i < bs.length; i++) if (norm(bs[i].textContent) === '?' && !(bs[i].closest && bs[i].closest('#zg-panel')) && !bs[i].classList.contains('zg-fab')) { bs[i].classList.add('zg-fab'); bs[i].setAttribute('aria-label', 'Ask Zuma'); } }, 1500);
} catch (e) {}
})();
