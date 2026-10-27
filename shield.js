/* Academic Summit - shield.js v1: the home contract, boot probe, reviews-lock card, data export.
   Load LAST (after hfdelegate.js) so it is the outermost layer. Delete the tag and it is gone.
   The law: Home always paints something tappable, even if every module under it fails. */
(function () {
'use strict';
var W = window;
function iso() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function norm(t) { return String(t || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
function toast(m, k) { if (W.showToast) W.showToast(m, k); }
function has(f) { try { return !!f(); } catch (e) { return false; } }

/* ---------- boot probe: what must exist for the app to be whole ---------- */
var NEED = [
  ['navigation', function () { return typeof W.go === 'function'; }],
  ['home screen', function () { return typeof V !== 'undefined' && typeof V.home === 'function'; }],
  ['study screen', function () { return typeof V !== 'undefined' && typeof V.acad2 === 'function'; }],
  ['study engine', function () { return !!W.StudyCore; }],
  ['Zuma', function () { return typeof W.zumaImg === 'function' && !!W.ZUMA_IMG; }],
  ['your data', function () { return typeof U !== 'undefined' && !!U; }],
  ['saving', function () { return typeof save === 'function'; }],
  ['messages', function () { return typeof W.showToast === 'function'; }],
  ['database', function () { return typeof sb !== 'undefined' && !!sb; }]
];
var health = { ok: [], bad: [] };
function probe() {
  health.ok = []; health.bad = [];
  NEED.forEach(function (n) { (has(n[1]) ? health.ok : health.bad).push(n[0]); });
  (W.AS_NOTES || []).slice(-2).forEach(function (x) { health.bad.push(x); });
  W.AS_HEALTH = health; return health;
}
setTimeout(function () { var h = probe(); if (h.bad.length) { try { console.warn('Academic Summit health: missing ->', h.bad.join(', ')); } catch (e) {} } }, 2500);

/* ---------- the safe shell ---------- */
var DOORS = [['Study', 'Study'], ['Results', 'Results'], ['Attend', 'Attend'], ['Finance', 'Finance']];
function navBtn(label) {
  var bs = document.querySelectorAll('button,a,[role=button]');
  for (var i = 0; i < bs.length; i++) {
    var b = bs[i], r = b.getBoundingClientRect();
    if (norm(b.textContent) === label && r.width > 0 && r.top > (W.innerHeight || 800) * 0.7) return b;
  }
  return null;
}
W.asDoor = function (label) { var b = navBtn(norm(label)); if (b) b.click(); else toast('Use the bottom bar to open ' + label); };
W.asStudy = function () { if (typeof V !== 'undefined' && V.acad2) W.go('acad2'); else toast('Study engine is not loaded', 'error'); };
W.asReviews = function () { W.asStudy(); setTimeout(function () { if (W.as2Reviews) W.as2Reviews(); }, 60); };
function safeHome() {
  var name = ''; try { name = ((U.name || (U.profile && U.profile.name) || '') + '').trim().split(/\s+/)[0]; } catch (e) {}
  var hr = new Date().getHours(), gr = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  return '<div class="space-y-4"><div><div class="text-2xl font-extrabold">' + gr + (name ? ', ' + esc(name) : '') + '</div>' +
    '<div class="text-xs" style="color:var(--mut)">Home is loading in safe mode. Your data is safe.</div></div><div class="grid grid-cols-2 gap-3">' +
    DOORS.map(function (d) { return '<button class="card text-left" onclick="asDoor(\'' + d[1] + '\')"><span class="font-extrabold">' + d[0] + '</span></button>'; }).join('') +
    '<button class="card text-left" onclick="asStudy()"><span class="font-extrabold">Study engine</span></button></div>' +
    '<button class="btn2 w-full" onclick="location.reload()">Reload the app</button></div>';
}
function paintSafe() { var m = document.getElementById('main'); if (m) m.innerHTML = safeHome(); }

/* ---------- reviews lock card: the day stays locked until reviews are done ---------- */
function lockCard() {
  if (!W.StudyCore || typeof U === 'undefined' || !U || !U.study || !U.study.items) return '';
  var due = W.StudyCore.dueNow(U.study.items, iso()); if (!due.length) return '';
  return '<div class="card flex items-center gap-3" style="padding:14px;border:1px solid rgba(16,185,129,.45);margin-bottom:14px">' + (W.zumaImg ? W.zumaImg('point', 72) : '') +
    '<div class="flex-1"><div class="font-extrabold">' + due.length + ' review' + (due.length > 1 ? 's' : '') + ' due first</div>' +
    '<div class="text-xs" style="color:var(--mut)">Today\'s study unlocks when they are done.</div>' +
    '<button class="btn" style="min-height:44px;padding:0 18px;margin-top:8px" onclick="asReviews()">Start reviews</button></div></div>';
}

/* ---------- the contract: V.home never returns nothing ---------- */
if (typeof V !== 'undefined' && typeof V.home === 'function') {
  var inner = V.home;
  V.home = function () {
    var h = null;
    try { h = inner.apply(this, arguments); } catch (e) { try { console.error('home chain failed', e); } catch (_) {} }
    if (typeof h !== 'string' || h.length < 300) h = safeHome();
    try { h = lockCard() + h; } catch (e) {}
    return h;
  };
}
/* a go() that throws or leaves Home blank gets the safe shell */
var g0 = W.go;
if (typeof g0 === 'function') {
  W.go = function (v) {
    var r;
    try { r = g0.apply(this, arguments); } catch (e) { try { console.error('go failed', v, e); } catch (_) {} if (v === 'home' || !v) paintSafe(); }
    setTimeout(function () {
      try {
        if (typeof view !== 'undefined' && view !== 'home') return;
        var m = document.getElementById('main');
        if (m && norm(m.innerText || m.textContent).length < 20) paintSafe();
      } catch (e) {}
    }, 800);
    return r;
  };
}

/* ---------- Profile: study door, data export, health line ---------- */
function profileCard() {
  var hl = probe(), good = !hl.bad.length;
  return '<div class="card space-y-3 mt-5"><div class="font-extrabold">Study engine</div><button class="btn w-full" onclick="asStudy()">Open the Study engine</button>' +
    '<div class="font-extrabold pt-2">Your data</div><button class="btn2 w-full" onclick="asExport()">Download my data</button>' +
    '<div class="text-xs font-extrabold" style="color:' + (good ? '#059669' : '#dc2626') + '">' + (good ? 'System check: all parts loaded' : 'System check: ' + esc(hl.bad.join(', ')) + ' not working') + '</div></div>';
}
if (typeof V !== 'undefined' && typeof V.prof === 'function') {
  var pb = V.prof;
  V.prof = function () { var h = pb.apply(this, arguments); try { h += profileCard(); } catch (e) {} return h; };
}
W.asExport = function () {
  try {
    var mats = {}; try { mats = JSON.parse(localStorage.getItem('as_mat_' + (typeof uid === 'function' ? uid() : (typeof uid !== 'undefined' ? uid : 'me')))) || {}; } catch (e) {}
    var out = { app: 'Academic Summit', schema: 1, exported: new Date().toISOString(), data: JSON.parse(JSON.stringify(U)), studyMaterials: mats };
    var a = document.createElement('a'), url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
    a.href = url; a.download = 'academic-summit-data-' + iso() + '.json'; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 1500);
    toast('Your data file is downloading');
  } catch (e) { toast('Could not export your data', 'error'); }
};
})();
