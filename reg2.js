/* Academic Summit - reg2.js: registration tied to the current semester.
   No registration -> empty state, never a stale timetable. Saving archives
   the old semester's list so it can never resurface. Re-edit anytime. */
(function () {
'use strict';
var W = window;
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function semGuess() {
  var d = new Date(), y = d.getFullYear(), m = d.getMonth() + 1;
  var yr = m >= 8 ? y + '/' + (y + 1) : (y - 1) + '/' + y;
  return yr + ' ' + (m >= 8 || m <= 1 ? 'First' : 'Second') + ' Semester';
}
function row(c) {
  return '<div class="card p-3 grid grid-cols-12 gap-2">' +
    '<input class="inp col-span-5" data-rg="code" value="' + esc(c.code || '') + '" placeholder="POS 204">' +
    '<input class="inp col-span-3" data-rg="unit" value="' + esc(c.units || c.unit || '') + '" placeholder="Units">' +
    '<input class="inp col-span-4" data-rg="title" value="' + esc(c.title || '') + '" placeholder="Title"></div>';
}
V.reg = function () {
  var cur = (U.dec && U.dec[0]) || [];
  return '<div class="space-y-4"><div class="font-extrabold text-2xl">Course registration</div>' +
    '<input id="rg-sem" class="inp" value="' + esc(U.regSem || semGuess()) + '">' +
    '<div id="rg-rows" class="space-y-2">' + cur.map(row).join('') + '</div>' +
    '<div class="flex gap-2"><button class="btn2 flex-1" onclick="rgAdd()">Add course</button>' +
    '<button class="btn flex-1" onclick="rgSave()">Save & build timetable</button></div>' +
    '<p class="text-[11px]" style="color:var(--mut)">Saving archives the previous semester\'s list, so an old timetable can never reappear.</p></div>';
};
W.rgAdd = function () { var box = $('rg-rows'); if (box) box.insertAdjacentHTML('beforeend', row({})); };
W.rgSave = function () {
  var rows = Array.from((($('rg-rows') || {}).children) || []);
  var cs = [];
  rows.forEach(function (r) {
    var code = (((r.querySelector('[data-rg="code"]') || {}).value) || '').trim().toUpperCase();
    if (!code) return;
    cs.push({ code: code, units: (+(((r.querySelector('[data-rg="unit"]') || {}).value) || 2)) || 2, title: (((r.querySelector('[data-rg="title"]') || {}).value) || '').trim() });
  });
  if (!cs.length) return showToast('Add at least one course', 'error');
  U.regArchive = U.regArchive || [];
  if (U.dec && U.dec[0] && U.dec[0].length) U.regArchive.push({ sem: U.regSem || semGuess(), courses: U.dec[0], archivedOn: new Date().toISOString() });
  U.regSem = (($('rg-sem') || {}).value) || semGuess();
  U.dec = [cs, []];
  U.readPlan = { order: [], days: {} };
  save();
  showToast('Registration saved - timetable rebuilt');
  W.go('read');
};
var readB = V.read;
V.read = function () {
  var has = (U.dec && U.dec[0] && U.dec[0].length) || (U.readPlan && U.readPlan.order.length);
  if (!has) {
    return '<div class="space-y-4"><div class="font-extrabold text-2xl">Reading</div>' +
      '<div class="card p-6 space-y-3 text-center">' + (W.zumaImg ? W.zumaImg('welcome', 90) : '') +
      '<div class="font-extrabold">No registration for this semester</div>' +
      '<p class="text-xs" style="color:var(--mut)">Add this semester\'s courses and units - your reading timetable is built from them, fresh.</p>' +
      '<button class="btn w-full" onclick="go(\'reg\')">Enter course registration</button></div></div>';
  }
  var h = readB.apply(this, arguments);
  return h + '<button class="btn2 w-full justify-between mt-3" onclick="go(\'reg\')">Edit registration' + (U.regSem ? ' (' + esc(U.regSem) + ')' : '') + ' ›</button>';
};
})();
