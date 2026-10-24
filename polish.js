/* Academic Summit - polish.js
   1. Larger, more readable text across the app
   2. Academics split into [ Courses & Materials ] | [ Performance & Grades ]
   Load order: ... home -> extras -> polish -> reps -> lecturer -> auth          */
(function () {
  'use strict';
  var W = window;

  /* ---------- 1. text size ---------- */
  var css = document.createElement('style');
  css.textContent =
    'body{font-size:15px}' +
    '.text-xs{font-size:.86rem!important;line-height:1.3rem!important}' +
    '.text-sm{font-size:.96rem!important;line-height:1.4rem!important}' +
    '.text-\\[11px\\]{font-size:.8rem!important;line-height:1.15rem!important}' +
    '.text-\\[10px\\]{font-size:.72rem!important}' +
    '.lbl{font-size:.72rem!important}' +
    '.btn,.btn2{font-size:.92rem!important}' +
    '.inp{font-size:1rem!important}';                      // 16px also stops phones zooming in when a field is focused
  document.head.appendChild(css);

  /* ---------- 2. Academics: two sections ---------- */
  var seg = function () {
    var on = aTab === 'crs';
    var b = function (active, label, fn) {
      return '<button type="button" class="' + (active ? 'btn' : 'text-slate-500') + ' justify-center py-2.5 rounded-xl text-sm font-bold" onclick="' + fn + '">' + label + '</button>';
    };
    return '<div class="grid grid-cols-2 gap-1 p-1 rounded-2xl" style="background:var(--sub)">' +
      b(on, 'Courses &amp; Materials', "aTab='crs';editing=null;go('acad')") +
      b(!on, 'Performance &amp; Grades', "aTab='calc';editing=null;go('acad')") + '</div>';
  };
  var acadBase = V.acad;
  V.acad = function () {
    if (U.role !== 'student') return acadBase();
    if (aTab === 'crs') return '<div class="space-y-5">' + seg() + '<div id="sub"></div></div>';
    return acadBase().replace('<div class="space-y-5">', '<div class="space-y-5">' + seg());
  };

  var sets = function () { return (U.dec && U.dec.length === 2) ? U.dec : [[], []]; };
  W.crsHalf = function (h) { U.curHalf = h; U.todayList = null; save(); go('acad'); };
  W.setLecturer = function (code) {
    var meta = U.courseMeta = U.courseMeta || {}, v = prompt('Lecturer for ' + code + ':', (meta[code] || {}).lecturer || '');
    if (v === null) return;
    meta[code] = { lecturer: v.trim() }; save(); go('acad');
  };

  ACAD.crs = function () {
    var S = sets(), h = U.curHalf || 0, courses = (S[h] && S[h].length) ? S[h] : (S[1 - h] || []);
    if (!courses.length) {
      $('sub').innerHTML = '<div class="card p-6 space-y-3"><div class="font-extrabold">No courses yet</div><p class="text-sm text-slate-500">Upload your course registration and your courses, reading progress and files will live here.</p><button class="btn w-full" onclick="regOpen()">Upload course registration</button></div>';
      return;
    }
    var log = U.readLog || {}, today = new Date(), weekRead = {}, i, k, d;
    for (i = 0; i < 7; i++) {                                // courses read in the last 7 days
      d = new Date(today); d.setDate(d.getDate() - i);
      k = new Date(d.getTime() - d.getTimezoneOffset() * 6e4).toISOString().slice(0, 10);
      (log[k] || []).forEach(function (c) { weekRead[c] = 1; });
    }
    var done = courses.filter(function (c) { return weekRead[c.code]; }).length, pct = Math.round(done / courses.length * 100);
    var tabs = (S[0].length && S[1].length)
      ? '<div class="grid grid-cols-2 gap-2">' + [0, 1].map(function (x) { return '<button class="' + (h === x ? 'btn' : 'btn2') + ' justify-center" onclick="crsHalf(' + x + ')">' + (x ? 'Second' : 'First') + ' semester</button>'; }).join('') + '</div>' : '';
    var rows = courses.map(function (c) {
      var days = Object.keys(log).filter(function (dk) { return (log[dk] || []).indexOf(c.code) > -1; }).length;
      var last = (U.reads || {})[c.code], lec = ((U.courseMeta || {})[c.code] || {}).lecturer;
      return '<div class="p-4 rounded-2xl space-y-2" style="background:var(--sub)"><div class="flex justify-between items-start"><div><b class="font-mono text-base">' + esc(c.code) + '</b><div class="text-xs text-slate-500">' + c.unit + ' unit' + (c.unit > 1 ? 's' : '') + ' \u2022 ' + (c.st === 'E' ? 'Elective' : 'Compulsory') + '</div></div>' +
        '<span class="text-xs font-bold ' + (weekRead[c.code] ? '' : 'text-slate-400') + '" style="' + (weekRead[c.code] ? 'color:#10b981' : '') + '">' + (weekRead[c.code] ? 'Read this week' : 'Not read this week') + '</span></div>' +
        '<div class="text-xs text-slate-500">Read on ' + days + ' day' + (days === 1 ? '' : 's') + (last ? ' \u2022 last ' + fmtD(last) : '') + '</div>' +
        '<div class="text-xs text-slate-500">Lecturer: ' + (lec ? esc(lec) : 'not added') + '</div>' +
        '<div class="flex gap-4 pt-1"><button class="text-xs font-bold text-violet-600" onclick="filesOpen(\'' + esc(c.code) + '\')">Files' + (W.fileCount ? W.fileCount(c.code) : '') + '</button><button class="text-xs font-bold text-violet-600" onclick="setLecturer(\'' + esc(c.code) + '\')">' + (lec ? 'Edit lecturer' : 'Add lecturer') + '</button></div></div>';
    }).join('');
    $('sub').innerHTML = '<div class="card p-5 space-y-3"><div class="flex justify-between text-sm font-extrabold"><span>Reading this week</span><span>' + done + ' of ' + courses.length + ' courses</span></div>' +
      '<div class="h-2.5 rounded-full" style="background:var(--sub)"><div class="h-full rounded-full" style="width:' + pct + '%;background:#10b981"></div></div></div>' +
      '<div class="card p-5 space-y-3"><div class="flex justify-between items-center"><div class="font-extrabold">Course vault</div><button class="text-xs font-bold text-violet-600" onclick="regOpen()">Update registration</button></div>' + tabs + '<div class="space-y-3">' + rows + '</div></div>';
  };

  /* students with a registration land on Courses first, once per launch */
  var startBase = W.start, first = true;
  W.start = function () {
    if (first && U && U.role === 'student' && typeof W.hasCourses === 'function' && W.hasCourses()) { aTab = 'crs'; }
    first = false;
    return startBase.apply(this, arguments);
  };
})();
