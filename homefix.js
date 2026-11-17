/* Academic Summit - homefix.js: runtime touches too quote-dense for sed.
   Tip line under today's cards, play button opens Reading, new door kinds.
   Load AFTER home2.js. */
(function () {
'use strict';
var W = window;
var hg = W.h2go;
W.h2go = function (k) {
  if (k === 'read') { W.go('read'); return; }
  if (k === 'study') { W.go(V.study ? 'study' : 'read'); return; }
  if (k === 'res') { W.go('traj'); return; }
  if (hg) return hg.apply(this, arguments);
  W.go('home');
};
function fix() {
  var m = $('main'); if (!m) return;
  var att = Array.from(m.querySelectorAll('button')).find(function (b) {
    return (b.getAttribute('onclick') || '').indexOf("h2go('att')") > -1;
  });
  if (att && !m.querySelector('[data-tip]') && W.pickTip) {
    var p = document.createElement('p');
    p.setAttribute('data-tip', '1');
    p.className = 'text-xs';
    p.style.cssText = 'color:var(--mut);font-style:italic';
    p.textContent = W.pickTip();
    att.parentNode.insertBefore(p, att);
  }
  var pb = m.querySelector('button[aria-label="Start reading"]');
  if (pb && (pb.getAttribute('onclick') || '').indexOf('read') < 0) pb.setAttribute('onclick', "h2go('read')");
}
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  setTimeout(function () { if (v === 'home') fix(); }, 120);
  return r;
};
})();
