/* Academic Summit - pulse.js v2: moment lines + the reading calendar.
   Marks are history: each read day keeps its mountain forever; new reads add, never edit.
   The streak badge is a real button (found by text, not by string surgery).
   Load LAST (after delights.js). */
(function () {
'use strict';
var W = window;
var iso = function (d) { var z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };
var part = function () { var h = new Date().getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; };
var PEAK = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" style="display:block;margin:1px auto 0"><path d="M3 17l6-9 4 5 3-4 5 8z"/></svg>';
var st = document.createElement('style');
st.textContent =
  '#main b.font-mono{font-size:.95rem !important}' +          /* course codes, where eyes land first */
  '.d-ring{font-size:12px !important;gap:6px !important}' +   /* the progress ring label */
  '.d-cal b{font-size:13px !important}';                      /* calendar day numbers */
document.head.appendChild(st);
/* ---------- moment lines (unchanged from v1) ---------- */
function sessionCount() {
  var k = 'd_sess_' + iso(new Date()), n = 1;
  try {
    if (!sessionStorage.getItem('d_sess_counted')) {
      sessionStorage.setItem('d_sess_counted', '1');
      n = (+localStorage.getItem(k) || 0) + 1;
      localStorage.setItem(k, String(n));
    } else n = +localStorage.getItem(k) || 1;
  } catch (e) {}
  return n;
}
function momentLine() {
  if (!U || U.role !== 'student' || sessionCount() < 2) return '';
  var si = W.streakInfo ? W.streakInfo() : null, n = si ? si.n : 0;
  var b = ($('main') || document).querySelector('button[onclick^="readDone("]');
  var code = b && b.closest('.flex') ? (b.closest('.flex').querySelector('b') || {}).textContent : null;
  if (code) return 'Back this ' + part() + ' - ' + code + ' is still on today\'s list.';
  if (n > 0) return 'Back this ' + part() + ' - one reading keeps the ' + n + '-day streak alive.';
  return 'Back this ' + part() + ' - the list resets at midnight, your progress does not.';
}
/* ---------- the badge becomes a button, found by what it SAYS ---------- */
function badgeButton() {
  var el = Array.from(($('main') || document).querySelectorAll('span,button')).find(function (n) {
    return /^\d+-day streak$/.test((n.textContent || '').trim());
  });
  if (!el || el.dataset.cal) return;
  el.dataset.cal = '1';
  el.style.cursor = 'pointer'; el.style.fontSize = '12px'; el.style.padding = '6px 12px';
  el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Open your reading calendar');
  el.onclick = function () { W.streakCal(); };
}
/* ---------- done rows tell the truth ---------- */
function fixReadLabels() {
  Array.from(($('main') || document).querySelectorAll('.space-y-2 > div')).forEach(function (row) {
    if (!/Read \u2713/.test(row.textContent || '')) return;
    var sub = row.querySelector('.text-[11px]');
    if (sub && /not opened yet|days since/.test(sub.textContent || '')) sub.textContent = 'read today';
  });
}
var homeB = V.home;
V.home = function () {
  var h = homeB.apply(this, arguments);
  try {
    var line = momentLine();
    if (line) h = h.replace(/(<p class="text-xs text-slate-500">[^<]*<\/p>)/, '$1<p class="text-xs font-bold" style="color:#047857">' + line + '</p>');
  } catch (e) {}
  return h;
};
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  setTimeout(function () { if (v === 'home') { badgeButton(); fixReadLabels(); } }, 80);
  return r;
};
/* ---------- attendance + clean-sweep moments (unchanged from v1) ---------- */
if (typeof W.markFromHome === 'function') {
  var mfB = W.markFromHome;
  W.markFromHome = function () { W._attWant = 1; return mfB.apply(this, arguments); };
}
var toastB = W.showToast;
W.showToast = function (m, t) {
  var r = toastB.apply(this, arguments);
  try {
    if (W._attWant) {
      W._attWant = 0;
      if (t !== 'error') setTimeout(function () {
        var si = W.streakInfo ? W.streakInfo() : null, n = si ? si.n : 0;
        var left = ($('main') || document).querySelectorAll('button[onclick^="readDone("]').length;
        toastB('Attendance locked. ' + (n > 0 ? (left ? left + ' reading' + (left === 1 ? '' : 's') + ' left to keep the ' + n + '-day streak.' : 'Readings done - streak safe.') : 'One reading today starts a streak.'));
      }, 1200);
    }
  } catch (e) {}
  return r;
};
var rdB = W.readDone;
W.readDone = function (code) {
  var r = rdB.apply(this, arguments);
  setTimeout(function () {
    try {
      var L = U.todayList; if (!L || L.date !== iso(new Date())) return;
      var t = iso(new Date()), log = U.readLog || {};
      if (L.items.length && L.items.every(function (i) { return (log[t] || []).indexOf(i.code) > -1; }))
        showToast('Clean sweep. The list resets at midnight - your streak does not.');
    } catch (e) {}
  }, 700);
  return r;
};
/* ---------- the reading calendar: mountains, immutable ---------- */
var calM = null;
W.streakCal = function (dy) {
  var now = new Date();
  if (!calM) calM = { y: now.getFullYear(), m: now.getMonth() };
  if (dy) { calM.m += dy; if (calM.m < 0) { calM.m = 11; calM.y--; } if (calM.m > 11) { calM.m = 0; calM.y++; } }
  var log = U.readLog || {}, t = iso(now), monthRead = 0;
  var names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  var startDow = (new Date(calM.y, calM.m, 1).getDay() + 6) % 7;
  var days = new Date(calM.y, calM.m + 1, 0).getDate();
  var cells = '';
  for (var i = 0; i < startDow; i++) cells += '<span></span>';
  for (var d = 1; d <= days; d++) {
    var key = iso(new Date(calM.y, calM.m, d)), c = (log[key] || []).length;
    if (c) monthRead++;
    var isT = key === t, fr = U.freezeGap === key;
    cells += '<span class="d-cal grid place-items-center rounded-lg" style="' +
      (c ? 'background:rgba(16,185,129,.16);color:#047857' : 'color:var(--mut);opacity:.5') +
      (isT ? ';border:1.5px solid #059669' : '') + (fr ? ';border:1.5px solid #38bdf8' : '') + '">' +
      '<b style="font-weight:800;font-size:13px;line-height:1.1">' + d + '</b>' + (c ? PEAK : '') + '</span>';
  }
  var si = W.streakInfo ? W.streakInfo() : null;
  fullScreen('Reading calendar',
    '<div class="card p-5 space-y-4">' +
    '<div class="flex justify-between items-center"><button class="btn2 px-3" onclick="streakCal(-1)">\u2039</button><div class="font-extrabold">' + names[calM.m] + ' ' + calM.y + '</div><button class="btn2 px-3" onclick="streakCal(1)">\u203a</button></div>' +
    '<div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
    '<div class="grid grid-cols-7 gap-1" style="grid-auto-rows:40px">' + cells + '</div>' +
    '<p class="text-[11px] text-slate-500">Every day you read keeps its mountain forever - new reads add peaks, they never move old ones. Empty days are simply skipped' + (U.freezeGap ? '; the blue ring is a freeze token covering a gap' : '') + '.</p>' +
    '<div class="grid grid-cols-3 gap-2 text-center text-xs">' +
    '<div class="rounded-xl p-3" style="background:var(--sub)"><div class="lbl">Current</div><b>' + (si ? si.n : 0) + ' days</b></div>' +
    '<div class="rounded-xl p-3" style="background:var(--sub)"><div class="lbl">Best</div><b>' + (U.bestStreak || (si ? si.n : 0)) + ' days</b></div>' +
    '<div class="rounded-xl p-3" style="background:var(--sub)"><div class="lbl">This month</div><b>' + monthRead + ' days</b></div></div></div>' +
    '<button class="btn w-full mt-2" onclick="closeSheet()">Close</button>');
};
})();
