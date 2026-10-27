/* Academic Summit - hfdelegate.js: Home taps by delegation, survives re-renders */
(function () {
'use strict';
var W = window;
function txt(n) { return ((n && n.textContent) || '').replace(/\s+/g, ' ').trim(); }
function up(t, test, max) {
  for (var n = t, i = 0; n && n !== document.body && i < (max || 6); n = n.parentNode, i++) if (test(n)) return n;
  return null;
}
function openStreak() {
  var chip = Array.from(document.querySelectorAll('button,div,span,a')).filter(function (el) {
    var r = el.getBoundingClientRect();
    return r.top < 100 && r.left < 170 && r.width > 16 && /^\D{0,3}\s*\d+$/.test(txt(el));
  }).pop();
  if (chip) chip.click(); else showToast('Streak calendar unavailable', 'error');
}
function rowCode(s) { var m = s.match(/[A-Za-z]{3}\s?\d{3}/); return m ? m[0] : null; }
function resolveCode(raw) {
  var key = raw.replace(/\s+/g, '').toUpperCase();
  var cs = W.h2courses ? W.h2courses() : [];
  var hit = cs.filter(function (c) { return String(c.code).replace(/\s+/g, '').toUpperCase() === key; })[0];
  return hit ? hit.code : raw;
}
document.addEventListener('click', function (e) {
  if (typeof view !== 'undefined' && view !== 'home') return;
  var t = e.target, hit = null, n;
  if (up(t, function (x) { return /^Day \d+ streak$/i.test(txt(x)); }, 4)) hit = openStreak;
  if (!hit && up(t, function (x) { return x.getBoundingClientRect().top < 110 && /^[A-Z]{2,3}$/.test(txt(x)); }, 3)) hit = function () { W.go('aprof'); };
  var m = $('main');
  if (!hit && m && m.contains(t)) {
    if (up(t, function (x) { var s = txt(x); return s.length < 40 && /^Good (morning|afternoon|evening),/.test(s); }, 3)) hit = function () { W.go('aprof'); };
    else if ((n = up(t, function (x) { var s = txt(x); return s.length < 220 && !x.querySelector('.grad') && (x.hasAttribute('data-hf-banner') || s.indexOf('not a figure') > -1); }, 4)))
      hit = function () { if (W.hfBannerSheet) W.hfBannerSheet(txt(n).replace(/\s*›\s*$/, '')); };
    else if (up(t, function (x) { return x.classList && x.classList.contains('grad'); }, 6))
      hit = function () { W.courseTap(W.hfNext()); };
    else if ((n = up(t, function (x) { var s = txt(x); return s.length < 60 && rowCode(s) && /(Not read yet|Read)/.test(s); }, 4)))
      hit = function () { W.courseTap(resolveCode(rowCode(txt(n)))); };
  }
  if (hit) { e.preventDefault(); e.stopPropagation(); hit(); }
}, true);
function dedupe() {
  var m = $('main'); if (!m) return;
  var mine = m.querySelector('[data-hf-banner]'); if (!mine) return;
  var c = Array.from(m.querySelectorAll('div,button,p')).filter(function (x) {
    return x !== mine && !x.contains(mine) && !mine.contains(x) && !x.querySelector('.grad') && txt(x).indexOf('not a figure') > -1;
  });
  c.filter(function (x) { return c.indexOf(x.parentNode) < 0; }).forEach(function (x) { x.style.display = 'none'; });
}
var tm = null;
new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(function () { try { dedupe(); } catch (e) {} }, 120); })
  .observe(document.body, { childList: true, subtree: true });
var st = document.createElement('style'); st.textContent = '#main::after{content:"";display:block;height:140px}'; document.head.appendChild(st);
})();
