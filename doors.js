/* Academic Summit - doors.js v2: the five doors with their own inline glyphs.
   Home | Study | Results | Attend | Finance. go('acad') reroutes to the right house.
   Load LAST-ish (before tune.js). */
(function () {
'use strict';
var W = window;
var S = '<svg viewBox="0 0 24 24" style="width:20px;height:20px" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
var ICONS = {
  home: S + '<path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>',
  study: S + '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
  traj: S + '<path d="M3 17l6-6 4 3 8-8"/><path d="M14 6h7v7"/></svg>',
  att: S + '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M9 16l2 2 4-4"/></svg>',
  fin: S + '<path d="M20 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/><path d="M2 9V5a2 2 0 0 1 2-2h12"/></svg>'
};
var ORDER = ['home', 'study', 'traj', 'att', 'fin'];
var LABEL = { home: 'Home', study: 'Study', traj: 'Results', att: 'Attend', fin: 'Finance' };
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
    var on = v === view;
    return '<button type="button" data-n="' + v + '" onclick="go(\'' + v + '\')" class="bn flex-1 flex flex-col items-center gap-1 py-2 ' + (on ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500') + '" style="background:none;border:none;cursor:pointer">' +
      ICONS[v] + '<span class="text-[10px] font-bold">' + LABEL[v] + '</span></button>';
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
