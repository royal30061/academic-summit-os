/* Academic Summit - homehub.js v3: Home dashboard redesign in the app's own design language.
   Wraps go() so it applies at boot, on nav taps and after every action. Colours untouched.
   Kill switches: localStorage.as_hh_off=1 or sessionStorage.as_hh_classic=1 (classic Home). */
(function () {
'use strict';
var W = window;
if (typeof document === 'undefined') return;

/* ---------- helpers (prefer the app's own, fall back safely) ---------- */
function has(f) { return typeof f === 'function'; }
var E = has(esc) ? esc : function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
var GREET = has(greet) ? greet : function () { var h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; };
var FMTD = has(fmtD) ? fmtD : function (d) { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }); };
var DAYSLEFT = has(days) ? days : function (d) { return Math.ceil((new Date(d) - new Date().setHours(0, 0, 0, 0)) / 864e5); };
var CHIP = has(chip) ? chip : function (t, c) { return '<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-' + c + '-100 dark:bg-' + c + '-950 text-' + c + '-600 dark:text-' + c + '-300">' + t + '</span>'; };
var DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function pad(n) { return (n < 10 ? '0' : '') + n; }
function iso(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parts(k) { return [+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)]; }
function wd(k) { var p = parts(k); return new Date(p[0], p[1], p[2]).getDay(); }
function nice(k) { var p = parts(k); return DAYN[wd(k)] + ' ' + p[2] + ' ' + MON[p[1]]; }
function dd(a, b) { var x = parts(a), y = parts(b); return Math.round((Date.UTC(y[0], y[1], y[2]) - Date.UTC(x[0], x[1], x[2])) / 864e5); }
function ck(c) { return String(c || '').replace(/\s+/g, '').toUpperCase(); }
function sum(a, f) { return a.reduce(function (s, x) { return s + f(x); }, 0); }
function toast(m, k) { if (W.showToast) W.showToast(m, k); }
function fmt(ms) { var s = Math.floor(ms / 1000), m = Math.floor(s / 60); return pad(m) + ':' + pad(s % 60); }
function UU() { return (typeof U !== 'undefined' && U) ? U : null; }
function state() { try { return W.__sh ? W.__sh.state() : null; } catch (e) { return null; } }
function courses() { try { if (W.as2Courses) return W.as2Courses() || []; } catch (e) {} return []; }
function titleOf(code) { var c = courses().filter(function (x) { return ck(x.code) === ck(code); })[0]; return c && c.title ? c.title : ''; }
function byTime(a, b) { return (a.date + (a.time || '99')) < (b.date + (b.time || '99')) ? -1 : 1; }
function classicOn() { try { return sessionStorage.getItem('as_hh_classic') === '1' || localStorage.getItem('as_hh_off') === '1'; } catch (e) { return false; } }
function HHon() { var u = UU(); return !!u && u.role !== 'lecturer' && !classicOn(); }
function curView() { try { return (typeof view !== 'undefined') ? view : ''; } catch (e) { return ''; } }

