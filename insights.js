/* Academic Summit - insights.js v2: GPA trajectory, academic risk, weekly report.
   Aligned to the real engine: U.semesters + gr/semS/cum/requiredAvg/U.target/U.carry.
   Load after studyhub.js, before homehub.js. Read-only + U.target writes via save().
   Kill switch: localStorage.as_ins_off = 1 */
(function () {
'use strict';
var W = window;
if (typeof document === 'undefined') return;

/* ---------- helpers ---------- */
function UU() { return (typeof U !== 'undefined' && U) ? U : null; }
function hasApp() { return !!UU() && typeof cum === 'function'; }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function iso(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function parts(k) { return [+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)]; }
function addD(k, n) { var p = parts(k); return iso(new Date(p[0], p[1], p[2] + n)); }
function dd(a, b) { var x = parts(a), y = parts(b); return Math.round((Date.UTC(y[0], y[1], y[2]) - Date.UTC(x[0], x[1], x[2])) / 864e5); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
function ck(c) { return String(c || '').replace(/\s+/g, '').toUpperCase(); }
function sum(a, f) { return a.reduce(function (s, x) { return s + f(x); }, 0); }
function toast(m, k) { if (W.showToast) W.showToast(m, k); }
function zuma(p, px) { return W.zumaImg ? W.zumaImg(p, px) : ''; }
function muted(t) { return '<div class="text-xs" style="color:var(--mut)">' + t + '</div>'; }
function bar(p) { return '<div style="height:8px;border-radius:6px;background:var(--sub);overflow:hidden"><div style="height:100%;width:' + Math.round(Math.max(0, Math.min(1, p)) * 100) + '%;background:#10b981"></div></div>'; }
function saveApp() { try { if (typeof save === 'function') save(); } catch (e) {} }
function state() { try { return W.__sh ? W.__sh.state() : null; } catch (e) { return null; } }
function calc() { return W.SHCalc || null; }

/* ---------- grade engine: use the app's own maths first ---------- */
var GP5 = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
function gpOf(score) {
  if (typeof gr === 'function') return gr(score)[1];
  var s = parseFloat(score); if (isNaN(s)) return GP5[String(score).trim().toUpperCase()] != null ? GP5[String(score).trim().toUpperCase()] : null;
  return s >= 70 ? 5 : s >= 60 ? 4 : s >= 50 ? 3 : s >= 45 ? 2 : s >= 40 ? 1 : 0;
}
function letterOf(score) { if (typeof gr === 'function') return gr(score)[0]; var g = gpOf(score); return g == null ? '-' : ['F', 'E', 'D', 'C', 'B', 'A'][g]; }
function sems() { var u = UU(); return (u && u.semesters) || []; }
function semStats(s) {
  if (typeof semStats62 === 'function') return semStats62(s);
  var u = 0, q = 0; (s.courses || []).forEach(function (c) { if (c.sup) return; u += +c.unit || 0; q += (+c.unit || 0) * (gpOf(c.score) || 0); });
  var uReg = u + sum(s.pending || [], function (p) { return +p.unit || 0; });
  return { uRel: u, q: q, uReg: uReg, rel: u ? q / u : 0 };
}
function headGpa(s) {
  if (s.portalGPA != null) return { v: s.portalGPA, src: 'portal' };
  if (s.deducedGPA != null) return { v: s.deducedGPA, src: 'deduced' };
  return { v: semStats(s).rel, src: 'released' };
}
function standing(c) {
  var n = ['First Class', 'Second Class Upper', 'Second Class Lower', 'Third Class', 'Pass / Probation'];
  if (c >= 4.5) return n[0]; if (c >= 3.5) return n[1]; if (c >= 2.5) return n[2]; if (c >= 1.5) return n[3]; return n[4];
}
/* pure, testable snapshot from a synthetic list (letters or scores) */
function snapFromList(list, sc) {
  sc = sc || 5;
  var rows = list.map(function (r) { var gp = r.score != null ? gpOf(r.score) : (GP5[String(r.grade || '').toUpperCase()] != null ? GP5[String(r.grade).toUpperCase()] : null); return { code: ck(r.code), sem: r.sem || '', units: +r.units || 0, gp: gp, raw: r.score != null ? r.score : r.grade }; });
  var graded = rows.filter(function (r) { return r.gp != null && r.units > 0; });
  var tu = sum(graded, function (r) { return r.units; }), cg = tu ? sum(graded, function (r) { return r.gp * r.units; }) / tu : null;
  var groups = {}; rows.forEach(function (r) { if (r.sem) (groups[r.sem] = groups[r.sem] || []).push(r); });
  var keys = Object.keys(groups).sort(), cp = 0, cu = 0, traj = [];
  keys.forEach(function (k) { var g = groups[k].filter(function (r) { return r.gp != null && r.units > 0; }); cp += sum(g, function (r) { return r.gp * r.units; }); cu += sum(g, function (r) { return r.units; }); if (cu) traj.push({ key: k, g: cp / cu, src: 'test', courses: groups[k] }); });
  return { scale: sc, cgpa: cg, units: tu, count: rows.length, sems: traj, impacts: impactsFrom(graded, cg, tu), standing: cg == null ? '' : standing(cg), required: null };
}
function impactsFrom(graded, cg, tu) {
  var by = {}; graded.forEach(function (r) { var o = by[r.code] = by[r.code] || { code: r.code, units: 0, pts: 0 }; o.units += r.units; o.pts += r.gp * r.units; });
  return Object.keys(by).map(function (k) { var o = by[k]; o.gp = o.pts / o.units; o.imp = cg != null && tu ? (o.gp - cg) * o.units / tu : 0; return o; }).sort(function (a, b) { return b.imp - a.imp; });
}
function snapshot() {
  var u = UU();
  if (hasApp()) {
    var c = cum(), list = [], graded = [];
    sems().forEach(function (s, i) {
      var st = semStats(s), h = headGpa(s);
      list.push({ key: s.name || s.label || ('Semester ' + (i + 1)), g: h.v, src: h.src, courses: (s.courses || []).concat((s.pending || []).map(function (p) { return { code: p.code, unit: p.unit, pending: true }; })), uReg: st.uReg });
      (s.courses || []).forEach(function (co) { if (co.sup) return; var gp = gpOf(co.score); if (gp == null) return; graded.push({ code: ck(co.code), units: +co.unit || 0, gp: gp }); });
    });
    var run = { u: 0, q: 0 }; list.forEach(function (s2) { s2.cg = null; });
    sems().forEach(function (s, i) { var st = semStats(s); run.u += st.uRel; run.q += st.q; list[i].cg = run.u ? run.q / run.u : null; });
    return { scale: 5, cgpa: c.g, units: c.u, count: graded.length + sum(sems(), function (s) { return (s.pending || []).length; }), target: u.target || null, standing: c.g ? standing(c.g) : '', sems: list, impacts: impactsFrom(graded, c.g, c.u), required: typeof requiredAvg === 'function' ? requiredAvg() : null, totalUnits: (u.profile && u.profile.totalUnits) || 120 };
  }
  return snapFromList([], 5);
}
W.asGrad = { snapshot: snapshot, snapFromList: snapFromList, gpOf: gpOf, letterOf: letterOf, standing: standing };
W.asSetTarget = function (v) {
  v = +v; if (!(v > 0 && v <= 5)) return toast('Target must be between 0 and 5', 'error');
  var u = UU(); if (u) { u.target = v; saveApp(); } else { try { localStorage.setItem('as_target_cgpa', String(v)); } catch (e) {} }
  toast('Target updated to ' + v.toFixed(2));
};
W.asWeekTarget = function (v) {
  if (v != null) { try { localStorage.setItem('as_week_target', String(Math.max(60, Math.min(3000, +v || 600)))); } catch (e) {} }
  try { var t = +localStorage.getItem('as_week_target'); return t >= 60 && t <= 3000 ? t : 600; } catch (e) { return 600; }
};
/* course list fallback so studyhub Courses never empties out */
if (!W.as2Courses) W.as2Courses = function () {
  var seen = {}, out = [];
  function add(code, units) { var k = ck(code); if (!k || seen[k]) return; seen[k] = 1; out.push({ code: k, units: +units || 0, title: '' }); }
  sems().forEach(function (s) { (s.courses || []).forEach(function (c) { add(c.code, c.unit); }); (s.pending || []).forEach(function (p) { add(p.code, p.unit); }); });
  try { var u = UU(); (u && u.dec || []).forEach(function (half) { (half || []).forEach(function (c) { add(c.code, c.unit); }); }); } catch (e) {}
  return out;
};
/* attendance: present-only records in U.attendance */
W.asAtt = function () {
  var u = UU(); return ((u && u.attendance) || []).map(function (a) { return { date: String(a.date || '').slice(0, 10), course: ck(a.code), st: 'present' }; });
};

/* ---------- views ---------- */
var INS = null, SELSEM = -1, BACK = 'home';
function navBtn(label) {
  var bs = document.querySelectorAll('button,a,[role=button]');
  for (var i = 0; i < bs.length; i++) { var b = bs[i]; if (norm(b.textContent) === label && b.getBoundingClientRect().width > 0 && b.getBoundingClientRect().top > (W.innerHeight || 800) * 0.7) return b; }
  return null;
}
function fromWhere() { try { if (W.__hh && W.__hh.active()) return 'home'; } catch (e) {} return 'study'; }
function shell(title, body) {
  return '<div data-ins="1" class="space-y-4"><button class="text-sm font-extrabold" style="color:#059669;min-height:40px" onclick="asInsBack()">&lsaquo; Back</button>' +
    '<div><div class="text-2xl font-extrabold">' + title + '</div>' + muted('Academic intelligence') + '</div>' + body + '</div>';
}
function chart(s) {
  var pts = s.sems.filter(function (x) { return x.g != null; });
  if (!pts.length) return muted('No semester GPAs yet - paste a result and this draws itself.');
  var w = 300, h = 110, pd = 18;
  var y = function (v) { return h - pd - (v / 5) * (h - 2 * pd); };
  var x = function (i) { return pts.length < 2 ? w / 2 : pd + i * (w - 2 * pd) / (pts.length - 1); };
  var poly = pts.map(function (p, i) { return x(i).toFixed(1) + ',' + y(p.g).toFixed(1); }).join(' ');
  var tgt = s.target;
  return '<svg viewBox="0 0 ' + w + ' ' + h + '" style="width:100%;height:auto" role="img" aria-label="CGPA trajectory">' +
    (tgt ? '<line x1="0" x2="' + w + '" y1="' + y(tgt) + '" y2="' + y(tgt) + '" stroke="#059669" stroke-dasharray="5 4"/>' : '') +
    '<polyline points="' + poly + '" fill="none" stroke="#10b981" stroke-width="2.5"/>' +
    pts.map(function (p, i) { return '<circle cx="' + x(i).toFixed(1) + '" cy="' + y(p.g).toFixed(1) + '" r="7" fill="' + (i === SELSEM ? '#14b8a6' : '#10b981') + '" style="cursor:pointer" onclick="asSem(' + i + ')"><title>' + esc(p.key) + ': ' + p.g.toFixed(2) + (p.src === 'portal' ? ' (portal)' : p.src === 'deduced' ? ' (deduced)' : '') + '</title></circle>'; }).join('') +
    '</svg>' + muted('Tap a point to inspect that semester.' + (pts.some(function (p) { return p.src !== 'released'; }) ? ' Dashed-target line shown; portal/deduced GPAs are labelled in the tooltip.' : ''));
}
function vGpa() {
  var s = snapshot(), h = '';
  try { if (!localStorage.getItem('as_gpa_intro')) h += '<div class="card flex items-center gap-3" style="padding:14px">' + zuma('welcome', 56) + '<div class="flex-1">' + muted('Your trajectory uses only your real results. Tap any point to inspect a semester.') + '<button class="btn" style="margin-top:6px" onclick="asIntroOk()">Got it</button></div></div>'; } catch (e) {}
  if (!s.count) return h + '<div class="card flex items-center gap-3" style="padding:18px">' + zuma('notice', 72) + '<div class="flex-1"><div class="font-extrabold">No results yet</div>' + muted('Import your portal results and this page comes alive.') + '<button class="btn2" style="margin-top:8px" onclick="insResults()">Open results</button></div></div>';
  h += '<div class="card space-y-2"><div class="font-extrabold">CGPA trajectory</div>' +
    '<div class="grid grid-cols-3 gap-2 text-center"><div><div class="text-xl font-extrabold">' + (s.cgpa != null ? s.cgpa.toFixed(2) : '—') + '</div>' + muted('current CGPA') + '</div><div><div class="text-xl font-extrabold" style="color:#059669">' + (s.target ? s.target.toFixed(2) : '—') + '</div>' + muted('target') + '</div><div><div class="text-xl font-extrabold">' + s.units + '<span class="text-xs" style="color:var(--mut)">/' + (s.totalUnits || '') + '</span></div>' + muted('units') + '</div></div>' +
    chart(s) + muted(esc(s.standing) + (s.required != null ? ' | required average in remaining units: <b>' + s.required.toFixed(2) + '</b>' + (s.required > 5 ? ' (target out of reach in remaining units)' : '') : '')) + '</div>';
  if (SELSEM >= 0 && s.sems[SELSEM]) {
    var sm = s.sems[SELSEM];
    h += '<div class="card space-y-1"><div class="font-extrabold">' + esc(sm.key) + ' &mdash; ' + sm.g.toFixed(2) + (sm.src === 'portal' ? ' (portal)' : sm.src === 'deduced' ? ' (deduced)' : '') + '</div>' +
      sm.courses.map(function (c) { return '<div class="flex justify-between text-sm"><span>' + esc(c.code) + (c.pending ? ' <span class="text-xs" style="color:#d97706">awaiting result</span>' : '') + '</span><span class="text-xs" style="color:var(--mut)">' + (c.pending ? (c.unit || '') + 'u' : esc(c.score) + ' (' + letterOf(c.score) + ') | ' + (c.unit || '') + 'u') + '</span></div>'; }).join('') + '</div>';
  }
  h += '<div class="card space-y-2"><div class="font-extrabold">Target</div><div class="flex gap-2"><input id="ins-tg" class="inp" type="number" step="0.01" min="0" max="5" placeholder="Target CGPA" value="' + (s.target || '') + '"><button class="btn" onclick="asSetTarget(document.getElementById(\'ins-tg\').value);asPaint()">Save</button></div></div>';
  var up = s.impacts.filter(function (x) { return x.imp > 0; }).slice(0, 4), dn = s.impacts.filter(function (x) { return x.imp < 0; }).sort(function (a, b) { return a.imp - b.imp; }).slice(0, 4);
  h += '<div class="card space-y-1"><div class="font-extrabold">Course contributions</div>' + muted('Weighted by real credit units against your CGPA.') +
    (up.length ? '<div class="text-xs font-extrabold" style="color:#059669">Lifting you up</div>' + up.map(function (x) { return '<div class="flex justify-between text-sm"><span>' + esc(x.code) + '</span><span class="text-xs" style="color:#059669">+' + x.imp.toFixed(2) + '</span></div>'; }).join('') : '') +
    (dn.length ? '<div class="text-xs font-extrabold" style="color:#d97706">Pulling you down</div>' + dn.map(function (x) { return '<div class="flex justify-between text-sm"><span>' + esc(x.code) + '</span><span class="text-xs" style="color:#d97706">' + x.imp.toFixed(2) + '</span></div>'; }).join('') : '') + '</div>';
  return h;
}
function courseCodes() { return W.as2Courses(); }
function risks() {
  var u = UU() || {}, today = iso(), st = state() || { plan: [], log: [] }, C = calc(), conf = [], pred = [];
  (u.carry || []).forEach(function (o) { conf.push({ t: o.code + ' failed (' + o.score + ') in ' + (o.sem || '') + ' - carryover', js: 'hhCourse("' + ck(o.code) + '")', a: 'Course' }); });
  sems().forEach(function (s) { (s.courses || []).forEach(function (c) { var sc = parseFloat(c.score); if (!c.sup && sc >= 40 && sc < 45) conf.push({ t: c.code + ' passed narrowly (' + sc + ', grade E)', js: 'hhCourse("' + ck(c.code) + '")', a: 'Course' }); }); });
  var att = W.asAtt();
  if (att.length && (u.timetable || []).length) {
    var first = att.map(function (a) { return a.date; }).sort()[0];
    var weeks = Math.max(1, Math.ceil(dd(first, today) / 7));
    var sched = u.timetable.length * weeks, missed = Math.max(0, sched - att.length), pct = Math.round(att.length / sched * 100);
    if (pct < 75) conf.push({ t: 'Estimated attendance ' + pct + '% (below 75%), from your timetable', js: 'insAttend()', a: 'Attendance' });
  }
  if (C) {
    C.attention(courseCodes(), st.log, today).forEach(function (x) { if (x.state === 'neglected') pred.push({ t: x.code + ': no valid session in ' + x.gap + ' days', js: 'hhCourse("' + ck(x.code) + '")', a: 'Course' }); });
    (u.exams || []).forEach(function (e) { var l = dd(today, e.date); if (l >= 0 && l <= 7) pred.push({ t: 'Exam in ' + l + ' day' + (l === 1 ? '' : 's') + ': ' + e.code, js: "go('plan')", a: 'Planner' }); });
    (u.events || []).forEach(function (e) { if (/exam|test/i.test(e.type || '')) { var l = dd(today, e.date); if (l >= 0 && l <= 7) pred.push({ t: e.type + ' in ' + l + ' day' + (l === 1 ? '' : 's') + ': ' + e.title, js: "go('plan')", a: 'Planner' }); } });
    (u.tasks || []).forEach(function (t) { if (!t.done && t.end && dd(today, String(t.end).slice(0, 10)) < 0) pred.push({ t: 'Overdue task: ' + t.t, js: "go('plan')", a: 'Planner' }); });
    var byC = {}; st.log.forEach(function (e2) { if (e2.understanding) (byC[ck(e2.course)] = byC[ck(e2.course)] || []).push(e2.understanding); });
    Object.keys(byC).forEach(function (k) { var a = byC[k], m = sum(a, function (x) { return x; }) / a.length; if (m <= 2.5 && a.length >= 2) pred.push({ t: k + ': your own understanding ratings average ' + m.toFixed(1) + '/5', js: 'hhCourse("' + k + '")', a: 'Course' }); });
    var soon = st.plan.filter(function (p) { return !p.done && p.date >= today && dd(today, p.date) <= 7; }).length;
    if (!soon && courseCodes().length) pred.push({ t: 'Nothing studied or planned for the next 7 days', js: 'hhPlan()', a: 'Planner' });
  }
  return { conf: conf, pred: pred };
}
function vRisk() {
  var r = risks(), h = '';
  h += '<div class="card space-y-1"><div class="font-extrabold">Confirmed from your records</div>' +
    (r.conf.length ? r.conf.map(function (x) { return '<div class="flex items-center justify-between gap-2"><span class="text-sm" style="min-width:0"><span style="color:#dc2626;font-weight:800">&#9679;</span> ' + esc(x.t) + '</span><button class="btn2" style="min-height:40px;padding:0 12px" onclick="' + x.js + '">' + x.a + '</button></div>'; }).join('') : muted('Nothing confirmed. Keep it that way.')) + '</div>';
  h += '<div class="card space-y-1"><div class="font-extrabold">Predictive signals</div>' + muted('Patterns from your own behaviour. Warnings, not facts.') +
    (r.pred.length ? r.pred.map(function (x) { return '<div class="flex items-center justify-between gap-2"><span class="text-sm" style="min-width:0"><span style="color:#d97706;font-weight:800">&#9679;</span> ' + esc(x.t) + '</span><button class="btn2" style="min-height:40px;padding:0 12px" onclick="' + x.js + '">' + x.a + '</button></div>'; }).join('') : muted('No predictive warnings right now.')) + '</div>';
  return h;
}
function reportData() {
  var u = UU() || {}, today = iso(), st = state() || { log: [], plan: [] }, C = calc(), wk = C ? C.week(st.log, today) : null;
  var days = C ? C.weekDays(today) : [];
  var tasks = (u.tasks || []).filter(function (t) { return t.end && days.indexOf(String(t.end).slice(0, 10)) > -1; });
  var done = tasks.filter(function (t) { return t.done; }).length;
  var sg = C ? C.suggest(courseCodes(), st.log, st.plan, today) : [];
  return { wk: wk, tasks: tasks.length, done: done, tgt: W.asWeekTarget(), sg: sg, today: today, u: u };
}
function reportText() {
  var d = reportData(), w = d.wk; if (!w) return 'Study report unavailable.';
  return ['ACADEMIC SUMMIT - WEEKLY REPORT (' + w.days[0] + ' to ' + d.today + ')',
    'Sessions completed: ' + w.sessions + ' (ended early: ' + w.abandoned + ')',
    'Focused time: ' + Math.floor(w.minutes / 60) + 'h ' + (w.minutes % 60) + 'm of ' + d.tgt + ' min target',
    'Days studied: ' + w.activeDays + '/7',
    'Courses studied: ' + (Object.keys(w.byCourse).join(', ') || 'none'),
    'Tasks done: ' + d.done + ' of ' + d.tasks,
    'CGPA now: ' + (snapshot().cgpa != null ? snapshot().cgpa.toFixed(2) : 'n/a'),
    'Next priorities: ' + (d.sg.length ? d.sg.map(function (x) { return x.code + ' (' + x.why.join(', ') + ')'; }).join('; ') : 'set your own')].join('\n');
}
function vReport() {
  var d = reportData(), w = d.wk;
  if (!w) return '<div class="card">' + muted('Analytics unlock after your first saved session.') + '</div>';
  var h = '<div class="card space-y-2"><div class="font-extrabold">This week</div>' +
    '<div class="grid grid-cols-3 gap-2 text-center"><div><div class="text-xl font-extrabold">' + w.sessions + '</div>' + muted('sessions') + '</div><div><div class="text-xl font-extrabold">' + Math.floor(w.minutes / 60) + 'h ' + (w.minutes % 60) + 'm</div>' + muted('focused') + '</div><div><div class="text-xl font-extrabold">' + w.activeDays + '/7</div>' + muted('consistency') + '</div></div>' +
    bar(w.minutes / d.tgt) + muted(Math.round(w.minutes / d.tgt * 100) + '% of your ' + d.tgt + ' min weekly target. <button class="text-xs" style="color:#059669" onclick="asWeekTargetPrompt()">Change target</button>') +
    muted('Courses: ' + esc(Object.keys(w.byCourse).join(', ') || 'none') + ' | tasks done ' + d.done + ' of ' + d.tasks + ' | ended early ' + w.abandoned) +
    '<button class="btn2 w-full" onclick="asCopyReport()">Copy report</button></div>';
  h += '<div class="card space-y-1"><div class="font-extrabold">Recommended priorities</div>' + muted('From your sessions, ratings and deadlines. You decide.') +
    (d.sg.length ? d.sg.map(function (x) { return '<div class="flex justify-between text-sm"><span><b>' + esc(x.code) + '</b> ' + esc(x.why.join(', ')) + '</span><button class="btn2" style="min-height:40px;padding:0 12px" onclick="hhCourse(\'' + ck(x.code) + '\')">Open</button></div>'; }).join('') : muted('No pressing priorities detected.')) + '</div>';
  return h;
}
function paintIns() {
  if (!INS) return;
  var m = document.getElementById('main'); if (!m) return;
  try {
    var body = INS === 'gpa' ? vGpa() : INS === 'risk' ? vRisk() : vReport();
    var title = INS === 'gpa' ? 'GPA Trajectory' : INS === 'risk' ? 'Academic Risk' : 'Weekly Report';
    m.innerHTML = shell(title, body);
  } catch (e) { try { console.error('insights', e); } catch (_) {} INS = null; toast('Intelligence view unavailable', 'error'); }
}
W.asPaint = paintIns;
W.asSem = function (i) { SELSEM = SELSEM === i ? -1 : i; paintIns(); };
W.asIntroOk = function () { try { localStorage.setItem('as_gpa_intro', '1'); } catch (e) {} paintIns(); };
W.asGpaIntroSeen = W.asIntroOk; /* call from any old intro sheet to retire it */
function open(v) { if (insOff()) return toast('Intelligence is switched off'); INS = v; SELSEM = -1; BACK = fromWhere(); paintIns(); }
W.asGpaOpen = function () { open('gpa'); };
W.asRiskOpen = function () { open('risk'); };
W.asReportOpen = function () { open('report'); };
W.asInsBack = function () { INS = null; if (BACK === 'study' && W.shTab) W.shTab('overview'); else if (W.__hh) W.__hh.paint(); };
W.asWeekTargetPrompt = function () { var v = prompt('Weekly focused-minute target (60-3000):', String(W.asWeekTarget())); if (v) { W.asWeekTarget(v); paintIns(); } };
W.insResults = function () { var b = navBtn('results'); if (b) { INS = null; b.click(); } else if (typeof go === 'function') { INS = null; go('acad'); } };
W.insAttend = function () { var b = navBtn('attend'); if (b) { INS = null; b.click(); } else if (typeof go === 'function') { INS = null; go('att'); } };
W.asCopyReport = function () {
  var t = reportText();
  function legacy() { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Report copied'); } catch (e) { toast('Copy not supported'); } ta.remove(); }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('Report copied'); }, legacy); else legacy();
};
function insOff() { try { return localStorage.getItem('as_ins_off') === '1'; } catch (e) { return false; } }
document.addEventListener('click', function (e) {
  try {
    var b = e.target && e.target.closest ? e.target.closest('button,a,[role=button]') : null; if (!b) return;
    var r = b.getBoundingClientRect(); if (!(r.width > 0 && r.top > (W.innerHeight || 800) * 0.7)) return;
    var t = norm(b.textContent);
    if (t === 'home' || t === 'study' || t === 'results' || t === 'attend' || t === 'finance' || t === 'academics' || t === 'planner') INS = null;
  } catch (err) {}
}, true);

/* ---------- Phase 4 self-test ---------- */
W.asSelfTest = function () {
  var r = [], C = W.SHCalc;
  function t(n, f) { try { r.push([n, f() ? 'PASS' : 'FAIL']); } catch (e) { r.push([n, 'ERROR ' + e.message]); } }
  t('week totals', function () { var d = iso(); var log = [{ date: d, focused: 30, status: 'done', valid: true, course: 'X' }, { date: d, focused: 20, status: 'abandoned', valid: false, course: 'X' }]; var w = C.week(log, d); return w.minutes === 50 && w.perDay[6] === 50 && w.sessions === 1 && w.abandoned === 1; });
  t('attention order', function () { var log = [{ course: 'A', date: addD(iso(), -1), valid: true, focused: 10 }]; var a = C.attention([{ code: 'A' }, { code: 'B' }], log, iso()); return a[0].code === 'B' && a[1].code === 'A'; });
  t('cgpa from scores', function () { var s = snapFromList([{ code: 'A', score: 70, units: 3, sem: '1' }, { code: 'B', score: 60, units: 3, sem: '2' }], 5); return Math.abs(s.cgpa - 4.5) < 1e-9 && s.sems.length === 2 && Math.abs(s.sems[0].g - 5) < 1e-9; });
  t('grade mapping', function () { return gpOf(70) === 5 && gpOf(45) === 2 && gpOf(39) === 0; });
  t('clocks exclude pause', function () { var c = C.clocks({ startedAt: Date.now() - 60000, pausedMs: 20000, hiddenMs: 0 }, Date.now()); return c.focused >= 39000 && c.focused <= 41000; });
  t('standing', function () { return standing(4.6) === 'First Class' && standing(2.2) === 'Second Class Lower'; });
  try { console.table(r); } catch (e) {}
  var bad = r.filter(function (x) { return x[1] !== 'PASS'; }).length;
  toast(bad ? bad + ' self-test(s) failed (console)' : 'All self-tests passed');
  return r;
};
})();
