/* Academic Summit - hub.js: Academics = two rooms.
   Performance & grades | Courses & materials (vault + reading progress).
   Load AFTER academics.js. */
(function () {
'use strict';
var W = window;
var grp = function () { try { return localStorage.getItem('as_hub') || 'perf'; } catch (e) { return 'perf'; } };
W.setHub = function (g) {
  try { localStorage.setItem('as_hub', g); } catch (e) {}
  if (g === 'courses') aTab = 'crs'; else if (aTab === 'crs') aTab = 'calc';
  go('acad');
};
function hidePerfChips(on) {
  var btn = Array.from(document.querySelectorAll('#main button')).find(function (b) {
    return /aTab=/.test(b.getAttribute('onclick') || '') && !($('sub') && $('sub').contains(b));
  });
  if (btn && btn.parentNode) btn.parentNode.style.display = on ? 'none' : '';
}
ACAD.crs = function () {
  var sets = (U.dec && U.dec.length === 2) ? U.dec : [[], []];
  var scored = {}, pending = {};
  (U.semesters || []).forEach(function (s) {
    (s.courses || []).forEach(function (c) { scored[c.code] = c; });
    (s.pending || []).forEach(function (p) { pending[p.code] = p; });
  });
  var total = 0, opened = 0;
  var block = function (half) {
    var list = sets[half] || [];
    if (!list.length) return '';
    var rows = list.map(function (c) {
      total++; var last = (U.reads || {})[c.code]; if (last) opened++;
      var sc = scored[c.code], pd = pending[c.code];
      var right = sc ? '<b style="color:#047857">' + sc.score + ' (' + gr(sc.score)[0] + ')</b>'
        : pd ? '<b style="color:#d97706">awaiting</b>'
        : '<span class="text-slate-400">' + (last ? 'read ' + last : 'not opened') + '</span>';
      return '<div class="flex items-center justify-between gap-2 text-xs p-3 rounded-xl" style="background:var(--sub)">' +
        '<span class="min-w-0"><b class="font-mono">' + esc(c.code) + '</b> <span class="text-slate-500">' + c.unit + 'u ' + (c.st === 'E' ? 'Elective' : 'Compulsory') + '</span></span>' +
        '<span class="flex items-center gap-3 shrink-0">' + right +
        (typeof W.filesOpen === 'function' ? '<button class="font-bold text-emerald-600" onclick="filesOpen(\'' + esc(c.code) + '\')">Files' + (W.fileCount ? W.fileCount(c.code) : '') + '</button>' : '') +
        '</span></div>';
    }).join('');
    return '<div class="space-y-2"><div class="lbl">' + (half ? 'Second' : 'First') + ' semester - ' + list.length + ' courses</div>' + rows + '</div>';
  };
  var pct = total ? Math.round(opened / total * 100) : 0;
  $('sub').innerHTML = '<div class="card p-6 space-y-4">' +
    '<div class="font-extrabold">Course vault & reading progress</div>' +
    '<div class="rounded-2xl p-4 space-y-1" style="background:var(--sub)"><div class="flex justify-between text-xs font-bold"><span>Opened at least once</span><span>' + opened + ' / ' + total + '</span></div>' +
    '<div class="h-2 rounded-full" style="background:var(--bd)"><div class="h-2 rounded-full" style="width:' + pct + '%;background:#10b981"></div></div></div>' +
    block(0) + block(1) +
    (total ? '' : '<p class="text-xs text-slate-500">No registration uploaded yet. Add it from Home to build your vault.</p>') +
    '</div>';
  hidePerfChips(true);
};
var acadBase = V.acad;
V.acad = function () {
  if (grp() === 'courses') aTab = 'crs';
  var h = acadBase.apply(this, arguments);
  var seg = '<div class="grid grid-cols-2 gap-2 mb-4">' +
    '<button class="' + (grp() === 'perf' ? 'btn' : 'btn2') + ' justify-center" onclick="setHub(\'perf\')">Performance & grades</button>' +
    '<button class="' + (grp() === 'courses' ? 'btn' : 'btn2') + ' justify-center" onclick="setHub(\'courses\')">Courses & materials</button></div>';
  return h.replace('<div id="sub"', seg + '<div id="sub"');
};
var calcBase = ACAD.calc;
ACAD.calc = function () { hidePerfChips(false); return calcBase.apply(this, arguments); };
})();
