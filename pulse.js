/* Academic Summit - pulse.js: the greeting speaks once; moment lines speak at moments.
   Streak badge opens a reading calendar: read days marked, missed days skipped kindly.
   Load LAST (after delights.js). */
(function () {
'use strict';
var W = window;
var iso = function (d) { var z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };
var part = function () { var h = new Date().getHours(); return h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening'; };
/* ---------- how many times today did they open the app? ---------- */
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
  if (!U || U.role !== 'student') return '';
  if (sessionCount() < 2) return '';                       // first open of the day: the greeting already spoke
  var si = W.streakInfo ? W.streakInfo() : null, n = si ? si.n : 0;
  var b = ($('main') || document).querySelector('button[onclick^="readDone("]');
  var code = b && b.closest('.flex') ? (b.closest('.flex').querySelector('b') || {}).textContent : null;
  if (code) return 'Back this ' + part() + ' - ' + code + ' is still on today\'s list.';
  if (n > 0) return 'Back this ' + part() + ' - one reading keeps the ' + n + '-day streak alive.';
  return 'Back this ' + part() + ' - the list resets at midnight, your progress does not.';
}
var homeB = V.home;
V.home = function () {
  var h = homeB.apply(this, arguments);
  try {
    var line = momentLine();
    if (line) h = h.replace(/(<p class="text-xs text-slate-500">[^<]*<\/p>)/, '$1<p class="text-xs font-bold" style="color:#047857">' + line + '</p>');
    h = h.replace(/<span class="px-2\.5 py-1 rounded-full text-\[10px\] font-extrabold" style="background:rgba\(16,185,129,\.15\);color:#047857">(\d+-day streak)<\/span>/,
      '<button type="button" onclick="streakCal()" aria-label="Open your reading calendar" style="background:rgba(16,185,129,.15);color:#047857;padding:5px 10px;border-radius:9999px;font-size:10px;font-weight:800;cursor:pointer">$1</button>');
  } catch (e) {}
  return h;
};
/* ---------- attendance moment: one warm line after the code lands ---------- */
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
        toastB('Attendance locked. ' + (n > 0
          ? (left ? left + ' reading' + (left === 1 ? '' : 's') + ' left to keep the ' + n + '-day streak.' : 'Readings done - streak safe.')
          : 'One reading today starts a streak.'));
      }, 1200);
    }
  } catch (e) {}
  return r;
};
/* ---------- clean-sweep moment ---------- */
var rdB = W.readDone;
W.readDone = function (code) {
  var r = rdB.apply(this, arguments);
  setTimeout(function () {
    try {
      var L = U.todayList; if (!L || L.date !== iso(new Date())) return;
      var log = U.readLog || {}, t = iso(new Date());
      if (L.items.length && L.items.every(function (i) { return (log[t] || []).indexOf(i.code) > -1; }))
        showToast('Clean sweep. The list resets at midnight - your streak does not.');
    } catch (e) {}
  }, 700);
  return r;
};
/* ---------- the reading calendar ---------- */
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
    cells += '<span class="grid place-items-center rounded-lg text-[11px] font-bold" style="' +
      (c ? 'background:rgba(16,185,129,.18);color:#047857;font-weight:800' : 'color:var(--mut);opacity:.5') +
      (isT ? ';border:1.5px solid #059669' : '') + (fr ? ';border:1.5px solid #38bdf8' : '') + '">' + d +
      (c ? '<i style="display:block;width:4px;height:4px;border-radius:50%;background:#059669;margin:1px auto 0"></i>' : '') + '</span>';
  }
  var si = W.streakInfo ? W.streakInfo() : null;
  fullScreen('Reading calendar',
    '<div class="card p-5 space-y-4">' +
    '<div class="flex justify-between items-center"><button class="btn2 px-3" onclick="streakCal(-1)">\u2039</button><div class="font-extrabold">' + names[calM.m] + ' ' + calM.y + '</div><button class="btn2 px-3" onclick="streakCal(1)">\u203a</button></div>' +
    '<div class="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-500">' + ['M', 'T', 'W', 'T', 'F', 'S', 'S'].map(function (x) { return '<span>' + x + '</span>'; }).join('') + '</div>' +
    '<div class="grid grid-cols-7 gap-1" style="grid-auto-rows:34px">' + cells + '</div>' +
    '<p class="text-[11px] text-slate-500">Green days are days you read. Empty days are simply skipped - no marks against you' + (U.freezeGap ? '; the blue ring is a freeze token covering a gap' : '') + '.</p>' +
    '<div class="grid grid-cols-3 gap-2 text-center text-xs">' +
    '<div class="rounded-xl p-3" style="background:var(--sub)"><div class="lbl">Current</div><b>' + (si ? si.n : 0) + ' days</b></div>' +
    '<div class="rounded-xl p-3" style="background:var(--sub)"><div class="lbl">Best</div><b>' + (U.bestStreak || (si ? si.n : 0)) + ' days</b></div>' +
    '<div class="rounded-xl p-3" style="background:var(--sub)"><div class="lbl">This month</div><b>' + monthRead + ' days</b></div></div></div>' +
    '<button class="btn w-full mt-2" onclick="closeSheet()">Close</button>');
};
})();
