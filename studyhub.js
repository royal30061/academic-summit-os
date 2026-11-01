/* Academic Summit - studyhub.js v2: the Study workspace (Today, Courses, Timetable & campus).
   Opens when the Study tab is tapped. Your classic Study screen stays untouched underneath:
   every old tool is one tap away, and this file never edits it. Delete the script tag to remove it.
   Data lives in one new object, U.sh (created safely, nothing existing is changed).
   Kill switch: localStorage.as_sh_off = 1. If anything here fails, the classic Study opens instead.
   Load after acad2.js. Phase 1 and 2 of the brief; analytics beyond the weekly view come next. */
(function () {
'use strict';
var W = window;
if (typeof document === 'undefined') return;

/* link switches: add ?classic=1 to the address for the classic Study, ?newstudy=1 to come back */
try {
  if (/[?&]classic=1/.test(location.search)) sessionStorage.setItem('as_sh_classic', '1');
  if (/[?&]newstudy=1/.test(location.search)) { sessionStorage.removeItem('as_sh_classic'); localStorage.removeItem('as_sh_off'); }
} catch (e) {}

/* ---------- helpers ---------- */
var CODE = /^[A-Z]{2,4}[- ]?\d{3}[A-Z]?$/;
var METHODS = ['Reading and comprehension', 'Active recall', 'Question and answer', 'Oral explanation', 'Practice examination', 'Revision'];
var PRESETS = [15, 25, 45, 60];
var DAYN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
function pad(n) { return (n < 10 ? '0' : '') + n; }
function iso(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parts(k) { return [+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)]; }
function addD(k, n) { var p = parts(k); return iso(new Date(p[0], p[1], p[2] + n)); }
function dd(a, b) { var x = parts(a), y = parts(b); return Math.round((Date.UTC(y[0], y[1], y[2]) - Date.UTC(x[0], x[1], x[2])) / 864e5); }
function wd(k) { var p = parts(k); return new Date(p[0], p[1], p[2]).getDay(); }
function nice(k) { var p = parts(k); return DAYN[wd(k)] + ' ' + p[2] + ' ' + MON[p[1]]; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
function ck(code) { return String(code || '').replace(/\s+/g, '').toUpperCase(); }
function sum(a, f) { return a.reduce(function (s, x) { return s + f(x); }, 0); }
function toast(m, k) { if (W.showToast) W.showToast(m, k); }
function persist() { try { if (typeof save === 'function') save(); } catch (e) {} }
function zuma(p, px) { return W.zumaImg ? W.zumaImg(p, px) : ''; }
function fmt(ms) { var s = Math.floor(ms / 1000), m = Math.floor(s / 60); return pad(m) + ':' + pad(s % 60); }
function mins(ms) { return Math.round(ms / 60000); }
function SH() {
  U.sh = U.sh || {}; var s = U.sh;
  s.topics = s.topics || {}; s.meta = s.meta || {}; s.tt = s.tt || []; s.events = s.events || []; s.plan = s.plan || []; s.log = s.log || []; s.active = s.active || null; s.reflect = s.reflect || null; s.v = 1;
  return s;
}
function courses() {
  try { if (W.as2Courses) return W.as2Courses() || []; if (W.h2courses) return (W.h2courses() || []).map(function (c) { return { code: c.code, title: c.title || c.name || '', units: c.units || c.unit || '' }; }); } catch (e) {}
  return [];
}
function byKey(k) { return courses().filter(function (c) { return ck(c.code) === k; })[0] || null; }
function titleOf(code) { var c = byKey(ck(code)); return c && c.title ? c.title : ''; }

/* ---------- pure calculations (also exposed for tests) ---------- */
var calc = {
  weekDays: function (today) { var o = []; for (var i = 6; i >= 0; i--) o.push(addD(today, -i)); return o; },
  week: function (log, today) {
    var days = calc.weekDays(today), rows = log.filter(function (e) { return e.date >= days[0] && e.date <= today; }), by = {};
    rows.forEach(function (e) { by[e.course] = (by[e.course] || 0) + (e.focused || 0); });
    return {
      days: days, perDay: days.map(function (d) { return sum(rows.filter(function (e) { return e.date === d; }), function (e) { return e.focused || 0; }); }),
      sessions: rows.filter(function (e) { return e.status === 'done'; }).length, abandoned: rows.filter(function (e) { return e.status === 'abandoned'; }).length,
      minutes: sum(rows, function (e) { return e.focused || 0; }), byCourse: by,
      activeDays: days.filter(function (d) { return rows.some(function (e) { return e.date === d && e.valid; }); }).length
    };
  },
  last: function (log, code) { var k = ck(code), best = null; log.forEach(function (e) { if (ck(e.course) === k && e.valid && (!best || e.date > best)) best = e.date; }); return best; },
  attention: function (cs, log, today) {
    return cs.map(function (c) {
      var l = calc.last(log, c.code), gap = l ? dd(l, today) : null;
      return { code: c.code, title: c.title, last: l, gap: gap, state: l == null ? 'new' : gap >= 5 ? 'neglected' : 'ok' };
    }).sort(function (a, b) { var w = { neglected: 0, new: 1, ok: 2 }; return (w[a.state] - w[b.state]) || ((b.gap || 0) - (a.gap || 0)); });
  },
  topicProg: function (list) { var t = list.length; return { total: t, done: list.filter(function (x) { return x.s === 2; }).length, doing: list.filter(function (x) { return x.s === 1; }).length, pct: t ? Math.round(list.filter(function (x) { return x.s === 2; }).length / t * 100) : 0 }; },
  avgUnderstanding: function (log, code) {
    var k = ck(code), r = log.filter(function (e) { return ck(e.course) === k && e.understanding; });
    return r.length ? sum(r, function (e) { return e.understanding; }) / r.length : null;
  },
  suggest: function (cs, log, plan, today) {
    return cs.map(function (c) {
      var k = ck(c.code), last = calc.last(log, c.code), gap = last ? dd(last, today) : null, score = 0, why = [];
      if (last == null) { score += 5; why.push('not studied yet'); } else if (gap >= 3) { score += Math.min(gap, 10) * 0.6; why.push(gap + ' days since your last session'); }
      plan.forEach(function (p) {
        if (p.kind === 'session' || p.done || ck(p.course) !== k) return;
        var left = dd(today, p.date);
        if (left >= 0 && left <= 7) { score += 4 / Math.max(1, left); why.push((p.kind === 'exam' ? 'exam ' : 'deadline ') + (left === 0 ? 'today' : 'in ' + left + ' day' + (left > 1 ? 's' : ''))); }
      });
      var avg = calc.avgUnderstanding(log, c.code);
      if (avg != null && avg <= 2.5) { score += 2; why.push('you rated your understanding ' + avg.toFixed(1) + ' of 5'); }
      return { code: c.code, title: c.title, score: score, why: why };
    }).filter(function (x) { return x.score > 0; }).sort(function (a, b) { return b.score - a.score; }).slice(0, 3);
  },
  nextClass: function (list, now) {
    var best = null;
    for (var d = 0; d < 8 && !best; d++) {
      var dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d), di = dt.getDay();
      list.forEach(function (x) {
        if (x.day !== di || !x.start) return;
        var hm = String(x.start).split(':'), at = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), +hm[0], +hm[1] || 0);
        if (at >= now && (!best || at < best.at)) best = { x: x, at: at };
      });
    }
    return best;
  },
  clocks: function (A, now) {
    now = now || Date.now();
    var run = now - A.startedAt, paused = (A.pausedMs || 0) + (A.pauseAt ? now - A.pauseAt : 0), hid = (A.hiddenMs || 0) + (A.hidAt ? now - A.hidAt : 0);
    return { run: run, paused: paused, hidden: hid, focused: Math.max(0, run - paused - hid) };
  }
};
W.SHCalc = calc;

/* ---------- state ---------- */
var ACTIVE = false, TAB = 'today', COURSE = null, TICK = null, SELDAY = null, MT = null, tries = 0;
var F = { course: '', topic: '', obj: '', min: 25, custom: '', method: METHODS[0], planId: null };
var P = { kind: 'session', course: '', topic: '', date: '', time: '', min: 30, method: METHODS[0] };
var PW = 0, PD = null;
try { var lm = +localStorage.getItem('as_sh_min'); if (lm >= 5 && lm <= 240) F.min = lm; } catch (e) {}

