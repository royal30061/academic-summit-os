/* Academic Summit - doors.js v2: the five doors with their own inline glyphs.
   Home | Study | Results | Attend | Finance. go('acad') reroutes to the right house.
   Load LAST-ish (before tune.js). */
(function () {
'use strict';
var W = window;
var S = '<svg viewBox="0 0 24 24" style="width:20px;height:20px" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
var S0 = S;
var ICONX = {
  roster: S + '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  reps: S + '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M9 10l2 2 4-4"/></svg>',
  prof: S + '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
};
var ICONS = {
  home: S + '<path d="M3 11l9-8 9 8v9a2 2 0 0 1-2 2h-4v-7h-6v7H5a2 2 0 0 1-2-2z"/></svg>',
  study: S + '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg>',
  traj: S + '<path d="M3 17l6-6 4 3 8-8"/><path d="M14 6h7v7"/></svg>',
  att: S + '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M9 16l2 2 4-4"/></svg>',
  fin: S + '<path d="M20 7H4a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M18 12a2 2 0 0 0 0 4h4v-4z"/><path d="M2 9V5a2 2 0 0 1 2-2h12"/></svg>'
};
var CHART = ICONS.traj;
var ORDER = (U && U.role === 'lecturer') ? ['home', 'roster', 'reps', 'prof'] : ['home', 'study', 'traj', 'att', 'fin'];
var LABEL = { home: 'Home', study: 'Study', traj: 'Results', att: 'Attend', fin: 'Finance', roster: 'Roster', reps: 'Records', prof: 'Profile' };
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
W.lectGo = function (k) {
  var m = { home: ['home'], roster: ['roster'], reps: ['reps', 'req', 'home'], prof: ['prof', 'profile', 'home'] };
  var c = m[k] || ['home'];
  for (var i = 0; i < c.length; i++) if (V[c[i]]) { W.go(c[i]); return; }
  W.go('home');
};
function paint() {
  var probe = document.querySelector('[data-n="home"].bn') ||
    Array.from(document.querySelectorAll('button')).find(function (b) { return /bn/.test(b.className || '') && /Home/i.test(b.textContent || ''); });
  if (!probe) return;
  var bar = probe.parentNode;
  bar.innerHTML = ORDER.map(function (v) {
    var on = v === view;
    return '<button type="button" data-n="' + v + '" onclick="' + ((U && U.role === 'lecturer') ? 'lectGo(\'' + v + '\')' : 'go(\'' + v + '\')') + '" class="bn flex-1 flex flex-col items-center gap-1 py-2 ' + (on ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500') + '" style="background:none;border:none;cursor:pointer">' +
      (ICONX[v] || ICONS[v] || CHART) + '<span class="text-[10px] font-bold">' + LABEL[v] + '</span></button>';
  }).join('');
  var fb = Array.from(document.querySelectorAll('button')).find(function (x) { return (x.textContent || '').trim() === '?'; });
  if (!fb && U) {
    fb = document.createElement('button');
    fb.type = 'button'; fb.textContent = '?';
    fb.setAttribute('aria-label', 'Help and tips');
    document.body.appendChild(fb);
    fb.style.cssText = 'position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom,0px) + 92px);width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#059669,#0d9488);color:#fff;font-size:37px;font-weight:800;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 26px rgba(5,150,105,.45);z-index:60;cursor:pointer;border:none';
    fb.onclick = function () { if (W.coachShow) W.coachShow(); };
  }
  var ren = { acad: 'Study', traj: 'Results', att: 'Attendance', fin: 'Finance', plan: 'Timetable' };
  Object.keys(ren).forEach(function (k) {
    var b = document.querySelector('#side [data-n="' + k + '"]');
    if (b) { var s = b.querySelector('span'); if (s) s.textContent = ren[k]; }
  });
}
var stB = W.start;
W.start = function () { var r = stB.apply(this, arguments); setTimeout(paint, 60); return r; };
})();
