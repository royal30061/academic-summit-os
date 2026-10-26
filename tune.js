/* Academic Summit - tune.js v3: the concierge with manners.
   Welcome: at most once per hour, and silent for the day once you've studied.
   Target strip: taps open a Zuma half-sheet that leads to STUDY, not Results;
   the same half-sheet also reminds you proactively on the same hourly routine.
   No X button on any Zuma takeover - companions don't post exit signs.
   Load LAST. */
(function () {
'use strict';
var W = window;
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function isoLocal() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function studiedToday() { return lsGet('as_study_day') === isoLocal(); }
function hourPassed(k) { return Date.now() - (+lsGet(k) || 0) >= 3600e3; }
function sheetFree() { var sh = $('sheet'); return sh && !sh.innerHTML.trim(); }
function scrubX(sh) {
  Array.from(sh.querySelectorAll('button')).forEach(function (b) {
    var t = (b.textContent || '').trim();
    var al = (b.getAttribute('aria-label') || '').toLowerCase();
    if (t === '\u00d7' || t === 'x' || t === 'X' || al.indexOf('close') > -1) b.style.display = 'none';
  });
}
/* h2go routing that can never dead-end */
var hg = W.h2go;
W.h2go = function (k) {
  var m = { study: ['sess', 'study', 'read', 'home'], read: ['read', 'study', 'home'],
    res: ['traj'], acad: ['study', 'acad', 'home'], att: ['att', 'attendance', 'attend', 'home'],
    plan: ['planner', 'plan', 'home'], sess: ['sess'] };
  if (m[k]) { for (var i = 0; i < m[k].length; i++) if (V[m[k][i]]) { W.go(m[k][i]); return; } }
  if (hg) return hg.apply(this, arguments);
};
/* Zuma faces the words, whatever zuma.js version lives */
var zi = W.zumaImg;
if (zi) W.zumaImg = function (pose) {
  var h = zi.apply(this, arguments);
  if ((pose === 'point' || pose === 'notice') && h.indexOf('scaleX') < 0) {
    if (h.indexOf('style="') > -1) h = h.replace('style="', 'style="transform:scaleX(-1);');
    else if (h.indexOf("style='") > -1) h = h.replace("style='", "style='transform:scaleX(-1);");
  }
  return h;
};
function targetVal() {
  var c = [U.target, U.targetCGPA, U.dreamCGPA, U.targets];
  for (var i = 0; i < c.length; i++) {
    var t = c[i];
    if (typeof t === 'number' && t >= 1 && t <= 5) return t;
    if (t && typeof t === 'object') { var v = t.cgpa || t.target || t.value; if (typeof v === 'number') return v; }
  }
  return null;
}
function nextCourse() {
  var cs = W.h2courses ? W.h2courses() : [];
  var done = (U.readLog || {})[isoLocal()] || [];
  return cs.filter(function (c) { return done.indexOf(c.code) < 0; })[0] || cs[0] || null;
}
/* ---------- the Session takeover (full screen) ---------- */
V.sess = function () {
  var c = nextCourse();
  if (!c) {
    return '<div class="space-y-4"><button type="button" class="btn2 px-3" onclick="go(\'home\')">' + ic('l') + '</button>' +
      '<div class="font-extrabold text-2xl">No session yet</div>' +
      '<p class="text-xs" style="color:var(--mut)">Add your courses and the summit builds your day.</p>' +
      '<button class="btn w-full" onclick="go(\'study\')">Go to Study</button></div>';
  }
  var lv = ((U.study && U.study.courses && U.study.courses[c.code]) || {}).level || 1;
  var min = { 1: 15, 2: 23, 3: 45, 4: 60 }[lv];
  var tv = targetVal();
  return '<div class="space-y-4">' +
    '<div class="grad" style="padding:22px;border-radius:26px;color:#fff">' +
    '<div class="lbl" style="color:rgba(255,255,255,.85)">Today\'s session</div>' +
    '<div style="font-size:26px;font-weight:800;margin:8px 0 2px">' + esc(c.title || c.code) + '</div>' +
    '<div style="font-size:13px;color:rgba(255,255,255,.85)">' + esc(c.code) + ' | ' + min + ' min | Level ' + lv + '</div>' +
    (tv ? '<div style="font-size:12px;margin-top:10px;color:rgba(255,255,255,.9)">Toward ' + tv.toFixed(2) + ' - not a figure, a habit.</div>' : '') +
    '</div>' +
    (W.zumaImg ? '<div class="card flex items-center gap-3" style="padding:14px">' + W.zumaImg('studying', 72) +
      '<div class="flex-1 text-xs" style="color:var(--mut)">One section, one timer, no skipping. Zuma reads with you.</div></div>' : '') +
    '<button class="btn w-full py-3" onclick="' + (W.timerStart ? 'timerStart(\'' + esc(c.code) + '\',1)' : 'go(\'read\')') + '">Start focus timer</button>' +
    '<button class="btn2 w-full" onclick="go(\'read\')">Open reading list</button>' +
    '<button class="btn2 w-full" onclick="go(\'home\')">Not now</button></div>';
};
/* ---------- welcome: open arms, once an hour, quiet after study ---------- */
function welcome() {
  if (!sheetFree() || studiedToday() || !hourPassed('as_welc_last')) return;
  var sh = $('sheet'); if (!sh) return;
  lsSet('as_welc_last', String(Date.now()));
  W._welcThisOpen = 1;
  var name = ((U.name || (U.profile && U.profile.name) || '') + '').trim().split(/\s+/)[0] || 'there';
  var hr = new Date().getHours();
  var gr = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  var c = nextCourse();
  sh.innerHTML = '<div class="fixed inset-0 flex flex-col" style="background:var(--card);z-index:9995">' +
    '<div class="flex-1 grid place-items-center p-6">' + (W.zumaImg ? W.zumaImg('welcome', 200) : '') + '</div>' +
    '<div class="space-y-3 px-7 text-left" style="padding-bottom:calc(env(safe-area-inset-bottom,0px) + 26px)">' +
    '<div class="font-extrabold text-2xl">' + gr + ', ' + esc(name) + '.</div>' +
    '<p class="text-sm" style="color:var(--mut)">' + (c ? 'Today we start with ' + esc(c.code) + '. I have been waiting at the trailhead.' : 'I have been waiting at the trailhead.') + '</p>' +
    '<button class="btn w-full py-3" onclick="closeSheet();go(\'sess\')">Start today\'s session</button>' +
    '<button class="btn2 w-full" onclick="closeSheet()">Just browse</button>' +
    '</div></div>';
  scrubX(sh);
}
/* ---------- the target reminder: Zuma half-sheet that leads to STUDY ---------- */
W.zumaRemind = function () {
  if (!sheetFree()) return;
  var sh = $('sheet'); if (!sh) return;
  lsSet('as_remind_last', String(Date.now()));
  var tv = targetVal();
  sh.innerHTML = '<div class="fixed inset-0" style="background:rgba(2,6,23,.45);z-index:9989" onclick="closeSheet()"></div>' +
    '<div class="fixed inset-x-0 bottom-0" style="z-index:9990;background:var(--card);border-top:1px solid var(--bd);border-radius:28px 28px 0 0;box-shadow:0 -18px 50px rgba(0,0,0,.28);max-height:62vh;overflow-y:auto">' +
    '<div style="width:44px;height:4px;border-radius:2px;background:var(--bd);margin:10px auto 0"></div>' +
    '<div class="p-6 space-y-4" style="padding-bottom:calc(env(safe-area-inset-bottom,0px) + 18px)">' +
    '<div class="flex items-end gap-4"><div class="flex-1 space-y-2 text-left">' +
    '<div class="font-extrabold text-xl">' + (tv ? 'Target ' + tv.toFixed(2) + ' - not a figure, a habit.' : 'The summit is not a figure, it is a habit.') + '</div>' +
    '<p class="text-sm" style="color:var(--mut)">One session now keeps the number honest. I will sit with you while you read.</p></div>' +
    (W.zumaImg ? W.zumaImg('studying', 96) : '') + '</div>' +
    '<button class="btn w-full py-3" onclick="closeSheet();go(\'sess\')">Start today\'s session</button>' +
    '<button class="btn2 w-full" onclick="closeSheet()">Later</button>' +
    '</div></div>';
  scrubX(sh);
};
function maybeRemind() {
  if (W._welcThisOpen) { W._welcThisOpen = 0; return; }
  if (studiedToday() || !hourPassed('as_remind_last')) return;
  W.zumaRemind();
}
/* ---------- studying silences both until tomorrow ---------- */
function markStudied() { lsSet('as_study_day', isoLocal()); }
var rdB = W.readDone;
W.readDone = function () { var r = rdB.apply(this, arguments); markStudied(); return r; };
if (W.timerMarkDone) { var tmB = W.timerMarkDone; W.timerMarkDone = function () { markStudied(); return tmB.apply(this, arguments); }; }
/* ---------- cleanHome: one strip, calm colour, taps to the reminder; subtitle unstutters ---------- */
function cleanHome() {
  var m = $('main'); if (!m) return;
  var grad = m.querySelector('.grad');
  if (grad) {
    var big = null, small = null;
    Array.prototype.forEach.call(grad.querySelectorAll('div'), function (d2) {
      var s2 = d2.getAttribute('style') || '';
      if (s2.indexOf('22px') > -1 || s2.indexOf('26px') > -1) big = d2;
      if (s2.indexOf('13px') > -1) small = d2;
    });
    if (big && small && big.textContent.trim() === small.textContent.trim()) small.style.display = 'none';
  }
  var strips = [];
  Array.prototype.forEach.call(m.querySelectorAll('.card, button'), function (n) {
    if ((n.textContent || '').indexOf('not a figure, a habit') > -1 && !n.querySelector('.card')) strips.push(n);
  });
  if (view !== 'home') { strips.forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); }); return; }
  strips.slice(1).forEach(function (n) { if (n.parentNode) n.parentNode.removeChild(n); });
  var keep = strips[0];
  if (keep && !keep.dataset.tuned) {
    keep.dataset.tuned = '1';
    keep.classList.add('mk-strip');
    keep.style.color = '';
    Array.prototype.forEach.call(keep.querySelectorAll('*'), function (x) { x.style.color = ''; });
    keep.style.cursor = 'pointer';
    keep.setAttribute('onclick', 'zumaRemind()');
  }
}
var st2 = document.createElement('style');
st2.textContent = '.mk-strip,.mk-strip *{color:#047857 !important}' +
  'html.dark .mk-strip,html.dark .mk-strip *,.dark .mk-strip,.dark .mk-strip *{color:#34d399 !important}';
document.head.appendChild(st2);
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  requestAnimationFrame(function () { if (v === 'home' || v === 'study') cleanHome(); });
  setTimeout(function () { if (v === 'home' || v === 'study') cleanHome(); }, 160);
  setTimeout(function () { if (v === 'home') { cleanHome(); maybeRemind(); } }, 1200);
  return r;
};
var stB = W.start;
W.start = function () {
  var r = stB.apply(this, arguments);
  setTimeout(welcome, 700);
  return r;
};
})();