/* ---------- small view pieces ---------- */
var ICON = {
  overview: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  sessions: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>',
  courses: '<path d="M3 5.5C5.5 4 9 4 12 5.5 15 4 18.5 4 21 5.5V19c-2.500-1.500-6-1.500-9 0-3-1.500-6.500-1.500-9 0z"/><path d="M12 5.500V19"/>',
  planner: '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>'
};
function ic(n) { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICON[n] + '</svg>'; }
function bar(p) { return '<div style="height:8px;border-radius:6px;background:var(--sub);overflow:hidden"><div style="height:100%;width:' + Math.round(Math.max(0, Math.min(1, p)) * 100) + '%;background:#10b981"></div></div>'; }
function chip(t, on, js) { return '<button class="' + (on ? 'btn' : 'btn2') + '" style="min-height:40px;padding:0 14px" onclick="' + js + '">' + esc(t) + '</button>'; }
function muted(t) { return '<div class="text-xs" style="color:var(--mut)">' + t + '</div>'; }
function row(a, b, js) { return '<button class="w-full flex items-center justify-between text-left" style="min-height:48px" ' + (js ? 'onclick="' + js + '"' : '') + '><span style="min-width:0">' + a + '</span>' + (b || '') + '</button>'; }
function courseOpts(sel) { return courses().map(function (c) { return '<option value="' + esc(c.code) + '"' + (ck(c.code) === ck(sel) ? ' selected' : '') + '>' + esc(c.code) + (c.title ? ' - ' + esc(c.title) : '') + '</option>'; }).join(''); }
function untilText(ms) { var m = Math.max(1, Math.round(ms / 60000)); if (m < 60) return m + ' min'; var h = Math.floor(m / 60); return h < 24 ? h + 'h ' + (m % 60) + 'm' : Math.floor(h / 24) + ' day' + (Math.floor(h / 24) > 1 ? 's' : ''); }
function whenWord(k, today) { if (!k) return 'never'; var g = dd(k, today); return g === 0 ? 'today' : g === 1 ? 'yesterday' : g + ' days ago'; }
function byTime(a, b) { return (a.date + (a.time || '99')) < (b.date + (b.time || '99')) ? -1 : 1; }

/* ---------- Overview ---------- */
function vOverview() {
  var s = SH(), today = iso(), cs = courses(), wk = calc.week(s.log, today), h = '';
  var plans = s.plan.filter(function (p) { return p.kind === 'session' && p.date === today; }).sort(byTime);
  var done = plans.filter(function (p) { return p.done; }).length, pm = sum(plans, function (p) { return +p.min || 0; });
  if (!cs.length) {
    return '<div class="card flex items-center gap-3" style="padding:18px">' + zuma('welcome', 90) + '<div class="flex-1"><div class="font-extrabold">Add your courses first</div>' + muted('Your study plan is built from your course registration.') + '<button class="btn" style="margin-top:8px" onclick="shClassic()">Open classic Study</button></div></div>';
  }
  h += '<div class="card space-y-2"><div class="flex justify-between items-center"><div class="font-extrabold">Today\'s target</div><div class="text-sm font-extrabold" style="color:#059669">' + (plans.length ? done + ' / ' + plans.length + ' sessions' : 'Nothing planned') + '</div></div>' + bar(plans.length ? done / plans.length : 0) +
    muted(plans.length ? (plans.length - done) + ' remaining, ' + pm + ' min planned.' : 'Plan a session to set today\'s target.') + (plans.length ? '' : '<button class="btn2" onclick="shTab(\'planner\')">Plan a session</button>') + '</div>';
  h += tasksCard(today);
  var A = s.active, lastE = s.log.slice(-1)[0];
  h += '<div class="font-extrabold" style="margin-top:4px">Continue learning</div>';
  if (A) h += '<button class="card w-full flex items-center justify-between text-left" onclick="shTab(\'sessions\')"><span><span class="font-extrabold block">' + esc(A.course) + (A.topic ? ' - ' + esc(A.topic) : '') + '</span>' + muted('Session in progress, ' + fmt(calc.clocks(A).focused) + ' focused') + '</span><span style="color:var(--mut)">&rsaquo;</span></button>';
  else if (lastE) h += '<button class="card w-full flex items-center justify-between text-left" onclick="shRepeat()"><span><span class="font-extrabold block">' + esc(lastE.course) + (lastE.topic ? ' - ' + esc(lastE.topic) : '') + '</span>' + muted('Last studied ' + whenWord(lastE.date, today) + '. Tap to study it again.') + '</span><span style="color:var(--mut)">&rsaquo;</span></button>';
  else h += '<div class="card flex items-center gap-3">' + zuma('studying', 64) + muted('Your first session starts the story. Zuma is ready when you are.') + '</div>';
  var nx = s.plan.filter(function (p) { return p.kind === 'session' && !p.done && p.date >= today; }).sort(byTime)[0];
  h += '<div class="font-extrabold" style="margin-top:4px">Your next session</div>';
  if (nx) h += '<div class="card space-y-2"><div class="flex justify-between"><div class="font-extrabold">' + esc(nx.course) + '</div><div class="text-xs font-extrabold" style="background:var(--sub);padding:4px 10px;border-radius:99px">' + esc(nx.min) + ' min</div></div>' + muted(esc(nx.topic || nx.method) + ' | ' + (nx.date === today ? 'today' : esc(nice(nx.date))) + (nx.time ? ' at ' + esc(nx.time) : '')) + '<button class="btn w-full" onclick="shBegin(\'' + esc(nx.id) + '\')">Begin session</button></div>';
  else h += '<div class="card">' + muted('Nothing scheduled.') + '<button class="btn2" style="margin-top:8px" onclick="shTab(\'planner\')">Open the planner</button></div>';
  h += '%%FORM%%';
  var at = calc.attention(cs, s.log, today).filter(function (x) { return x.state !== 'ok'; }).slice(0, 3);
  if (at.length) h += '<div class="font-extrabold" style="margin-top:4px">Courses needing attention</div><div class="card space-y-1">' + at.map(function (x) {
    return row('<span class="font-extrabold block">' + esc(x.code) + '</span>' + muted(x.state === 'new' ? 'Not studied yet' : 'Last studied ' + whenWord(x.last, today)), '<span class="text-xs font-extrabold" style="color:#d97706">' + (x.state === 'new' ? 'New' : 'Neglected') + '</span>', 'shStudy(\'' + ck(x.code) + '\')');
  }).join('') + '</div>';
  var seen = {}, rec = []; s.log.slice().reverse().forEach(function (e) { var k = ck(e.course) + '|' + norm(e.topic); if (e.topic && !seen[k] && rec.length < 4) { seen[k] = 1; rec.push(e); } });
  if (rec.length) h += '<div class="font-extrabold" style="margin-top:4px">Recently studied topics</div><div class="card space-y-1">' + rec.map(function (e) { return '<div class="flex justify-between text-sm"><span>' + esc(e.topic) + '</span><span class="text-xs" style="color:var(--mut)">' + esc(e.course) + ' | ' + whenWord(e.date, today) + '</span></div>'; }).join('') + '</div>';
  var mx = Math.max.apply(null, wk.perDay.concat([1])), sd = SELDAY == null ? 6 : SELDAY;
  h += '<div class="font-extrabold" style="margin-top:4px">This week</div><div class="card space-y-3"><div class="grid grid-cols-3 gap-2 text-center">' +
    '<div><div class="text-xl font-extrabold">' + wk.sessions + '</div>' + muted('sessions') + '</div><div><div class="text-xl font-extrabold">' + Math.floor(wk.minutes / 60) + 'h ' + (wk.minutes % 60) + 'm</div>' + muted('focused time') + '</div><div><div class="text-xl font-extrabold">' + wk.activeDays + '/7</div>' + muted('days studied') + '</div></div>' +
    '<div style="display:flex;align-items:flex-end;gap:6px;height:84px">' + wk.perDay.map(function (m, i) { return '<button aria-label="' + esc(nice(wk.days[i])) + ': ' + m + ' minutes" onclick="shDay(' + i + ')" style="flex:1;height:100%;display:flex;flex-direction:column;justify-content:flex-end;align-items:center;gap:4px;background:none;border:0"><span style="width:100%;height:' + Math.max(4, Math.round(m / mx * 60)) + 'px;border-radius:6px;background:' + (i === sd ? '#10b981' : 'var(--sub)') + '"></span><span class="text-xs" style="color:var(--mut)">' + DAYN[wd(wk.days[i])][0] + '</span></button>'; }).join('') + '</div>' +
    muted(esc(nice(wk.days[sd])) + ': ' + wk.perDay[sd] + ' min' + (function () { var c = Object.keys(s.log.filter(function (e) { return e.date === wk.days[sd]; }).reduce(function (o, e) { o[e.course] = 1; return o; }, {})); return c.length ? ' on ' + esc(c.join(', ')) : ''; })()) +
    (wk.abandoned ? muted(wk.abandoned + ' session' + (wk.abandoned > 1 ? 's' : '') + ' ended early') : '') + '</div>';
  h += '%%HIST%%';
  return h + classicCard();
}
function classicCard() {
  return '<div class="card space-y-2"><div class="font-extrabold">Classic Study tools</div>' + muted('Timetable, reading list and plan editor are unchanged.') +
    '<div class="flex flex-wrap gap-2"><button class="btn2" style="min-height:40px" onclick="shOld([\'Timetable\'])">Timetable and campus</button><button class="btn2" style="min-height:40px" onclick="shOld([\'Reading List\'])">Reading list</button><button class="btn2" style="min-height:40px" onclick="shOld([\'Plan Editor\'])">Plan editor</button><button class="btn2" style="min-height:40px" onclick="shClassic()">Use classic Study</button></div></div>';
}