/* ---------- timetable (Mon=0, matches dow()) ---------- */
var NC = null;
function nextClass() {
  var u = UU(), list = (u && u.timetable) || []; if (!list.length) return null;
  var now = new Date(), hm = pad(now.getHours()) + ':' + pad(now.getMinutes()), todayIdx = (now.getDay() + 6) % 7;
  for (var off = 0; off < 7; off++) {
    var d = (todayIdx + off) % 7;
    var rows = list.filter(function (r) { return r.day === d; }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    for (var i = 0; i < rows.length; i++) { if (off === 0 && (rows[i].start || '') <= hm) continue; return { row: rows[i], off: off }; }
  }
  return null;
}
function cdLabel(nc, now) {
  if (!nc) return '';
  if (nc.off === 0) {
    var p = parts(iso(now)), t = String(nc.row.start || '0:0').split(':');
    var ms = new Date(p[0], p[1], p[2], +t[0], +t[1] || 0) - now;
    if (ms <= 0) return 'starting now';
    var h = Math.floor(ms / 3600000), m = Math.floor(ms % 3600000 / 60000);
    return 'in ' + (h ? h + 'h ' + pad(m) + 'm' : m + 'm');
  }
  if (nc.off === 1) return 'tomorrow ' + (nc.row.start || '');
  return 'in ' + nc.off + ' days';
}

/* ---------- sections ---------- */
var MT = null, TICK = null, HH = { more: false, day: 6 };
function streakChip() {
  var u = UU(), n = u && (u.streak != null ? u.streak : u.streakDays != null ? u.streakDays : null);
  if (n == null) { try { n = +localStorage.getItem('as_streak'); } catch (e) {} }
  if (!n) return '';
  return '<span class="text-[10px] bg-white/20 rounded-full px-2.5 py-1 font-bold text-white">Day ' + n + ' streak</span>';
}
function snapshotCard() {
  var u = UU(); if (!u) return '';
  var c = (typeof cum === 'function') ? cum() : { u: 0, q: 0, g: 0 };
  var tot = (u.profile && u.profile.totalUnits) || 120;
  var req = (typeof requiredAvg === 'function') ? requiredAvg() : null;
  var t = u.target || null;
  if (!c.u && !(u.semesters || []).length) {
    return '<div class="card p-5 space-y-2"><div class="font-extrabold">Academic snapshot</div><p class="text-xs text-slate-500">Paste your first portal result and this card comes alive with your real CGPA, units and standing. Nothing here is estimated.</p><button class="btn2" onclick="hhResults()">Open results</button></div>';
  }
  var stand = c.g >= 4.5 ? 'First Class' : c.g >= 3.5 ? 'Second Class Upper' : c.g >= 2.5 ? 'Second Class Lower' : c.g >= 1.5 ? 'Third Class' : 'Pass / Probation';
  var h = '<div class="grad rounded-3xl p-6 space-y-3 shadow-lg">' +
    '<div class="flex items-center justify-between"><div class="text-xs font-bold uppercase tracking-wider opacity-80">Cumulative GPA</div>' + streakChip() + '</div>' +
    '<div class="flex items-end justify-between"><div class="text-4xl font-extrabold">' + c.g.toFixed(2) + '<span class="text-base opacity-75"> / 5.00</span></div><span class="text-[11px] bg-white/20 rounded-full px-3 py-1 font-bold cursor-pointer" onclick="hhTarget()">Target ' + (t ? t.toFixed(2) : '—') + '</span></div>' +
    '<div class="h-2 rounded-full bg-white/30"><div class="h-2 rounded-full bg-white" style="width:' + Math.min(100, c.g / 5 * 100) + '%"></div></div>' +
    '<div class="text-xs font-semibold" style="color:rgba(255,255,255,.85)">' + c.u + ' of ' + tot + ' units • ' + stand + (t ? (c.g >= t ? ' • target met' : ' • ' + (t - c.g).toFixed(2) + ' below target (' + Math.round(c.g / t * 100) + '% of target)') : '') + '</div>' +
    (req != null ? '<div class="text-[11px] font-semibold" style="color:rgba(255,255,255,.75)">Required average in remaining units: ' + req.toFixed(2) + (req > 5 ? ' — target out of reach in remaining units' : '') + '</div>' : '') +
    '</div>';
  if (localStorage.getItem('as_ins_off') !== '1' && W.asGpaOpen) {
    h += '<div class="card p-4 flex flex-wrap gap-2"><button class="btn2" onclick="asGpaOpen()">GPA trajectory</button><button class="btn2" onclick="asRiskOpen()">Risk check</button><button class="btn2" onclick="asReportOpen()">Weekly report</button></div>';
  }
  return h;
}
function focusCard(st, today) {
  var head = '<div class="font-extrabold">Today\'s focus</div>';
  if (!st) return '<div class="card p-5 space-y-2">' + head + '<p class="text-xs text-slate-500">Your study sessions live in the Study tab.</p><button class="btn w-full" onclick="go(\'study\')">Open Study</button></div>';
  var A = st.active;
  if (A) return '<div class="card p-5 space-y-2">' + head +
    '<div class="flex justify-between items-center"><div class="text-sm font-extrabold">' + E(A.course) + (titleOf(A.course) ? ' <span class="text-xs text-slate-500">' + E(titleOf(A.course)) + '</span>' : '') + '</div>' + CHIP('In progress', 'emerald') + '</div>' +
    '<p class="text-xs text-slate-500">' + E(A.topic || A.method) + ' • planned ' + A.planned + ' min • ' + fmt(W.SHCalc.clocks(A).focused) + ' focused</p>' +
    '<button class="btn w-full" onclick="hhGoStudy(\'sessions\')">Resume session</button></div>';
  var next = st.plan.filter(function (p) { return p.kind === 'session' && !p.done && p.date >= today; }).sort(byTime)[0];
  if (next) return '<div class="card p-5 space-y-2">' + head +
    '<div class="flex justify-between items-center"><div class="text-sm font-extrabold">' + E(next.course) + (titleOf(next.course) ? ' <span class="text-xs text-slate-500">' + E(titleOf(next.course)) + '</span>' : '') + '</div><span class="text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300 px-2.5 py-1 rounded-full">' + E(next.min) + ' min</span></div>' +
    '<p class="text-xs text-slate-500">' + E(next.topic || next.method) + ' • ' + (next.date === today ? 'scheduled today' : 'scheduled ' + nice(next.date)) + (next.time ? ' at ' + E(next.time) : '') + '</p>' +
    '<button class="btn w-full" onclick="hhBegin(\'' + E(next.id) + '\')">Start session</button>' +
    '<button class="btn2 w-full" onclick="hhGoStudy(\'planner\')">See full schedule</button></div>';
  var plans = st.plan.filter(function (p) { return p.kind === 'session' && p.date === today; });
  var doneN = plans.filter(function (p) { return p.done; }).length;
  if (doneN) {
    var mins = sum(st.log.filter(function (e) { return e.date === today; }), function (e) { return e.focused || 0; });
    return '<div class="card p-5 space-y-2">' + head + '<p class="text-xs text-slate-500">Completed ' + doneN + ' of ' + plans.length + ' scheduled sessions today • ' + mins + ' focused minutes.</p><button class="btn2 w-full" onclick="hhGoStudy(\'planner\')">Plan another session</button></div>';
  }
  return '<div class="card p-5 space-y-2">' + head + '<p class="text-xs text-slate-500">No session scheduled. Your next action appears here the moment you plan one.</p><button class="btn w-full" onclick="hhGoStudy(\'planner\')">Plan a session</button></div>';
}
function priorities(u, today) {
  var out = [];
  (u.exams || []).forEach(function (e) { var l = DAYSLEFT(e.date); if (l < 0) return; out.push({ w: l <= 2 ? 1 : 2, lab: l <= 2 ? 'Urgent' : 'Upcoming', col: l <= 2 ? 'rose' : 'violet', t: e.code, s: 'Examination • ' + FMTD(e.date) + (e.time ? ' ' + e.time : '') + (e.venue ? ' • ' + e.venue : ''), js: "go('plan')" }); });
  (u.events || []).forEach(function (e) { if (!/exam|test|assignment/i.test(e.type || '')) return; var l = DAYSLEFT(e.date); if (l < 0) return; out.push({ w: l <= 2 ? 1 : 2, lab: l <= 2 ? 'Urgent' : 'Upcoming', col: l <= 2 ? 'rose' : 'violet', t: e.title, s: e.type + ' • ' + FMTD(e.date), js: "go('plan')" }); });
  (u.tasks || []).forEach(function (t) { if (t.done) return; var l = t.end ? DAYSLEFT(String(t.end).slice(0, 10)) : null; out.push({ w: l == null ? 2 : l < 0 ? 0 : l <= 2 ? 1 : 2, lab: l == null ? 'Open' : l < 0 ? 'Overdue' : l <= 2 ? 'Urgent' : 'Upcoming', col: l != null && l < 0 ? 'rose' : l != null && l <= 2 ? 'rose' : 'violet', t: t.t, s: 'Task' + (t.end ? ' • ' + String(t.end).slice(0, 10) : ''), js: "go('plan')" }); });
  var st = state();
  (st ? st.plan : []).forEach(function (p) {
    var l = dd(today, p.date);
    if (p.kind === 'session') { if (!p.done && l < 0) out.push({ w: 0, lab: 'Overdue', col: 'rose', t: p.course + ' — unfinished session', s: p.topic || p.method, js: 'hhGoStudy(\'sessions\')' }); else if (!p.done && l === 0) out.push({ w: 1, lab: 'Today', col: 'emerald', t: p.course + ' — study session', s: p.topic || p.method, js: 'hhBegin(\'' + E(p.id) + '\')' }); return; }
    if (p.done) return;
    out.push({ w: l < 0 ? 0 : l <= 2 ? 1 : 2, lab: l < 0 ? 'Overdue' : l <= 2 ? 'Urgent' : 'Upcoming', col: l <= 2 ? 'rose' : 'violet', t: p.course + ' — ' + (p.kind === 'exam' ? 'examination' : 'assignment'), s: p.topic || '', js: 'hhGoStudy(\'planner\')' });
  });
  out.sort(function (a, b) { return a.w - b.w; });
  return out;
}
function prioritiesCard(u, today) {
  var ps = priorities(u, today), show = HH.more ? ps : ps.slice(0, 4);
  var inner = show.length ? show.map(function (x) {
    return '<button class="w-full flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-left" onclick="' + x.js + '"><span style="min-width:0"><b class="block">' + E(x.t) + '</b><span class="text-slate-400 text-[11px]">' + E(x.s) + '</span></span>' + CHIP(x.lab, x.col) + '</button>';
  }).join('') : '<p class="text-xs text-slate-400">Nothing urgent. Priorities appear from exams, tasks and your study plan.</p>';
  if (ps.length > 4) inner += '<button class="btn2 w-full" onclick="hhMore()">' + (HH.more ? 'Show less' : 'Show all ' + ps.length) + '</button>';
  return '<div class="card p-5 space-y-2"><div class="font-extrabold">Your priorities</div>' + inner + '</div>';
}
function classCard() {
  NC = nextClass(); if (!NC) return '';
  var r = NC.row;
  return '<div class="card p-5 space-y-1"><div class="flex justify-between items-center"><div class="font-extrabold">Next class</div><span class="text-xs font-extrabold text-emerald-600 dark:text-emerald-400" id="hh-cd">' + E(cdLabel(NC, new Date())) + '</span></div>' +
    '<div class="text-sm font-extrabold">' + E(r.code) + (titleOf(r.code) ? ' <span class="text-xs text-slate-500">' + E(titleOf(r.code)) + '</span>' : '') + '</div>' +
    '<p class="text-xs text-slate-500">' + E(r.start || '') + (r.end ? '–' + E(r.end) : '') + (r.venue ? ' • ' + E(r.venue) : '') + '</p>' +
    '<button class="btn2" onclick="hhTimetable()">Full timetable</button></div>';
}
function activityCard(st, today) {
  if (!W.SHCalc || !st) return '';
  var wk = W.SHCalc.week(st.log, today), tgt = W.asWeekTarget ? W.asWeekTarget() : 600;
  var mx = Math.max.apply(null, wk.perDay.concat([1])), sd = HH.day == null ? 6 : HH.day;
  var dayLogs = st.log.filter(function (e) { return e.date === wk.days[sd]; });
  return '<div class="card p-5 space-y-3"><div class="font-extrabold">This week</div>' +
    '<div class="grid grid-cols-3 gap-2 text-center"><div><div class="text-xl font-extrabold">' + wk.sessions + '</div><div class="text-[11px] text-slate-500">sessions</div></div><div><div class="text-xl font-extrabold">' + Math.floor(wk.minutes / 60) + 'h ' + (wk.minutes % 60) + 'm</div><div class="text-[11px] text-slate-500">focused</div></div><div><div class="text-xl font-extrabold">' + wk.activeDays + '/7</div><div class="text-[11px] text-slate-500">consistency</div></div></div>' +
    '<div class="h-2 rounded-full bg-slate-100 dark:bg-slate-800"><div class="h-2 rounded-full bg-emerald-500" style="width:' + Math.min(100, Math.round(wk.minutes / tgt * 100)) + '%"></div></div>' +
    '<p class="text-[11px] text-slate-500">' + wk.minutes + ' of ' + tgt + ' min weekly target • courses: ' + E(Object.keys(wk.byCourse).join(', ') || 'none') + '</p>' +
    '<div style="display:flex;align-items:flex-end;gap:6px;height:72px">' + wk.perDay.map(function (m, i) {
      return '<button aria-label="' + E(nice(wk.days[i])) + ': ' + m + ' minutes" onclick="hhDay(' + i + ')" style="flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;background:none;border:0"><span style="width:100%;height:' + Math.max(4, Math.round(m / mx * 52)) + 'px;border-radius:6px;background:' + (i === sd ? '#10b981' : 'var(--sub)') + '"></span><span class="text-[10px] text-slate-400">' + DAYN[wd(wk.days[i])][0] + '</span></button>';
    }).join('') + '</div>' +
    '<p class="text-[11px] text-slate-500">' + E(nice(wk.days[sd])) + ': ' + wk.perDay[sd] + ' min' + (function () { var c = []; dayLogs.forEach(function (e) { if (c.indexOf(e.course) < 0) c.push(e.course); }); return c.length ? ' on ' + E(c.join(', ')) : ''; })() + '</p></div>';
}
function attendanceCard(u, today) {
  var recs = []; try { if (W.asAtt) recs = W.asAtt(); } catch (e) {}
  var head = '<div class="font-extrabold">Attendance</div>';
  var btn = '<button class="btn w-full" onclick="hhAttend()">Mark attendance</button>';
  if (!recs.length) return '<div class="card p-5 space-y-2">' + head + '<p class="text-xs text-slate-500">No attendance records yet.</p>' + btn + '</div>';
  var line = '<p class="text-xs text-slate-500">' + recs.length + ' classes marked present.</p>';
  if ((u.timetable || []).length) {
    var first = recs.map(function (a) { return a.date; }).sort()[0];
    var weeks = Math.max(1, Math.ceil(dd(first, today) / 7));
    var sched = u.timetable.length * weeks, missed = Math.max(0, sched - recs.length), pct = Math.round(recs.length / sched * 100);
    line = '<div class="grid grid-cols-3 gap-2 text-center"><div><div class="text-xl font-extrabold">' + recs.length + '</div><div class="text-[11px] text-slate-500">attended</div></div><div><div class="text-xl font-extrabold">' + missed + '</div><div class="text-[11px] text-slate-500">missed (est.)</div></div><div><div class="text-xl font-extrabold ' + (pct < 75 ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400') + '">' + pct + '%</div><div class="text-[11px] text-slate-500">rate (est.)</div></div></div><p class="text-[11px] text-slate-400">Missed count estimated from your ' + u.timetable.length + ' weekly slots since ' + FMTD(first) + '.</p>';
  }
  return '<div class="card p-5 space-y-2">' + head + line + btn + '</div>';
}
function render() {
  var u = UU(), today = iso(), p = (u && u.profile) || {};
  var h = '<div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"><div><h1 class="text-2xl font-extrabold">' + GREET() + ' ' + E(String(u.name || '').split(' ')[0]) + '</h1><p class="text-xs text-slate-500">' + E(p.program || '') + ' • ' + E(p.level || '') + ' Level' + (p.matric ? ' • ' + E(p.matric) : '') + '</p></div><div class="text-xs text-slate-500 font-semibold">' + new Date().toDateString() + '</div></div>';
  h += snapshotCard() + focusCard(state(), today) + prioritiesCard(u, today) + classCard() + activityCard(state(), today) + attendanceCard(u, today);
  h += '<div class="card p-4 space-y-2"><div class="font-extrabold text-sm">Classic Home</div><p class="text-[11px] text-slate-500">The old dashboard is untouched underneath.</p><button class="btn2 w-full" onclick="hhClassic()">Use classic Home</button></div>';
  return '<div data-hh="1" class="space-y-5">' + h + '</div>';
}

/* ---------- shell ---------- */
function stopTick() { if (TICK) { clearInterval(TICK); TICK = null; } }
function startTick() { stopTick(); TICK = setInterval(function () { var el = document.getElementById('hh-cd'); if (el && NC) el.textContent = cdLabel(NC, new Date()); }, 30000); }
function mount() {
  var m = document.getElementById('main'); if (!m || !HHon() || curView() !== 'home') return;
  try { m.innerHTML = render(); startTick(); } catch (e) { try { console.error('homehub', e); } catch (_) {} }
}
function paint() { mount(); }
/* wrap go(): applies at boot, on nav taps, after every save */
if (typeof go === 'function') {
  var _goHH = go;
  go = function (v) {
    var r = _goHH.apply(this, arguments);
    try {
      if (v === 'home') { if (HHon()) { clearTimeout(MT); MT = setTimeout(mount, 80); } }
      else stopTick();
    } catch (e) {}
    return r;
  };
}
/* re-assert if another home script repaints over us */
try {
  new MutationObserver(function () {
    if (!HHon() || curView() !== 'home') return;
    var m = document.getElementById('main'); if (!m) return;
    if (m.querySelector('[data-hh]') || m.querySelector('[data-ins]') || m.querySelector('[data-sh]')) return;
    clearTimeout(MT); MT = setTimeout(mount, 60);
  }).observe(document.getElementById('main') || document.body, { childList: true });
} catch (e) {}

/* ---------- actions ---------- */
W.hhMore = function () { HH.more = !HH.more; paint(); };
W.hhDay = function (i) { HH.day = i; paint(); };
W.hhTarget = function () {
  var u = UU(); if (!u) return;
  var v = prompt('New target CGPA (0.00 - 5.00):', (u.target || 4.5).toFixed(2));
  if (v === null) return; var t = parseFloat(v);
  if (isNaN(t) || t < 0 || t > 5) return toast('Target must be between 0 and 5', 'error');
  u.target = t; try { if (typeof save === 'function') save(); } catch (e) {} toast('Target updated to ' + t.toFixed(2)); paint();
};
W.hhResults = function () { if (typeof go === 'function') go('acad'); };
W.hhAttend = function () { if (typeof go === 'function') go('att'); };
W.hhTimetable = function () { if (W.shOld) W.shOld(['Timetable']); else if (typeof go === 'function') go('plan'); };
W.hhClassic = function () { try { sessionStorage.setItem('as_hh_classic', '1'); } catch (e) {} if (typeof go === 'function') go('home'); };
W.hhGoStudy = function (tab, id) {
  if (typeof go !== 'function') return;
  go('study');
  setTimeout(function () { if (id && W.shBegin) W.shBegin(id); else if (tab && W.shTab) W.shTab(tab); }, 250);
};
W.hhBegin = function (id) { W.hhGoStudy(null, id); };
W.hhPlan = function () { W.hhGoStudy('planner'); };
W.hhCourse = function (k) { if (typeof go !== 'function') return; go('study'); setTimeout(function () { if (W.shOpen) W.shOpen(k); }, 250); };
W.__hh = { paint: paint, render: render, active: function () { return HHon() && curView() === 'home'; } };
})();
