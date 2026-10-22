/* Academic Summit - delights.js: Summit Marks, streak tiers, decode titles.
   Load LAST. Fails quiet; reduced-motion users get none of the motion. */
(function () {
'use strict';
var W = window;
var reduce = false; try { reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
/* ---------- 1. Summit Marks: exploration pays ---------- */
var MARKS = [
  { id: 'first-import', e: '\u{1F4E5}', n: 'First Import', h: 'Save your first semester result', t: function () { return (U.semesters || []).length >= 1; } },
  { id: 'streak-3', e: '\u2726', n: 'Kindling', h: 'Read 3 days in a row', t: function () { return W.streakInfo && W.streakInfo().n >= 3; } },
  { id: 'streak-7', e: '\u{1F525}', n: 'Week Flame', h: 'Read 7 days in a row', t: function () { return W.streakInfo && W.streakInfo().n >= 7; } },
  { id: 'freeze-used', e: '\u2744', n: 'Cold Save', h: 'Let a freeze token protect a streak', t: function () { return (U.freezeSpent || 0) >= 1; } },
  { id: 'all-read', e: '\u2705', n: 'Clean Sweep', h: 'Tick every course on a daily list', t: function () { var l = U.readLog || {}; return Object.keys(l).some(function (k) { return l[k].length >= 3; }); } },
  { id: 'vault', e: '\u{1F5C2}', n: 'Vault Keeper', h: 'Save your first course file', t: function () { return (U.courseFiles || []).length >= 1; } },
  { id: 'rep', e: '\u{1F4E3}', n: 'Voice of the Class', h: 'Be appointed a class rep', t: function () { return (W._repCourses || []).length >= 1; } },
  { id: 'explorer', e: '\u{1F9ED}', n: 'Explorer', h: 'Open the GPA trajectory', t: function () { try { return !!localStorage.getItem('as_seen_traj'); } catch (e) { return false; } } }
];
function earned() { U.marks = U.marks || {}; return U.marks; }
function burst(e) {
  if (reduce) return;
  var d = document.createElement('div'); d.className = 'mk-burst';
  d.innerHTML = '<span>' + e + '</span><span style="animation-delay:.12s;margin:-26px 0 0 -18px">\u2726</span><span style="animation-delay:.2s;margin:18px 0 0 22px">\u2726</span>';
  document.body.appendChild(d); setTimeout(function () { if (d.parentNode) d.remove(); }, 1200);
}
function checkMarks() {
  if (!U || U.role !== 'student') return;
  var got = earned(), changed = false;
  MARKS.forEach(function (m) {
    if (got[m.id]) return;
    var ok = false; try { ok = m.t(); } catch (e) {}
    if (ok) { got[m.id] = Date.now(); changed = true; setTimeout(function () { showToast('Summit Mark earned: ' + m.n + ' ' + m.e); burst(m.e); }, 300); }
  });
  if (changed) save();
}
/* ---------- 2. streak tiers: the flame evolves ---------- */
function tier(n) { return n >= 30 ? { e: '\u{1F6A9}', n: 'Summit flag' } : n >= 14 ? { e: '\u{1F56F}', n: 'Torch' } : n >= 7 ? { e: '\u{1F525}', n: 'Flame' } : n >= 3 ? { e: '\u2728', n: 'Spark' } : { e: '\u2726', n: 'Kindling' }; }
function tierNum(n) { return n >= 30 ? 4 : n >= 14 ? 3 : n >= 7 ? 2 : n >= 3 ? 1 : 0; }
/* ---------- 3. decode titles: headings settle out of static ---------- */
var GLYPHS = '01<>#/\\|=+*';
function decode(el) {
  if (reduce || !el || el.dataset.dec) return;
  el.dataset.dec = '1';
  var fin = el.textContent, i = 0, steps = fin.length * 2 + 6;
  var t = setInterval(function () {
    i++;
    var solid = Math.floor(i / 2);
    el.textContent = fin.slice(0, solid) + fin.slice(solid).split('').map(function (c) { return c === ' ' ? ' ' : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]; }).join('');
    if (i >= steps) { clearInterval(t); el.textContent = fin; }
  }, 28);
}
/* ---------- wiring ---------- */
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  if (v === 'traj') { try { localStorage.setItem('as_seen_traj', '1'); } catch (e) {} }
  setTimeout(function () {
    checkMarks();
    var h = $('main'); if (!h) return;
    decode(h.querySelector('h1, .font-extrabold.text-lg, .text-lg.font-extrabold'));
  }, 80);
  return r;
};
var homeB = V.home;
V.home = function () {
  var h = homeB.apply(this, arguments);
  try {
    var si = W.streakInfo ? W.streakInfo() : null;
    if (si && si.n > 0) {
      var t = tier(si.n);
      h = h.replace(/(\d+-day streak)/, t.e + ' $1');
      var now = tierNum(si.n), last = +localStorage.getItem('as_stier') || 0;
      if (now > last) { localStorage.setItem('as_stier', String(now)); setTimeout(function () { showToast('Streak evolved: ' + t.n + ' ' + t.e); burst(t.e); }, 600); }
    }
  } catch (e) {}
  return h;
};
var profB = V.prof;
V.prof = function () {
  var h = profB.apply(this, arguments);
  try {
    var got = earned();
    h += '<div class="card p-6 space-y-3 mt-5"><div class="font-extrabold">Summit Marks</div>' +
      '<div class="grid grid-cols-2 gap-2">' + MARKS.map(function (m) {
        var on = !!got[m.id];
        return '<div class="p-3 rounded-xl space-y-1" style="background:var(--sub);' + (on ? '' : 'opacity:.5') + '">' +
          '<div class="text-lg">' + (on ? m.e : '\u{1F512}') + '</div>' +
          '<div class="text-xs font-extrabold ' + (on ? 'mk-gold' : '') + '">' + m.n + '</div>' +
          '<div class="text-[10px] text-slate-500">' + m.h + '</div></div>';
      }).join('') + '</div></div>';
  } catch (e) {}
  return h;
};
var startB = W.start;
W.start = function () { var r = startB.apply(this, arguments); setTimeout(checkMarks, 1200); return r; };
})();
