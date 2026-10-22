/* Academic Summit - splash.js: animated front-loading, Stake-style.
   Letters rise, sparkles twinkle, a shimmer sweeps; fades into the app
   through the existing hideSplash(). Load FIRST, before guard.js.
   prefers-reduced-motion gets no overlay at all. */
(function () {
'use strict';
var W = window;
try { if (matchMedia('(prefers-reduced-motion: reduce)').matches) return; } catch (e) {}
var st = document.createElement('style');
st.textContent =
  '@keyframes asRise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}' +
  '@keyframes asTwinkle{0%,100%{opacity:0;transform:scale(.4) rotate(0)}50%{opacity:1;transform:scale(1) rotate(90deg)}}' +
  '@keyframes asSweep{from{transform:translateX(-110%)}to{transform:translateX(260%)}}' +
  '#as-splash{position:fixed;inset:0;z-index:99999;background:#021812;display:flex;align-items:center;justify-content:center;transition:opacity .45s ease}' +
  '#as-splash.off{opacity:0;pointer-events:none}' +
  '#as-splash .w{display:flex}' +
  '#as-splash .w span{color:#e7fff5;font-weight:800;font-size:26px;opacity:0;animation:asRise .5s both}' +
  '#as-splash .sp{position:absolute;color:#34d399;font-size:14px;animation:asTwinkle 1.6s infinite}' +
  '#as-splash .bar{width:120px;height:2px;background:rgba(231,255,245,.15);overflow:hidden;border-radius:2px}' +
  '#as-splash .bar i{display:block;width:40%;height:100%;background:#34d399;animation:asSweep 1.1s infinite}' +
  '#auth .min-h-screen > div > *,#auth .card > *{animation:asRise .55s both}' +
  '#auth .min-h-screen > div > *:nth-child(2),#auth .card > *:nth-child(2){animation-delay:.08s}' +
  '#auth .min-h-screen > div > *:nth-child(3),#auth .card > *:nth-child(3){animation-delay:.16s}' +
  '#auth .min-h-screen > div > *:nth-child(4),#auth .card > *:nth-child(4){animation-delay:.24s}';
document.head.appendChild(st);
var word = 'Academic Summit';
var d = document.createElement('div');
d.id = 'as-splash';
d.innerHTML = '<div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:14px">' +
  '<span class="sp" style="top:-18px;right:-26px">\u2726</span><span class="sp" style="bottom:-14px;left:-30px;animation-delay:.7s">\u2726</span>' +
  '<div class="w">' + word.split('').map(function (ch, i) { return '<span style="animation-delay:' + (i * 45) + 'ms">' + (ch === ' ' ? '&nbsp;' : ch) + '</span>'; }).join('') + '</div>' +
  '<div class="bar"><i></i></div>' +
  '<div style="color:#a7f3d0;font-size:11px;font-weight:700;letter-spacing:2px;opacity:0;animation:asRise .5s .9s both">HIGHER GOALS, BIGGER FUTURE</div></div>';
if (document.body) document.body.appendChild(d); else document.addEventListener('DOMContentLoaded', function () { document.body.appendChild(d); });
var born = Date.now(), gone = false;
function off() {
  if (gone) return; gone = true;
  var wait = Math.max(0, 900 - (Date.now() - born));
  setTimeout(function () { d.classList.add('off'); setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 500); }, wait);
}
var iv = setInterval(function () {
  if (typeof W.hideSplash === 'function') {
    clearInterval(iv);
    var hb = W.hideSplash;
    W.hideSplash = function () { off(); return hb.apply(this, arguments); };
  }
}, 150);
setTimeout(function () { clearInterval(iv); off(); }, 4000);   // never trap a user behind the curtain
})();
