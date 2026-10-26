/* Academic Summit - hometune.js: the small truths round.
   Target line on home + study, attendance door doubled, streak pill tappable,
   session card navigates, coach Zuma flipped to face his words. Load LAST. */
(function () {
'use strict';
var W = window;
var st = document.createElement('style');
st.textContent =
  '#sheet .items-end > img[draggable="false"]{transform:scaleX(-1)}' +
  "#main button[onclick*=\"h2go('att')\"]{min-height:96px !important;padding:20px 18px !important;font-size:16px !important}" +
  '.h2-pill{cursor:pointer}';
document.head.appendChild(st);
function targetLine() {
  if (!U || U.role !== 'student') return '';
  var tg = U.target != null ? U.target : null;
  return '<button type="button" class="card w-full text-left" style="padding:12px 14px" onclick="if(window.rTabSet)rTabSet(\'tgt\');go(\'traj\')">' +
    '<span class="text-xs font-bold" style="color:#b45309">' +
    (tg ? 'Target CGPA ' + Number(tg).toFixed(2) + ' - not a figure, a habit: your study plan is how it happens.'
        : 'Set your target CGPA - then let the study plan carry you there.') +
    '</span> <span style="color:var(--mut)">\u203a</span></button>';
}
function tune() {
  var m = $('main'); if (!m) return;
  if (view === 'home' && !m.querySelector('[data-tline]')) {
    var grad = m.querySelector('.grad');
    if (grad && grad.parentNode) {
      var d = document.createElement('div');
      d.setAttribute('data-tline', '1'); d.style.marginTop = '8px';
      d.innerHTML = targetLine();
      grad.parentNode.insertBefore(d.firstChild, grad.nextSibling);
    }
  }
  if (view === 'study') {
    var sub = $('sub');
    if (sub && !sub.querySelector('[data-tline]')) {
      var d2 = document.createElement('div');
      d2.setAttribute('data-tline', '1'); d2.style.marginBottom = '8px';
      d2.innerHTML = targetLine();
      sub.insertBefore(d2.firstChild, sub.firstElementChild);
    }
  }
  Array.from(m.querySelectorAll('div,span')).forEach(function (el) {
    if (el.children.length) return;
    var tx = (el.textContent || '').trim();
    if (/^(Day )?\d+-day streak$/.test(tx) && !el.dataset.pill) {
      el.dataset.pill = '1';
      el.classList.add('h2-pill');
      el.setAttribute('role', 'button');
      el.onclick = function () { if (W.streakCal) W.streakCal(); };
    }
  });
  var card = Array.from(m.querySelectorAll('.grad')).find(function (g) {
    return /Today's session|Today's reading/.test(g.textContent || '');
  });
  if (card && !card.getAttribute('onclick')) {
    card.style.cursor = 'pointer';
    card.setAttribute('role', 'button');
    card.onclick = function () { W.go(V.study ? 'study' : 'read'); };
  }
}
function navIcon() {
  var b = document.querySelector('[data-n="traj"].bn') ||
    Array.from(document.querySelectorAll('button')).find(function (x) { return x.getAttribute && x.getAttribute('data-n') === 'traj'; });
  if (!b || b.dataset.iconed) return;
  var svg = b.querySelector('svg');
  if (svg) {
    b.dataset.iconed = '1';
    svg.outerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l5-6 4 3 6-8"/><path d="M14 6h4v4"/></svg>';
  }
}
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  setTimeout(function () { tune(); navIcon(); }, 110);
  return r;
};
var stB = W.start;
W.start = function () {
  var r = stB.apply(this, arguments);
  setTimeout(function () { tune(); navIcon(); }, 400);
  return r;
};
})();
