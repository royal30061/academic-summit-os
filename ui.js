/* Academic Summit - ui.js: the Ember Circuit constitution.
   Warm surfaces, one emerald accent, gold reserved for earned moments,
   a faint cyber grid on brand gradients, neon press rings.
   One CSS layer: delete the tag and the old coat returns intact. Load near the end. */
(function () {
'use strict';
var st = document.createElement('style');
st.textContent =
  /* warm surfaces: paper by day, ember charcoal by night */
  ':root{--sub:#f2e9db;--bd:#e4d8c4;--mut:#8a7f6d}' +
  '.dark{--sub:#1e1916;--bd:#2c2420;--mut:#a89b8c}' +
  'body{background:#faf5ee}.dark body{background:#161210}' +
  '.card{background:#fffdf9;border-color:var(--bd)}.dark .card{background:#1e1916}' +
  /* one accent: inherited violet becomes emerald everywhere */
  '.text-violet-600{color:#059669 !important}.dark .text-violet-600{color:#34d399 !important}' +
  '.text-violet-400{color:#34d399 !important}.text-violet-300\\/80{color:#a7f3d0 !important}' +
  '.bg-violet-900\\/40,.hover\\:bg-violet-900\\/40:hover{background:rgba(6,78,59,.28) !important}' +
  '.border-violet-800\\/40{border-color:rgba(6,95,70,.45) !important}' +
  /* readable warmth: 14px body, sentence-case labels */
  'body{font-size:14px}.text-xs{font-size:13px !important;line-height:1.45}' +
  '.text-\\[11px\\]{font-size:12px !important}.text-\\[10px\\]{font-size:11px !important}' +
  '.lbl{text-transform:none !important;letter-spacing:.02em !important;font-weight:700 !important}' +
  /* cyber texture: faint scan-grid on brand gradients only */
  '.grad{position:relative}' +
  '.grad::after{content:"";position:absolute;inset:0;border-radius:inherit;pointer-events:none;' +
  'background:repeating-linear-gradient(0deg,rgba(255,255,255,.06) 0 1px,transparent 1px 7px),' +
  'repeating-linear-gradient(90deg,rgba(255,255,255,.04) 0 1px,transparent 1px 7px)}' +
  /* neon press ring */
  '.btn:active,.btn2:active,.bn:active{box-shadow:0 0 0 3px rgba(52,211,153,.28)}' +
  /* gold is for earned moments only */
  '.mk-gold{color:#b45309}.dark .mk-gold{color:#fcd34d}' +
  /* sparkle burst for unlocks */
  '@keyframes mkPop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}' +
  '.mk-burst{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none;z-index:99998}' +
  '.mk-burst span{font-size:34px;animation:mkPop .9s both}';
document.head.appendChild(st);
})();
