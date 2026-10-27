/* Academic Summit - homeflow.js: every Home tap leads somewhere.
   Course rows + session card -> history or straight into a session;
   22-line rotating target banner -> Zuma sheet; streak chip -> calendar;
   name/avatar -> academic profile; timer duration editable + remembered;
   Done/Mark-as-read gated by the 5-minute server rule. Load after tune.js. */
(function () {
'use strict';
var W = window;
function LSg(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function LSs(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function hfTag(tm, c) {
  var t = tm && tm.get(c); if (!t || t.kind === 'first') return '';
  var lab = t.kind === 'resit' ? 'Re-sit' : t.kind === 'late-first' ? 'First attempt' : 'Earlier result missing';
  return ' <span style="font-size:9px;font-weight:700;opacity:.7;border:1px solid var(--bd);border-radius:6px;padding:0 4px">' + lab + '</span>';
}
function todayKey() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function targetVal() {
  var c = [U.target, U.targetCGPA, U.dreamCGPA, U.targets];
  for (var i = 0; i < c.length; i++) { var t = c[i];
    if (typeof t === 'number' && t >= 1 && t <= 5) return t;
    if (t && typeof t === 'object') { var v = t.cgpa || t.target || t.value; if (typeof v === 'number') return v; } }
  return null;
}
var POOL = [
'Target CGPA {T} - not a figure, a habit: your study plan is how it happens.',
'{T} is built in fifteen-minute bricks, not midnight miracles.',
'Consistency first: the plan is the prize, {T} is the receipt.',
'Small sessions, stacked daily, outperform any all-nighter aimed at {T}.',
'You do not chase {T}; you keep appointments until it arrives.',
'Today\'s section is a vote for the {T} version of you.',
'{T} is what habits look like from the outside.',
'Miss a day, miss a mood - never miss the plan that carries {T}.',
'The mountain does not move; fifteen minutes at a time, you do. Hello, {T}.',
'{T} begins with the sentence: start now, start small.',
'Grades follow sessions the way rivers follow rain. Feed {T} daily.',
'A target like {T} is kept the way promises are kept: daily, quietly.',
'Do not watch the number; watch the streak that becomes {T}.',
'{T} is not a wish, it is a timetable you respect.',
'Every reviewed card is a coin in the {T} jar.',
'Motivation fades; the calendar does not. {T} lives on the calendar.',
'Study the section, not the dream - the dream ({T}) studies back.',
'Perfect days are myths; returned days are methods. Return toward {T}.',
'{T} rewards the student who shows up on the boring days.',
'One section now beats a perfect plan tomorrow. That is how {T} happens.',
'Your future self already thanked you for today\'s {T} session.',
'Habits carry what willpower cannot: all the way to {T}.'];
function bannerLine() {
  var i = +(LSg('as_banner_idx') || -1); i = (i + 1) % POOL.length; LSs('as_banner_idx', String(i));
  var t = targetVal(); return POOL[i].split('{T}').join(t != null ? t.toFixed(2) : 'your target');
}
function applyBanner() {
  var m = $('main'); if (!m) return;
  var cands = Array.from(m.querySelectorAll('div,button,p')).filter(function (n) {
    var tx = (n.textContent || '').trim();
    return tx.indexOf('not a figure') > -1 || tx.indexOf('Target CGPA') === 0;
  });
  var el = m.querySelector('[data-hf-banner]') || cands.filter(function (n) {
    return !cands.some(function (o) { return o !== n && n.contains(o); });
  })[0];
  if (el && el.querySelector('.grad')) el = null;
  if (!el) {
    var grad = m.querySelector('.grad');
    if (!grad || !grad.parentNode) return;
    el = document.createElement('div'); el.className = 'card'; el.style.padding = '12px 14px';
    grad.parentNode.insertBefore(el, grad.nextSibling);
  }
  var line = bannerLine();
  el.dataset.hfBanner = '1'; el.style.cursor = 'pointer';
  el.innerHTML = '<div class="text-xs font-bold" style="color:#047857">' + esc(line) + '</div>';
  el.onclick = function () { bannerSheet(line); };
}
function bannerSheet(line) {
  var sh = $('sheet'); if (!sh || sh.innerHTML.trim()) return;
  sh.innerHTML = '<div class="fixed inset-0" style="background:rgba(2,6,23,.45);z-index:9989" onclick="closeSheet()"></div>' +
    '<div class="fixed inset-x-0 bottom-0" style="z-index:9990;background:var(--card);border-top:1px solid var(--bd);border-radius:28px 28px 0 0;max-height:62vh;overflow-y:auto">' +
    '<div style="width:44px;height:4px;border-radius:2px;background:var(--bd);margin:10px auto 0"></div>' +
    '<div class="p-6 space-y-4" style="padding-bottom:calc(env(safe-area-inset-bottom,0px) + 18px)">' +
    '<div class="flex items-end gap-4"><div class="flex-1 text-left"><div class="font-extrabold text-xl">Zuma remembers the why</div>' +
    '<p class="text-sm mt-2" style="color:var(--mut)">' + esc(line) + '</p></div>' +
    (W.zumaImg ? W.zumaImg('studying', 96) : '') + '</div>' +
    '<button class="btn w-full py-3" onclick="closeSheet();courseTap(hfNext())">Start today\'s session</button>' +
    '<button class="btn2 w-full" onclick="closeSheet()">Later</button></div></div>';
}
W.hfBannerSheet = bannerSheet;
W.hfNext = function () {
  var cs = W.h2courses ? W.h2courses() : [];
  var done = (U.readLog || {})[todayKey()] || [];
  var c = cs.filter(function (x) { return done.indexOf(x.code) < 0; })[0];
  return c ? c.code : (cs[0] ? cs[0].code : null);
};
function plannedMin(code) {
  var lv = ((U.study && U.study.courses && U.study.courses[code]) || {}).level || 1;
  return { 1: 15, 2: 23, 3: 45, 4: 60 }[lv] || 15;
}
W.courseTap = function (code) {
  if (!code) return;
  (W.SS ? SS.history(code) : Promise.resolve([])).then(function (h) {
    if (h && h.length) { W._chist = code; W.go('chist'); } else W.sessBegin(code);
  });
};
W.sessBegin = function (code) {
  if (!code) return;
  var min = +(LSg('as_focus_min') || 0) || plannedMin(code);
  if (W.SS) SS.start(code, min);
  if (W.timerStart) W.timerStart(code, 1, min);
  W.go('timer');
};
V.chist = function () {
  return '<div class="space-y-4"><div class="font-extrabold text-2xl">' + esc(W._chist || '') + ' - study history</div>' +
    '<div id="chist-box" class="space-y-2"><p class="text-xs" style="color:var(--mut)">Loading…</p></div></div>';
};
function fillChist() {
  var box = $('chist-box'); if (!box || !W.SS) return;
  SS.history(W._chist).then(function (h) {
    var mins = h.reduce(function (a, x) { return a + (+x.minutes || 0); }, 0);
    var last = h[0] ? new Date(h[0].started_at).toDateString() : '-';
    box.innerHTML = '<div class="card p-4 grid grid-cols-3 gap-2 text-center">' +
      '<div><div class="lbl">Sessions</div><b>' + h.length + '</b></div>' +
      '<div><div class="lbl">Minutes</div><b>' + mins + '</b></div>' +
      '<div><div class="lbl">Last</div><b class="text-[10px]">' + esc(last) + '</b></div></div>' +
      h.slice(0, 12).map(function (x) {
        return '<div class="card p-3 flex justify-between text-xs"><span>' + esc(new Date(x.started_at).toLocaleString()) + '</span><b>' + (+x.minutes || 0) + ' min' + (x.valid ? '' : ' (short)') + '</b></div>';
      }).join('') +
      '<button class="btn w-full" onclick="sessBegin(\'' + esc(W._chist) + '\')">Start session</button>';
  });
}
function tagHome() {
  var m = $('main'); if (!m) return;
  Array.from(m.querySelectorAll('.space-y-2 > div')).forEach(function (row) {
    var b = row.querySelector('b'); if (!b || row.dataset.hf) return;
    var code = (b.textContent || '').trim();
    row.dataset.hf = '1'; row.style.cursor = 'pointer';
    row.onclick = function () { W.courseTap(code); };
  });
  var grad = m.querySelector('.grad');
  var code2 = W.hfNext();
  if (grad && code2 && !grad.dataset.hfDone) {
    grad.dataset.hfDone = '1'; grad.style.cursor = 'pointer';
    grad.addEventListener('click', function () { W.courseTap(code2); });
  }
  var greet = Array.from(m.querySelectorAll('div')).find(function (d) {
    return /^(Good (morning|afternoon|evening),)/.test((d.textContent || '').trim()) && d.children.length === 0;
  });
  if (greet && !greet.dataset.hf) { greet.dataset.hf = '1'; greet.style.cursor = 'pointer'; greet.onclick = function () { W.go('aprof'); }; }
}
/* timer duration: presets + custom, remembered, synced */
W.timerEditOpen = function () {
  fullScreen('Focus length',
    '<div class="card p-4 space-y-3"><div class="grid grid-cols-4 gap-2">' +
    [5, 10, 15, 25].map(function (x) { return '<button class="btn2 py-3" onclick="timerSetMin(' + x + ')">' + x + 'm</button>'; }).join('') + '</div>' +
    '<input id="hf-min" type="number" min="1" max="180" class="inp" placeholder="Custom minutes">' +
    '<button class="btn w-full" onclick="timerSetCustom()">Save custom</button></div>');
};
W.timerSetCustom = function () { var v = +(($('hf-min') || {}).value || 0); W.timerSetMin(v); };
W.timerSetMin = function (min) {
  if (!min || min < 1) return showToast('Pick a minute count', 'error');
  LSs('as_focus_min', String(min)); closeSheet();
  var t = null; try { t = JSON.parse(localStorage.getItem('as_timer') || 'null'); } catch (e) {}
  if (t && t.phase !== 'done') {
    var ms = min * 60000;
    var rem = t.pausedLeft != null ? t.pausedLeft : Math.max(0, t.endsAt - Date.now());
    var elapsed = Math.max(0, t.phaseMs - rem);
    var newRem = Math.max(30000, ms - elapsed);
    t.phaseMs = ms;
    if (t.pausedLeft != null) t.pausedLeft = newRem; else t.endsAt = Date.now() + newRem;
    localStorage.setItem('as_timer', JSON.stringify(t));
  }
  W.go('timer');
};
function tagTimer() {
  var m = $('main'); if (!m || !m.querySelector('svg[viewBox="0 0 120 120"]')) return;
  if (m.querySelector('[data-hf-edit]')) return;
  var ctl = Array.from(m.querySelectorAll('div')).find(function (d) { return d.className === 'flex gap-2'; });
  if (ctl && ctl.parentNode) {
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'btn2 w-full'; b.setAttribute('data-hf-edit', '1');
    b.textContent = 'Edit time'; b.onclick = W.timerEditOpen;
    ctl.parentNode.insertBefore(b, ctl.nextSibling);
  }
}
/* 5-minute gate on every completion button */
function gateDone() {
  var m = $('main'); if (!m || !W.SS || !SS.active()) return;
  Array.from(m.querySelectorAll('button')).forEach(function (b) {
    var tx = (b.textContent || '').trim();
    if (!/^(Done reading|Mark as read|I've studied|Done)$/.test(tx)) return;
    if (SS.can()) { b.disabled = false; b.dataset.hfGate = ''; return; }
    b.disabled = true; b.dataset.hfGate = '1';
    b.textContent = 'Wait ' + SS.leftMin() + ' min';
  });
}
var rdB = W.readDone;
W.readDone = function () { if (W.SS && SS.active() && !SS.can()) return showToast('Anti-cheat: ' + SS.leftMin() + ' min left', 'error'); return rdB.apply(this, arguments); };
var tmB = W.timerMarkDone;
W.timerMarkDone = function () { if (W.SS && SS.active()) SS.finish(); return tmB.apply(this, arguments); };
var teB = W.timerEnd;
W.timerEnd = function () { if (W.SS && SS.active()) SS.finish(); return teB.apply(this, arguments); };
/* academic profile */
V.aprof = function () {
  var sems = (U.semesters || []).filter(function (s) { return s.courses && s.courses.length; });
  var totU = 0, totP = 0, cum = [];
  var tm = (window.Resit && Resit.tagMap) ? Resit.tagMap(U.semesters || [], U.entry) : null;
  sems.forEach(function (s) {
    var su = 0, sp = 0;
    s.courses.forEach(function (c) {
      if (c.grade && typeof gr === 'function') {
        var g = gr(c.grade); if (g != null) { var u = +c.unit || +c.units || 3; su += u; sp += g * u; }
      }
    });
    if (su) { totU += su; totP += sp; cum.push({ sem: s.name || s.sem || ('Sem ' + cum.length), v: sp / su }); }
  });
  var calc = totU ? totP / totU : null;
  var pick = (W.StudyCore && StudyCore.pickCgpa) ? StudyCore.pickCgpa({ portal: U.portalCGPA || null, computed: calc, pendingUnits: 0 }) : { value: calc != null ? calc : (U.portalCGPA || null), label: calc != null ? 'Calculated CGPA' : 'Portal CGPA' };
  var tv = targetVal();
  var chart = '';
  if (cum.length) {
    var pts = cum.map(function (c, i) { return [40 + i * (280 / Math.max(1, cum.length - 1 || 1)), 150 - ((c.v - 1) / 4) * 120]; });
    chart = '<svg viewBox="0 0 360 170" style="width:100%;height:150px"><polyline fill="none" stroke="#10b981" stroke-width="3" points="' +
      pts.map(function (p) { return p[0].toFixed(0) + ',' + p[1].toFixed(0); }).join(' ') + '"/>' +
      pts.map(function (p) { return '<circle cx="' + p[0] + '" cy="' + p[1] + '" r="4" fill="#10b981"/>'; }).join('') + '</svg>';
  } else chart = '<p class="text-xs" style="color:var(--mut)">No released results yet - the line starts with your first grade.</p>';
  var rows = sems.map(function (s) {
    return '<div class="card p-3"><div class="font-bold text-xs mb-1">' + esc(s.name || s.sem || 'Semester') + '</div>' +
      s.courses.map(function (c) { return '<div class="flex justify-between text-xs py-0.5"><span>' + esc(c.code) + hfTag(tm, c) + '</span><b>' + esc(c.grade || '-') + '</b></div>'; }).join('') + '</div>';
  }).join('');
  return '<div class="space-y-4"><div class="font-extrabold text-2xl">Academic profile</div>' +
    '<div class="card p-4 grid grid-cols-2 gap-3 text-center">' +
    '<div><div class="lbl">Current CGPA</div><b class="text-xl">' + (pick.value != null ? pick.value.toFixed(2) : '-') + '</b><div class="text-[10px]" style="color:var(--mut)">' + esc(pick.label || '') + '</div></div>' +
    '<div><div class="lbl">Target</div><b class="text-xl">' + (tv != null ? tv.toFixed(2) : '-') + '</b></div></div>' +
    '<div class="card p-3"><div class="lbl mb-1">Trajectory by semester</div>' + chart + '</div>' + rows +
    '<div class="flex gap-2"><button class="btn2 flex-1" onclick="go(\'prof\')">Edit profile</button>' +
    '<button class="btn flex-1" onclick="if(window.rTabSet){rTabSet(\'tgt\')}else{go(\'traj\')}">Set target</button></div></div>';
};
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  setTimeout(function () {
    if (v === 'home') { [tagHome, applyBanner, gateDone].forEach(function (f) { try { f(); } catch (e) { console.error('home patch failed:', f.name, e); } }); }
    if (v === 'timer') { tagTimer(); gateDone(); }
    if (v === 'chist') fillChist();
  }, 150);
  return r;
};
setInterval(function () { if (view === 'timer' || view === 'home') gateDone(); }, 20000);
})();
