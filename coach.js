/* Academic Summit - coach.js v3: Zuma guides from a half-sheet, not a takeover.
   Text starts left, Zuma sits right, Skip left / Next right.
   First launch: Zuma introduces himself, once, then never interrupts again.
   Load after zuma.js. */
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
var K_IDX = 'as_coach_idx', K_KNOWN = 'as_coach_known', K_LAST = 'as_coach_last', K_INTRO = 'as_zuma_intro';
function known() { try { return JSON.parse(localStorage.getItem(K_KNOWN) || '[]'); } catch (e) { return []; } }
function markKnown(id) { var k = known(); if (k.indexOf(id) < 0) k.push(id); try { localStorage.setItem(K_KNOWN, JSON.stringify(k)); } catch (e) {} }
function shouldShow() { try { var d0 = +localStorage.getItem('as_first_seen') || Date.now(); if (Date.now() - d0 > 3 * 864e5) return false; return localStorage.getItem(K_LAST + 'day') !== new Date().toDateString(); } catch (e) { return false; } }
function listFor() { return (TIPS[U.role] || TIPS.student).filter(function (t) { return known().indexOf(t.id) < 0; }); }
function nextTip() {
  var list = listFor(); if (!list.length) return null;
  var i = (+localStorage.getItem(K_IDX) || 0) % list.length;
  try { localStorage.setItem(K_IDX, String(i + 1)); } catch (e) {}
  return list[i];
}
function find(id) { return TIPS.student.concat(TIPS.lecturer).filter(function (t) { return t.id === id; })[0]; }
/* ---------- the half-sheet tour ---------- */
W.coachShow = function (force) {
  if (!U) return;
  var t = force ? find(force) : nextTip();
  if (!t) t = (TIPS[U.role] || TIPS.student)[0];
  if (!t) return;
  try { localStorage.setItem(K_LAST, String(Date.now())); localStorage.setItem(K_LAST + 'day', new Date().toDateString()); } catch (e) {}
  var sh = $('sheet'); if (!sh) return;
  sh.innerHTML =
    '<div class="fixed inset-0" style="background:rgba(2,6,23,.45);z-index:9989" onclick="coachSkip()"></div>' +
    '<div class="fixed inset-x-0 bottom-0" style="z-index:9990;background:var(--card);border-top:1px solid var(--bd);border-radius:28px 28px 0 0;box-shadow:0 -18px 50px rgba(0,0,0,.28);max-height:62vh;overflow-y:auto">' +
    '<div style="width:44px;height:4px;border-radius:2px;background:var(--bd);margin:10px auto 0"></div>' +
    '<div class="p-6 space-y-4" style="padding-bottom:calc(env(safe-area-inset-bottom,0px) + 18px)">' +
    '<div class="flex items-end gap-4"><div class="flex-1 space-y-2 text-left">' +
    '<div class="font-extrabold text-xl">' + esc(t.title) + '</div>' +
    '<p class="text-sm text-slate-500">' + esc(t.pitch) + '</p></div>' + W.zumaImg('point', 96) + '</div>' +
    '<button class="btn w-full py-3" onclick="coachGo(\'' + t.id + '\')">' + esc(t.cta) + '</button>' +
    '<div class="flex gap-2"><button class="btn2 flex-1" onclick="coachSkip()">Skip</button>' +
    '<button class="btn flex-1" onclick="coachNext()">Next</button></div>' +
    '<button class="text-xs text-slate-500 w-full" onclick="coachKnown(\'' + t.id + '\')">I already know this - don\'t show it again</button>' +
    '</div></div>';
};
W.coachNext = function () { W.coachShow(); };
W.coachGo = function (id) { closeSheet(); var t = find(id); if (t) { markKnown(id); t.go(); } };
W.coachSkip = function () { closeSheet(); };
W.coachKnown = function (id) { markKnown(id); closeSheet(); showToast('Noted - this tip will not return'); };
/* ---------- Zuma's first hello (once per install) ---------- */
W.zumaIntro = function () {
  var sh = $('sheet'); if (!sh) return;
  try { localStorage.setItem(K_INTRO, '1'); } catch (e) {}
  sh.innerHTML = '<div class="fixed inset-0 flex flex-col" style="background:var(--card);z-index:9995">' +
    '<div class="flex-1 grid place-items-center p-6">' + W.zumaImg('wave', 210, 32) + '</div>' +
    '<div class="space-y-3 px-7 text-left" style="padding-bottom:calc(env(safe-area-inset-bottom,0px) + 26px)">' +
    '<div class="font-extrabold text-2xl">Hello. My name is Zuma.</div>' +
    '<p class="text-sm text-slate-500">I am from Academic Summit. I will walk with you - attendance, reading, results - until your goals reach the top of the mountain. I know the way. I live there.</p>' +
    '<button class="btn w-full py-3" onclick="closeSheet()">Let\'s walk</button>' +
    '<button class="text-xs text-slate-500 w-full" onclick="closeSheet()">Skip the introductions</button>' +
    '</div></div>';
};
function auto() {
  if (!U) return;
  var sh = $('sheet'); if (sh && sh.innerHTML.trim()) return;
  var introDone = false;
  try { introDone = !!localStorage.getItem(K_INTRO); } catch (e) { introDone = true; }
  if (!introDone) return W.zumaIntro();
  if (!shouldShow() || !listFor().length) return;
  W.coachShow();
}
/* ---------- the "?" button stays: right, inset, doubled, bold ---------- */
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
  if (!b.dataset.fabbed) b.dataset.fabbed = String(created ? 88 : Math.round((b.offsetWidth || 44) * 2));
  var s = +b.dataset.fabbed;
  b.style.cssText = 'position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 92px);width:' + s + 'px;height:' + s +
    'px;border-radius:50%;background:linear-gradient(135deg,#059669,#0d9488);color:#fff;font-size:' + Math.round(s * 0.42) +
    'px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 26px rgba(5,150,105,.45);z-index:60;cursor:pointer;border:none';
  b.onclick = function () { W.coachShow(); };
}
var goB = W.go;
W.go = function (v) { var r = goB.apply(this, arguments); setTimeout(fabFix, 140); return r; };
var stB = W.start;
W.start = function () { var r = stB.apply(this, arguments); setTimeout(function () { fabFix(); auto(); }, 1200); return r; };
})();
