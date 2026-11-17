/* Academic Summit - bridge.js v1: tapping a course (or Today's session) opens the study engine
   when that course has saved study material. Otherwise your existing flow runs exactly as before.
   Load after homeflow.js and acad2.js. Delete the tag to remove it. */
(function () {
'use strict';
var W = window;
function wrap() {
  if (typeof W.courseTap !== 'function' || W.courseTap.__br) return false;
  var orig = W.courseTap;
  var f = function (code) {
    try {
      if (code && W.as2Has && W.as2Has(code) && typeof V !== 'undefined' && V.acad2) {
        W.go('acad2'); setTimeout(function () { W.as2StartCourse(code); }, 60); return;
      }
    } catch (e) { try { console.error('bridge', e); } catch (_) {} }
    return orig.apply(this, arguments);
  };
  f.__br = 1; W.courseTap = f; return true;
}
wrap(); var n = 0, t = setInterval(function () { wrap(); if (++n > 60) clearInterval(t); }, 500);
})();
