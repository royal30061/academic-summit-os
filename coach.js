/* Academic Summit - coach.js
   Rotating full-screen feature discovery. Load AFTER auth.js.
   Non-critical: if it fails, the app simply never shows a tip. */
(function () {
'use strict';
var MODULE_NAME = 'COACH';
try {
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
function nextTip() {
  var list = (TIPS[U.role] || TIPS.student).filter(function (t) { return known().indexOf(t.id) < 0; });
  if (!list.length) return null;
  var i = (+localStorage.getItem(K_IDX) || 0) % list.length;
  try { localStorage.setItem(K_IDX, String(i + 1)); } catch (e) {}
  return list[i];
}
function find(id) { return TIPS.student.concat(TIPS.lecturer).filter(function (t) { return t.id === id; })[0]; }
function show() {
  try {
    if (!U || !shouldShow()) return;
    var t = nextTip();
    if (!t) return;
    localStorage.setItem(K_LAST, String(Date.now()));
    fullScreen('Did you know?',
      '<div class="space-y-4 text-center"><div class="text-5xl">💡</div>' +
      '<div class="font-extrabold text-xl">' + esc(t.title) + '</div>' +
      '<p class="text-sm text-slate-500">' + esc(t.pitch) + '</p>' +
      '<button class="btn w-full" onclick="coachGo(\'' + t.id + '\')">' + esc(t.cta) + '</button>' +
      '<button class="btn2 w-full" onclick="coachSkip()">Not now</button>' +
      '<button class="text-xs text-slate-500 w-full pt-1" onclick="coachKnown(\'' + t.id + '\')">I already know this - don\'t show it again</button></div>');
  } catch (e) { console.error('coach show', e); }
}
W.coachGo = function (id) { closeSheet(); var t = find(id); if (t) { markKnown(id); t.go(); } };
W.coachSkip = function () { closeSheet(); };
W.coachKnown = function (id) { markKnown(id); closeSheet(); showToast('Noted - you won\'t see this tip again'); };
var startBase = W.start;
W.start = function () { startBase.apply(this, arguments); setTimeout(show, 900); };
} catch (err) {
  console.error('[CIRCUIT BREAKER] ' + MODULE_NAME + ' failed to load:', err);
  try {
    (window._featureFailures = window._featureFailures || {})[MODULE_NAME] = { time: Date.now(), message: (err && err.message) || String(err) };
    if (window._cbNotify) window._cbNotify(MODULE_NAME);
  } catch (e) {}
}
})();
