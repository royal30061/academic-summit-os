/* Academic Summit - marks.js v1: single authoritative Summit Marks section.
   Legacy injectors render it twice with dead cards; this sweeps their copies,
   computes every mark from real activity, persists unlocks in U.marks. */
(function () {
'use strict';
var W = window;
if (typeof document === 'undefined') return;
function UU() { return (typeof U !== 'undefined' && U) ? U : null; }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function pad(n) { return (n < 10 ? '0' : '') + n; }
function iso(d) { d = d || new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function saveApp() { try { if (typeof save === 'function') save(); } catch (e) {} }
function toast(m, k) { if (W.showToast) W.showToast(m, k); }
function zuma(p, px) { return W.zumaImg ? W.zumaImg(p, px) : ''; }
function hasLog(u, k) { var v = (u.readLog || {})[k]; return !!(v && (v.length === undefined || v.length > 0)); }
function streakNow(u) {
  try { if (W.streakInfo) { var s = W.streakInfo(); if (s && s.n != null) return s.n; } } catch (e) {}
  var d = new Date(), k = iso(d);
  if (!hasLog(u, k)) d.setDate(d.getDate() - 1);
  var n = 0; for (var i = 0; i < 400; i++) { if (hasLog(u, iso(d))) { n++; d.setDate(d.getDate() - 1); } else break; }
  return n;
}
function todayCodes(u) {
  var idx = (new Date().getDay() + 6) % 7;
  return (u.timetable || []).filter(function (t) { return t.day === idx; }).map(function (t) { return String(t.code || '').replace(/\s+/g, '').toUpperCase(); });
}
var DEF = [
  { id: 'first_import', t: 'First Import', d: 'Save your first semester result', cond: function (u) { return (u.semesters || []).length > 0; }, prog: function (u) { return Math.min(1, (u.semesters || []).length) + ' of 1 semesters saved'; } },
  { id: 'kindling', t: 'Kindling', d: 'Read 3 days in a row', cond: function (u) { return streakNow(u) >= 3; }, prog: function (u) { return Math.min(3, streakNow(u)) + ' of 3 days'; } },
  { id: 'week_flame', t: 'Week Flame', d: 'Read 7 days in a row', cond: function (u) { return streakNow(u) >= 7; }, prog: function (u) { return Math.min(7, streakNow(u)) + ' of 7 days'; } },
  { id: 'cold_save', t: 'Cold Save', d: 'Let a freeze token protect a streak', cond: function (u) { return u.freezeGap != null || u.freezeUsed > 0 || (u.freezes || []).length > 0; }, prog: function (u) { return (u.freezeGap != null || u.freezeUsed > 0 || (u.freezes || []).length > 0) ? 'A freeze protected you' : 'No freeze used yet'; } },
  { id: 'clean_sweep', t: 'Clean Sweep', d: 'Tick every course on a daily list', cond: function (u) { var c = todayCodes(u); return c.length > 0 && c.every(function (k) { return ((u.readLog || {})[iso()] || []).indexOf(k) > -1; }); }, prog: function (u) { var c = todayCodes(u), l = (u.readLog || {})[iso()] || []; if (!c.length) return 'No class list today'; return c.filter(function (k) { return l.indexOf(k) > -1; }).length + ' of ' + c.length + ' courses today'; } },
  { id: 'vault_keeper', t: 'Vault Keeper', d: 'Save your first course file', cond: function (u) { return (u.materials || []).length > 0; }, prog: function (u) { return Math.min(1, (u.materials || []).length) + ' of 1 files'; } },
  { id: 'voice_class', t: 'Voice of the Class', d: 'Be appointed a class rep', cond: function (u) { return !!(u.classRep || (u.profile || {}).classRep) || localStorage.getItem('as_class_rep') === '1'; }, prog: function (u) { return (u.classRep || (u.profile || {}).classRep) ? 'Recorded' : 'Not recorded yet'; } },
  { id: 'explorer', t: 'Explorer', d: 'Open the GPA trajectory', cond: function () { return localStorage.getItem('as_traj_opened') === '1'; }, prog: function () { return localStorage.getItem('as_traj_opened') === '1' ? 'Opened' : 'Not opened yet'; } }
];
function refresh(quiet) {
  var u = UU(); if (!u) return;
  u.marks = u.marks || {}; var got = [];
  DEF.forEach(function (d) { var ok = false; try { ok = d.cond(u); } catch (e) {} if (ok && !u.marks[d.id]) { u.marks[d.id] = { at: iso() }; got.push(d.t); } });
  if (got.length) { saveApp(); if (!quiet) toast('Summit Mark earned: ' + got.join(', ')); }
}
function card() {
  var u = UU(); if (!u) return '';
  refresh(true);
  return '<div class="card p-5 space-y-3" data-marks="1"><div class="font-extrabold">Summit Marks</div><div class="grid grid-cols-2 gap-3">' +
    DEF.map(function (d) {
      var un = !!u.marks[d.id];
      return '<button class="text-left p-4 rounded-2xl space-y-1" style="background:var(--sub);border:1px solid ' + (un ? 'rgba(250,204,21,.4)' : 'var(--bd)') + '" onclick="marksDetail(\'' + d.id + '\')">' +
        '<div class="text-sm font-extrabold" style="color:' + (un ? '#fde047' : 'var(--mut)') + '">' + (un ? '✓ ' : '') + esc(d.t) + '</div>' +
        '<div class="text-[11px]" style="color:var(--mut)">' + esc(d.d) + '</div>' +
        (un ? '<div class="text-[10px] font-bold" style="color:#fde047">Unlocked ' + esc((u.marks[d.id].at || '').slice(0, 10)) + '</div>' : '<div class="text-[10px]" style="color:var(--mut)">Locked</div>') +
        '</button>';
    }).join('') + '</div></div>';
}
W.marksDetail = function (id) {
  var u = UU(); if (!u) return;
  var d = DEF.filter(function (x) { return x.id === id; })[0]; if (!d) return;
  var un = !!u.marks[id];
  var body = '<div class="space-y-3">' + (zuma(un ? 'cheer' : 'notice', 72)) +
    '<div class="font-extrabold text-base" style="color:' + (un ? '#fde047' : 'inherit') + '">' + esc(d.t) + '</div>' +
    '<p class="text-xs" style="color:var(--mut)">' + esc(d.d) + '.</p>' +
    '<div class="p-3 rounded-xl text-xs" style="background:var(--sub)">' + (un ? 'Unlocked on ' + esc(u.marks[id].at || '') + '. Progress: ' + esc(d.prog(u)) : 'Still locked. Progress: ' + esc(d.prog(u))) + '</div>' +
    '<button class="btn w-full" onclick="closeSheet()">Back</button></div>';
  if (typeof fullScreen === 'function') fullScreen('Summit Mark', body);
};
function sweep() {
  var leaves = Array.from(document.querySelectorAll('div,b,h1,h2,h3,h4,span')).filter(function (n) { return n.children.length === 0 && (n.textContent || '').trim() === 'Summit Marks'; });
  leaves.forEach(function (l) {
    var c = l.closest ? l.closest('.card') : null; if (!c) c = l.parentNode && l.parentNode.parentNode;
    if (c && !c.hasAttribute('data-marks') && c.parentNode) c.parentNode.removeChild(c);
  });
}
if (typeof V !== 'undefined' && V.prof) {
  var _profM = V.prof;
  V.prof = function () {
    var h = _profM();
    var u = UU();
    if (u && u.role !== 'lecturer') {
      refresh(true);
      if (h.indexOf('<div class="space-y-5 max-w-2xl mx-auto">') > -1) h = h.replace('<div class="space-y-5 max-w-2xl mx-auto">', '$&' + card());
      else h += card();
    }
    setTimeout(sweep, 120);
    return h;
  };
}
var tm = null;
new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(sweep, 200); }).observe(document.body, { childList: true, subtree: true });
W.__marks = { refresh: refresh, sweep: sweep, DEF: DEF };
})();
