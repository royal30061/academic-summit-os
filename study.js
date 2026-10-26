/* Academic Summit - study.js: the Study house shell (engine lands in Drop B).
   Tabs: Today | Courses | Timetable & campus. Load before doors.js. */
(function () {
'use strict';
var W = window;
V.study = function () {
  U._stab = U._stab || 'today';
  var tabs = [['today', 'Today'], ['crs', 'Courses'], ['plan', 'Timetable & campus']];
  return '<div class="space-y-4">' +
    '<div class="font-extrabold text-2xl">Study</div>' +
    '<div class="flex gap-1 flex-wrap p-1 rounded-2xl" style="background:var(--sub)">' +
    tabs.map(function (t) {
      return '<button type="button" class="' + (U._stab === t[0] ? 'btn' : 'btn2') + ' px-3 py-1.5" style="font-size:12px" onclick="stabSet(\'' + t[0] + '\')">' + t[1] + '</button>';
    }).join('') + '</div><div id="sub"></div></div>';
};
W.stabSet = function (t) { U._stab = t; go('study'); };
function fillStudy() {
  var sub = $('sub'); if (!sub) return;
  if (U._stab === 'crs') { if (typeof ACAD.crs === 'function') ACAD.crs(); return; }
  if (U._stab === 'plan') {
    sub.innerHTML = '<div class="space-y-2">' +
      '<button class="btn w-full justify-between" onclick="go(\'plan\')">Timetable & campus events' + ic('r', 'w-4 h-4') + '</button>' +
      '<button class="btn2 w-full justify-between" onclick="go(\'read\')">Reading list & plan editor' + ic('r', 'w-4 h-4') + '</button></div>';
    return;
  }
  var t = null; try { t = JSON.parse(localStorage.getItem('as_timer') || 'null'); } catch (e) {}
  sub.innerHTML = '<div class="space-y-2">' +
    (W.zumaImg ? '<div class="card flex items-center gap-3" style="padding:14px">' + W.zumaImg('welcome', 72) + '<div class="flex-1"><div class="font-extrabold">Where do we start today?</div><div class="text-xs" style="color:var(--mut)">Open the reading list - the first unchecked course is your first session.</div></div></div>' : '') +
    '<button class="btn w-full justify-between" onclick="go(\'read\')">Today\'s reading' + ic('r', 'w-4 h-4') + '</button>' +
    (t ? '<button class="btn w-full justify-between" onclick="go(\'timer\')">Resume focus timer' + ic('r', 'w-4 h-4') + '</button>' : '') +
    '<button class="btn2 w-full justify-between" onclick="planSetupOpen()">Study plan settings' + ic('r', 'w-4 h-4') + '</button>' +
    '<p class="text-[11px] text-slate-500">The full study engine (sections, reviews, levels) arrives in the next drop.</p></div>';
}
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  setTimeout(function () { if (v === 'study') fillStudy(); }, 90);
  return r;
};
})();
