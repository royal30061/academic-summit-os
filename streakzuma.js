/* Academic Summit - streakzuma.js: Zuma speaks under the streak calendar.
   Reads Current/Best from the calendar screen itself, so it needs no streak data of its own.
   Isolated: one observer, every step guarded. If anything is missing it simply does nothing. */
(function () {
'use strict';
var W = window;
/* swap these names for 'proud', 'flame', 'kind' once those poses are added to zuma-art.js */
var POSE = { record: 'cheer', steady: 'studying', fresh: 'welcome', first: 'welcome', none: 'welcome' };
var LINES = {
  record: ['This is your longest streak yet. Look how far one step at a time got you.',
           'Your best run so far, and it is still growing.',
           'Longest streak so far. Come back tomorrow and it gets longer.'],
  steady: ['One step at a time. {gap} more {days} to beat your best of {best}.',
           'You are {gap} {days} from a new record. Just today\u2019s session.',
           '{gap} more {days} and you pass your best of {best}. Keep going.'],
  fresh:  ['A fresh start. One step at a time, and today already counts.',
           'Your best is {best} days. One session today starts the climb.',
           'Yesterday is behind you. Today is a good day to build again.'],
  first:  ['Day one. Every long streak starts exactly here.',
           'One day down. Come back tomorrow to make it two.'],
  none:   ['No streak running yet. One short session starts it.',
           'Today is a good day to light the first day.']
};
function pick(cur, best, day) {
  var kind = !(cur > 0) ? 'none' : (cur >= 2 && cur >= best) ? 'record' : cur >= 2 ? 'steady' : best > 1 ? 'fresh' : 'first';
  var pool = LINES[kind], gap = Math.max(1, best - cur + 1);
  var text = pool[Math.abs(day || 0) % pool.length].split('{gap}').join(gap).split('{days}').join(gap === 1 ? 'day' : 'days').split('{best}').join(best);
  return { kind: kind, text: text };
}
function txt(n) { return ((n && n.textContent) || '').replace(/\s+/g, ' ').trim(); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function leafWith(text) {
  return Array.from(document.querySelectorAll('div,span,p,h1,h2,h3,b')).filter(function (n) { return n.children.length === 0 && txt(n) === text; })[0] || null;
}
function stat(label) {
  var l = leafWith(label); if (!l || !l.parentNode) return null;
  var m = txt(l.parentNode).match(/(\d+)/);
  return m ? +m[1] : null;
}
function zuma(name) {
  try { var h = W.zumaImg ? W.zumaImg(name, 84) : ''; return h && !/undefined|null/.test(h) ? h : ''; } catch (e) { return ''; }
}
var css = document.createElement('style');
css.textContent = '@keyframes aszBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}.asz-bob{animation:aszBob 3s ease-in-out infinite;flex:none}@media (prefers-reduced-motion:reduce){.asz-bob{animation:none}}';
document.head.appendChild(css);
function mount() {
  if (!leafWith('Reading calendar')) return;
  var cur = stat('Current'), best = stat('Best'); if (cur == null || best == null) return;
  var close = Array.from(document.querySelectorAll('button')).filter(function (b) { return txt(b) === 'Close'; })[0];
  if (!close || !close.parentNode) return;
  var day = Math.floor(Date.now() / 86400000), sig = cur + '/' + best + '/' + day;
  var old = document.querySelector('[data-asz]');
  if (old && old.dataset.asz === sig) return;
  if (old && old.parentNode) old.parentNode.removeChild(old);
  var p = pick(cur, best, day), card = document.createElement('div');
  card.dataset.asz = sig;
  card.style.cssText = 'display:flex;align-items:center;gap:14px;margin:14px 0;padding:14px 16px;border-radius:22px;background:var(--card);border:1px solid var(--bd)';
  card.innerHTML = '<div class="asz-bob">' + zuma(POSE[p.kind]) + '</div><div style="font-weight:700;font-size:15px;line-height:1.4">' + esc(p.text) + '</div>';
  close.parentNode.insertBefore(card, close);
}
W.StreakZuma = { pick: pick };
var tm = null;
new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(function () { try { mount(); } catch (e) { console.error('streakzuma', e); } }, 150); })
  .observe(document.body, { childList: true, subtree: true });
})();
