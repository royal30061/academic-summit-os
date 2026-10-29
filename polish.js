/* Academic Summit - polish.js: badge detail sheets with Zuma, calendar text-select guard,
   padding fix for the Study engine card. Isolated: one click listener, one observer, every step guarded. */
(function () {
'use strict';
var W = window;
function txt(n) { return ((n && n.textContent) || '').replace(/\s+/g, ' ').trim(); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function up(t, test, max) {
  for (var n = t, i = 0; n && n !== document.body && i < (max || 6); n = n.parentNode, i++) if (test(n)) return n;
  return null;
}
function leafWith(text) {
  return Array.from(document.querySelectorAll('div,span,p,h1,h2,h3,b')).filter(function (n) { return n.children.length === 0 && txt(n) === text; })[0] || null;
}
var css = document.createElement('style');
css.textContent =
  '@keyframes asDance{0%,100%{transform:translateY(0) rotate(0)}25%{transform:translateY(-16px) rotate(-9deg)}50%{transform:translateY(0) rotate(0)}75%{transform:translateY(-16px) rotate(9deg)}}' +
  '@keyframes asFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}' +
  '@keyframes asFall{0%{transform:translateY(-10px) rotate(0);opacity:1}100%{transform:translateY(240px) rotate(540deg);opacity:0}}' +
  '.as-dance{animation:asDance 1.1s ease-in-out infinite}.as-float{animation:asFloat 3s ease-in-out infinite}' +
  '.as-conf{position:absolute;top:0;width:8px;height:12px;border-radius:2px;animation:asFall 1.9s ease-out forwards}' +
  'body.as-nosel,body.as-nosel *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}' +
  '@media (prefers-reduced-motion:reduce){.as-dance,.as-float,.as-conf{animation:none}}';
document.head.appendChild(css);

/* ---- Summit Marks: tap a badge ---- */
function isEarned(el) {
  try { var m = getComputedStyle(el).color.match(/\d+/g) || []; return (+m[0] - +m[2]) > 60 && +m[0] > 120; } catch (e) { return false; }
}
function confetti() {
  var cols = ['#10b981', '#06b6d4', '#f59e0b', '#ef4444', '#8b5cf6'], out = '';
  for (var i = 0; i < 16; i++) {
    out += '<i class="as-conf" style="left:' + (4 + Math.random() * 92).toFixed(0) + '%;background:' + cols[i % cols.length] +
      ';animation-delay:' + (Math.random() * 0.5).toFixed(2) + 's"></i>';
  }
  return out;
}
function badgeSheet(title, desc, earned) {
  var sh = document.getElementById('sheet'); if (!sh || sh.innerHTML.trim()) return;
  var zuma = W.zumaImg ? W.zumaImg(earned ? 'cheer' : 'notice', 116) : '';
  sh.innerHTML = '<div class="fixed inset-0" style="background:rgba(2,6,23,.45);z-index:9989" onclick="closeSheet()"></div>' +
    '<div class="fixed inset-x-0 bottom-0" style="z-index:9990;background:var(--card);border-top:1px solid var(--bd);border-radius:28px 28px 0 0;overflow:hidden">' +
    '<div style="position:relative;pointer-events:none;height:0">' + (earned ? confetti() : '') + '</div>' +
    '<div style="padding:24px 24px calc(env(safe-area-inset-bottom,0px) + 18px);text-align:center">' +
    '<div class="' + (earned ? 'as-dance' : 'as-float') + '" style="display:inline-block">' + zuma + '</div>' +
    '<div style="font-weight:800;font-size:22px;margin-top:8px">' + esc(title) + '</div>' +
    '<div style="display:inline-block;margin:8px 0;padding:3px 12px;border-radius:999px;font-size:11px;font-weight:800;' +
    (earned ? 'background:#d1fae5;color:#047857' : 'background:rgba(100,116,139,.15);color:#64748b') + '">' + (earned ? 'Earned' : 'Not yet') + '</div>' +
    '<p style="font-size:14px;margin:4px 0 16px;color:var(--mut)">' + (earned ? 'You did this: ' : 'How to earn it: ') + esc(desc || title) +
    (earned ? '. Zuma is dancing for you.' : '. Zuma is waiting at the trailhead.') + '</p>' +
    '<button class="btn w-full" onclick="closeSheet()">' + (earned ? 'Nice' : 'Got it') + '</button></div></div>';
}
document.addEventListener('click', function (e) {
  try {
    var tile = up(e.target, function (n) {
      var p = n.parentNode; if (!p || p === document.body || p.children.length < 4) return false;
      if (String(getComputedStyle(p).display).indexOf('grid') < 0) return false;
      return !!up(p, function (x) { return /^Summit Marks/.test(txt(x)); }, 3);
    }, 5);
    if (!tile) return;
    var leaves = Array.from(tile.querySelectorAll('*')).filter(function (n) { return !n.children.length && txt(n); });
    var tEl = leaves[0] || tile;
    badgeSheet(txt(tEl), leaves[1] ? txt(leaves[1]) : '', isEarned(tEl));
  } catch (err) { console.error('badge tap', err); }
});

/* ---- calendar: stop the day numbers being selected (the Google pop-up) ---- */
function syncNoSel() { document.body.classList.toggle('as-nosel', !!leafWith('Reading calendar')); }

/* ---- Study engine / Your data card: missing inner padding ---- */
function pad(label) {
  var h = leafWith(label); if (!h) return;
  var card = up(h, function (n) { return parseFloat(getComputedStyle(n).borderTopLeftRadius) >= 16; }, 4);
  if (!card || card.dataset.asPad) return;
  if (parseFloat(getComputedStyle(card).paddingLeft) < 8) card.style.padding = '18px';
  card.dataset.asPad = '1';
}
var tm = null;
new MutationObserver(function () {
  clearTimeout(tm);
  tm = setTimeout(function () {
    try { syncNoSel(); pad('Study engine'); pad('Your data'); } catch (e) { console.error('polish', e); }
  }, 150);
}).observe(document.body, { childList: true, subtree: true });
})();
