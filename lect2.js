/* Academic Summit - lect2.js: role read from Supabase on every load;
   lecturer nav = Attendance | Roster | Planner | Profile; session records card.
   Load LAST. */
(function () {
'use strict';
var W = window;
function isLec() { return U && U.role === 'lecturer'; }
var stB = W.start;
W.start = function () {
  var r = stB.apply(this, arguments);
  try {
    if (sb && sb.auth && sb.auth.getUser) sb.auth.getUser().then(function (u) {
      var id = u && u.user && u.user.id; if (!id) return;
      return sb.from('profiles').select('role,title').eq('id', id).single().then(function (p) {
        if (p && p.data && p.data.role && p.data.role !== U.role) {
          U.role = p.data.role; if (p.data.title) U.lecTitle = p.data.title;
          save(); setTimeout(function () { W.go(view); }, 60);
        }
      });
    });
  } catch (e) {}
  return r;
};
var S0 = '<svg viewBox="0 0 24 24" style="width:20px;height:20px" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
var GL = {
  home: S0 + '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M9 16l2 2 4-4"/></svg>',
  roster: S0 + '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  plan: S0 + '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/></svg>',
  prof: S0 + '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
};
var OR = ['home', 'roster', 'plan', 'prof'];
var LB = { home: 'Attendance', roster: 'Roster', plan: 'Planner', prof: 'Profile' };
function paintLec() {
  if (!isLec()) return;
  var probe = document.querySelector('[data-n="home"].bn'); if (!probe) return;
  var bar = probe.parentNode;
  bar.innerHTML = OR.map(function (v) {
    return '<button type="button" data-n="' + v + '" onclick="go(\'' + v + '\')" class="bn flex-1 flex flex-col items-center gap-1 py-2 ' +
      (v === view ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500') + '" style="background:none;border:none;cursor:pointer">' +
      GL[v] + '<span class="text-[10px] font-bold">' + LB[v] + '</span></button>';
  }).join('');
}
if (typeof W.liveStart === 'function') {
  var lsB = W.liveStart;
  W.liveStart = function () {
    var r = lsB.apply(this, arguments);
    try {
      U.lecLog = U.lecLog || [];
      U.lecLog.unshift({ code: arguments[0] || ((($('lec-code') || {}).value) || ''), topic: arguments[1] || ((($('lec-topic') || {}).value) || ''), openedAt: new Date().toISOString() });
      U.lecLog = U.lecLog.slice(0, 30); save();
    } catch (e) {}
    return r;
  };
}
if (typeof W.liveClose === 'function') {
  var lcB = W.liveClose;
  W.liveClose = function () {
    var r = lcB.apply(this, arguments);
    try { if (U.lecLog && U.lecLog[0] && !U.lecLog[0].closedAt) { U.lecLog[0].closedAt = new Date().toISOString(); save(); } } catch (e) {}
    return r;
  };
}
function recordsCard() {
  if (!isLec() || view !== 'home') return;
  var m = $('main'); if (!m || m.querySelector('[data-lec-rec]')) return;
  var log = U.lecLog || []; if (!log.length) return;
  var c = document.createElement('div');
  c.setAttribute('data-lec-rec', '1'); c.className = 'card p-4 space-y-2';
  c.innerHTML = '<div class="font-extrabold">Session records</div>' + log.slice(0, 8).map(function (x) {
    return '<div class="flex justify-between text-xs"><span>' + esc(x.code) + ' ' + esc(x.topic || '') + '</span><span style="color:var(--mut)">' +
      esc(new Date(x.openedAt).toLocaleTimeString()) + (x.closedAt ? ' - closed' : ' - live') + '</span></div>';
  }).join('');
  m.appendChild(c);
}
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  setTimeout(function () { paintLec(); recordsCard(); }, 160);
  return r;
};
})();
