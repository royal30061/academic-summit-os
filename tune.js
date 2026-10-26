/* Academic Summit - tune.js: runtime tunes, zero anchors.
   Routes h2go kinds, buttons the streak pill, doubles the attendance door,
   seats the target-to-study link on Home and in Target, empties Results for
   freshers, and turns Zuma to face the words. Load LAST. */
(function () {
'use strict';
var W = window;
/* 1. h2go routing that can never dead-end */
var hg = W.h2go;
W.h2go = function (k) {
  var m = {
    study: ['study', 'read', 'home'], read: ['read', 'study', 'home'],
    res: ['traj'], acad: ['study', 'acad', 'home'],
    att: ['att', 'attendance', 'attend', 'home'], plan: ['planner', 'plan', 'home']
  };
  if (m[k]) { for (var i = 0; i < m[k].length; i++) if (V[m[k][i]]) { W.go(m[k][i]); return; } }
  if (hg) return hg.apply(this, arguments);
};
/* 2. Zuma faces the words, whatever zuma.js version lives */
var zi = W.zumaImg;
if (zi) W.zumaImg = function (pose) {
  var h = zi.apply(this, arguments);
  if ((pose === 'point' || pose === 'notice') && h.indexOf('scaleX') < 0) {
    if (h.indexOf('style="') > -1) h = h.replace('style="', 'style="transform:scaleX(-1);');
    else if (h.indexOf("style='") > -1) h = h.replace("style='", "style='transform:scaleX(-1);");
  }
  return h;
};
function targetVal() {
  var c = [U.target, U.targetCGPA, U.dreamCGPA, U.targets];
  for (var i = 0; i < c.length; i++) {
    var t = c[i];
    if (typeof t === 'number' && t >= 1 && t <= 5) return t;
    if (t && typeof t === 'object') {
      var v = t.cgpa || t.target || t.value;
      if (typeof v === 'number') return v;
    }
  }
  return null;
}
function mkBtn(cls, label, fn) {
  var b = document.createElement('button');
  b.type = 'button'; b.className = cls; b.textContent = label;
  b.onclick = fn;
  return b;
}
function tuneHome() {
  var m = $('main'); if (!m) return;
  var pill = Array.from(m.querySelectorAll('div,span')).find(function (n) {
    return /^(day \d+ streak|\d+-day streak|start a streak)$/i.test((n.textContent || '').trim());
  });
  if (pill && !pill.dataset.tuned && W.streakCal) {
    pill.dataset.tuned = '1';
    pill.style.cursor = 'pointer';
    pill.setAttribute('role', 'button');
    pill.addEventListener('click', function () { W.streakCal(); });
  }
  var att = Array.from(m.querySelectorAll('button')).find(function (b) {
    return (b.getAttribute('onclick') || '').indexOf("h2go('att')") > -1;
  });
  if (att && !att.dataset.tuned) {
    att.dataset.tuned = '1';
    att.style.minHeight = '88px';
    att.style.padding = '18px';
    var s = att.querySelector('span');
    if (s) s.style.fontSize = '17px';
  }
  if (!m.querySelector('[data-tgt-strip]') && (m.textContent || '').indexOf('not a figure, a habit') < 0) {
    var grad = m.querySelector('button.grad');
    var host = grad ? grad.parentNode : null;
    if (host) {
      var tv = targetVal();
      var d = document.createElement('div');
      d.setAttribute('data-tgt-strip', '1');
      d.className = 'card flex items-center gap-3';
      d.style.padding = '12px 14px';
      var txt = document.createElement('div');
      txt.className = 'flex-1 text-xs';
      txt.style.color = 'var(--mut)';
      txt.textContent = tv
        ? 'Target ' + tv.toFixed(2) + ' - not a figure, a habit. Today\'s sessions feed it.'
        : 'Set your target - 4.5 is not a figure, it is consistent study.';
      if (W.zumaImg) d.insertAdjacentHTML('beforeend', W.zumaImg('read', 44));
      d.appendChild(txt);
      d.appendChild(mkBtn('btn2 shrink-0', tv ? 'Start' : 'Set target', function () {
        if (tv) W.h2go('study');
        else if (W.rTabSet) W.rTabSet('tgt');
        else W.go('traj');
      }));
      if (grad.nextSibling) host.insertBefore(d, grad.nextSibling);
      else host.appendChild(d);
    }
  }
}
function activeChip(name) {
  var m = $('main'); if (!m) return null;
  return Array.from(m.querySelectorAll('button')).find(function (b) {
    var oc = b.getAttribute('onclick') || '';
    return oc.indexOf("rTabSet('" + name + "')") > -1 && /(^|\s)btn(\s|$)/.test(b.className || '');
  });
}
function tuneResults() {
  var sub = $('sub'); if (!sub) return;
  if (!(U.semesters || []).length && activeChip('graph')) {
    sub.innerHTML = '';
    var card = document.createElement('div');
    card.className = 'card p-6 space-y-3';
    card.innerHTML = '<div class="font-extrabold">No results yet</div>' +
      '<p class="text-xs" style="color:var(--mut)">Your story starts with your first semester. Until then, set your target and let the study plan build toward it.</p>';
    card.appendChild(mkBtn('btn w-full', 'Upload my first result', function () { if (W.rTabSet) W.rTabSet('calc'); }));
    card.appendChild(mkBtn('btn2 w-full', 'Set my target', function () { if (W.rTabSet) W.rTabSet('tgt'); }));
    sub.appendChild(card);
  }
  if (activeChip('tgt') && !sub.querySelector('[data-tgt-door]')) {
    var door = mkBtn('btn w-full mt-3', 'Open today\'s study session', function () { W.h2go('study'); });
    door.setAttribute('data-tgt-door', '1');
    sub.appendChild(door);
  }
}
function cleanHome() {
  var m = $('main'); if (!m) return;
  var grad = m.querySelector('button.grad');
  if (grad) {
    var big = null, small = null;
    Array.prototype.forEach.call(grad.querySelectorAll('div'), function (d2) {
      var st = d2.getAttribute('style') || '';
      if (st.indexOf('22px') > -1) big = d2;
      if (st.indexOf('13px') > -1) small = d2;
    });
    if (big && small && big.textContent.trim() === small.textContent.trim()) small.style.display = 'none';
  }
  var strips = [];
    Array.prototype.forEach.call(m.querySelectorAll('.card, button'), function (n) {
    if ((n.textContent || '').indexOf('not a figure, a habit') > -1 && !n.querySelector('.card')) strips.push(n);
  });
  for (var i = 1; i < strips.length; i++) if (strips[i].parentNode) strips[i].parentNode.removeChild(strips[i]);
}
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  setTimeout(function () {
    if (v === 'home') tuneHome();
    if (v === 'traj') tuneResults();
  }, 160);
  return r;
};
})();
