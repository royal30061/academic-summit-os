/* Academic Summit - ui.js: the visual constitution. Load LAST. */
(function () {
'use strict';
var W = window;
var st = document.createElement('style');
st.textContent =
  /* one brand bar: status + header */
  '#top{background:#04271c !important;border-bottom:1px solid rgba(255,255,255,.08)}' +
  '#top .text-slate-500{color:#a7f3d0 !important}#top .text-sm{color:#fff !important}' +
  '#top button{border-color:rgba(255,255,255,.25) !important;background:rgba(255,255,255,.08) !important;color:#fff !important}' +
  /* type scale: readable body, dense tables untouched */
  'body{font-size:14px}.text-xs{font-size:13px !important;line-height:1.45}' +
  '.text-\\[11px\\]{font-size:12px !important}.text-\\[10px\\]{font-size:11px !important}' +
  '.lbl{text-transform:none !important;letter-spacing:.02em !important;font-size:12px !important;font-weight:700}' +
  /* one accent: decorative violet becomes green; rose/amber stay (meaning, not decoration) */
  '.text-violet-600,.text-violet-400{color:#059669 !important}.text-violet-300\\/80{color:#a7f3d0 !important}' +
  '.bg-violet-900\\/40{background:rgba(6,78,59,.35) !important}.border-violet-800\\/40{border-color:rgba(6,95,70,.45) !important}' +
  /* reading-list hero */
  '.hero-read{background:linear-gradient(135deg,#047857,#059669 55%,#0d9488) !important;border:none !important;color:#fff !important}' +
  '.hero-read .text-slate-500{color:rgba(255,255,255,.78) !important}' +
  '.hero-read [style*="background:var(--sub)"]{background:rgba(255,255,255,.14) !important}' +
  '.hero-read .btn2{background:rgba(255,255,255,.18) !important;color:#fff !important}';
document.head.appendChild(st);
function dressHome() {
  var card = Array.from(document.querySelectorAll('.card')).find(function (c) { return /Today's reading list/.test(c.textContent || ''); });
  if (card) card.classList.add('hero-read');
  var att = document.querySelector('button[onclick="go(\'att\')"].grad, .grad[onclick*="att"]');
  if (att) { att.classList.remove('grad'); att.style.background = '#047857'; }
}
function fixNav() {
  var b = $('bnav'); if (!b || b.dataset.ui) return; b.dataset.ui = '1';
  var get = function (n) { return b.querySelector('[data-n="' + n + '"]'); };
  var fab = Array.from(b.children).find(function (el) { return !el.getAttribute('data-n'); });
  var order = [get('home'), get('acad'), fab, get('plan'), get('prof')].filter(Boolean);
  order.forEach(function (el) { b.appendChild(el); });
  var labs = { acad: 'Results', prof: 'Me' };
  Object.keys(labs).forEach(function (n) {
    var el = get(n); if (el) el.innerHTML = el.innerHTML.replace(/(Home|Academics|Results|Planner|Finance|Profile|Me)$/, labs[n]);
  });
}
function fabRule() {
  try {
    var t = +localStorage.getItem('as_first_seen') || Date.now();
    localStorage.setItem('as_first_seen', String(t));
    if (Date.now() - t > 7 * 864e5 || localStorage.getItem('as_fab_used')) {
      Array.from(document.querySelectorAll('button')).forEach(function (x) { if ((x.textContent || '').trim() === '?') x.remove(); });
    }
  } catch (e) {}
}
function profHelp() {
  if (view !== 'prof' || $('ui-help-row')) return;
  var host = $('main'); if (!host) return;
  var d = document.createElement('div');
  d.id = 'ui-help-row'; d.className = 'card p-5 space-y-1 mt-4';
  d.innerHTML = '<div class="font-extrabold text-sm">Show me around</div><p class="text-xs text-slate-500">Restart the guided tips from the beginning.</p>' +
    '<button class="btn2 w-full" onclick="localStorage.removeItem(\'as_coach_known\');localStorage.removeItem(\'as_coach_last\');localStorage.setItem(\'as_fab_used\',\'\');showToast(\'Tips will resume on the home screen\');go(\'home\');">Resume the tips</button>';
  host.appendChild(d);
}
var goB = W.go;
W.go = function (v) { var r = goB.apply(this, arguments); setTimeout(function () { dressHome(); fixNav(); fabRule(); profHelp(); }, 120); return r; };
var stB = W.start;
W.start = function () { var r = stB.apply(this, arguments); setTimeout(function () { dressHome(); fixNav(); fabRule(); }, 200); return r; };
document.addEventListener('click', function (e) {
  var b = e.target && e.target.closest ? e.target.closest('button') : null;
  if (b && (b.textContent || '').trim() === '?') { try { localStorage.setItem('as_fab_used', '1'); } catch (e2) {} }
}, true);
})();
