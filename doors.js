/* Academic Summit - doors.js: the five doors.
   Bottom nav = Home | Study | Results | Attend | Finance.
   go('acad') reroutes: crs -> Study, everything results -> Results hub.
   Load LAST. */
(function () {
'use strict';
var W = window;
var ORDER = ['home', 'study', 'traj', 'att', 'fin'];
var LABEL = { home: 'Home', study: 'Study', traj: 'Results', att: 'Attend', fin: 'Finance' };
var ICON = { home: 'h', study: 'g', traj: 'up', att: 'c', fin: 'w' };
var CHART = '<svg viewBox="0 0 24 24" class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 3 8-8"/><path d="M14 6h7v7"/></svg>';
var RAWICON = { traj: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-6 4 3 6-8"/><path d="M14 6h4v4"/></svg>' };
var goB = W.go;
W.go = function (v) {
  if (v === 'acad') {
    if (!aTab || aTab === 'crs') v = 'study';
    else { if (W.rTabSet) W.rTabSet(aTab); aTab = 'crs'; v = 'traj'; }
  }
  var r = goB.call(this, v);
  setTimeout(paint, 80);
  return r;
};
function paint() {
  var probe = document.querySelector('[data-n="home"].bn') ||
    Array.from(document.querySelectorAll('button')).find(function (b) { return /bn/.test(b.className || '') && /Home/i.test(b.textContent || ''); });
  if (!probe) return;
  var bar = probe.parentNode;
  bar.innerHTML = ORDER.map(function (v) {
    var on = v === view || (v === 'study' && view === 'study') || (v === 'traj' && view === 'traj');
    return '<button type="button" data-n="' + v + '" onclick="go(\'' + v + '\')" class="bn flex-1 flex flex-col items-center gap-1 py-2 ' + (on ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500') + '" style="background:none;border:none;cursor:pointer">' +
      (RAWICON[v] || (v === 'traj' ? CHART : ic(ICON[v], 'w-5 h-5'))) + '<span class="text-[10px] font-bold">' + LABEL[v] + '</span></button>';
  }).join('');
  var ren = { acad: 'Study', traj: 'Results', att: 'Attendance', fin: 'Finance', plan: 'Timetable' };
  Object.keys(ren).forEach(function (k) {
    var b = document.querySelector('#side [data-n="' + k + '"]');
    if (b) { var s = b.querySelector('span'); if (s) s.textContent = ren[k]; }
  });
}
var stB = W.start;
W.start = function () { var r = stB.apply(this, arguments); setTimeout(paint, 60); return r; };
})();
