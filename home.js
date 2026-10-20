/* Academic Summit - home.js
   Course-based home screen:
   - first run: upload course registration (or upload old results, or skip)
   - registered students: today's reading list, courses, classes, attendance, compact CGPA
   - students with results but no registration yet: the current home plus a "waiting" banner
   Load order: core.js -> academics.js -> ocr.js -> home.js -> reps.js -> lecturer.js -> auth.js */
(function () {
  'use strict';
  var W = window;
  var LIST_SIZE = 3;

  /* the old welcome/results walkthroughs would fight the new setup screen */
  W._rwShown = 1;
  try { localStorage.setItem('as_fw_import', '1'); } catch (e) {}

  /* ---------- helpers ---------- */
  var localIso = function (d) { var z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };
  var norm = function (c) { return String(c || '').toUpperCase().replace(/[\s-]/g, ''); };
  var addDay = function (n) { var d = new Date(); d.setDate(d.getDate() + n); return localIso(d); };
  var gapDays = function (a, b) { return Math.round((new Date(b) - new Date(a)) / 864e5); };
  var courseSets = function () { return (U.dec && U.dec.length === 2) ? U.dec : [[], []]; };

  W.hasCourses = function () { return courseSets().some(function (a) { return a && a.length; }); };
  function curCourses() {
    var s = courseSets(), h = U.curHalf || 0;
    return (s[h] && s[h].length) ? s[h] : (s[1 - h] || []);
  }
  var needsSetup = function () { return U.role === 'student' && !hasCourses() && !(U.semesters || []).length && !U.skipSetup; };

  /* ---------- reading log ---------- */
  var readToday = function (code) { var l = (U.readLog || {})[localIso(new Date())]; return !!l && l.indexOf(code) > -1; };
  function streak() {
    var log = U.readLog || {}, d = new Date(), n = 0, has = function () { return (log[localIso(d)] || []).length > 0; };
    if (!has()) d.setDate(d.getDate() - 1);
    while (has()) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  W.readDone = function (code) {
    var t = localIso(new Date());
    U.reads = U.reads || {}; U.readLog = U.readLog || {};
    U.reads[code] = t;
    U.readLog[t] = U.readLog[t] || [];
    if (U.readLog[t].indexOf(code) < 0) U.readLog[t].push(code);
    var keys = Object.keys(U.readLog).sort();                    // keep the log small
    while (keys.length > 60) delete U.readLog[keys.shift()];
    save(); go('home');
  };

  /* ---------- today's reading list ---------- */
  function rank(courses) {
    var t = localIso(new Date()), tt = U.timetable || [], ex = U.exams || [];
    var todayC = {}, tomorrowC = {};
    tt.forEach(function (x) {
      if (x.day === dow(t)) todayC[norm(x.code)] = 1;
      if (x.day === dow(addDay(1))) tomorrowC[norm(x.code)] = 1;
    });
    return courses.map(function (c) {
      var k = norm(c.code), s = (+c.unit || 2) * 2, why = [], last = (U.reads || {})[c.code];
      if (tomorrowC[k]) { s += 50; why.push('class tomorrow'); }
      if (todayC[k]) { s += 40; why.push('class today, review it'); }
      ex.forEach(function (e) {
        if (norm(e.code) !== k) return;
        var d = days(e.date);
        if (d >= 0 && d <= 21) { s += 80 - d * 2; why.unshift('exam in ' + d + (d === 1 ? ' day' : ' days')); }
      });
      var since = last ? Math.min(14, gapDays(last, t)) : 14;
      s += since * 3;
      if (!last) why.push('not opened yet'); else if (since >= 4) why.push(since + ' days since you read it');
      return { code: c.code, unit: c.unit, score: s, why: why[0] || 'keep it fresh' };
    }).sort(function (a, b) { return b.score - a.score; });
  }
  function todayList(courses) {                                  // fixed for the day so ticking one off does not reshuffle
    var t = localIso(new Date()), L = U.todayList;
    var valid = L && L.date === t && L.items.every(function (i) { return courses.some(function (c) { return c.code === i.code; }); });
    if (!valid) { L = U.todayList = { date: t, items: rank(courses).slice(0, LIST_SIZE) }; save(); }
    return L.items;
  }
  var todayClasses = function () {
    var t = localIso(new Date());
    return (U.timetable || []).filter(function (x) { return x.day === dow(t) && ttLive(t); }).sort(function (a, b) { return a.start < b.start ? -1 : 1; });
  };
  function nextExam() {
    var ex = (U.exams || []).filter(function (e) { return days(e.date) >= 0; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
    return ex ? { code: ex.code, d: days(ex.date) } : null;
  }

  /* ---------- course registration upload ---------- */
  W.regOpen = function () {
    W._ocrSink = null;
    fullScreen('Course registration',
      '<div class="card p-5 space-y-3"><p class="text-xs text-slate-500">Upload your course registration page. We read your courses, units and status and build your reading list from them.</p>' +
      '<div><label class="lbl block mb-1">Which semester is this?</label><select id="rg-half" class="inp"><option value="1">First semester</option><option value="2">Second semester</option></select></div>' +
      '<label class="btn w-full" style="cursor:pointer;position:relative">Upload screenshot<input id="rg-file" type="file" accept="image/*" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer" onchange="regPick(this)"></label>' +
      '<p id="ocr-status" class="text-[11px] font-bold" aria-live="polite"></p>' +
      '<textarea id="rg-paste" rows="6" class="inp font-mono text-xs" placeholder="Or paste the page text here. You can also type one course per line, like: POS 204 3"></textarea>' +
      '<button class="btn w-full" onclick="regSave()">Save my courses</button></div>');
  };
  W.regPick = function (input) {
    if (typeof W.ocrPick !== 'function') return showToast('The screenshot reader is not loaded', 'error');
    W._ocrSink = function (t) { var ta = $('rg-paste'); if (ta) ta.value = t; };
    W.ocrPick(input);
  };
  W.regSave = function () {
    var t = (($('rg-paste') || {}).value || ''), half = ($('rg-half') || {}).value === '2' ? 1 : 0, r = parseReg(t), list;
    if (!r[0].length && !r[1].length) {                          // fallback: "POS 204 3" lines
      r = [[], []];
      t.split('\n').forEach(function (l) {
        var m = l.trim().toUpperCase().match(/^(?:UA-)?([A-Z]{2,4})\s?(\d{3}[A-Z]?)\s+([1-6])\b/);
        if (m && !r[half].some(function (x) { return x.code === m[1] + m[2]; })) r[half].push({ code: m[1] + m[2], unit: +m[3], st: 'C' });
      });
    }
    if (!r[0].length && !r[1].length) return showToast('No courses found. Type them one per line, like: POS 204 3', 'error');
    if (r[0].length && r[1].length) U.dec = r;                    // a full-session registration
    else { list = r[half].length ? r[half] : (r[0].length ? r[0] : r[1]); U.dec = courseSets().map(function (a) { return a.slice(); }); U.dec[half] = list; }
    U.curHalf = half; U.skipSetup = false; U.todayList = null; U.regAt = Date.now();
    save(); closeSheet(); go('home');
    showToast(curCourses().length + ' courses saved. Your reading list is ready');
  };
  W.regSkip = function () { U.skipSetup = true; save(); go('home'); };
  W.setCurHalf = function (h) { U.curHalf = h; U.todayList = null; save(); go('home'); };

  /* ---------- screens ---------- */
  function head() {
    var p = U.profile || {};
    return '<div><h1 class="text-2xl font-extrabold">' + greet() + ' ' + esc(U.name.split(' ')[0]) + '</h1><p class="text-xs text-slate-500">' + esc(p.program) + ' \u2022 ' + esc(p.level) + ' Level' + (p.matric ? ' \u2022 ' + esc(p.matric) : '') + '</p></div>';
  }
  function setupHome() {
    return '<div class="space-y-5">' + head() +
      '<div class="card p-6 space-y-3"><div class="font-extrabold text-lg">Let us set up your semester</div><p class="text-xs text-slate-500">Upload your course registration and the app builds a daily reading list for the courses you actually offer.</p>' +
      '<button class="btn w-full py-3" onclick="regOpen()">Upload course registration</button></div>' +
      '<div class="card p-6 space-y-3"><div class="font-extrabold">Registration not open yet?</div><p class="text-xs text-slate-500">Upload your previous results instead. When registration opens you can add it and switch to the reading list.</p>' +
      '<button class="btn2 w-full" onclick="aTab=\'calc\';editing=null;go(\'acad\')">Upload my results</button></div>' +
      '<button class="text-xs text-slate-500 w-full hover:underline" onclick="regSkip()">Skip for now</button></div>';
  }
  function waitingBanner() {
    return '<div class="card p-5 space-y-2 mb-5" style="border-left:4px solid #059669"><div class="font-extrabold text-sm">Registration not uploaded yet</div>' +
      '<p class="text-xs text-slate-500">Once you have this semester\'s course registration, upload it to unlock your daily reading list. If registration has not opened yet, we will tell you the moment it does.</p>' +
      '<button class="btn w-full" onclick="regOpen()">Upload course registration</button></div>';
  }
  function courseHome() {
    var courses = curCourses(), list = todayList(courses), cls = todayClasses(), ex = nextExam(), sets = courseSets(), n = streak();
    var read = list.map(function (i) {
      var done = readToday(i.code);
      return '<div class="flex items-center justify-between gap-3 p-3 rounded-xl" style="background:var(--sub);' + (done ? 'opacity:.6' : '') + '"><div><b class="font-mono">' + esc(i.code) + '</b><div class="text-[11px] text-slate-500">' + esc(i.why) + '</div></div>' +
        (done ? '<span class="text-xs font-extrabold" style="color:#10b981">Read \u2713</span>' : '<button class="btn2 shrink-0" onclick="readDone(\'' + esc(i.code) + '\')">Done reading</button>') + '</div>';
    }).join('');
    var all = list.length && list.every(function (i) { return readToday(i.code); });
    var rows = courses.map(function (c) {
      var last = (U.reads || {})[c.code], g = last ? gapDays(last, localIso(new Date())) : null;
      return '<div class="flex justify-between items-center text-xs p-3 rounded-xl" style="background:var(--sub)"><span><b class="font-mono">' + esc(c.code) + '</b> <span class="text-slate-500">' + c.unit + 'u ' + (c.st === 'E' ? 'Elective' : 'Compulsory') + '</span></span><span class="text-slate-400">' +
        (g === null ? 'not read yet' : g === 0 ? 'read today' : g + 'd ago') + '</span>' +
        (typeof W.filesOpen === 'function' ? '<button class="text-xs font-bold text-violet-600 ml-2" onclick="filesOpen(\'' + esc(c.code) + '\')">Files' + W.fileCount(c.code) + '</button>' : '') +  '</div>';
    }).join('');
    var tabs = (sets[0].length && sets[1].length)
      ? '<div class="grid grid-cols-2 gap-2">' + [0, 1].map(function (h) { return '<button class="' + ((U.curHalf || 0) === h ? 'btn' : 'btn2') + ' justify-center" onclick="setCurHalf(' + h + ')">' + (h ? 'Second' : 'First') + ' semester</button>'; }).join('') + '</div>' : '';
    var cg = (U.semesters || []).length ? (U.portalCGPA != null ? +U.portalCGPA : cum().g) : null;
    return '<div class="space-y-5">' + head() +
      '<div class="card p-6 space-y-3"><div class="flex justify-between items-start"><div><div class="font-extrabold text-lg">Today\'s reading list</div><div class="text-[11px] text-slate-500">' + new Date().toDateString() + '</div></div>' +
      (n ? '<span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold" style="background:rgba(16,185,129,.15);color:#047857">' + n + '-day streak</span>' : '') + '</div>' +
      (ex ? '<div class="text-xs font-bold" style="color:#d97706">' + esc(ex.code) + ' exam ' + (ex.d === 0 ? 'is today' : 'in ' + ex.d + ' day' + (ex.d === 1 ? '' : 's')) + '</div>' : '') +
      '<div class="space-y-2">' + (read || '<p class="text-xs text-slate-500">No courses yet.</p>') + '</div>' +
      (all ? '<p class="text-xs font-bold" style="color:#10b981">All done for today. Come back tomorrow.</p>' : '') + '</div>' +
      attBar() +
      '<div class="card p-6 space-y-3"><div class="flex justify-between items-center"><div class="font-extrabold">Today\'s classes</div><button class="text-xs font-bold text-violet-600" onclick="pTab=\'week\';go(\'plan\')">Timetable</button></div>' +
      (cls.length ? cls.map(function (c) { return '<div class="text-xs p-3 rounded-xl" style="background:var(--sub)"><b>' + esc(c.code) + '</b><div class="text-slate-500">' + c.start + '\u2013' + c.end + ' \u2022 ' + esc(c.venue || 'TBA') + '</div></div>'; }).join('') : '<p class="text-xs text-slate-500">No classes on your timetable today.</p>') + '</div>' +
      '<div class="card p-6 space-y-3"><div class="flex justify-between items-center"><div class="font-extrabold">My courses</div><button class="text-xs font-bold text-violet-600" onclick="regOpen()">Update registration</button></div>' + tabs + '<div class="space-y-2">' + rows + '</div></div>' +
      (cg !== null ? '<button type="button" class="card p-5 text-left w-full flex items-center justify-between" onclick="cgpaBreakdown()"><span><span class="lbl block">Cumulative GPA</span><span class="text-2xl font-extrabold">' + cg.toFixed(2) + '<span class="text-sm text-slate-400"> / 5.00</span></span></span>' + ic('r', 'w-5 h-5') + '</button>' : '') + '<button type="button" class="card p-5 text-left w-full flex items-center justify-between" onclick="go(\'traj\')"><span class="font-extrabold">GPA Trajectory</span>' + ic('r','w-5 h-5') + '</button>' + '<button type="button" class="card p-5 text-left w-full flex items-center justify-between" onclick="carrySheet()"><span class="font-extrabold">Carryover Register</span>' + ic('r','w-5 h-5') + '</button>' + '<button type="button" class="card p-5 text-left w-full flex items-center justify-between" onclick="notifSheet()"><span class="font-extrabold">Academic insight</span>' + ic('r','w-5 h-5') + '</button>' +  '</div>';
  }

  /* set from the admin panel (extras.js): a level's registration is live */
  var liveInfo = function () { return typeof W.regLive === 'function' ? W.regLive() : null; };
  function liveBanner() {
    return '<div class="card p-5 space-y-2 mb-5" style="border-left:4px solid #10b981"><div class="font-extrabold text-sm">Course registration is now live</div>' +
      '<p class="text-xs text-slate-500">Upload your new course registration to refresh your courses and your daily reading list.</p>' +
      '<button class="btn w-full" onclick="regOpen()">Upload course registration</button></div>';
  }

  var homeBase = V.home;
  V.home = function () {
    if (U.role !== 'student') return homeBase();
    var live = liveInfo();
    if (needsSetup()) return (live ? liveBanner() : '') + setupHome();
    if (hasCourses()) return (live && (U.regAt || 0) < live.since ? liveBanner() : '') + courseHome();
    return (live ? liveBanner() : waitingBanner()) + homeBase();                         // has results, registration not uploaded yet
  };
})();
