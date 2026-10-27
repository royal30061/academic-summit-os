/* Academic Summit - chartfix.js: trajectory caption + fade the ? button while scrolling */
(function () {
'use strict';
function txt(n) { return ((n && n.textContent) || '').replace(/\s+/g, ' ').trim(); }
function caption() {
  var m = document.getElementById('main');
  if (!m || m.querySelector('[data-cf-cap]')) return;
  var h = Array.from(m.querySelectorAll('div,h1,h2,h3,span,p')).filter(function (n) {
    return n.children.length === 0 && txt(n) === 'GPA Trajectory';
  })[0];
  if (!h) return;
  var row = h, mw = m.getBoundingClientRect().width;
  while (row.parentNode && row.parentNode !== m && row.getBoundingClientRect().width < mw - 40) row = row.parentNode;
  var p = document.createElement('p');
  p.setAttribute('data-cf-cap', '1');
  p.style.cssText = 'font-size:12px;line-height:1.45;color:var(--mut);margin:6px 2px 12px';
  p.textContent = 'Each step is one course, and the number on it is what that course added to your GPA. The further right the line ends, the higher your GPA. The dashed line is the all-A path. A dot\u2019s color shows its grade.';
  row.parentNode.insertBefore(p, row.nextSibling);
}
var t2 = null;
new MutationObserver(function () {
  clearTimeout(t2);
  t2 = setTimeout(function () { try { caption(); } catch (e) { console.error('chartfix', e); } }, 150);
}).observe(document.body, { childList: true, subtree: true });

var tmr = 0, btn = null;
function findBtn() {
  if (btn && document.body.contains(btn)) return btn;
  btn = Array.from(document.querySelectorAll('button,div,a')).filter(function (n) {
    return txt(n) === '?' && getComputedStyle(n).position === 'fixed';
  })[0] || null;
  return btn;
}
document.addEventListener('scroll', function () {
  try {
    var b = findBtn(); if (!b) return;
    b.style.transition = 'opacity .2s'; b.style.opacity = '0.15'; b.style.pointerEvents = 'none';
    clearTimeout(tmr);
    tmr = setTimeout(function () { b.style.opacity = ''; b.style.pointerEvents = ''; }, 700);
  } catch (e) {}
}, true);
})();
