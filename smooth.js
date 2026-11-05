/* Academic Summit - smooth.js v1
   Several scripts touch a screen again 100-300 ms after it is drawn (extra cards inserted, rows hidden,
   text rewritten). Each touch was painted as its own frame, which is the "shaking robot arm" feel.
   Fix: when you move to a different screen, hold the new screen invisible until it has stopped
   changing (about 100-200 ms, never more than 380 ms), then fade it in once. Same content, one calm frame.
   Re-draws of the screen you are already on (timers, counters) are NOT held, so nothing blinks.
   Load LAST, after announce.js. Nothing else is changed. */
(function () {
'use strict';
var W = window;
if (W.__smooth) return; W.__smooth = true;
var reduce = false; try { reduce = W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
var st = document.createElement('style');
st.textContent =
  '.d-calm #main .card{animation:none!important}' +          /* cards used to rise in one by one, on top of the late edits */
  '#main.sm-hide{opacity:0!important;transition:none!important}' +
  '#main.sm-show{transition:opacity .2s ease-out}';
document.head.appendChild(st);

var obs = null, quiet = 0, cap = 0, fade = 0;
function stop() { clearTimeout(quiet); clearTimeout(cap); if (obs) { try { obs.disconnect(); } catch (e) {} obs = null; } }
function reveal() {
  stop();
  var m = document.getElementById('main'); if (!m) return;
  m.classList.remove('sm-hide');
  if (!reduce) { m.classList.add('sm-show'); clearTimeout(fade); fade = setTimeout(function () { m.classList.remove('sm-show'); }, 260); }
}
function hold() {
  var m = document.getElementById('main'); if (!m) return;
  stop(); m.classList.remove('sm-show'); m.classList.add('sm-hide');
  try {
    obs = new MutationObserver(function () { clearTimeout(quiet); quiet = setTimeout(reveal, 90); });
    obs.observe(m, { childList: true, subtree: true, attributes: true, characterData: true });
  } catch (e) {}
  quiet = setTimeout(reveal, 130);
  cap = setTimeout(reveal, 380);                              /* hard limit: the screen can never stay hidden */
}
var goB = W.go;
W.go = function (v) {
  var changed = (typeof view === 'undefined') || v !== view;
  if (changed && !document.hidden) hold();
  try { return goB.apply(this, arguments); }
  catch (e) { reveal(); throw e; }
};
})();