/* ---------- Sessions ---------- */
function vSessions() {
  var s = SH();
  if (s.reflect) return vReflect(s.reflect);
  if (s.active) return vActive(s.active);
  var today = iso(), h = '<div class="card space-y-3"><div class="font-extrabold">Start a study session</div>' +
    '<div><div class="lbl">Course</div><select class="inp" onchange="shF(\'course\',this.value);shRefresh()"><option value="">Choose a course</option>' + courseOpts(F.course) + '</select></div>' +
    '<div><div class="lbl">Topic</div><input class="inp" list="sh-topics" placeholder="What will you study?" value="' + esc(F.topic) + '" oninput="shF(\'topic\',this.value)"><datalist id="sh-topics">' + (s.topics[ck(F.course)] || []).map(function (t) { return '<option value="' + esc(t.t) + '">'; }).join('') + '</datalist></div>' +
    '<div><div class="lbl">Learning objectives (one per line)</div><textarea class="inp" rows="3" placeholder="What should you be able to do by the end?" oninput="shF(\'obj\',this.value)">' + esc(F.obj) + '</textarea></div>' +
    '<div><div class="lbl">Planned duration</div><div class="flex flex-wrap gap-2">' + PRESETS.map(function (m) { return chip(m + ' min', F.min === m && !F.custom, 'shMin(' + m + ')'); }).join('') +
    '<input class="inp" type="number" min="5" max="240" placeholder="Custom" style="width:96px" value="' + esc(F.custom) + '" oninput="shF(\'custom\',this.value)"></div></div>' +
    '<div><div class="lbl">Study method</div><select class="inp" onchange="shF(\'method\',this.value);shRefresh()">' + METHODS.map(function (m) { return '<option' + (m === F.method ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div>';
  if (F.course && F.method === 'Active recall' && W.as2Has && W.as2Has(F.course)) h += '<button class="btn2 w-full" onclick="shMaterial()">Use my saved material for questions</button>';
  h += '<button class="btn w-full" onclick="shStart()">Start session</button>' + muted('Time counts only while the app is open and the timer is running. At least 5 focused minutes count toward your streak.') + '</div>';
  var wk = calc.week(s.log, today), recent = s.log.slice(-8).reverse();
  h += '%%SPLIT%%';
  h += '<div class="card space-y-2"><div class="font-extrabold">Study history</div><div class="grid grid-cols-3 gap-2 text-center"><div><div class="text-xl font-extrabold">' + s.log.filter(function (e) { return e.status === 'done'; }).length + '</div>' + muted('completed') + '</div><div><div class="text-xl font-extrabold">' + Math.round(sum(s.log, function (e) { return e.focused || 0; }) / 6) / 10 + 'h</div>' + muted('focused total') + '</div><div><div class="text-xl font-extrabold">' + s.log.filter(function (e) { return e.status === 'abandoned'; }).length + '</div>' + muted('ended early') + '</div></div>' +
    (recent.length ? recent.map(function (e) { return '<div class="flex justify-between text-sm" style="border-top:1px solid var(--bd);padding-top:6px"><span><b>' + esc(e.course) + '</b> ' + esc(e.topic || '') + '<span class="block text-xs" style="color:var(--mut)">' + esc(nice(e.date)) + ' | ' + esc(e.method || '') + (e.status === 'abandoned' ? ' | ended early' : '') + '</span></span><span class="text-xs font-extrabold" style="color:' + (e.valid ? '#059669' : 'var(--mut)') + '">' + e.focused + ' min' + (e.understanding ? '<br>' + e.understanding + '/5' : '') + '</span></div>'; }).join('') : '<div class="flex items-center gap-3">' + zuma('studying', 56) + muted('No sessions yet. Your history appears here.') + '</div>') + '</div>';
  return h;
}
function vActive(A) {
  var c = calc.clocks(A), planned = (+A.planned || 25) * 60000, left = Math.max(0, planned - c.focused);
  return '<div class="card space-y-4" style="text-align:center"><div><div class="font-extrabold" style="font-size:18px">' + esc(A.course) + '</div>' + muted(esc(A.topic || A.method)) + '</div>' +
    '<div id="sh-clock" style="font-size:54px;font-weight:800;letter-spacing:.02em">' + fmt(c.focused) + '</div>' + bar(c.focused / planned) +
    '<div class="text-xs" id="sh-sub" style="color:var(--mut)">' + (A.pauseAt ? 'Paused' : A.hidAt ? 'App in background, time is not counting' : (left > 0 ? fmt(left) + ' left of ' + A.planned + ' min' : 'Planned time reached. Finish when you are ready.')) + '</div>' +
    ((A.obj || []).length ? '<div class="text-left space-y-1"><div class="lbl">Learning objectives</div>' + A.obj.map(function (o, i) { return '<label class="flex items-start gap-2 text-sm" style="min-height:36px"><input type="checkbox" ' + (o.d ? 'checked' : '') + ' onchange="shObj(' + i + ')" style="margin-top:3px"><span>' + esc(o.t) + '</span></label>'; }).join('') + '</div>' : '') +
    '<div class="flex gap-2"><button class="btn flex-1" onclick="shPause()">' + (A.pauseAt ? 'Resume' : 'Pause') + '</button><button class="btn2 flex-1" onclick="shComplete()">Complete</button></div>' +
    '<button class="text-xs" style="color:var(--mut);min-height:40px" onclick="shAbandon()">' + (A.confirm ? 'Tap again to end without finishing' : 'End early') + '</button></div>';
}
function vReflect(R) {
  var met = R.obj.length ? R.obj.filter(function (o) { return o.d; }).length + ' of ' + R.obj.length + ' objectives ticked' : '';
  var tl = SH().topics[ck(R.course)] || [], hasT = tl.some(function (t) { return norm(t.t) === norm(R.topic); });
  return '<div class="card space-y-3"><div class="font-extrabold">How did it go?</div><div class="flex items-center gap-3">' + zuma('cheer', 64) + muted('You focused for <b>' + R.focused + ' min</b> (timer ran ' + R.running + ' min).' + (R.focused < 5 ? ' Under 5 minutes does not count toward your streak.' : '')) + '</div>' +
    '<div><div class="lbl">Topics covered</div><input class="inp" value="' + esc(R.topic || '') + '" oninput="shR(\'topic\',this.value)"></div>' +
    '<div><div class="lbl">How well do you understand it?</div><div class="flex gap-2">' + [1, 2, 3, 4, 5].map(function (n) { return chip(String(n), R.understanding === n, 'shR(\'understanding\',' + n + ');shRefresh()'); }).join('') + '</div>' + muted('1 is lost, 5 is confident') + '</div>' +
    '<div><div class="lbl">Objectives achieved</div><div class="flex gap-2">' + [['yes', 'Yes'], ['partly', 'Partly'], ['no', 'No']].map(function (o) { return chip(o[1], R.met === o[0], 'shR(\'met\',\'' + o[0] + '\');shRefresh()'); }).join('') + '</div>' + (met ? muted(met) : '') + '</div>' +
    '<div><div class="lbl">Difficulties</div><textarea class="inp" rows="2" placeholder="What was hard or unclear?" oninput="shR(\'difficulties\',this.value)">' + esc(R.difficulties || '') + '</textarea></div>' +
    '<div><div class="lbl">Notes</div><textarea class="inp" rows="3" placeholder="Short notes for next time" oninput="shR(\'notes\',this.value)">' + esc(R.notes || '') + '</textarea></div>' +
    (hasT ? '<label class="flex items-center gap-2 text-sm"><input type="checkbox" ' + (R.markDone ? 'checked' : '') + ' onchange="shR(\'markDone\',this.checked)"> Mark this topic as completed</label>' : '') +
    '<button class="btn w-full" onclick="shSaveReflect()">Save session</button></div>';
}

/* ---------- Courses ---------- */
function vCourses() {
  var s = SH(), today = iso(), cs = courses();
  if (COURSE) return vCourse(COURSE);
  if (!cs.length) return '<div class="card flex items-center gap-3" style="padding:18px">' + zuma('welcome', 90) + '<div class="flex-1"><div class="font-extrabold">No courses yet</div>' + muted('Courses come from your course registration.') + '<button class="btn" style="margin-top:8px" onclick="shClassic()">Open classic Study</button></div></div>';
  var at = calc.attention(cs, s.log, today), m = {}; at.forEach(function (x) { m[ck(x.code)] = x; });
  return '<div class="space-y-3">' + cs.map(function (c) {
    var k = ck(c.code), a = m[k], tp = calc.topicProg(s.topics[k] || []);
    return '<button class="card w-full text-left space-y-2" onclick="shOpen(\'' + k + '\')"><div class="flex justify-between"><div><div class="font-extrabold">' + esc(c.code) + '</div>' + muted(esc(c.title || '') + (c.units ? ' | ' + esc(c.units) + ' units' : '')) + '</div><span class="text-xs font-extrabold" style="color:' + (a.state === 'ok' ? '#059669' : '#d97706') + '">' + (a.state === 'ok' ? 'On track' : a.state === 'new' ? 'New' : 'Needs attention') + '</span></div>' +
      (tp.total ? bar(tp.done / tp.total) + muted(tp.done + ' of ' + tp.total + ' topics covered') : muted('No topics added yet')) + muted('Last studied ' + whenWord(a.last, today)) + '</button>';
  }).join('') + '</div>';
}
var STAT = ['Not started', 'In progress', 'Completed'], STC = ['var(--mut)', '#d97706', '#059669'];
function vCourse(k) {
  var s = SH(), today = iso(), c = byKey(k);
  if (!c) { COURSE = null; return vCourses(); }
  var tl = s.topics[k] || [], tp = calc.topicProg(tl), meta = s.meta[k] || {}, logs = s.log.filter(function (e) { return ck(e.course) === k; }).slice(-6).reverse();
  var avg = calc.avgUnderstanding(s.log, c.code), last = calc.last(s.log, c.code);
  var due = s.plan.filter(function (p) { return p.kind !== 'session' && !p.done && ck(p.course) === k && p.date >= today; }).sort(byTime);
  var hasMat = W.as2Has && W.as2Has(c.code);
  return '<div class="space-y-3"><button class="text-sm font-extrabold" style="color:#059669;min-height:40px" onclick="shOpen(null)">&lsaquo; All courses</button>' +
    '<div class="card space-y-2"><div class="font-extrabold" style="font-size:20px">' + esc(c.code) + '</div>' + muted(esc(c.title || '') + (c.units ? ' | ' + esc(c.units) + ' units' : '')) + muted('Last studied ' + whenWord(last, today)) +
    '<div class="flex gap-2"><button class="btn flex-1" onclick="shStudy(\'' + k + '\')">Start session</button><button class="btn2 flex-1" onclick="shSchedule(\'' + k + '\')">Schedule</button></div></div>' +
    '<div class="card space-y-2"><div class="font-extrabold">Course details</div><div class="lbl">Lecturer</div><input class="inp" value="' + esc(meta.lect || '') + '" placeholder="Optional" onchange="shMeta(\'' + k + '\',\'lect\',this.value)"><div class="lbl">Course objectives</div><textarea class="inp" rows="3" placeholder="What this course should teach you" onchange="shMeta(\'' + k + '\',\'obj\',this.value)">' + esc(meta.obj || '') + '</textarea><div class="lbl">Notes</div><textarea class="inp" rows="3" placeholder="Your own notes for this course" onchange="shMeta(\'' + k + '\',\'notes\',this.value)">' + esc(meta.notes || '') + '</textarea></div>' +
    '<div class="card space-y-2"><div class="font-extrabold">Reading material</div>' + (hasMat ? muted('Saved on this device.') + '<button class="btn2 w-full" onclick="shMaterialFor(\'' + k + '\')">Study with my material</button>' : muted('No material saved yet.') + '<button class="btn2 w-full" onclick="shAddMaterial()">Add material</button>') + '</div>' +
    '<div class="card space-y-2"><div class="font-extrabold">Topics</div>' + (tp.total ? bar(tp.done / tp.total) + muted(tp.done + ' completed, ' + tp.doing + ' in progress, ' + (tp.total - tp.done - tp.doing) + ' not started') + muted('Completed topics show coverage, not mastery.' + (avg != null ? ' Your own rating for this course averages ' + avg.toFixed(1) + ' of 5.' : '')) : muted('Add the topics from your course outline.')) +
    tl.map(function (t, i) { return '<div class="flex items-center gap-2"><button class="btn2 flex-1 text-left" style="min-height:44px;justify-content:flex-start" onclick="shTopic(\'' + k + '\',' + i + ')"><span style="color:' + STC[t.s] + ';font-weight:800;margin-right:8px">' + (t.s === 2 ? 'Done' : t.s === 1 ? 'Doing' : 'To do') + '</span>' + esc(t.t) + '</button><button class="text-xs" style="min-height:44px;padding:0 10px;color:var(--mut)" onclick="shTopicDel(\'' + k + '\',' + i + ')" aria-label="Remove topic">Remove</button></div>'; }).join('') +
    '<div class="flex gap-2"><input id="sh-nt" class="inp" placeholder="Add a topic"><button class="btn" onclick="shTopicAdd(\'' + k + '\')">Add</button></div></div>' +
    (due.length ? '<div class="card space-y-1"><div class="font-extrabold">Upcoming assessments</div>' + due.map(function (p) { return '<div class="flex justify-between text-sm"><span>' + esc(p.kind === 'exam' ? 'Exam' : 'Assignment') + ': ' + esc(p.topic || '') + '</span><span class="text-xs" style="color:var(--mut)">' + esc(nice(p.date)) + '</span></div>'; }).join('') + '</div>' : '') +
    '<div class="card space-y-1"><div class="font-extrabold">Study history</div>' + (logs.length ? logs.map(function (e) { return '<div class="flex justify-between text-sm"><span>' + esc(e.topic || e.method || '') + '<span class="block text-xs" style="color:var(--mut)">' + esc(nice(e.date)) + '</span></span><span class="text-xs font-extrabold">' + e.focused + ' min' + (e.understanding ? ' | ' + e.understanding + '/5' : '') + '</span></div>'; }).join('') : muted('No sessions for this course yet.')) + '</div></div>';
}

/* ---------- Planner ---------- */
function weekStart(today, off) { var d = wd(today), mon = addD(today, -((d + 6) % 7)); return addD(mon, off * 7); }
function vPlanner() {
  var s = SH(), today = iso(), cs = courses(), ws = weekStart(today, PW), sel = PD || today, days = []; for (var i = 0; i < 7; i++) days.push(addD(ws, i));
  if (days.indexOf(sel) < 0) sel = days[0];
  var items = s.plan.filter(function (p) { return p.date === sel; }).sort(byTime), sg = calc.suggest(cs, s.log, s.plan, today);
  var h = '<div class="card space-y-3"><div class="flex items-center justify-between"><button class="btn2" style="min-height:40px" onclick="shWeek(-1)" aria-label="Previous week">&lsaquo;</button><div class="font-extrabold">' + esc(nice(days[0])) + ' to ' + esc(nice(days[6])) + '</div><button class="btn2" style="min-height:40px" onclick="shWeek(1)" aria-label="Next week">&rsaquo;</button></div>' +
    '<div class="grid grid-cols-7 gap-1 text-center">' + days.map(function (d) {
      var n = s.plan.filter(function (p) { return p.date === d && !p.done; }).length, on = d === sel;
      return '<button onclick="shPick(\'' + d + '\')" style="min-height:58px;border-radius:14px;border:0;background:' + (on ? '#10b981' : 'var(--sub)') + ';color:' + (on ? '#fff' : 'inherit') + '"><span class="text-xs block" style="opacity:.8">' + DAYN[wd(d)] + '</span><span class="font-extrabold block">' + parts(d)[2] + '</span><span class="block" style="height:6px;font-size:8px">' + (n ? '&bull;' : '') + '</span></button>';
    }).join('') + '</div><div class="font-extrabold">' + (sel === today ? 'Today' : esc(nice(sel))) + '</div>' +
    (items.length ? items.map(function (p) {
      return '<div class="flex items-center gap-2" style="border-top:1px solid var(--bd);padding-top:8px"><input type="checkbox" ' + (p.done ? 'checked' : '') + ' onchange="shPlanDone(\'' + esc(p.id) + '\')" aria-label="Done" style="width:20px;height:20px"><div class="flex-1" style="min-width:0;' + (p.done ? 'opacity:.55' : '') + '"><div class="font-extrabold text-sm">' + esc(p.course) + (p.kind !== 'session' ? ' <span style="color:#d97706">' + (p.kind === 'exam' ? 'Exam' : 'Assignment') + '</span>' : '') + '</div>' + muted(esc(p.topic || p.method || '') + (p.time ? ' | ' + esc(p.time) : '') + (p.kind === 'session' ? ' | ' + esc(p.min) + ' min' : '')) + '</div>' +
        (p.kind === 'session' && !p.done ? '<button class="btn" style="min-height:40px;padding:0 14px" onclick="shBegin(\'' + esc(p.id) + '\')">Start</button>' : '') + '<button class="text-xs" style="min-height:40px;padding:0 8px;color:var(--mut)" onclick="shPlanDel(\'' + esc(p.id) + '\')" aria-label="Remove">Remove</button></div>';
    }).join('') : '<div class="flex items-center gap-3">' + zuma('notice', 56) + muted('Nothing planned for this day.') + '</div>') + '</div>';
  if (sg.length) h += '<div class="card space-y-2"><div class="font-extrabold">Suggested focus</div>' + muted('Based on your own sessions and deadlines. You decide what goes in your plan.') + sg.map(function (x) { return '<div class="flex items-center justify-between gap-2"><span style="min-width:0"><span class="font-extrabold block text-sm">' + esc(x.code) + '</span>' + muted(esc(x.why.join(', '))) + '</span><button class="btn2" style="min-height:40px;padding:0 12px" onclick="shSuggest(\'' + ck(x.code) + '\')">Add</button></div>'; }).join('') + '</div>';
  h += '<div class="card space-y-3"><div class="font-extrabold">Add to your plan</div><div class="flex gap-2 flex-wrap">' + [['session', 'Study session'], ['exam', 'Exam'], ['assignment', 'Assignment']].map(function (k) { return chip(k[1], P.kind === k[0], 'shP(\'kind\',\'' + k[0] + '\');shRefresh()'); }).join('') + '</div>' +
    '<select class="inp" onchange="shP(\'course\',this.value)"><option value="">Course</option>' + courseOpts(P.course) + '</select>' +
    '<input class="inp" placeholder="' + (P.kind === 'session' ? 'Topic' : 'Title') + '" value="' + esc(P.topic) + '" oninput="shP(\'topic\',this.value)">' +
    '<div class="grid grid-cols-2 gap-2"><input class="inp" type="date" value="' + esc(P.date || sel) + '" onchange="shP(\'date\',this.value)"><input class="inp" type="time" value="' + esc(P.time) + '" onchange="shP(\'time\',this.value)"></div>' +
    (P.kind === 'session' ? '<div class="grid grid-cols-2 gap-2"><input class="inp" type="number" min="5" max="240" value="' + esc(P.min) + '" onchange="shP(\'min\',this.value)" aria-label="Minutes"><select class="inp" onchange="shP(\'method\',this.value)">' + METHODS.map(function (m) { return '<option' + (m === P.method ? ' selected' : '') + '>' + m + '</option>'; }).join('') + '</select></div>' : '') +
    '<button class="btn w-full" onclick="shPlanAdd()">Add</button></div>';
  var up = s.plan.filter(function (p) { return p.kind !== 'session' && !p.done && p.date >= today && dd(today, p.date) <= 14; }).sort(byTime);
  if (up.length) h += '<div class="card space-y-1"><div class="font-extrabold">Deadlines in the next 14 days</div>' + up.map(function (p) { var l = dd(today, p.date); return '<div class="flex justify-between text-sm"><span>' + esc(p.course) + ' ' + (p.kind === 'exam' ? 'exam' : 'assignment') + (p.topic ? ': ' + esc(p.topic) : '') + '</span><span class="text-xs font-extrabold" style="color:' + (l <= 2 ? '#dc2626' : '#d97706') + '">' + (l === 0 ? 'Today' : l + ' day' + (l > 1 ? 's' : '')) + '</span></div>'; }).join('') + '</div>';
  return h + '<div class="card space-y-2"><div class="font-extrabold">Class timetable</div>' + muted('Your lecture timetable is kept in the classic Study tools.') + '<button class="btn2" onclick="shOld([\'Timetable\'])">Open timetable and campus</button></div>';
}

/* ---------- timetable data: your own lectures, or the classic timetable if it can be recognised ---------- */
function dayIdx(v) { if (typeof v === 'number') return ((v % 7) + 7) % 7; var t = String(v).slice(0, 3).toLowerCase(); return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'].indexOf(t); }
function isTTRow(x) {
  if (!x || typeof x !== 'object') return false; var c = x.code || x.course;
  return typeof c === 'string' && CODE.test(c.replace(/^UA-/i, '').trim().toUpperCase()) && (x.venue || x.room || x.hall) && (x.day != null || x.dow != null || x.weekday != null) && !!(x.start || x.time || x.from);
}
function scanTT(o, d, out) {
  if (!o || typeof o !== 'object' || d > 3) return;
  if (Array.isArray(o)) { if (o.length && o.every(isTTRow)) out.push(o); return; }
  Object.keys(o).forEach(function (k) { if (k !== 'sh' && k !== 'readLog' && k !== 'study') scanTT(o[k], d + 1, out); });
}
function classicTT() {
  var f = []; try { scanTT(U, 0, f); } catch (e) {} if (!f.length) return [];
  return f[0].map(function (x) { return { id: 'c' + (x.id || x.code || x.course), ro: true, course: x.code || x.course, day: dayIdx(x.day != null ? x.day : x.dow != null ? x.dow : x.weekday), start: String(x.start || x.time || x.from), end: String(x.end || x.to || ''), venue: x.venue || x.room || x.hall || '', lect: x.lecturer || x.lect || '' }; }).filter(function (x) { return x.day >= 0; });
}
function ttAll() { var own = SH().tt || []; return own.length ? own : classicTT(); }
function tasksCard(today) {
  var s = SH(), items = s.plan.filter(function (p) { return p.date === today; }).sort(byTime), lec = ttAll().filter(function (x) { return x.day === wd(today); }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  if (!items.length && !lec.length) return '';
  return '<div class="card space-y-2"><div class="font-extrabold">Today\'s tasks</div>' +
    lec.map(function (x) { return '<div class="flex items-center justify-between gap-2"><span style="min-width:0"><span class="font-extrabold text-sm block">' + esc(x.course) + ' lecture</span>' + muted(esc(x.start) + (x.end ? ' - ' + esc(x.end) : '') + (x.venue ? ' | ' + esc(x.venue) : '')) + '</span><button class="btn2" style="min-height:40px;padding:0 12px" onclick="shOpen(\'' + ck(x.course) + '\')">View course</button></div>'; }).join('') +
    items.map(function (p) { return '<div class="flex items-center gap-2" style="border-top:1px solid var(--bd);padding-top:8px"><input type="checkbox" ' + (p.done ? 'checked' : '') + ' onchange="shPlanDone(\'' + esc(p.id) + '\')" aria-label="Mark complete" style="width:20px;height:20px"><span class="flex-1" style="min-width:0;' + (p.done ? 'opacity:.55;text-decoration:line-through' : '') + '"><span class="font-extrabold text-sm block">' + esc(p.course) + (p.kind !== 'session' ? ' ' + (p.kind === 'exam' ? 'exam' : 'assignment') : '') + '</span>' + muted(esc(p.topic || p.method || '')) + '</span>' + (p.kind === 'session' && !p.done ? '<button class="btn" style="min-height:40px;padding:0 14px" onclick="shBegin(\'' + esc(p.id) + '\')">Start session</button>' : '') + '</div>'; }).join('') + '</div>';
}
function vToday() {
  var s = SH(); if (s.reflect || s.active) return vSessions();
  var parts = vSessions().split('%%SPLIT%%');
  return vOverview().replace('%%FORM%%', parts[0]).replace('%%HIST%%', parts[1] || '');
}

/* ---------- Timetable and campus ---------- */
var TTV = 'week', L = { course: '', day: '1', start: '', end: '', venue: '', lect: '' }, E = { title: '', date: '', time: '', venue: '' };
var ORDER = [1, 2, 3, 4, 5, 6, 0], FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function lecRow(x) {
  return '<div class="flex items-center justify-between gap-2"><span style="min-width:0"><span class="font-extrabold text-sm block">' + esc(x.course) + '</span>' + muted(esc(x.start) + (x.end ? ' - ' + esc(x.end) : '') + (x.venue ? ' | ' + esc(x.venue) : '') + (x.lect ? ' | ' + esc(x.lect) : '')) + '</span>' +
    (x.ro ? '' : '<button class="text-xs" style="min-height:40px;padding:0 8px;color:var(--mut)" onclick="shLDel(\'' + esc(x.id) + '\')" aria-label="Remove lecture">Remove</button>') + '</div>';
}
function vTimetable() {
  var s = SH(), today = iso(), now = new Date(), all = ttAll(), nc = calc.nextClass(all, now);
  var h = '<div class="card space-y-1">';
  if (nc) h += '<div class="lbl">Next class</div><div class="font-extrabold" style="font-size:18px">' + esc(nc.x.course) + '</div>' + muted(esc(FULL[nc.at.getDay()]) + ' ' + esc(nc.x.start) + (nc.x.venue ? ' | ' + esc(nc.x.venue) : '') + (nc.x.lect ? ' | ' + esc(nc.x.lect) : '')) + '<div class="text-sm font-extrabold" style="color:#059669">Starts in ' + untilText(nc.at - now) + '</div>';
  else h += '<div class="flex items-center gap-3">' + zuma('notice', 64) + '<div><div class="font-extrabold">No lectures on your timetable</div>' + muted('Add your lectures below and your week fills in.') + '</div></div>';
  h += '</div><div class="flex gap-2">' + chip('Week', TTV === 'week', 'shTT(\'week\')') + chip('Day', TTV === 'day', 'shTT(\'day\')') + '</div>';
  if (TTV === 'week') {
    h += '<div class="card space-y-3">' + ORDER.map(function (d) {
      var rows = all.filter(function (x) { return x.day === d; }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
      return '<div><div class="lbl" style="' + (d === now.getDay() ? 'color:#059669' : '') + '">' + FULL[d] + (d === now.getDay() ? ' (today)' : '') + '</div>' + (rows.length ? '<div class="space-y-2">' + rows.map(lecRow).join('') + '</div>' : muted('Free')) + '</div>';
    }).join('') + '</div>';
  } else {
    var ws = weekStart(today, 0), days = []; for (var i = 0; i < 7; i++) days.push(addD(ws, i));
    var sel = PD && days.indexOf(PD) > -1 ? PD : today, rows = all.filter(function (x) { return x.day === wd(sel); }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    var evs = s.events.filter(function (e) { return e.date === sel; }), pl = s.plan.filter(function (p) { return p.date === sel; }).sort(byTime);
    h += '<div class="card space-y-3"><div class="grid grid-cols-7 gap-1 text-center">' + days.map(function (d) { var on = d === sel; return '<button onclick="shPick(\'' + d + '\')" style="min-height:52px;border-radius:14px;border:0;background:' + (on ? '#10b981' : 'var(--sub)') + ';color:' + (on ? '#fff' : 'inherit') + '"><span class="text-xs block" style="opacity:.8">' + DAYN[wd(d)] + '</span><span class="font-extrabold block">' + parts(d)[2] + '</span></button>'; }).join('') + '</div>' +
      '<div class="font-extrabold">' + (sel === today ? 'Today' : esc(nice(sel))) + '</div>' +
      (rows.length || evs.length || pl.length ? rows.map(lecRow).join('') + evs.map(function (e) { return '<div class="text-sm"><b>' + esc(e.title) + '</b>' + muted('Campus event' + (e.time ? ' | ' + esc(e.time) : '') + (e.venue ? ' | ' + esc(e.venue) : '')) + '</div>'; }).join('') + pl.map(function (p) { return '<div class="text-sm"><b>' + esc(p.course) + '</b> ' + esc(p.kind === 'session' ? 'study session' : p.kind) + muted(esc(p.topic || '') + (p.time ? ' | ' + esc(p.time) : '')) + '</div>'; }).join('')
        : '<div class="flex items-center gap-3">' + zuma('notice', 56) + muted('Nothing scheduled. A free day is a good day to get ahead.') + '</div>') + '</div>';
  }
  h += '<details class="card"><summary class="font-extrabold" style="min-height:44px;display:flex;align-items:center">Add a lecture</summary><div class="space-y-2" style="padding-top:8px">' +
    '<select class="inp" onchange="shL(\'course\',this.value)"><option value="">Course</option>' + courseOpts(L.course) + '</select>' +
    '<select class="inp" onchange="shL(\'day\',this.value)">' + ORDER.map(function (d) { return '<option value="' + d + '"' + (String(d) === String(L.day) ? ' selected' : '') + '>' + FULL[d] + '</option>'; }).join('') + '</select>' +
    '<div class="grid grid-cols-2 gap-2"><input class="inp" type="time" aria-label="Start time" onchange="shL(\'start\',this.value)"><input class="inp" type="time" aria-label="End time" onchange="shL(\'end\',this.value)"></div>' +
    '<input class="inp" placeholder="Venue" oninput="shL(\'venue\',this.value)"><input class="inp" placeholder="Lecturer (optional)" oninput="shL(\'lect\',this.value)"><button class="btn w-full" onclick="shLAdd()">Add lecture</button></div></details>';
  var evAll = s.events.filter(function (e) { return e.date >= today; }).sort(byTime);
  h += '<details class="card"><summary class="font-extrabold" style="min-height:44px;display:flex;align-items:center">Campus events' + (evAll.length ? ' (' + evAll.length + ')' : '') + '</summary><div class="space-y-2" style="padding-top:8px">' +
    evAll.map(function (e) { return '<div class="flex items-center justify-between gap-2"><span style="min-width:0"><span class="font-extrabold text-sm block">' + esc(e.title) + '</span>' + muted(esc(nice(e.date)) + (e.time ? ' | ' + esc(e.time) : '') + (e.venue ? ' | ' + esc(e.venue) : '')) + '</span><button class="text-xs" style="min-height:40px;padding:0 8px;color:var(--mut)" onclick="shEDel(\'' + esc(e.id) + '\')" aria-label="Remove event">Remove</button></div>'; }).join('') +
    '<input class="inp" placeholder="Event title" oninput="shE(\'title\',this.value)"><div class="grid grid-cols-2 gap-2"><input class="inp" type="date" aria-label="Event date" onchange="shE(\'date\',this.value)"><input class="inp" type="time" aria-label="Event time" onchange="shE(\'time\',this.value)"></div><input class="inp" placeholder="Venue" oninput="shE(\'venue\',this.value)"><button class="btn w-full" onclick="shEAdd()">Add event</button></div></details>';
  var up = [];
  s.plan.forEach(function (p) { if (!p.done && p.date >= today && dd(today, p.date) <= 14) up.push({ date: p.date, time: p.time, a: p.course + ' ' + (p.kind === 'session' ? 'study session' : p.kind), b: p.topic || '' }); });
  s.events.forEach(function (e) { if (e.date >= today && dd(today, e.date) <= 14) up.push({ date: e.date, time: e.time, a: e.title, b: 'Campus event' }); });
  up.sort(byTime);
  h += '<div class="card space-y-2"><div class="font-extrabold">Upcoming academic activities</div>' + (up.length ? up.slice(0, 8).map(function (u) { return '<div class="flex justify-between gap-2 text-sm"><span style="min-width:0"><b>' + esc(u.a) + '</b>' + (u.b ? muted(esc(u.b)) : '') + '</span><span class="text-xs" style="color:var(--mut);white-space:nowrap">' + esc(nice(u.date)) + (u.time ? ' ' + esc(u.time) : '') + '</span></div>'; }).join('') : muted('Nothing in the next 14 days.')) + '</div>';
  h += '<details class="card"><summary class="font-extrabold" style="min-height:44px;display:flex;align-items:center">Plan your study</summary><div style="padding-top:8px">' + vPlanner() + '</div></details>';
  return h;
}
W.shTT = function (v) { TTV = v; paint(); };
W.shL = function (k, v) { L[k] = v; };
W.shLAdd = function () {
  var s = SH(); if (!L.course) return toast('Choose a course', 'error'); if (!L.start) return toast('Add the start time', 'error');
  if (L.end && L.end <= L.start) return toast('The end time must be after the start', 'error');
  s.tt.push({ id: 't' + Date.now() + Math.floor(Math.random() * 99), course: L.course, day: +L.day, start: L.start, end: L.end, venue: (L.venue || '').trim(), lect: (L.lect || '').trim() });
  L.start = L.end = L.venue = ''; persist(); toast('Lecture added'); paint();
};
W.shLDel = function (id) { var s = SH(); s.tt = s.tt.filter(function (x) { return x.id !== id; }); persist(); paint(); };
W.shE = function (k, v) { E[k] = v; };
W.shEAdd = function () {
  var s = SH(); if (!(E.title || '').trim()) return toast('Add a title', 'error'); if (!E.date) return toast('Choose a date', 'error');
  s.events.push({ id: 'e' + Date.now() + Math.floor(Math.random() * 99), title: E.title.trim(), date: E.date, time: E.time || '', venue: (E.venue || '').trim() });
  E.title = E.venue = ''; persist(); toast('Event added'); paint();
};
W.shEDel = function (id) { var s = SH(); s.events = s.events.filter(function (x) { return x.id !== id; }); persist(); paint(); };

/* ---------- shell ---------- */
var TABS = [['today', 'Today'], ['courses', 'Courses'], ['timetable', 'Timetable & campus']], IC = { today: 'overview', courses: 'courses', timetable: 'planner' };
function render() {
  var body = TAB === 'courses' ? vCourses() : TAB === 'timetable' ? vTimetable() : vToday();
  return '<div data-sh="1" class="space-y-4"><div><div class="text-2xl font-extrabold">Study</div>' + muted('Your academic workspace') + '</div>' +
    '<div class="grid grid-cols-3 gap-2" role="tablist">' + TABS.map(function (t) {
      var on = t[0] === TAB; return '<button role="tab" aria-selected="' + on + '" onclick="shTab(\'' + t[0] + '\')" style="min-height:62px;border-radius:16px;border:1.5px solid ' + (on ? '#10b981' : 'var(--bd)') + ';background:' + (on ? 'rgba(16,185,129,.14)' : 'var(--sub)') + ';color:' + (on ? '#059669' : 'inherit') + ';font-weight:700;font-size:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px">' + ic(IC[t[0]]) + t[1] + '</button>';
    }).join('') + '</div>' + body + '</div>';
}
function stopTick() { if (TICK) { clearInterval(TICK); TICK = null; } }
function startTick() {
  stopTick(); if (!SH().active) return;
  TICK = setInterval(function () {
    var A = SH().active, el = document.getElementById('sh-clock'); if (!A || !el) { stopTick(); return; }
    var c = calc.clocks(A), pl = (+A.planned || 25) * 60000; el.textContent = fmt(c.focused);
    try { localStorage.setItem('as_sh_beat', String(Date.now())); } catch (e) {}
  }, 1000);
}
function paint() {
  if (!ACTIVE) return;
  var m = document.getElementById('main'); if (!m) return;
  if (!document.querySelector('[data-sh]') && m.innerHTML && !m.innerHTML.length) return;
  try { m.innerHTML = render(); startTick(); } catch (e) { try { console.error('studyhub', e); } catch (_) {} toast('Something went wrong here', 'error'); }
}
function heal() {
  var A = SH().active; if (!A) return;
  try {
    var beat = +localStorage.getItem('as_sh_beat') || A.startedAt, gap = Date.now() - beat;
    if (gap > 45000 && !A.pauseAt) { A.hiddenMs = (A.hiddenMs || 0) + gap; A.hidAt = null; persist(); }
  } catch (e) {}
}
function mount() {
  try {
    var m = document.getElementById('main'); if (!m || !ACTIVE) return;
    SH(); heal(); var html = render(); m.innerHTML = html; startTick();
  } catch (e) {
    try { console.error('studyhub', e); sessionStorage.setItem('as_sh_classic', '1'); } catch (_) {}
    ACTIVE = false; toast('Study opened in classic mode'); viaOld([]);
  }
}

/* ---------- finding and using the classic screens ---------- */
function vis(el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
function navBtn(label) {
  var bs = document.querySelectorAll('button,a,[role=button]');
  for (var i = 0; i < bs.length; i++) { var b = bs[i]; if (norm(b.textContent) === label && vis(b) && b.getBoundingClientRect().top > (W.innerHeight || 800) * 0.7) return b; }
  return null;
}
function clickText(t) {
  t = norm(t); var els = document.querySelectorAll('button,[onclick],a,[role=button]'), best = null, bl = 1e9;
  for (var i = 0; i < els.length; i++) { var x = norm(els[i].textContent); if (x.indexOf(t) > -1 && x.length < bl && vis(els[i]) && !els[i].closest('[data-sh]')) { best = els[i]; bl = x.length; } }
  if (best) { best.click(); return true; } return false;
}
function viaOld(steps) {
  var b = navBtn('study'); if (!b) return false;
  W.__shSkip = true; try { b.click(); } finally { W.__shSkip = false; }
  ACTIVE = false; stopTick(); var i = 0;
  (function next() { if (i >= steps.length) return; setTimeout(function () { clickText(steps[i++]); next(); }, 200); })();
  return true;
}
W.shOld = function (steps) { if (!viaOld(steps)) toast('Open the Study tab from the bottom bar'); };
W.shClassic = function () { try { sessionStorage.setItem('as_sh_classic', '1'); } catch (e) {} viaOld([]); };
function classicOn() { try { return sessionStorage.getItem('as_sh_classic') === '1' || localStorage.getItem('as_sh_off') === '1'; } catch (e) { return false; } }
document.addEventListener('click', function (e) {
  try {
    var b = e.target && e.target.closest ? e.target.closest('button,a,[role=button]') : null; if (!b) return;
    var r = b.getBoundingClientRect(); if (!(r.width > 0 && r.top > (W.innerHeight || 800) * 0.7)) return;
    var t = norm(b.textContent);
    if (t === 'study') {
      if (W.__shSkip || classicOn()) return;
      ACTIVE = true; tries = 0; clearTimeout(MT); MT = setTimeout(mount, 90);
      setTimeout(function () { if (ACTIVE && !document.querySelector('[data-sh]') && tries++ < 2) mount(); }, 500);
    } else if (t === 'home' || t === 'results' || t === 'attend' || t === 'finance') { ACTIVE = false; stopTick(); }
  } catch (err) {}
}, true);

/* ---------- actions ---------- */
var MAPT = { overview: 'today', sessions: 'today', planner: 'timetable' };
W.shTab = function (t) { TAB = MAPT[t] || t; COURSE = null; paint(); };
W.shRefresh = function () { paint(); };
W.shF = function (k, v) { F[k] = v; };
W.shMin = function (m) { F.min = m; F.custom = ''; try { localStorage.setItem('as_sh_min', String(m)); } catch (e) {} paint(); };
W.shDay = function (i) { SELDAY = i; paint(); };
W.shOpen = function (k) { COURSE = k; TAB = 'courses'; paint(); };
W.shStudy = function (k) { var c = byKey(k); F.course = c ? c.code : ''; F.topic = ''; F.obj = ''; F.planId = null; TAB = 'today'; COURSE = null; paint(); };
W.shRepeat = function () { var e = SH().log.slice(-1)[0]; if (!e) return; F.course = e.course; F.topic = e.topic || ''; F.method = e.method || METHODS[0]; F.planId = null; TAB = 'today'; paint(); };
W.shMaterial = function () { W.go('acad2'); setTimeout(function () { if (W.as2StartCourse) W.as2StartCourse(F.course); }, 80); };
W.shMaterialFor = function (k) { var c = byKey(k); if (!c) return; W.go('acad2'); setTimeout(function () { if (W.as2StartCourse) W.as2StartCourse(c.code); }, 80); };
W.shAddMaterial = function () { W.go('acad2'); };
W.shMeta = function (k, f, v) { var s = SH(); (s.meta[k] = s.meta[k] || {})[f] = v; persist(); };
W.shTopicAdd = function (k) { var el = document.getElementById('sh-nt'), v = el && el.value.trim(); if (!v) return; var s = SH(); (s.topics[k] = s.topics[k] || []).push({ id: Date.now() + '', t: v, s: 0 }); persist(); paint(); };
W.shTopic = function (k, i) { var t = SH().topics[k][i]; t.s = (t.s + 1) % 3; persist(); paint(); };
W.shTopicDel = function (k, i) { SH().topics[k].splice(i, 1); persist(); paint(); };

/* planner */
W.shP = function (k, v) { P[k] = v; };
W.shWeek = function (d) { PW += d; PD = null; paint(); };
W.shPick = function (d) { PD = d; P.date = d; paint(); };
W.shPlanAdd = function () {
  var s = SH(), today = iso(), date = P.date || PD || today;
  if (!P.course) return toast('Choose a course', 'error');
  if (P.kind !== 'session' && !P.topic.trim()) return toast('Add a title', 'error');
  var min = Math.max(5, Math.min(240, +P.min || 30));
  s.plan.push({ id: 'p' + Date.now() + Math.floor(Math.random() * 99), kind: P.kind, course: P.course, topic: P.topic.trim(), date: date, time: P.time || '', min: min, method: P.method, done: false });
  P.topic = ''; persist(); toast('Added to your plan'); paint();
};
W.shPlanDone = function (id) { var p = SH().plan.filter(function (x) { return x.id === id; })[0]; if (p) { p.done = !p.done; persist(); paint(); } };
W.shPlanDel = function (id) { var s = SH(); s.plan = s.plan.filter(function (x) { return x.id !== id; }); persist(); paint(); };
W.shSuggest = function (k) { var c = byKey(k); if (!c) return; var s = SH(); s.plan.push({ id: 'p' + Date.now(), kind: 'session', course: c.code, topic: '', date: iso(), time: '', min: 30, method: METHODS[0], done: false }); persist(); toast('Added to today'); paint(); };
W.shSchedule = function (k) { var c = byKey(k); P.kind = 'session'; P.course = c ? c.code : ''; TAB = 'timetable'; COURSE = null; paint(); };
W.shBegin = function (id) {
  var p = SH().plan.filter(function (x) { return x.id === id; })[0]; if (!p) return;
  F.course = p.course; F.topic = p.topic || ''; F.obj = ''; F.min = +p.min || 25; F.custom = ''; F.method = p.method || METHODS[0]; F.planId = p.id; shStart();
};

/* session engine */
function closeServer(A, focusedMin) {
  try {
    if (typeof sb === 'undefined' || !sb.from) return;
    function fallback() {
      var patch = { ended_at: new Date().toISOString(), minutes: focusedMin, valid: focusedMin >= 5 };
      var q = A.serverId ? sb.from('study_sessions').update(patch).eq('id', A.serverId) : sb.from('study_sessions').insert(Object.assign({ course: A.course, planned_min: A.planned }, patch));
      q.then(function (r) { if (r && r.error) (W.AS_NOTES = W.AS_NOTES || []).push('study_sessions end: ' + r.error.message); }, function () {});
    }
    if (!A.serverId || !sb.rpc) return fallback();
    sb.rpc('finish_study_session', { p_id: A.serverId, p_minutes: focusedMin }).then(function (r) { if (r && r.error) fallback(); }, fallback);
  } catch (e) {}
}
W.shStart = function () {
  var s = SH();
  if (s.active) { TAB = 'today'; return paint(); }
  var min = F.custom ? +F.custom : F.min;
  if (!F.course) return toast('Choose a course first', 'error');
  if (!(min >= 5 && min <= 240)) return toast('Choose between 5 and 240 minutes', 'error');
  try { localStorage.setItem('as_sh_min', String(min)); } catch (e) {}
  var A = { id: 's' + Date.now(), course: F.course, topic: F.topic.trim(), method: F.method, planned: min, planId: F.planId || null, startedAt: Date.now(), pausedMs: 0, hiddenMs: 0, pauseAt: null, hidAt: null, confirm: false,
    obj: String(F.obj || '').split(/\n/).map(function (x) { return x.trim(); }).filter(Boolean).map(function (t) { return { t: t, d: false }; }) };
  s.active = A; persist(); TAB = 'today'; COURSE = null;
  try {
    if (typeof sb !== 'undefined' && sb.from) {
      var row = { course: A.course, planned_min: min }; if (W.performance && performance.timeOrigin) row.app_opened_at = new Date(performance.timeOrigin).toISOString();
      sb.from('study_sessions').insert(row).select('id').single().then(function (r) { if (r && r.data) { A.serverId = r.data.id; persist(); } else if (r && r.error) (W.AS_NOTES = W.AS_NOTES || []).push('study_sessions start: ' + r.error.message); }, function () {});
    }
  } catch (e) {}
  paint();
};
W.shPause = function () {
  var A = SH().active; if (!A) return;
  if (A.pauseAt) { A.pausedMs = (A.pausedMs || 0) + (Date.now() - A.pauseAt); A.pauseAt = null; } else { if (A.hidAt) { A.hiddenMs = (A.hiddenMs || 0) + (Date.now() - A.hidAt); A.hidAt = null; } A.pauseAt = Date.now(); }
  persist(); paint();
};
W.shObj = function (i) { var A = SH().active; if (A && A.obj[i]) { A.obj[i].d = !A.obj[i].d; persist(); } };
function finishActive(status) {
  var s = SH(), A = s.active; if (!A) return;
  var c = calc.clocks(A), focused = mins(c.focused);
  closeServer(A, focused);
  s.reflect = { id: A.id, course: A.course, topic: A.topic, method: A.method, planned: A.planned, planId: A.planId, obj: A.obj, focused: focused, running: mins(c.run), status: status, understanding: 3, met: A.obj.length && A.obj.every(function (o) { return o.d; }) ? 'yes' : '', difficulties: '', notes: '', markDone: false };
  s.active = null; stopTick(); persist();
}
W.shComplete = function () { finishActive('done'); paint(); };
W.shAbandon = function () {
  var A = SH().active; if (!A) return;
  if (!A.confirm) { A.confirm = true; paint(); return; }
  finishActive('abandoned'); var s = SH(), R = s.reflect; s.reflect = null;
  saveEntry(R, true); toast('Session ended early. Your focused time is saved.'); paint();
};
W.shR = function (k, v) { var R = SH().reflect; if (R) R[k] = v; };
function saveEntry(R, quick) {
  var s = SH(), today = iso(), valid = R.focused >= 5;
  s.log.push({ id: R.id, date: today, course: R.course, topic: (R.topic || '').trim(), method: R.method, planned: R.planned, focused: R.focused, running: R.running, status: R.status, valid: valid,
    understanding: quick ? 0 : R.understanding, met: quick ? '' : R.met, difficulties: quick ? '' : (R.difficulties || '').trim(), notes: quick ? '' : (R.notes || '').trim(), planId: R.planId || null });
  if (s.log.length > 400) s.log = s.log.slice(-400);
  if (valid) { var log = (U.readLog = U.readLog || {}), d = (log[today] = log[today] || []); if (d.indexOf(R.course) < 0) d.push(R.course); }
  if (R.planId && R.status === 'done') { var p = s.plan.filter(function (x) { return x.id === R.planId; })[0]; if (p) p.done = true; }
  if (!quick && R.markDone) { var tl = s.topics[ck(R.course)] || []; tl.forEach(function (t) { if (norm(t.t) === norm(R.topic)) t.s = 2; }); }
  persist();
}
W.shSaveReflect = function () {
  var s = SH(), R = s.reflect; if (!R) return;
  saveEntry(R, false); s.reflect = null; persist(); F.topic = ''; F.obj = ''; F.planId = null;
  toast(R.focused >= 5 ? 'Session saved' : 'Saved. Under 5 minutes does not count toward your streak.'); paint();
};
document.addEventListener('visibilitychange', function () {
  try {
    var A = typeof U !== 'undefined' && U && U.sh && U.sh.active; if (!A) return;
    if (document.hidden) { if (!A.pauseAt && !A.hidAt) A.hidAt = Date.now(); }
    else if (A.hidAt) { A.hiddenMs = (A.hiddenMs || 0) + (Date.now() - A.hidAt); A.hidAt = null; persist(); paint(); }
  } catch (e) {}
});
W.__sh = { mount: mount, render: render, setActive: function (v) { ACTIVE = v; }, state: SH, form: F, plan: P, reset: function () { TAB = 'today'; COURSE = null; }, ttAll: function () { return ttAll(); }, tab: function () { return TAB; } };
})();
