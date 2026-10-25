/* Academic Summit - results-hub.js: the IA correction, built on the REAL map.
   Academics = study house only (segment removed, Results door added).
   Trajectory = results house: hero + chapter chips hosting the ACAD tools.
   Load LAST (after events.js). Branch: academics-hub. */
(function () {
'use strict';
var W = window;
var rTab = 'graph';
var CHAPTERS = [['graph', 'Trajectory'], ['calc', 'Upload'], ['rec', 'Record'], ['tgt', 'Target'], ['det', 'Detective']];
/* ---- Academics: study only ---- */
var acadB = V.acad;
V.acad = function () { aTab = 'crs'; return acadB.apply(this, arguments); };
function polishAcademics() {
  var main = $('main'); if (!main) return;
  var segBtn = Array.from(main.querySelectorAll('button')).find(function (b) {
    return /aTab='calc';editing=null;go\('acad'\)/.test(b.getAttribute('onclick') || '');
  });
  if (segBtn && segBtn.parentNode && /grid/.test(segBtn.parentNode.className || '')) segBtn.parentNode.remove();
  var sub = $('sub');
  if (sub && !sub.querySelector('[data-results-door]')) {
    var d = document.createElement('button');
    d.type = 'button'; d.setAttribute('data-results-door', '1');
    d.className = 'btn w-full justify-between mb-3';
    d.setAttribute('onclick', "go('traj')");
    d.innerHTML = 'Results & trajectory' + ic('r', 'w-4 h-4');
    sub.insertBefore(d, sub.firstElementChild);
  }
}
/* ---- Trajectory: the results house ---- */
var trajB = V.traj;
V.traj = function () {
  var chips = CHAPTERS.map(function (c) {
    var on = rTab === c[0];
    return '<button type="button" class="' + (on ? 'btn' : 'btn2') + ' px-2 py-1" style="font-size:11px" onclick="rTabSet(\'' + c[0] + '\')">' + c[1] + '</button>';
  }).join('');
  return '<div class="space-y-4">' +
    '<div class="font-extrabold text-2xl">Results & Trajectory</div>' +
    '<div class="flex gap-1 flex-wrap p-1 rounded-2xl" style="background:var(--sub)">' + chips + '</div>' +
    '<div id="sub"></div></div>';
};
W.rTabSet = function (t) { rTab = t; go('traj'); };
function fillResults() {
  var sub = $('sub'); if (!sub) return;
  if (rTab === 'graph') sub.innerHTML = trajB();
  else if (typeof ACAD[rTab] === 'function') ACAD[rTab]();
}
function renameDoor() {
  var b = document.querySelector('#side [data-n="traj"]') ||
          Array.from(document.querySelectorAll('#side button')).find(function (x) { return /go\('traj'\)/.test(x.getAttribute('onclick') || ''); });
  if (b) { var s = b.querySelector('span'); if (s) s.textContent = 'Results'; }
}
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  setTimeout(function () {
    if (v === 'acad') polishAcademics();
    if (v === 'traj') fillResults();
    renameDoor();
  }, 90);
  return r;
};
})();
