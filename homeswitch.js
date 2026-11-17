/* Academic Summit - homeswitch.js v2: dashboard style preference.
   Persists in localStorage.as_home_mode, mirrored into homehub's legacy keys.
   Classic always carries a return control; the setting lives in Profile > Appearance. */
(function () {
'use strict';
var W = window;
if (typeof document === 'undefined') return;
function UU() { return (typeof U !== 'undefined' && U) ? U : null; }
function toast(m, k) { if (W.showToast) W.showToast(m, k); }
function mode() {
  try {
    var m = localStorage.getItem('as_home_mode');
    if (!m) { m = (localStorage.getItem('as_hh_off') === '1' || sessionStorage.getItem('as_hh_classic') === '1') ? 'classic' : 'new'; localStorage.setItem('as_home_mode', m); }
    return m;
  } catch (e) { return 'new'; }
}
function syncLegacy(m) {
  try {
    if (m === 'classic') { localStorage.setItem('as_hh_off', '1'); sessionStorage.removeItem('as_hh_classic'); }
    else { localStorage.removeItem('as_hh_off'); sessionStorage.removeItem('as_hh_classic'); }
  } catch (e) {}
}
W.hhSetHomeMode = function (m) {
  m = m === 'classic' ? 'classic' : 'new';
  try { localStorage.setItem('as_home_mode', m); } catch (e) {}
  syncLegacy(m);
  toast(m === 'classic' ? 'Classic dashboard enabled. You can switch back anytime from Profile \u2192 Appearance.' : 'New dashboard enabled.');
  if (typeof go === 'function') go('home');
};
function chip() {
  if (mode() !== 'classic') return;
  try { if ((typeof view === 'undefined' ? '' : view) !== 'home') return; } catch (e) { return; }
  if (document.getElementById('hh-return')) return;
  var u = UU(); if (!u || u.role === 'lecturer') return;
  var b = document.createElement('button');
  b.id = 'hh-return'; b.className = 'btn';
  b.style.cssText = 'position:fixed;left:14px;z-index:45;bottom:calc(env(safe-area-inset-bottom,6px) + 84px);padding:.55rem .9rem;font-size:11px';
  b.innerHTML = '\u2726 New dashboard';
  b.onclick = function () { W.hhSetHomeMode('new'); };
  document.body.appendChild(b);
}
function dropChip() { var b = document.getElementById('hh-return'); if (b && b.parentNode) b.parentNode.removeChild(b); }
if (typeof V !== 'undefined' && V.prof) {
  var _profH = V.prof;
  V.prof = function () {
    var h = _profH();
    var u = UU();
    if (u && u.role !== 'lecturer' && h.indexOf('data-hhpref') === -1) {
      var cur = mode();
      var ctl = '<div class="card p-5 space-y-2" data-hhpref="1"><div class="lbl">Dashboard style</div><div class="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40"><span class="text-sm font-semibold">Home dashboard</span><select class="inp text-xs" style="width:auto" onchange="hhSetHomeMode(this.value)"><option value="new"' + (cur === 'new' ? ' selected' : '') + '>New dashboard</option><option value="classic"' + (cur === 'classic' ? ' selected' : '') + '>Classic dashboard</option></select></div><p class="text-[11px] text-slate-500">Your records are identical in both. Your choice is remembered on this device.</p></div>';
      var mk = '<button class="w-full py-3.5 rounded-2xl font-bold text-sm bg-rose-100';
      if (h.indexOf(mk) > -1) h = h.replace(mk, ctl + mk); else h += ctl;
    }
    return h;
  };
}
if (typeof go === 'function') {
  var _goHS = go;
  go = function (v) {
    var r = _goHS.apply(this, arguments);
    setTimeout(function () { if (mode() === 'classic') chip(); else dropChip(); }, 200);
    return r;
  };
}
syncLegacy(mode());
setTimeout(chip, 400);
W.__homeswitch = { mode: mode, set: W.hhSetHomeMode };
})();
