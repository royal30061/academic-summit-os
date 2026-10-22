/* Academic Summit - coach.js v2: calm full-page teacher + the help button.
   Blank stage, drawn mountains centred, words and doors near the bottom
   (about an inch above the gesture bar). No emoji anywhere.
   The "?" fab is reinstated on Home: right side, inset from the edge,
   double its old size, bold, and it stays. Load after fixes.js. */
(function () {
'use strict';
var W = window;
var TIPS = {
  student: [
    { id: 'det', title: 'Result Detective', pitch: 'Paste your portal page once. The Detective reads every course, unit and score - and isolates what each semester actually scored.', cta: 'Try it', go: function () { aTab = 'det'; go('acad'); } },
    { id: 'traj', title: 'GPA Trajectory', pitch: 'Watch your CGPA climb course by course toward 5.00 - and see exactly which course pulled the line down.', cta: 'See my trajectory', go: function () { go('traj'); } },
    { id: 'ocr', title: 'Screenshot import', pitch: 'No copying text. Screenshot your portal results and the app reads them for you.', cta: 'Try it', go: function () { aTab = 'calc'; go('acad'); } },
    { id: 'carry', title: 'Carryover Register', pitch: 'One tap shows every carryover and every narrow 40s escape - guard them before they guard you.', cta: 'Open register', go: function () { carrySheet(); } },
    { id: 'target', title: 'Target Setup', pitch: 'Set your dream CGPA and see the exact average next semester must hit.', cta: 'Set my target', go: function () { aTab = 'tgt'; go('acad'); } }
  ],
  lecturer: [
    { id: 'reps', title: 'Class reps', pitch: 'Appoint a rep: they see your live code, re-issue it, and send names for your approval. You stay in control.', cta: 'Open console', go: function () { go('home'); } },
    { id: 'csv', title: 'Roster export', pitch: 'One tap exports the class list as a sorted CSV - matric, department, course, method.', cta: 'Open roster', go: function () { go('roster'); } },
    { id: 'profile', title: 'Teaching profile', pitch: 'Two minutes now: your courses and levels fill themselves in every time you start a class.', cta: 'Set it up', go: function () { ls2Open(); } }
  ]
};
var K_IDX = 'as_coach_idx', K_KNOWN = 'as_coach_known', K_LAST = 'as_coach_last';
function known() { try { return JSON.parse(localStorage.getItem(K_KNOWN) || '[]'); } catch (e) { return []; } }
function markKnown(id) { var k = known(); if (k.indexOf(id) < 0) k.push(id); try { localStorage.setItem(K_KNOWN, JSON.stringify(k)); } catch (e) {} }
function shouldShow() { try { return Date.now() - (+localStorage.getItem(K_LAST) || 0) > 12 * 3600e3; } catch (e) { return false; } }
function listFor() { return (TIPS[U.role] || TIPS.student).filter(function (t) { return known().indexOf(t.id) < 0; }); }
function nextTip() {
  var list = listFor(); if (!list.length) return null;
  var i = (+localStorage.getItem(K_IDX) || 0) % list.length;
  try { localStorage.setItem(K_IDX, String(i + 1)); } catch (e) {}
  return list[i];
}
function find(id) { return TIPS.student.concat(TIPS.lecturer).filter(function (t) { return t.id === id; })[0]; }
var PEAKS = '<svg viewBox="0 0 48 32" width="104" height="70" aria-hidden="true"><path d="M2 30 L18 6 L28 20 L34 12 L46 30 Z" fill="rgba(16,185,129,.14)" stroke="#10b981" stroke-width="2.5" stroke-linejoin="round"/></svg>';
W.coachShow = function (force) {
  if (!U) return;
  var t = force ? find(force) : nextTip();
  if (!t) t = (TIPS[U.role] || TIPS.student)[0];
  if (!t) return;
  try { localStorage.setItem(K_LAST, String(Date.now())); } catch (e) {}
  var sh = $('sheet'); if (!sh) return;
  sh.innerHTML = '<div class="fixed inset-0 flex flex-col" style="background:var(--card);z-index:9990">' +
    '<div class="flex-1 grid place-items-center">' + PEAKS + '</div>' +
    '<div class="space-y-4 px-6" style="padding-bottom:calc(env(safe-area-inset-bottom,0px) + 84px)">' +
    '<div class="text-center space-y-2"><div class="font-extrabold text-xl">' + esc(t.title) + '</div>' +
    '<p class="text-sm text-slate-500">' + esc(t.pitch) + '</p></div>' +
    '<button class="btn w-full py-3" onclick="coachGo(\'' + t.id + '\')">' + esc(t.cta) + '</button>' +
    '<button class="btn2 w-full" onclick="coachSkip()">Not now</button>' +
    '<button class="text-xs text-slate-500 w-full pt-1" onclick="coachKnown(\'' + t.id + '\')">I already know this - don\'t show it again</button>' +
    '</div></div>';
};
W.coachGo = function (id) { closeSheet(); var t = find(id); if (t) { markKnown(id); t.go(); } };
W.coachSkip = function () { closeSheet(); };
W.coachKnown = function (id) { markKnown(id); closeSheet(); showToast('Noted - this tip will not return'); };
function auto() {
  if (!U || !shouldShow() || !listFor().length) return;
  var sh = $('sheet'); if (sh && sh.innerHTML.trim()) return;
  W.coachShow();
}
/* ---------- the "?" button: reinstated, right, inset, doubled, bold, permanent ---------- */
function fabFix() {
  if (!U || view !== 'home') return;
  var b = Array.from(document.querySelectorAll('button')).find(function (x) { return (x.textContent || '').trim() === '?'; });
  var created = false;
  if (!b) {
    b = document.createElement('button');
    b.type = 'button'; b.textContent = '?';
    b.setAttribute('aria-label', 'Help and tips');
    document.body.appendChild(b);
    created = true;
  }
  if (!b.dataset.fabbed) {
    var size = created ? 88 : Math.round((b.offsetWidth || 44) * 2);   // literally double what it was
    b.dataset.fabbed = String(size);
  }
  var size2 = +b.dataset.fabbed;
  b.style.cssText = 'position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 92px);width:' + size2 + 'px;height:' + size2 +
    'px;border-radius:50%;background:linear-gradient(135deg,#059669,#0d9488);color:#fff;font-size:' + Math.round(size2 * 0.42) +
    'px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 26px rgba(5,150,105,.45);z-index:60;cursor:pointer;border:none';
  b.onclick = function () { W.coachShow(); };
}
var goB = W.go;
W.go = function (v) { var r = goB.apply(this, arguments); setTimeout(fabFix, 140); return r; };
var stB = W.start;
W.start = function () { var r = stB.apply(this, arguments); setTimeout(function () { fabFix(); auto(); }, 1200); return r; };
})();
