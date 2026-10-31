/* Academic Summit - homeswitch.js v1: reliable two-way switching between the
   New Home overlay and the Classic Home. Persists in localStorage.as_home_mode,
   mirrored into homehub's legacy keys so the deployed homehub obeys it.
   Never traps the student: Classic always carries a return chip. */
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
  toast(m === 'classic' ? 'Classic Home on - the return chip is always on screen' : 'New Home on');
  if (typeof go === 'function') go('home');
};
/* make the New-Home card's classic button persist the choice */
if (W.hhClassic) { var _hc = W.hhClassic; W.hhClassic = function () { try { localStorage.setItem('as_home_mode', 'classic'); } catch (e) {} syncLegacy('classic'); return _hc(); }; }
/* return chip inside Classic Home */
function chip() {
  if (mode() !== 'classic') return;
  try { if ((typeof view === 'undefined' ? '' : view) !== 'home') return; } catch (e) { return; }
  if (document.getElementById('hh-return')) return;
  var u = UU(); if (!u || u.role === 'lecturer') return;
  var b = document.createElement('button');
  b.id = 'hh-return';
  b.className = 'btn';
  b.style.cssText = 'position:fixed;left:14px;z-index:45;bottom:calc(env(safe-area-inset-bottom,6px) + 84px);padding:.55rem .9rem;font-size:11px;box-shadow:0 8px 20px -8px rgba(16,185,129,.6)';
  b.innerHTML = '\u2728 New Home';
  b.onclick = function () { W.hhSetHomeMode('new'); };
  document.body.appendChild(b);
}
function dropChip() { var b = document.getElementById('hh-return'); if (b && b.parentNode) b.parentNode.removeChild(b); }
/* Profile -> Appearance: home screen preference */
if (typeof V !== 'undefined' && V.prof) {
  var _profH = V.prof;
  V.prof = function () {
    var h = _profH();
    var u = UU();
    if (u && u.role !== 'lecturer') {
      var cur = mode();
      var ctl = '<div class="card p-5 space-y-2"><div class="lbl">Home Screen</div><div class="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40"><span class="text-sm font-semibold">Preferred home screen</span><select class="inp text-xs" style="width:auto" onchange="hhSetHomeMode(this.value)"><option value="new"' + (cur === 'new' ? ' selected' : '') + '>New Home Screen</option><option value="classic"' + (cur === 'classic' ? ' selected' : '') + '>Classic Home Screen</option></select></div><p class="text-[11px] text-slate-500">Both use the same account and records. A return chip always sits on the Classic screen.</p></div>';
      var mk = '<button class="w-full py-3.5 rounded-2xl font-bold text-sm bg-rose-100';
      if (h.indexOf(mk) > -1) h = h.replace(mk, ctl + mk); else h += ctl;
    }
    return h;
  };
}
/* hook renders */
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
