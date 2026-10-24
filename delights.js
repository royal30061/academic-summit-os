/* Academic Summit - delights.js v2 (calm): motion per the founder's note.
   Calm by default, surprising only occasionally. No emoji anywhere.
   Load LAST (after polish.js). */
(function () {
'use strict';
var W = window;
var reduce = false; try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
var iso = function () { var d = new Date(); var z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };
var st = document.createElement('style');
st.textContent =
  '.rl-morn{background:linear-gradient(160deg,rgba(16,185,129,.10),rgba(252,211,77,.06))!important}' +
  '.rl-noon{background:linear-gradient(160deg,rgba(16,185,129,.14),rgba(16,185,129,.04))!important}' +
  '.rl-night{background:linear-gradient(160deg,rgba(13,148,136,.16),rgba(148,163,184,.05))!important}' +
  '.dark .rl-noon{background:linear-gradient(160deg,rgba(16,185,129,.12),rgba(6,78,59,.25))!important}' +
  '.dark .rl-night{background:linear-gradient(160deg,rgba(15,118,110,.18),rgba(0,0,0,.25))!important}' +
  '.d-mile{border:1px solid rgba(180,83,9,.35);background:linear-gradient(140deg,rgba(252,211,77,.10),rgba(16,185,129,.06))!important}' +
  '.mk-gold{color:#b45309}.dark .mk-gold{color:#fcd34d}' +
  '@media (prefers-reduced-motion: no-preference){' +
  '@keyframes dGreet{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}' +
  '@keyframes dRise{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
  '@keyframes dDraw{to{stroke-dashoffset:0}}' +
  '#main h1.d-greet{animation:dGreet .6s both}' +
  '#main h1.d-settled{font-size:1.35rem;color:var(--mut);transition:font-size .4s,color .4s}' +
  '.d-calm #main .card{animation:dRise .25s both}' +
  '.d-calm #main .card:nth-child(2){animation-delay:.06s}.d-calm #main .card:nth-child(3){animation-delay:.12s}.d-calm #main .card:nth-child(4){animation-delay:.18s}.d-calm #main .card:nth-child(5){animation-delay:.24s}' +
  '.d-check path{stroke-dasharray:24;stroke-dashoffset:24;animation:dDraw .4s .05s both}' +
  '.d-ring circle.fg{transition:stroke-dashoffset .5s ease}' +
  '}';
document.head.appendChild(st);
/* ---------- Summit Marks: quiet shelf, star not sticker ---------- */
var MARKS = [
  { id: 'first-import', n: 'First Import', h: 'Save your first semester result', t: function () { return (U.semesters || []).length >= 1; } },
  { id: 'streak-3', n: 'Kindling', h: 'Read 3 days in a row', t: function () { return W.streakInfo && W.streakInfo().n >= 3; } },
  { id: 'streak-7', n: 'Week Flame', h: 'Read 7 days in a row', t: function () { return W.streakInfo && W.streakInfo().n >= 7; } },
  { id: 'freeze-used', n: 'Cold Save', h: 'Let a freeze token protect a streak', t: function () { return (U.freezeSpent || 0) >= 1; } },
  { id: 'all-read', n: 'Clean Sweep', h: 'Tick every course on a daily list', t: function () { var l = U.readLog || {}; return Object.keys(l).some(function (k) { return l[k].length >= 3; }); } },
  { id: 'vault', n: 'Vault Keeper', h: 'Save your first course file', t: function () { return (U.courseFiles || []).length >= 1; } },
  { id: 'rep', n: 'Voice of the Class', h: 'Be appointed a class rep', t: function () { return (W._repCourses || []).length >= 1; } },
  { id: 'explorer', n: 'Explorer', h: 'Open the GPA trajectory', t: function () { try { return !!localStorage.getItem('as_seen_traj'); } catch (e) { return false; } } }
];
function checkMarks() {
  if (!U || U.role !== 'student') return;
  U.marks = U.marks || {};
  var changed = false;
  MARKS.forEach(function (m) {
    if (U.marks[m.id]) return;
    var ok = false; try { ok = m.t(); } catch (e) {}
    if (ok) { U.marks[m.id] = Date.now(); changed = true; setTimeout(function () { showToast('Summit Mark earned: ' + m.n); }, 300); }
  });
  if (changed) save();
}
var TIPS = [
  'Courses you read the day before class stick roughly twice as well.',
  'Two short readings beat one long cram: the list resets tomorrow either way.',
  'Your narrowest course is the cheapest place to gain a grade point.',
  'Attendance first, reading after: the code expires in ninety seconds, the list does not.',
  'A 40 is one mark from a carryover. Guard your narrow escapes.',
  'Files you keep per course today are the revision you skip searching for in June.'
];
function ring(done, total) {
  if (!total) return '';
  var r = 9, c = 2 * Math.PI * r;
  return '<span class="d-ring inline-flex items-center gap-1 text-[10px] font-bold text-slate-500"><svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="' + r + '" stroke="var(--bd)" stroke-width="3" fill="none"/><circle class="fg" cx="11" cy="11" r="' + r + '" stroke="#10b981" stroke-width="3" fill="none" stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + (c * (1 - done / total)).toFixed(1) + '" stroke-linecap="round" transform="rotate(-90 11 11)"/></svg>' + done + ' of ' + total + ' today</span>';
}
function ringStep() {
  var lab = document.querySelector('.d-ring'); if (!lab) return;
  var m = lab.textContent.match(/(\d+) of (\d+)/); if (!m) return;
  var d = +m[1] + 1, t = +m[2], c = 2 * Math.PI * 9, fg = lab.querySelector('circle.fg');
  if (fg) fg.style.strokeDashoffset = (c * (1 - d / t)).toFixed(1);
  lab.innerHTML = lab.innerHTML.replace(m[0], d + ' of ' + t);
}
/* ---------- the rewarded tap: check draws, row dims, ring fills ---------- */
document.addEventListener('click', function (e) {
  var b = e.target && e.target.closest ? e.target.closest('button[onclick^="readDone("]') : null;
  if (!b) return;
  var code = ((b.getAttribute('onclick') || '').match(/readDone\('([^']+)'\)/) || [])[1];
  if (!code) return;
  e.stopPropagation();
  if (!reduce) {
    var row = b.closest('.flex');
    if (row) { row.style.opacity = '.55'; b.outerHTML = '<span class="d-check" style="color:#10b981"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M4 12l5 5 11-11"/></svg></span>'; }
    ringStep();
    setTimeout(function () { W.readDone(code); }, 420);
    return;
  }
  W.readDone(code);
}, true);
/* ---------- home: tint by hour, ring, rare surprises, emoji sweep ---------- */
var homeB = V.home;
V.home = function () {
  var h = homeB.apply(this, arguments);
  try {
    h = h.replace(/[\u{1F525}\u{23F3}\u{2744}\u{1F4A4}\u{2728}\u{1F6A9}\u{1F56F}\u{1F4A1}]/gu, '');
    var hr = new Date().getHours(), tod = hr < 12 ? 'rl-morn' : hr < 17 ? 'rl-noon' : 'rl-night';
    h = h.replace('<div class="card p-6 space-y-3"><div class="flex justify-between items-start"><div><div class="font-extrabold text-lg">Today\'s reading list',
      '<div class="card p-6 space-y-3 ' + tod + '"><div class="flex justify-between items-start"><div><div class="font-extrabold text-lg">Today\'s reading list');
    var i = h.indexOf("Today's reading list");
    if (i > -1) {
      var j = h.indexOf('<div class="space-y-2">', i);
      if (j > -1) {
        var si = W.streakInfo ? W.streakInfo() : null, n = si ? si.n : 0, t = iso();
        var undone = (h.match(/readDone\('/g) || []).length, done = (h.match(/Read \u2713/g) || []).length;
        var extra = ring(done, undone + done);
        if ((n === 7 || n === 30) && localStorage.getItem('d_mile') !== t + ':' + n) {
          localStorage.setItem('d_mile', t + ':' + n);
          extra += '<div class="card p-4 d-mile text-xs font-bold mk-gold flex items-center gap-3">' + (W.zumaImg ? W.zumaImg('cheer', 52) : '') + '<span>' + (n === 7 ? 'Seven days in a row. The list is yours now.' : 'Thirty days. This is a habit, not a streak.') + '</span></div>';
        }
        if (n > 0 && n > (U.bestStreak || 0)) {
          extra += '<p class="text-xs font-bold mk-gold">You passed your old best of ' + (U.bestStreak || 0) + ' days. Quietly extraordinary.</p>';
          U.bestStreak = n; save();
        }
        var day = Math.floor(Date.now() / 864e5);
        if (day % 3 === 0) extra += '<p class="text-xs text-slate-500" style="font-style:italic">' + TIPS[day % TIPS.length] + '</p>';
        h = h.slice(0, j) + extra + h.slice(j);
      }
    }
  } catch (e) {}
  return h;
};
/* ---------- profile: the quiet shelf ---------- */
var STAR = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke-width="2" stroke-linejoin="round"><path d="M12 3l2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z"/></svg>';
var profB = V.prof;
V.prof = function () {
  var h = profB.apply(this, arguments);
  try {
    var got = U.marks || {};
    h += '<div class="card p-6 space-y-3 mt-5"><div class="font-extrabold">Summit Marks</div><div class="grid grid-cols-2 gap-2">' + MARKS.map(function (m) {
      var on = !!got[m.id];
      return '<div class="p-3 rounded-xl space-y-1" style="background:var(--sub);' + (on ? '' : 'opacity:.5') + '"><span style="color:' + (on ? '#b45309' : 'var(--mut)') + '">' + STAR + '</span><div class="text-xs font-extrabold' + (on ? ' mk-gold' : '') + '">' + m.n + '</div><div class="text-[10px] text-slate-500">' + m.h + '</div></div>';
    }).join('') + '</div></div>';
  } catch (e) {}
  return h;
};
/* ---------- greeting + once-a-day calm entrance ---------- */
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  if (v === 'traj') { try { localStorage.setItem('as_seen_traj', '1'); } catch (e) {} }
  setTimeout(function () {
    checkMarks();
    if (v !== 'home' || reduce) return;
    try {
      var h1 = $('main') && $('main').querySelector('h1');
      if (h1 && !sessionStorage.getItem('d_greet')) {
        sessionStorage.setItem('d_greet', '1');
        h1.classList.add('d-greet');
        setTimeout(function () { h1.classList.add('d-settled'); }, 1300);
      }
    } catch (e) {}
    var t = iso();
    if (localStorage.getItem('d_calm') !== t) {
      localStorage.setItem('d_calm', t);
      document.body.classList.add('d-calm');
      setTimeout(function () { document.body.classList.remove('d-calm'); }, 1200);
    }
  }, 60);
  return r;
};
var startB = W.start;
W.start = function () { var r = startB.apply(this, arguments); setTimeout(checkMarks, 1200); return r; };
})();
