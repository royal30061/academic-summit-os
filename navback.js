/* Academic Summit - navback.js: the phone's Back button walks back through screens
   instead of closing the app. Home asks for a second press to exit.
   One sentinel history entry keeps the app open; a logical screen stack does the rest. */
(function () {
'use strict';
var W = window, stack = ['home'], last = 0, backing = false;
function arm() { try { history.pushState({ as: 'sentinel' }, ''); } catch (e) {} }
try { history.replaceState({ as: 'base' }, ''); arm(); } catch (e) {}
/* Chrome may skip history entries a page adds before any tap, so arm once more on the first tap */
document.addEventListener('pointerup', arm, { capture: true, once: true });
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  if (!backing && typeof v === 'string') {
    var i = stack.lastIndexOf(v);
    if (i >= 0) stack = stack.slice(0, i + 1); else stack.push(v);
    if (stack.length > 10) stack = stack.slice(-10);
  }
  return r;
};
window.addEventListener('popstate', function () {
  try {
    var sh = document.getElementById('sheet');
    if (sh && sh.innerHTML.trim()) { if (typeof closeSheet === 'function') closeSheet(); arm(); return; }
    if (stack.length > 1) {
      stack.pop(); arm();
      backing = true;
      try { W.go(stack[stack.length - 1]); } finally { backing = false; }
      return;
    }
    var now = Date.now();
    if (now - last < 2000) { history.back(); return; }
    last = now; arm();
    if (typeof showToast === 'function') showToast('Press back again to exit');
  } catch (err) { console.error('navback', err); }
});
})();
