/* Academic Summit - lecconsole.js v3
   v3: plain-language wording ("Nearby check-in" instead of "Bluetooth with the code") on both the lecturer and student screens.
   Earlier: v2 field guard; v1 switch, range picker hidden, student button always shown.
   (history below is from v2)
   v2: keeps course codes out of boxes that are not course boxes (Level, Topic, matric, notes). Something was writing the lecturer's
   course code into every empty box. Anything the lecturer types themselves is never touched.
   (1) Lecturer console: a visible "Bluetooth with the code" switch beside Generate Code. Bluetooth runs ALONGSIDE the 5-digit code
       (never instead of it). On the website, or in an app build without the Bluetooth plugin, the switch is shown but disabled with a
       plain explanation.
   (2) Lecturer console: the class-range (geofence) picker is hidden so the console stays tidy. The server-side range rule and its
       admin switch are NOT changed; the lecturer's stored/default range is simply no longer shown.
   (3) Student Attend screen: "Mark by Bluetooth" is always shown; outside the Android app it explains where it works.
   Nothing here changes how marks are saved. */
(function () {
'use strict';
var W = window;
if (W.__asLecConsole) return; W.__asLecConsole = '3';

var KEY = 'as_lec_ble';
function toast(m, t) { try { showToast(m, t); } catch (e) {} }
function lsg(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lss(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function native() { try { return !!(W.Capacitor && W.Capacitor.isNativePlatform && W.Capacitor.isNativePlatform()); } catch (e) { return false; } }
function bleReady() { try { return !!(W.ASBle && W.ASBle.available && W.ASBle.available()); } catch (e) { return false; } }
function wanted() { return lsg(KEY) !== '0'; }            // on by default whenever Bluetooth is available

/* ---------- styles ---------- */
(function () {
  if (document.getElementById('lb-css')) return;
  var st = document.createElement('style'); st.id = 'lb-css';
  st.textContent = [
    '#att-rad-box{display:none!important}',
    '.lb-row{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:1.1rem;border:1px solid var(--bd);background:var(--sub);text-align:left}',
    '.lb-chip{width:38px;height:38px;border-radius:.85rem;display:flex;align-items:center;justify-content:center;flex:none;color:#059669;background:linear-gradient(135deg,rgba(16,185,129,.16),rgba(6,182,212,.12));border:1px solid rgba(16,185,129,.28)}',
    'html.dark .lb-chip{color:#34d399}',
    '.lb-t{font-weight:800;font-size:.9rem;color:var(--tx);line-height:1.2}',
    '.lb-s{font-size:.74rem;line-height:1.4;color:var(--mut);margin-top:2px}',
    '.lb-sw{position:relative;width:46px;height:28px;border-radius:99px;flex:none;border:0;background:rgba(120,140,150,.35);transition:background .18s ease;-webkit-tap-highlight-color:transparent}',
    '.lb-sw:after{content:"";position:absolute;top:3px;left:3px;width:22px;height:22px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.35);transition:transform .18s ease}',
    '.lb-sw[aria-checked="true"]{background:linear-gradient(135deg,#059669,#10b981 55%,#06b6d4)}',
    '.lb-sw[aria-checked="true"]:after{transform:translateX(18px)}',
    '.lb-sw:disabled{opacity:.45}',
    '@media (prefers-reduced-motion:reduce){.lb-sw,.lb-sw:after{transition:none}}'
  ].join('\n');
  document.head.appendChild(st);
})();

var BT = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 7l10 10-5 5V2l5 5L7 17"/></svg>';

/* ---------- (1) lecturer: Bluetooth switch beside the code button ---------- */
function state() {
  if (!native()) return { ok: false, on: false, msg: 'Nearby check-in works in the Android app. The 5-digit code works everywhere.' };
  if (!bleReady()) return { ok: false, on: false, msg: 'Update the Android app to use nearby check-in. The 5-digit code still works.' };
  var on = wanted();
  return { ok: true, on: on, msg: on ? 'Students close to you can check in on their phones without typing the code. The 5-digit code still works.' : 'Students use the 5-digit code only.' };
}
function ctlHtml() {
  var s = state();
  return '<div class="lb-chip">' + BT + '</div><div class="flex-1 min-w-0" style="flex:1;min-width:0"><div class="lb-t">Nearby check-in</div><div class="lb-s" id="lb-msg">' + s.msg + '</div></div>' +
    '<button type="button" class="lb-sw" id="lb-sw" role="switch" aria-label="Nearby check-in" aria-checked="' + (s.on ? 'true' : 'false') + '"' + (s.ok ? '' : ' disabled') + ' onclick="lbToggle()"></button>';
}
function inject() {
  try {
    var btn = document.querySelector('button[onclick="startAttendanceSession()"]'); if (!btn || !btn.parentNode) return;
    var ex = document.getElementById('as-ble-ctl');
    if (ex) { if (ex.nextSibling !== btn) btn.parentNode.insertBefore(ex, btn); return; }
    var d = document.createElement('div'); d.id = 'as-ble-ctl'; d.className = 'lb-row'; d.innerHTML = ctlHtml();
    btn.parentNode.insertBefore(d, btn);
  } catch (e) {}
}
function refresh() { var d = document.getElementById('as-ble-ctl'); if (d) d.innerHTML = ctlHtml(); }
function liveId() { try { var s = typeof liveGet === 'function' ? liveGet() : null; return s && s.id && isFinite(s.end) && Date.now() < s.end + 120000 ? s.id : null; } catch (e) { return null; } }
W.lbToggle = function () {
  var s = state(); if (!s.ok) return toast(s.msg);
  var next = !s.on; lss(KEY, next ? '1' : '0'); refresh();
  try {
    if (!next) { W.ASBle.lecturerStop(); toast('Nearby check-in is off. Students use the code.'); }
    else { var id = liveId(); if (id) { W.ASBle.lecturerStart(id); toast('Nearby check-in is on for this class.'); } else toast('Nearby check-in will start with your next code.'); }
  } catch (e) {}
};
/* the class-start hook in index.html calls ASBle.lecturerStart(): honour the switch there */
(function () {
  var A = W.ASBle; if (!A || A.__lb) return; var o = A.lecturerStart; if (typeof o !== 'function') return;
  A.lecturerStart = function (id) { if (!wanted()) return Promise.resolve(false); return o.call(A, id); };
  W.ASBleLecturerStart = A.lecturerStart; A.__lb = 1;
})();

/* ---------- (3) student: Mark by Bluetooth is always visible ---------- */
(function () {
  var base = (typeof V !== 'undefined') ? V.att : null; if (typeof base !== 'function') return;
  V.att = function () {
    var h = base.apply(this, arguments);
    if (typeof h !== 'string' || h.indexOf('as-alt-methods') < 0) return h;
    if (h.indexOf('asBleMark(this)') > -1) return h.replace(/Mark by Bluetooth/g, 'Check in nearby').replace(/\(stand near the lecturer\)/g, '(stand near your lecturer)');
    var ok = native() && bleReady();
    var b = '<button class="btn2 w-full" onclick="asBleMark(this)">Check in nearby' + (ok ? ' (stand near your lecturer)' : ' (Android app)') + '</button>';
    return h.replace(/(go\('qrs'\)">[^<]*<\/button>)/, '$1' + b);
  };
  var ob = W.asBleMark;
  W.asBleMark = function (btn) {
    if (!(native() && bleReady())) return toast('Nearby check-in works in the Android app. Use the 5-digit code or scan the QR here.');
    if (typeof ob === 'function') return ob.apply(this, arguments);
  };
})();


/* ---------- (4) keep course codes out of fields that are not course fields ---------- */
var CODE = /^[A-Za-z]{3}\s?\d{3}$/, hits = new WeakMap();
function isLec() { try { return U && U.role === 'lecturer'; } catch (e) { return false; } }
function courseField(el) {
  if (el.tagName === 'SELECT') return true;
  var k = [el.id, el.name, el.getAttribute('data-rg'), el.getAttribute('placeholder'), el.getAttribute('aria-label')].join(' ');
  return /course|code/i.test(k);
}
function sanitize() {
  if (!isLec()) return;
  var els = document.querySelectorAll('input,textarea');
  for (var i = 0; i < els.length; i++) {
    var el = els[i], ty = (el.type || 'text').toLowerCase();
    if (ty !== 'text' && ty !== 'search' && ty !== '' && ty !== 'textarea') continue;
    if (el.getAttribute('data-usr') === '1' || courseField(el)) continue;
    var v = String(el.value || '').trim();
    if (!v || !CODE.test(v)) continue;
    var n = hits.get(el) || 0; if (n >= 6) continue;           // something keeps re-filling it: stop fighting after 6 clears
    hits.set(el, n + 1); el.value = '';
  }
}
document.addEventListener('input', function (e) { try { if (e.isTrusted && e.target && e.target.setAttribute) e.target.setAttribute('data-usr', '1'); } catch (x) {} }, true);
document.addEventListener('focusin', function () { try { sanitize(); } catch (e) {} }, true);
setInterval(function () { try { sanitize(); } catch (e) {} }, 1500);

/* ---------- keep the console control in place as screens redraw ---------- */
var q = 0;
try { new MutationObserver(function () { if (q) return; q = setTimeout(function () { q = 0; inject(); try { sanitize(); } catch (e) {} }, 100); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
setTimeout(inject, 400);
W.__asLecConsoleTest = { inject: inject, state: state, sanitize: sanitize };
})();
