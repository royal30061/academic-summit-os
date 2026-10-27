/* Academic Summit - timertick.js: keeps the focus clock live, independent of plan.js */
(function () {
'use strict';
var warned = 0;
function pad(n) { return (n < 10 ? '0' : '') + n; }
function fmt(ms) { var s = Math.max(0, Math.ceil(ms / 1000)); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }
function state() { try { return JSON.parse(localStorage.getItem('as_timer') || 'null'); } catch (e) { return null; } }
function tick() {
  try {
    if (typeof view !== 'undefined' && view !== 'timer') return;
    var m = document.getElementById('main'); if (!m) return;
    var t = state(); if (!t || t.phase === 'done' || t.pausedLeft != null || !t.endsAt) return;
    var left = t.endsAt - Date.now();
    var clock = Array.from(m.querySelectorAll('div,span,p,b,text')).filter(function (n) {
      return n.children.length === 0 && /^\d{1,2}:\d{2}$/.test((n.textContent || '').trim());
    })[0];
    if (clock) { var s = fmt(left); if (clock.textContent !== s) clock.textContent = s; }
    var svg = m.querySelector('svg[viewBox="0 0 120 120"]');
    var arc = svg && svg.querySelector('circle[stroke-dasharray], circle[style*="dasharray"]');
    if (arc && t.phaseMs) {
      var C = 2 * Math.PI * (+arc.getAttribute('r') || 0);
      var frac = Math.min(1, Math.max(0, 1 - left / t.phaseMs));
      if (C) { arc.style.strokeDasharray = C + ' ' + C; arc.style.strokeDashoffset = String(C * (1 - frac)); }
    }
    if (left <= 0 && warned !== t.endsAt) { warned = t.endsAt; if (typeof showToast === 'function') showToast('Time is up. Tap End to log it'); }
  } catch (e) { console.error('timertick', e); }
}
setInterval(tick, 500);
document.addEventListener('visibilitychange', tick);
})();
