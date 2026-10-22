/* Academic Summit - tt.js: practical reading timetable (POC).
   Add slots from your courses, tick them as you read, edit or delete anytime.
   Ticks feed the existing streak + reading log without leaving the page.
   Load AFTER home.js. */
(function () {
'use strict';
var W = window;
var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
var localIso = function (d) { var z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };
var gap = function (a, b) { return Math.round((new Date(b) - new Date(a)) / 864e5); };
function data() { U.rtt = U.rtt || { slots: [], done: {} }; U.rtt.slots = U.rtt.slots || []; U.rtt.done = U.rtt.done || {}; return U.rtt; }
function codes() {
  var out = [];
  ((U.dec && U.dec[0]) || []).concat((U.dec && U.dec[1]) || []).forEach(function (c) { if (out.indexOf(c.code) < 0) out.push(c.code); });
  (U.semesters || []).forEach(function (s) { (s.courses || []).forEach(function (c) { if (out.indexOf(c.code) < 0) out.push(c.code); }); });
  return out;
}
var editingId = null;
function formHTML() {
  return '<div class="card p-5 space-y-3" id="rtt-form" style="display:none">' +
    '<div class="font-extrabold text-sm" id="rtt-form-title">Add a reading slot</div>' +
    '<div class="grid grid-cols-2 gap-2">' +
    '<select id="rt-day" class="inp">' + DAYS.map(function (d, i) { return '<option value="' + i + '">' + d + '</option>'; }).join('') + '</select>' +
    '<input id="rt-code" class="inp font-mono uppercase" placeholder="Course code" list="rt-codes">' +
    '<datalist id="rt-codes">' + codes().map(function (c) { return '<option value="' + esc(c) + '">'; }).join('') + '</datalist>' +
    '<input id="rt-start" type="time" class="inp" value="08:00"><input id="rt-end" type="time" class="inp" value="10:00"></div>' +
    '<button class="btn w-full" onclick="rttSave()">Save slot</button>' +
    '<button class="btn2 w-full" onclick="rttCancel()">Cancel</button></div>';
}
W.rttAdd = function () { editingId = null; var f = $('rtt-form'); if (f) { f.style.display = ''; $('rtt-form-title').textContent = 'Add a reading slot'; } };
W.rttEdit = function (id) {
  var s = data().slots.filter(function (x) { return x.id === id; })[0]; if (!s) return;
  editingId = id; var f = $('rtt-form'); if (!f) return;
  f.style.display = ''; $('rtt-form-title').textContent = 'Edit slot';
  $('rt-day').value = s.day; $('rt-code').value = s.code; $('rt-start').value = s.start; $('rt-end').value = s.end;
};
W.rttCancel = function () { editingId = null; var f = $('rtt-form'); if (f) f.style.display = 'none'; };
W.rttSave = function () {
  var day = parseInt(($('rt-day') || {}).value, 10), code = (($('rt-code') || {}).value || '').trim().toUpperCase().replace(/\s+/g, ''),
      start = (($('rt-start') || {}).value || ''), end = (($('rt-end') || {}).value || '');
  if (!code || !start || !end) return showToast('Pick a day, course and times', 'error');
  var d = data();
  if (editingId != null) {
    var s = d.slots.filter(function (x) { return x.id === editingId; })[0];
    if (s) { s.day = day; s.code = code; s.start = start; s.end = end; }
    editingId = null;
  } else d.slots.push({ id: Date.now(), day: day, code: code, start: start, end: end });
  save(); go('rtt'); showToast('Slot saved');
};
W.rttDel = function (id) {
  if (!confirm('Delete this slot?')) return;
  var d = data(); d.slots = d.slots.filter(function (x) { return x.id !== id; });
  save(); go('rtt'); showToast('Slot deleted');
};
W.rttTick = function (id) {
  var d = data(), s = d.slots.filter(function (x) { return x.id === id; })[0]; if (!s) return;
  var t = localIso(new Date());
  d.done[t] = d.done[t] || [];
  if (d.done[t].indexOf(id) > -1) return;
  d.done[t].push(id);
  U.reads = U.reads || {}; U.readLog = U.readLog || {};          // same log the streak reads, without leaving the page
  U.reads[s.code] = t; U.readLog[t] = U.readLog[t] || [];
  if (U.readLog[t].indexOf(s.code) < 0) U.readLog[t].push(s.code);
  var keys = Object.keys(U.readLog).sort(); while (keys.length > 60) delete U.readLog[keys.shift()];
  save(); go('rtt'); showToast(s.code + ' logged for today');
};
function doneToday(id) { var t = localIso(new Date()); return (data().done[t] || []).indexOf(id) > -1; }
V.rtt = function () {
  var d = data(), today = (new Date().getDay() + 6) % 7, t = localIso(new Date()), week = 0;
  Object.keys(d.done).forEach(function (k) { if (gap(k, t) <= 7) week += d.done[k].length; });
  var body = DAYS.map(function (name, i) {
    var slots = d.slots.filter(function (s) { return s.day === i; }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
    if (!slots.length) return '';
    return '<div class="space-y-2"><div class="lbl">' + name + (i === today ? ' - today' : '') + '</div>' + slots.map(function (s) {
      var done = doneToday(s.id);
      return '<div class="flex items-center justify-between gap-2 text-xs p-3 rounded-xl" style="background:var(--sub);' + (i === today ? 'border:1px solid rgba(16,185,129,.4)' : '') + '">' +
        '<span class="min-w-0"><b class="font-mono">' + esc(s.code) + '</b> <span class="text-slate-500">' + s.start + '\u2013' + s.end + '</span></span>' +
        '<span class="flex items-center gap-3 shrink-0">' +
        (done ? '<b style="color:#10b981">Read \u2713</b>' : (i === today ? '<button class="btn2" onclick="rttTick(' + s.id + ')">Tick</button>' : '<span class="text-slate-400">\u2013</span>')) +
        '<button class="font-bold text-emerald-600" onclick="rttEdit(' + s.id + ')">Edit</button>' +
        '<button class="font-bold text-rose-500" onclick="rttDel(' + s.id + ')">x</button></span></div>';
    }).join('') + '</div>';
  }).join('');
  return '<div class="space-y-5">' +
    '<div class="flex items-center gap-3"><button type="button" class="btn2 px-3" onclick="go(\'home\')">' + ic('l') + '</button><div class="font-extrabold text-lg">Reading timetable</div></div>' +
    '<p class="text-xs text-slate-500">Add your reading slots, tick them as you read - ticks count toward your streak. Edit or delete anything anytime: this is your plan, not a prison.</p>' +
    '<div class="rounded-2xl p-4 flex justify-between text-xs font-bold" style="background:var(--sub)"><span>Sessions logged this week</span><span style="color:#047857">' + week + '</span></div>' +
    '<button class="btn w-full" onclick="rttAdd()">+ Add reading slot</button>' + formHTML() +
    (body || '<div class="card p-6 text-xs text-slate-500">No slots yet. Add your first reading slot above.</div>') + '</div>';
};
})();
