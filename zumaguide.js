/* Academic Summit - zumaguide.js v1: the ? button opens Zuma, an interactive guide
   with natural-language search, real routes and take-me-there shortcuts.
   Also: governs the legacy GPA Trajectory intro sheet (separate experience,
   persisted dismissal, CTA wired to the real feature) and warms up the
   attendance distance consent with Zuma's voice. */
(function () {
'use strict';
var W = window;
if (typeof document === 'undefined') return;
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function norm(s) { return String(s || '').toLowerCase().replace(/\s+/g, ' '); }
function toast(m, k) { if (W.showToast) W.showToast(m, k); }
function zuma(p, px) { return W.zumaImg ? W.zumaImg(p, px) : ''; }
function UU() { return (typeof U !== 'undefined' && U) ? U : null; }
function goSafe(v) { if (typeof go === 'function') go(v); }
function study(tab) { goSafe('study'); setTimeout(function () { if (W.shTab) W.shTab(tab); }, 250); }

/* ---------- knowledge base: real routes only ---------- */
var KB = [
  { k: ['cgpa', 'calculate', 'calculator', 'gpa calc'], t: 'Calculate your CGPA', tag: 'Academics', steps: ['Tap Academics (or Results) on the bottom bar.', 'Choose GPA Calculator.', 'Add courses, units and scores - or paste your portal page and tap Parse.', 'Tap Calculate & Save; your dashboard updates instantly.'], go: function () { if (typeof aTab !== 'undefined') { aTab = 'calc'; } goSafe('acad'); } },
  { k: ['trajectory', 'graph', 'line', 'climb'], t: 'GPA Trajectory', tag: 'Intelligence', steps: ['Tap Study on the bottom bar.', 'Open GPA Trajectory from the Academic snapshot row.', 'Tap See my trajectory.', 'Tap any point to inspect that semester and see which courses pulled the line down.'], go: function () { if (W.asGpaOpen) W.asGpaOpen(); else study('overview'); } },
  { k: ['result', 'upload', 'import', 'paste', 'semester result'], t: 'Upload / import semester results', tag: 'Academics', steps: ['Tap Academics.', 'Open Import / Paste Portal Result Text.', 'Paste the full results page and tap Parse & Auto-Fill.', 'Review the rows, then Calculate & Save.'], go: function () { if (typeof aTab !== 'undefined') aTab = 'calc'; goSafe('acad'); setTimeout(function () { var p = document.getElementById('paste'); if (p) p.classList.remove('hidden'); }, 300); } },
  { k: ['course', 'add course', 'new course', 'registration'], t: 'Add or manage courses', tag: 'Study', steps: ['Tap Study, then Courses.', 'Open a course workspace to add topics, notes and material.', 'Course lists themselves come from your saved results or registration paste in Academics.'], go: function () { study('courses'); } },
  { k: ['study session', 'start studying', 'study', 'timer', 'focus'], t: 'Create and start a study session', tag: 'Study', steps: ['Tap Study, then Sessions.', 'Pick course, topic, objectives, duration and method.', 'Tap Start session - the timer counts only focused time.', 'Complete it and rate your understanding to grow your history.'], go: function () { study('sessions'); } },
  { k: ['attendance', 'attend', 'present', 'code', 'scan'], t: 'Record attendance', tag: 'Attend', steps: ['Tap Attend on the bottom bar.', 'Enter your course code and the 5-digit code your lecturer calls.', 'Tap Mark. If a QR is offered, one distance reading per scan - declining still marks you present.'], go: function () { goSafe('att'); } },
  { k: ['timetable', 'class', 'schedule', 'venue'], t: 'Timetable and next class', tag: 'Planner', steps: ['Tap Planner, then Timetable.', 'Add class slots once - they repeat weekly.', 'Home shows your next class with a live countdown.'], go: function () { goSafe('plan'); } },
  { k: ['exam', 'test', 'assignment', 'deadline'], t: 'Exams and deadlines', tag: 'Planner', steps: ['Tap Planner, then Exam Timetable.', 'Add exams with date, time and venue.', 'Home lists them under Your priorities with urgency chips.'], go: function () { goSafe('plan'); } },
  { k: ['task', 'todo', 'to-do'], t: 'Tasks', tag: 'Planner', steps: ['Tap Planner.', 'Use Smart Tasks at the bottom.', 'Set start and end times for live countdowns.'], go: function () { goSafe('plan'); } },
  { k: ['finance', 'money', 'expense', 'budget', 'fees', 'naira'], t: 'Finances and fees', tag: 'Finance', steps: ['Tap Finance.', 'Log income and expenses by category.', 'School-fees progress sits in the same screen.'], go: function () { goSafe('fin'); } },
  { k: ['material', 'file', 'pdf', 'past question', 'library', 'upload file'], t: 'Materials and past questions', tag: 'Materials', steps: ['Tap the + button or go to Materials.', 'Upload a PDF or paste a link.', 'It lands in your library under the course code.'], go: function () { goSafe('mat'); } },
  { k: ['profile', 'name', 'personal information', 'update profile', 'matric'], t: 'Profile and personal information', tag: 'Account', steps: ['Tap your avatar (top right) or Profile.', 'Use Personal Information or Update Profile.', 'Matric, phone, faculty, level and target CGPA all live there.'], go: function () { goSafe('prof'); } },
  { k: ['theme', 'dark', 'light', 'mode', 'appearance', 'home screen'], t: 'Theme and home screen preference', tag: 'Account', steps: ['Tap Profile.', 'In Appearance, choose Light, Dark or System.', 'Right below it, choose New Home Screen or Classic Home Screen - it persists.'], go: function () { goSafe('prof'); } },
  { k: ['download', 'backup', 'export', 'my data'], t: 'Download your data', tag: 'Account', steps: ['Tap Profile.', 'Tap Download Backup (or Download my data).', 'You get a JSON copy of everything on this account.'], go: function () { if (typeof exportData === 'function') exportData(); else goSafe('prof'); } },
  { k: ['notification', 'alerts', 'reminders'], t: 'Notifications', tag: 'Account', steps: ['Tap Profile, then Notifications.', 'Toggle in-app, email and each smart alert type.'], go: function () { if (typeof openNotifSheet === 'function') openNotifSheet(); else goSafe('prof'); } },
  { k: ['streak', 'flame', 'missed day', 'make up', 'repair'], t: 'Streak and make-up days', tag: 'Home', steps: ['On Home, open the reading calendar.', 'Tap a missed day from the last 7.', 'Study 120 verified minutes within 48 hours and the day counts. One make-up a week.'], go: function () { goSafe('home'); } },
  { k: ['badge', 'mark', 'achievement', 'summit marks'], t: 'Summit Marks', tag: 'Account', steps: ['Tap Profile.', 'Summit Marks shows every achievement.', 'Tap any card to see its condition and your live progress.'], go: function () { goSafe('prof'); } },
  { k: ['risk', 'warning', 'danger', 'carryover'], t: 'Academic risk and carryovers', tag: 'Intelligence', steps: ['On Home, tap Risk check in the Academic snapshot row.', 'Confirmed risks come from your records; predictive signals are labelled as warnings, not facts.'], go: function () { if (W.asRiskOpen) W.asRiskOpen(); } },
  { k: ['report', 'weekly', 'summary'], t: 'Weekly report', tag: 'Intelligence', steps: ['On Home, tap Weekly report.', 'Sessions, hours, courses, tasks and next priorities.', 'Tap Copy report to share it.'], go: function () { if (W.asReportOpen) W.asReportOpen(); } },
  { k: ['goal', 'milestone', 'target'], t: 'Goals and milestones', tag: 'Goals', steps: ['Tap the + button, then Goals.', 'Include a CGPA number and the app tracks it against real results.'], go: function () { goSafe('goal'); } },
  { k: ['admin', 'lecturer', 'pin'], t: 'Admin tools', tag: 'Admin', steps: ['Profile shows Open Admin Panel only for authorised accounts.', 'There you generate lecturer PINs and manage lecturer roles.'], go: function () { if (typeof adminLoadLecturers === 'function') adminLoadLecturers(); else goSafe('prof'); } }
];
function match(q) {
  q = norm(q); var best = null, bs = 0;
  KB.forEach(function (e) {
    var s = 0; e.k.forEach(function (k) { if (q.indexOf(k) > -1) s += k.length > 4 ? 2 : 1; });
    if (q.indexOf(norm(e.t)) > -1) s += 2;
    if (s > bs) { bs = s; best = e; }
  });
  return bs > 0 ? best : null;
}
var CONVO = [];
function greetTxt() {
  var u = UU(), n = u ? String(u.name || '').split(' ')[0] : 'there';
  var h = new Date().getHours(), g = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Good night';
  return g + ', ' + n + '! I\u2019m Zuma, your Academic Summit guide. I can help you find features, understand how things work and navigate your academic workspace. What would you like to know today?';
}
function convoHtml() {
  return CONVO.map(function (c) {
    return '<div class="space-y-2"><div class="text-xs font-bold p-2.5 rounded-2xl ml-8" style="background:linear-gradient(135deg,#059669,#06b6d4);color:#fff">' + esc(c.q) + '</div>' +
      '<div class="text-xs p-3 rounded-2xl mr-4 space-y-2" style="background:var(--sub)"><div class="flex gap-2 items-start">' + zuma('welcome', 40) + '<div class="space-y-1"><div class="font-extrabold">Let\u2019s get you there! ' + esc(c.e.t) + ' lives in ' + esc(c.e.tag) + '.</div><ol style="padding-left:16px">' + c.e.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol></div></div>' +
      '<button class="btn w-full" onclick="zumaGo(' + c.i + ')">Take me there \u2192</button></div></div>';
  }).join('');
}
function paint() {
  var el = document.getElementById('zuma-convo'); if (el) { el.innerHTML = convoHtml(); el.scrollTop = el.scrollHeight; }
  var sug = document.getElementById('zuma-sug');
  if (sug) sug.style.display = CONVO.length ? 'none' : 'flex';
}
W.zumaAsk = function (q) {
  q = (q != null ? q : (document.getElementById('zuma-q') || {}).value || '').trim();
  if (!q) return;
  var inp = document.getElementById('zuma-q'); if (inp) inp.value = '';
  var art = document.getElementById('zuma-art'); if (art) { art.classList.remove('zuma-bob'); art.classList.add('zuma-think'); setTimeout(function () { art.classList.remove('zuma-think'); }, 700); }
  var e = match(q);
  if (!e) {
    CONVO.push({ q: q, e: { t: 'Here\u2019s the map', tag: 'Academic Summit', steps: ['Home: overview, streak, next class, priorities.', 'Study: sessions, courses, planner, trajectory.', 'Results/Academics: results, GPA calc, Detective.', 'Attend: class codes and history. Finance: money.', 'Profile: settings, marks, backup, home screen choice.'], go: null }, i: -1 });
  } else CONVO.push({ q: q, e: e, i: KB.indexOf(e) });
  paint();
};
W.zumaGo = function (i) {
  var e = i >= 0 ? KB[i] : null;
  zumaClose();
  if (e && e.go) { try { e.go(); } catch (err) {} toast('Zuma: here is ' + e.t); }
};
W.zumaClear = function () { CONVO = []; paint(); };
W.zumaClose = function () { var s = document.getElementById('zuma-sheet'); if (s && s.parentNode) s.parentNode.removeChild(s); };
function openZuma() {
  if (document.getElementById('zuma-sheet')) return;
  var SUG = ['Help me calculate my CGPA.', 'How do I start studying?', 'Where are my semester results?', 'How do I update my profile?'];
  var d = document.createElement('div');
  d.id = 'zuma-sheet';
  d.className = 'fixed inset-0 z-[85] bg-black/50 backdrop-blur-sm flex items-end zuma-fade';
  d.onclick = function () { zumaClose(); };
  d.innerHTML = '<div class="w-full rounded-t-3xl p-5 space-y-3 zuma-in" style="background:var(--card);border:1px solid var(--bd);max-height:84vh;display:flex;flex-direction:column;padding-bottom:max(1rem,env(safe-area-inset-bottom))" onclick="event.stopPropagation()">' +
    '<div style="width:44px;height:5px;border-radius:99px;background:var(--bd);margin:0 auto"></div>' +
    '<div class="flex items-center gap-3"><div id="zuma-art" class="zuma-bob shrink-0">' + zuma('welcome', 64) + '</div><div class="flex-1 text-xs leading-relaxed" style="color:var(--tx)"><b>' + esc(greetTxt().split('!')[0] + '!")'.slice(0, 0) + greetTxt().split('!')[0] + '!</b><br>' + esc(greetTxt().split('!').slice(1).join('!')) + '</div><button class="p-2 shrink-0" style="color:var(--mut)" onclick="zumaClose()" aria-label="Close Zuma">\u2715</button></div>' +
    '<div id="zuma-convo" class="space-y-3" style="overflow-y:auto;flex:1;min-height:60px"></div>' +
    '<div id="zuma-sug" class="flex flex-wrap gap-2">' + SUG.map(function (s) { return '<button class="btn2" style="min-height:36px;padding:0 12px;font-size:11px" onclick="zumaAsk(\'' + esc(s).replace(/'/g, "\\'") + '\')">' + esc(s) + '</button>'; }).join('') + '</div>' +
    '<div class="flex gap-2"><input id="zuma-q" class="inp" placeholder="What would you like help finding?" onkeydown="if(event.key===\'Enter\')zumaAsk()"><button class="btn shrink-0" onclick="zumaAsk()">Ask</button></div>' +
    '<div class="flex justify-between"><button class="text-[11px]" style="color:var(--mut)" onclick="zumaClear()">Clear conversation</button><button class="text-[11px]" style="color:var(--mut)" onclick="zumaClose()">Close</button></div>' +
    '</div>';
  document.body.appendChild(d);
  paint();
  setTimeout(function () { var i = document.getElementById('zuma-q'); if (i) i.focus(); }, 250);
}
/* the ? button now opens the guide (cuts any legacy chain behind startTour) */
try { if (typeof startTour === 'function') startTour = openZuma; } catch (e) {}
var fab = document.getElementById('tour-fab'); if (fab) fab.onclick = openZuma;

/* ---------- GPA Trajectory intro governor (separate experience) ---------- */
function governTrajectory(node) {
  var t = node.textContent || '';
  if (!/GPA Trajectory/.test(t) || !/See my trajectory/.test(t)) return;
  try {
    if (localStorage.getItem('as_traj_seen') === '1') { if (node.parentNode) node.parentNode.removeChild(node); return; }
    W._trajN = (W._trajN || 0) + 1;
    if (W._trajN > 1) { if (node.parentNode) node.parentNode.removeChild(node); return; }
    Array.from(node.querySelectorAll('button,a')).forEach(function (b) {
      var tx = (b.textContent || '').trim();
      if (/See my trajectory/i.test(tx)) b.addEventListener('click', function () {
        try { localStorage.setItem('as_traj_seen', '1'); localStorage.setItem('as_traj_opened', '1'); } catch (e) {}
        setTimeout(function () { if (W.asGpaOpen) W.asGpaOpen(); }, 120);
      }, true);
      else if (/Skip|Next|already know|don.t show/i.test(tx)) b.addEventListener('click', function () { try { localStorage.setItem('as_traj_seen', '1'); } catch (e) {} }, true);
    });
  } catch (e) {}
}
/* ---------- attendance consent: give it Zuma's voice ---------- */
function warmConsent() {
  var leaf = Array.from(document.querySelectorAll('h1,h2,h3,div,b')).filter(function (n) { return n.children.length === 0 && (n.textContent || '').trim() === 'Before you scan'; })[0];
  if (!leaf) return;
  var c = leaf.closest ? leaf.closest('.card') : null; if (!c) c = leaf.parentNode;
  if (!c || c.dataset.zloc) return;
  c.dataset.zloc = '1';
  c.insertAdjacentHTML('afterbegin', '<div class="flex items-center gap-3 pb-1">' + zuma('notice', 56) + '<div class="text-xs font-bold" style="color:#6ee7b7">Zuma rides along: one reading, one number - nothing kept but distance and time.</div></div>');
}
var tm2 = null;
new MutationObserver(function (ms) {
  clearTimeout(tm2);
  tm2 = setTimeout(function () {
    ms.forEach(function (m) { Array.from(m.addedNodes || []).forEach(function (n) { if (n.nodeType === 1) governTrajectory(n); }); });
    warmConsent();
  }, 160);
}).observe(document.body, { childList: true, subtree: true });
/* mark Explorer whenever the real trajectory opens */
if (W.asGpaOpen) { var _g = W.asGpaOpen; W.asGpaOpen = function () { try { localStorage.setItem('as_traj_opened', '1'); } catch (e) {} return _g(); }; }
/* entrance / bob / think animations */
var st = document.createElement('style');
st.textContent = '@keyframes zumaIn{from{transform:translateY(100%)}to{transform:translateY(0)}}@keyframes zumaBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-4px)}}@keyframes zumaThink{0%,100%{transform:scale(1)}50%{transform:scale(1.08)}}@keyframes zumaFade{from{opacity:0}to{opacity:1}}.zuma-in{animation:zumaIn .32s cubic-bezier(.16,1,.3,1)}.zuma-bob{animation:zumaBob 1.6s ease-in-out 2}.zuma-think{animation:zumaThink .7s ease-in-out}.zuma-fade{animation:zumaFade .2s}';
document.head.appendChild(st);
W.__zuma = { open: openZuma, KB: KB };
})();
