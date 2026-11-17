/* Academic Summit - acad2.js v1: the new Academics door (the study engine's screens).
   Needs study-core.js and home2.js loaded first. If anything fails it offers the classic Academics.
   Delete the script tag and the old Academics is untouched.
   v1 limits: no AI levels yet (the level only sets how long the session is), no voice, no music. */
(function () {
'use strict';
var W = window, SC = W.StudyCore;
if (typeof V === 'undefined' || !SC) return;
var RUN = null, TIMER = null;

function iso() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function toast(m, k) { if (W.showToast) W.showToast(m, k); }
function persist() { try { if (typeof save === 'function') save(); } catch (e) {} }
function zuma(p, px) { return W.zumaImg ? W.zumaImg(p, px) : ''; }
function S() {
  U.study = U.study || {}; var s = U.study;
  s.items = s.items || []; s.pos = s.pos || {}; s.last = s.last || {}; s.notes = s.notes || [];
  s.minutes = s.minutes || 45; s.streak = s.streak || { count: 0, last: null, best: 0 };
  return s;
}
/* study text lives on this device only: the original file is never stored or shared */
function matKey() { return 'as_mat_' + (typeof uid === 'function' ? uid() : (typeof uid !== 'undefined' ? uid : 'me')); }
function mats() { try { return JSON.parse(localStorage.getItem(matKey())) || {}; } catch (e) { return {}; } }
function saveMats(m) { try { localStorage.setItem(matKey(), JSON.stringify(m)); return true; } catch (e) { toast('Not enough space on this device', 'error'); return false; } }
var CODE = /^[A-Z]{2,4}[- ]?\d{3}[A-Z]?$/, SKIP = /semester|histor|result|file|mark|log|lec|study/i;
function scan(o, path, depth, found) {
  if (!o || typeof o !== 'object' || depth > 3) return;
  if (Array.isArray(o)) { if (o.length && o.every(function (x) { return x && typeof x.code === 'string' && CODE.test(x.code.replace(/^UA-/i, '').trim().toUpperCase()); })) found.push({ path: path, list: o }); return; }
  Object.keys(o).forEach(function (k) { if (!SKIP.test(k)) scan(o[k], path + '.' + k, depth + 1, found); });
}
function courses() {
  var list = [];
  try { if (W.h2courses) list = W.h2courses() || []; else if (W.asCourses) list = W.asCourses() || []; } catch (e) {}
  if (!list.length) {
    var f = []; try { scan(U, 'U', 0, f); } catch (e) {}
    f.sort(function (a, b) { return (/reg|current|course/i.test(b.path) ? 1000 : 0) + b.list.length - ((/reg|current|course/i.test(a.path) ? 1000 : 0) + a.list.length); });
    list = f.length ? f[0].list : [];
  }
  var seen = {}, out = [];
  list.forEach(function (c) { var k = String(c.code).toUpperCase(); if (seen[k]) return; seen[k] = 1; out.push({ code: c.code, title: c.title || c.name || '', units: c.units || c.unit || '' }); });
  return out;
}
function paint() {
  clearInterval(TIMER);
  var m = document.getElementById(W.AS2_HOST || 'main'); if (m) m.innerHTML = V.acad2();
  if (RUN && RUN.step === 'read' && !RUN.done) { tick(); TIMER = setInterval(tick, 500); }
}
function tick() {
  var b = $('as2-next'); if (!b || !RUN || RUN.step !== 'read') return;
  var left = RUN.lock - Math.floor((Date.now() - RUN.t0) / 1000);
  if (left > 0) { b.disabled = true; b.style.opacity = '.5'; b.textContent = 'Next in ' + left + 's'; }
  else { b.disabled = false; b.style.opacity = '1'; b.textContent = 'I have read this'; clearInterval(TIMER); }
}

/* ---------- views ---------- */
var CH = [[30, '30 min'], [45, '45 min'], [90, '1 h 30'], [120, '2 hours']];
function homeView() {
  var s = S(), cs = courses(), m = mats(), today = iso();
  var plan = SC.planDay(s.minutes, cs.map(function (c) { return { code: c.code, title: c.title }; }), s.last, 2);
  var due = SC.dueNow(s.items, today), locked = due.length > 0;
  var ready = plan.courses.some(function (c) { return m[c.code]; });
  var h = '<div class="space-y-4"><div class="flex items-center gap-3">' + zuma('read', 72) +
    '<div><div class="text-2xl font-extrabold">Academics</div><div class="text-xs" style="color:var(--mut)">A little study every day. Zuma keeps score.</div></div></div>';
  if (locked) h += '<div class="card flex items-center gap-3" style="padding:14px;border:1px solid rgba(16,185,129,.45)">' + zuma('point', 72) +
    '<div class="flex-1"><div class="font-extrabold">' + due.length + ' review' + (due.length > 1 ? 's' : '') + ' due first</div><div class="text-xs mb-2" style="color:var(--mut)">Today\'s study unlocks when they are done.</div>' +
    '<button class="btn" style="min-height:44px;padding:0 18px" onclick="as2Reviews()">Start reviews</button></div></div>';
  h += '<div class="card space-y-3"><div class="lbl">How long do you want to study today?</div><div class="flex gap-2 flex-wrap">' +
    CH.map(function (c) { return '<button class="' + (s.minutes === c[0] ? 'btn' : 'btn2') + '" style="min-height:44px;padding:0 16px" onclick="as2Minutes(' + c[0] + ')">' + c[1] + '</button>'; }).join('') + '</div>';
  if (!cs.length) h += '<div class="text-sm" style="color:var(--mut)">Add your courses for this semester first. Your plan is built from them.</div><button class="btn2" onclick="as2Old()">Back to Home</button>';
  else {
    h += '<div class="text-xs" style="color:var(--mut)">' + plan.courses.length + ' course' + (plan.courses.length > 1 ? 's' : '') + ', about ' + Math.round(plan.perCourse) + ' min each. Level ' + plan.level.id + ': ' + plan.level.name + '.</div>' +
      plan.courses.map(function (c) { var w = m[c.code]; return '<div class="flex items-center justify-between py-1"><div><div class="font-extrabold text-sm">' + esc(c.code) + '</div><div class="text-xs" style="color:var(--mut)">' + esc(c.title || '') + '</div></div><div class="text-xs font-extrabold" style="color:' + (w ? '#059669' : 'var(--mut)') + '">' + (w ? w.words + ' words' : 'No material yet') + '</div></div>'; }).join('') +
      '<button class="btn w-full" ' + (locked || !ready ? 'disabled style="opacity:.5"' : '') + ' onclick="as2Start()">' + (locked ? 'Finish reviews first' : ready ? 'Start today\'s study' : 'Add material to begin') + '</button>';
  }
  h += '</div><div class="card space-y-3"><div class="lbl">Add study material</div>' +
    '<select id="as2-c" class="inp">' + cs.map(function (c) { return '<option value="' + esc(c.code) + '">' + esc(c.code) + (c.title ? ' - ' + esc(c.title) : '') + '</option>'; }).join('') + '</select>' +
    '<input type="file" accept="application/pdf" class="inp" onchange="as2Pdf(this)">' +
    '<textarea id="as2-t" rows="5" class="inp" placeholder="Choose a PDF above, or paste your notes here"></textarea>' +
    '<div class="text-xs" style="color:var(--mut)">Only the text is kept, on this device. Your file is never stored or shared.</div>' +
    '<button class="btn w-full" onclick="as2Save()">Save material</button>' +
    Object.keys(m).map(function (k) { return '<div class="flex items-center justify-between text-sm"><span>' + esc(k) + ' <span class="text-xs" style="color:var(--mut)">' + m[k].words + ' words</span></span><button class="btn2" style="min-height:36px" onclick="as2Remove(\'' + esc(k) + '\')">Remove</button></div>'; }).join('') + '</div>' +
    '</div>';
  return h;
}
function head(title, sub) {
  return '<div class="flex items-center justify-between"><div><div class="font-extrabold">' + esc(title) + '</div><div class="text-xs" style="color:var(--mut)">' + esc(sub || '') + '</div></div><button class="btn2" style="min-height:40px" onclick="as2Quit()">Leave</button></div>';
}
function qView(label, q, sub, title) {
  var fb = RUN.fb;
  return '<div class="space-y-4">' + head(title, sub) + '<div class="card space-y-3"><div class="lbl">' + esc(label) + '</div><div style="font-size:16px;line-height:1.5">' + esc(q.q) + '</div>' +
    (fb ? '<div class="p-3 rounded-xl text-sm font-extrabold" style="background:' + (fb.ok ? 'rgba(5,150,105,.14);color:#059669' : 'rgba(220,38,38,.12);color:#dc2626') + '">' + (fb.ok ? 'Correct' : 'Not quite. The answer is: ' + esc(fb.a)) + '</div><button class="btn w-full" onclick="as2Continue()">Continue</button>'
      : '<input id="as2-in" class="inp" autocomplete="off" placeholder="Your answer"><button class="btn w-full" onclick="as2Check()">Check</button>') + '</div></div>';
}
function runView() {
  if (RUN.done) {
    var n = RUN.asked.length;
    return '<div class="space-y-4"><div class="card flex items-center gap-3" style="padding:18px">' + zuma('cheer', 96) + '<div class="flex-1"><div class="font-extrabold mk-gold" style="font-size:20px">Session complete</div>' +
      '<div class="text-xs" style="color:var(--mut)">' + n + ' questions will come back in 2, 4 and 6 days. Streak: ' + S().streak.count + ' day' + (S().streak.count === 1 ? '' : 's') + '.</div></div></div><button class="btn w-full" onclick="as2Quit()">Back to Academics</button></div>';
  }
  if (RUN.mode === 'review') return qView('Review ' + (RUN.i + 1) + ' of ' + RUN.q.length, RUN.q[RUN.i], 'Weak spots come first', 'Reviews');
  var bi = Math.min(RUN.bi, RUN.blocks.length - 1), b = RUN.blocks[bi], si = Math.min(RUN.si, b.secs.length - 1), sec = b.secs[si], sub = 'Section ' + (si + 1) + ' of ' + b.secs.length + ' | course ' + (bi + 1) + ' of ' + RUN.blocks.length;
  if (RUN.step === 'read') return '<div class="space-y-4">' + head(b.code, sub) + '<div class="card"><div style="white-space:pre-wrap;font-size:15px;line-height:1.65">' + esc(sec.text) + '</div></div><button id="as2-next" class="btn w-full" disabled style="opacity:.5" onclick="as2Next()">Next</button></div>';
  if (RUN.step === 'quiz') return qView('Question ' + (RUN.qi + 1) + ' of ' + RUN.qs.length + (RUN.retry ? ' (second try)' : ''), RUN.qs[RUN.qi], sub, b.code);
  if (RUN.step === 'final') return qView('End-of-day question ' + (RUN.qi + 1) + ' of ' + RUN.qs.length, RUN.qs[RUN.qi], 'Last step before today counts', 'Today\'s recap');
  return '<div class="space-y-4">' + head(b.code, sub) + '<div class="card space-y-3"><div class="lbl">Write the main points in your own words</div><textarea id="as2-notes" rows="6" class="inp" placeholder="Dates, names and the key ideas"></textarea><button class="btn w-full" onclick="as2Notes()">Save and continue</button></div></div>';
}
V.acad2 = function () {
  try { return RUN ? runView() : homeView(); }
  catch (e) { try { console.error('acad2', e); } catch (_) {} return '<div class="card space-y-3"><div class="font-extrabold">This screen could not load</div><button class="btn" onclick="as2Old()">Open classic Academics</button></div>'; }
};

/* ---------- actions ---------- */
W.as2Old = function () { RUN = null; W.go('home'); };
W.as2Minutes = function (m) { S().minutes = m; persist(); paint(); };
W.as2Quit = function () { RUN = null; paint(); };
W.as2Save = function () {
  var code = ($('as2-c') || {}).value, t = (($('as2-t') || {}).value || '').trim();
  if (!code || SC.words(t) < 60) return toast('Choose a course and add at least 60 words', 'error');
  var m = mats(); m[code] = { text: t.slice(0, 250000), words: SC.words(t.slice(0, 250000)), added: iso() };
  if (saveMats(m)) { toast('Material saved'); paint(); }
};
W.as2Remove = function (c) { var m = mats(); delete m[c]; saveMats(m); paint(); };
function loadPdfJs() {
  return new Promise(function (res, rej) {
    if (W.pdfjsLib) return res(W.pdfjsLib);
    var s = document.createElement('script'); s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload = function () { W.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js'; res(W.pdfjsLib); };
    s.onerror = rej; document.head.appendChild(s);
  });
}
W.as2Pdf = async function (inp) {
  var f = inp.files && inp.files[0]; if (!f) return;
  toast('Reading your PDF...');
  try {
    var lib = await loadPdfJs(), doc = await lib.getDocument({ data: await f.arrayBuffer() }).promise, out = [], n = Math.min(doc.numPages, 150);
    for (var i = 1; i <= n; i++) { var tc = await (await doc.getPage(i)).getTextContent(); out.push(tc.items.map(function (x) { return x.str; }).join(' ').replace(/\s+/g, ' ').trim()); }
    var text = out.join('\n\n');
    if (SC.words(text) < 60) return toast('This PDF has no selectable text. It may be a scan.', 'error');
    $('as2-t').value = text; toast('Check the text, then tap Save material');
  } catch (e) { toast('Could not read that PDF', 'error'); }
};
function buildBlock(code, perMin) {
  var mt = mats()[code]; if (!mt) return null;
  var secs = SC.splitSections(mt.text, 350); if (!secs.length) return null;
  var n = Math.max(1, Math.round(perMin / 7)), p = S().pos[code] || 0; if (p >= secs.length) p = 0;
  return { code: code, secs: secs.slice(p, p + n), start: p, total: secs.length };
}
function curSec() { return RUN.blocks[RUN.bi].secs[RUN.si]; }
function beginSection() { RUN.step = 'read'; RUN.t0 = Date.now(); RUN.lock = curSec().lock; RUN.fb = null; }
W.as2Start = function () {
  var s = S(), today = iso();
  if (SC.isLocked(s.items, today)) return toast('Finish your reviews first');
  var plan = SC.planDay(s.minutes, courses().map(function (c) { return { code: c.code, title: c.title }; }), s.last, 2), blocks = [];
  plan.courses.forEach(function (c) { var b = buildBlock(c.code, plan.perCourse); if (b) { b.title = c.title; blocks.push(b); } });
  if (!blocks.length) return toast('Add study material for today\'s courses first');
  RUN = { mode: 'session', blocks: blocks, bi: 0, si: 0, asked: [], t00: Date.now() }; beginSection(); paint();
};
W.as2Reviews = function () {
  var q = SC.dueNow(S().items, iso()); if (!q.length) return;
  RUN = { mode: 'review', q: q, i: 0, fb: null, t0: Date.now() }; paint();
};
W.as2Next = function () {
  if (Date.now() - RUN.t0 < RUN.lock * 1000 - 400) return;
  var qs = SC.questionsFor(curSec().text, 3);
  if (!qs.length) { RUN.step = 'notes'; return paint(); }
  RUN.qs = qs; RUN.qi = 0; RUN.res = []; RUN.retry = false; RUN.step = 'quiz'; RUN.t0 = Date.now(); RUN.fb = null; paint();
};
W.as2Check = function () {
  var v = ($('as2-in') || {}).value || '', ms = Date.now() - RUN.t0;
  var q = RUN.mode === 'review' ? RUN.q[RUN.i] : RUN.qs[RUN.qi], ok = SC.checkAnswer(v, q.a);
  if (RUN.mode === 'review') { var s = S(), k = s.items.findIndex(function (x) { return x.id === q.id; }); if (k > -1) s.items[k] = SC.advance(q, ok, ms, iso()); }
  else if (RUN.step === 'final') { var it = RUN.asked.filter(function (x) { return x.q === q.q; })[0]; if (it && !ok) it.weak = (it.weak || 0) + 2; }
  else RUN.res.push({ ok: ok, ms: ms, q: q });
  RUN.fb = { ok: ok, a: q.a }; paint();
};
W.as2Continue = function () {
  RUN.fb = null;
  if (RUN.mode === 'review') {
    RUN.i++;
    if (RUN.i >= RUN.q.length) { RUN = null; persist(); toast('Reviews done. Today\'s study is unlocked.'); } else RUN.t0 = Date.now();
    return paint();
  }
  RUN.qi++;
  if (RUN.qi < RUN.qs.length) { RUN.t0 = Date.now(); return paint(); }
  if (RUN.step === 'final') return finish();
  var g = SC.gradeSection(RUN.res), b = RUN.blocks[RUN.bi];
  if (!RUN.retry) RUN.res.forEach(function (r) { RUN.asked.push({ course: b.code, section: b.start + RUN.si, q: r.q.q, a: r.q.a, kind: r.q.kind, weak: r.ok ? 0 : 2 }); });
  if (!g.pass && !RUN.retry) {
    RUN.retry = true; RUN.qs = g.weak.map(function (i) { return RUN.res[i].q; }); RUN.qi = 0; RUN.res = []; RUN.t0 = Date.now();
    toast('Let\'s go over the tricky ones again'); return paint();
  }
  RUN.step = 'notes'; paint();
};
W.as2Notes = function () {
  var v = ($('as2-notes') || {}).value || '';
  if (SC.words(v) < 8) return toast('Write the main points in a few words of your own');
  var b = RUN.blocks[RUN.bi]; S().notes.push({ course: b.code, section: b.start + RUN.si, text: v.trim(), date: iso() });
  RUN.si++; if (RUN.si >= b.secs.length) { RUN.bi++; RUN.si = 0; }
  if (RUN.bi >= RUN.blocks.length) {
    var pool = RUN.asked.slice().sort(function (a, c) { return (c.weak || 0) - (a.weak || 0); }), per = {}, qs = [];
    pool.forEach(function (a) { per[a.course] = (per[a.course] || 0) + 1; if (per[a.course] <= 2) qs.push({ q: a.q, a: a.a, kind: a.kind }); });
    if (!qs.length) return finish();
    RUN.qs = qs; RUN.qi = 0; RUN.step = 'final'; RUN.t0 = Date.now(); RUN.fb = null; return paint();
  }
  beginSection(); paint();
};
function finish() {
  var s = S(), t = iso();
  RUN.asked.forEach(function (a) { s.items.push(SC.newItem(a, t)); });
  RUN.blocks.forEach(function (b) {
    s.last[b.code] = t; s.pos[b.code] = b.start + b.secs.length;
    var log = (U.readLog = U.readLog || {}), d = (log[t] = log[t] || []); if (d.indexOf(b.code) < 0) d.push(b.code);
  });
  s.streak = SC.updateStreak(s.streak, t);
  try {
    if (typeof sb !== 'undefined' && sb.from) {
      var mins = Math.max(1, Math.round((Date.now() - RUN.t00) / 60000 / RUN.blocks.length));
      RUN.blocks.forEach(function (b) {
        sb.from('study_sessions').insert({ course: b.code, started_at: new Date(RUN.t00).toISOString(), ended_at: new Date().toISOString(), minutes: mins })
          .then(function (r) { if (r && r.error) { (W.AS_NOTES = W.AS_NOTES || []).push('study_sessions: ' + r.error.message); } }, function () {});
      });
    }
  } catch (e) {}
  RUN.done = true; persist(); paint();
}
})();
