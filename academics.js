/* Academic Summit - academics.js (consolidation stage 1)
   Replaces patch.js sections v64-v66 (everything ABOVE the "v67" banner comment).
   Load order:  academics.js -> patch.js (trimmed) -> upload-fix.js            */
(function () {
  'use strict';
  var W = window;
  var GC = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#fb923c', E: '#f43f5e', F: '#b91c1c' };
  var NARROW_MAX = 44;               // E band 40-44; exactly 40 gets the loudest warning
  var TS = { lv: null };             // trajectory level selection
  var SEM_LV = [100, 200, 300, 400, 500, 600];

  /* ---------- retire the old v63 inline helpers (they matched text that never exists) ---------- */
  ['homeExtras', 'acadExtras', 'makeHomeCardsClickable', 'fixTrajectory', 'fixSemTitle', 'fixAttHero']
    .forEach(function (n) { W[n] = function () {}; });

  var st = document.createElement('style');
  st.textContent = '.tg-t{fill:var(--mut)}.tg-g{stroke:var(--bd);stroke-width:.6}.tg-ax{stroke:var(--mut);stroke-width:1}';
  document.head.appendChild(st);

  /* ---------- helpers ---------- */
  var fmt = function (n) { return Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : n.toFixed(1); };
  var closeBtn = function () { return '<button class="btn w-full mt-2" onclick="closeSheet()">Close</button>'; };
  var arrowCard = function (label, onclick) {
    return '<button type="button" class="card p-6 text-left w-full flex items-center justify-between" onclick="' + onclick + '"><span class="font-extrabold">' + label + '</span>' + ic('r', 'w-5 h-5') + '</button>';
  };

  function nums(courses, exSup) {
    var u = 0, q = 0;
    (courses || []).forEach(function (c) {
      if (exSup && c.sup) return;
      var n = +c.unit; u += n; q += n * gr(c.score)[1];
    });
    return { u: u, q: q, g: u ? q / u : 0 };
  }
  function majorityHalf(s, i) {
    var a = 0, b = 0;
    (s.courses || []).forEach(function (c) { if (semOfCode(c.code) === 1) a++; else b++; });
    return a > b ? 0 : b > a ? 1 : i % 2;
  }
  /* Every semester gets lv (100..600) and half (0 first, 1 second). */
  function tagAll() {
    var sems = (U && U.semesters) || [], cnt = [0, 0], dirty = false;
    sems.forEach(function (s, i) {
      if (s.lv == null || s.half == null) {
        var nm = String(s.name || ''), m = nm.match(/(\d{3})\s*level/i), h = /first/i.test(nm) ? 0 : /second/i.test(nm) ? 1 : majorityHalf(s, i);
        s.half = h; s.lv = m ? parseInt(m[1], 10) : 100 + cnt[h] * 100; dirty = true;
      }
      cnt[s.half] = Math.max(cnt[s.half], (s.lv - 100) / 100 + 1);
    });
    if (dirty) save();
  }
  var lvl2 = function (s) { return s.lv + 'L ' + (s.half ? 'Second' : 'First') + ' Semester'; };
  var lvlLong = function (s) { return s.lv + ' Level ' + (s.half ? 'Second' : 'First') + ' Semester'; };

  function lowestRows() {
    tagAll();
    var out = [];
    (U.semesters || []).forEach(function (s) {
      var cs = (s.courses || []).filter(function (c) { return c.score != null && c.score !== ''; });
      if (cs.length) out.push({ s: s, c: cs.reduce(function (a, b) { return +b.score < +a.score ? b : a; }) });
    });
    return out;
  }
  /* Per-semester heading: portal GPA, else deduced from the portal CGPA, else the released courses. */
  function semHead(s, x) {
    var h = typeof headGpa === 'function' ? headGpa(s) : { v: x.g, src: 'released' };
    var reg = x.u + (s.pending || []).reduce(function (a, c) { return a + (+c.unit || 0); }, 0);
    var note = h.src === 'released' ? '' : '<p class="text-[11px] text-slate-500">' + (h.src === 'portal' ? 'Portal GPA. ' : 'Deduced from your portal CGPA. ') + 'Released courses only: ' + x.g.toFixed(2) + '.</p>';
if (s.check === 'mismatch') note += '<p class="text-[11px] font-bold" style="color:#d97706">The portal GPA' + (s.portalGPAUnverified != null ? ' (' + (+s.portalGPAUnverified).toFixed(2) + ')' : '') + ' does not match the courses saved here, so it is not used. A course may be missing: upload this semester again and only the missing ones are added.</p>';
    return { t: 'GPA ' + h.v.toFixed(2) + ' (' + reg + 'u)', note: note };
  }
  function headCgpa() {
    var c = cum().g;
    return U && U.portalCGPA != null ? { v: +U.portalCGPA, src: 'portal', calc: c } : { v: c, src: 'calc', calc: c };
  }

  /* ---------- attendance entry (home button + page) ---------- */
  W.attBar = function () {
    return '<button type="button" class="rounded-3xl p-6 grad shadow-lg text-left w-full flex items-center justify-between" onclick="go(\'att\')"><span class="font-extrabold text-white text-lg">Mark attendance</span>' + ic('r', 'w-5 h-5 text-white') + '</button>';
  };
  V.att = function () {
    setTimeout(function () { if (typeof attHistory === 'function') attHistory(); }, 80);
    return '<div class="space-y-5"><div class="card p-6 space-y-4"><div class="font-extrabold text-lg">Mark attendance</div>' +
      '<p class="text-xs text-slate-500">Enter your course code and the 5-digit code your lecturer calls out, then tap Mark.</p>' +
      '<input id="ha-course" class="inp uppercase font-mono font-bold" placeholder="Course code (e.g. POS 204)">' +
      '<input id="ha-pin" class="inp font-mono font-bold tracking-widest" placeholder="Lecturer code" maxlength="5" inputmode="numeric">' +
      '<button class="btn w-full py-3" onclick="markFromHome()">Mark</button></div>' +
      '<div class="card p-6 space-y-3"><div class="font-extrabold">My attendance</div><div id="att-hist" class="space-y-2 text-xs text-slate-500">Loading...</div></div></div>';
  };

  /* ---------- carryovers ---------- */
  W.carryCard = function () { return arrowCard('Carryover Register', 'carrySheet()'); };
  W.carrySheet = function () {
    tagAll();
    var carries = [], narrow = [];
    (U.semesters || []).forEach(function (s) {
      (s.courses || []).forEach(function (c) {
        if (c.sup) return;
        var sc = +c.score;
        if (sc < 40) carries.push({ s: s, c: c }); else if (sc <= NARROW_MAX) narrow.push({ s: s, c: c });
      });
    });
    var row = function (x, tail, col) {
      return '<div class="flex justify-between items-center py-2 text-xs border-b border-slate-200/40"><span>' + lvl2(x.s) + ' - <b>' + esc(x.c.code) + '</b></span><b style="color:' + col + '">' + tail + '</b></div>';
    };
    var b = carries.length
      ? '<div class="p-4 rounded-2xl space-y-1" style="background:var(--sub);border-left:4px solid #e11d48"><div class="font-extrabold text-sm" style="color:#e11d48">Carryovers (' + carries.length + ')</div>' +
        carries.map(function (x) { return row(x, x.c.score + ' (F)', '#e11d48'); }).join('') + '</div>'
      : '<div class="p-5 rounded-2xl text-center space-y-1" style="background:var(--sub);border-left:4px solid #10b981"><div class="font-extrabold">No carryovers yet - you are killing it.</div><p class="text-xs text-slate-500">Keep up the good work.</p></div>';
    if (narrow.length) {
      narrow.sort(function (a, c) { return a.c.score - c.c.score; });
      b += '<div class="p-4 rounded-2xl space-y-1" style="background:var(--sub);border-left:4px solid #d97706"><div class="font-extrabold text-sm" style="color:#d97706">Narrow escapes (' + narrow.length + ')</div>' +
        '<p class="text-[11px] text-slate-500">40 is the lowest pass mark. One mark less and it becomes a carryover. Guard these.</p>' +
        narrow.map(function (x) {
          var ex = +x.c.score === 40;
          return row(x, x.c.score + (ex ? ' - exactly 40' : ' (E)'), ex ? '#e11d48' : '#d97706');
        }).join('') + '</div>';
    }
    fullScreen('Carryover Register', b + closeBtn());
  };

  /* ---------- academic insight ---------- */
  W.notifSheet = function () {
    var rows = lowestRows(), b;
    if (!rows.length) b = '<p class="text-xs text-slate-500">No results yet.</p>';
    else {
      var min = rows.reduce(function (a, r) { return +r.c.score < +a.c.score ? r : a; });
      b = '<div class="p-4 rounded-2xl space-y-1" style="background:var(--sub);border-left:4px solid #e11d48"><div class="lbl">Lowest score overall</div><div class="font-extrabold">' + esc(min.c.code) + ' - ' + min.c.score + ' (' + gr(min.c.score)[0] + ')</div><div class="text-xs text-slate-500">' + lvlLong(min.s) + '</div></div>' +
        '<div class="p-4 rounded-2xl space-y-1" style="background:var(--sub)"><div class="lbl pb-1">Lowest in each semester</div>' +
        rows.map(function (r) {
          return '<div class="flex justify-between py-2 text-xs border-b border-slate-200/40"><span>' + lvlLong(r.s) + '</span><b>' + esc(r.c.code) + ' - ' + r.c.score + ' (' + gr(r.c.score)[0] + ')</b></div>';
        }).join('') + '</div>';
    }
    fullScreen('Academic insight', b + closeBtn());
  };

  /* ---------- CGPA breakdown ---------- */
  W.cgpaBreakdown = function () {
    tagAll();
    var sems = U.semesters || [];
    if (!sems.length) return fullScreen('How your CGPA is built', '<p class="text-xs text-slate-500">No results yet.</p>' + closeBtn());
    var ru = 0, rq = 0, rows = '', anySup = false;
    sems.forEach(function (s) {
      var a = nums(s.courses, false), c = nums(s.courses, true), pend = s.pending || [];
      (s.courses || []).forEach(function (x) { if (x.sup) anySup = true; });
      ru += c.u; rq += c.q;
      var wait = pend.length ? '<p class="text-[11px] font-bold" style="color:#d97706">Awaiting upload: ' + pend.map(function (x) { return esc(x.code); }).join(', ') + '</p>' : '';
      var pg = s.portalGPA != null && Math.abs(s.portalGPA - a.g) > 0.005 ? '<p class="text-[11px] text-slate-500">Portal prints ' + (+s.portalGPA).toFixed(2) + ' for this semester until the rest are uploaded.</p>' : '';
      rows += '<div class="p-3 rounded-xl space-y-2" style="background:var(--sub)"><div class="flex justify-between text-xs"><b>' + lvlLong(s) + '</b><span class="text-slate-500">' + a.u + ' units released</span></div>' +
        '<div class="grid grid-cols-3 gap-2 text-center text-xs"><div><div class="lbl">Points</div><b>' + fmt(a.q) + '</b></div><div><div class="lbl">GPA</div><b>' + a.g.toFixed(2) + '</b></div><div><div class="lbl">Awaiting</div><b>' + pend.length + '</b></div></div>' + wait + pg + '</div>';
    });
    var h = headCgpa(), cg = ru ? rq / ru : 0;
    var top = '<div class="grad rounded-3xl p-5 space-y-1"><div class="text-xs font-bold opacity-80">Cumulative GPA</div><div class="text-4xl font-extrabold">' + h.v.toFixed(2) + '<span class="text-base opacity-75"> / 5.00</span></div><div class="text-xs opacity-90">' +
      (h.src === 'portal' ? 'As printed by your portal' : fmt(rq) + ' total points / ' + ru + ' total units') + '</div></div>';
    var note = h.src === 'portal' && Math.abs(h.v - cg) > 0.005 ? '<p class="text-[11px] text-slate-500">From the released courses alone (' + fmt(rq) + ' points / ' + ru + ' units) it is ' + cg.toFixed(2) + '. Your portal figure is shown above and will move as the remaining results are uploaded.</p>' : '';
    var how = '<p class="text-[11px] text-slate-500">GPA = total points / total units, where each course earns grade point x units (A 5, B 4, C 3, D 2, E 1, F 0).' + (anySup ? ' A failed course you later retook is replaced by the retake.' : '') + '</p>';
    fullScreen('How your CGPA is built', top + '<div class="space-y-2">' + rows + '</div>' + how + note + closeBtn());
  };

  /* ---------- My Record ---------- */
  ACAD.rec = function () {
    tagAll();
    var h = headCgpa(), c = cum(), p = U.profile || {};
    var blocks = (U.semesters || []).map(function (s) {
      var x = nums(s.courses, false), hd = semHead(s, x);
      var got = (s.courses || []).map(function (k) {
        return '<div class="flex justify-between text-xs"><span class="font-mono text-slate-500">' + esc(k.code) + (k.sup ? ' (retaken)' : '') + ' (' + k.unit + 'u)</span><b>Score: ' + k.score + ' (' + gr(k.score)[0] + ')</b></div>';
      }).join('');
      var wait = (s.pending || []).map(function (k) {
        return '<div class="flex justify-between text-xs"><span class="font-mono text-slate-500">' + esc(k.code) + ' (' + k.unit + 'u)</span><b style="color:#d97706">Awaiting upload</b></div>';
      }).join('');
      return '<div class="rounded-2xl p-4 space-y-2" style="background:var(--sub)"><div class="flex justify-between text-sm font-extrabold"><span>' + lvlLong(s) + '</span><span>' + hd.t + '</span></div>' + hd.note + got + wait +
        '<div class="flex gap-4 np pt-2 border-t border-slate-200/60 dark:border-slate-700/60"><button class="text-xs font-bold text-violet-600" onclick="editSem(' + s.id + ')">Edit</button><button class="text-xs font-bold text-rose-500" onclick="delSem(' + s.id + ')">Delete</button></div></div>';
    }).join('') || '<p class="text-xs text-slate-400 text-center py-6">No semesters stored.</p>';
    $('sub').innerHTML = '<div class="card p-6 space-y-4"><div class="flex justify-between items-center"><div class="font-extrabold">Academic Transcript</div><button class="btn2 text-xs np" onclick="window.print()">' + ic('print') + ' Print</button></div>' +
      '<p class="text-xs text-slate-500">' + esc(U.name) + ' - ' + esc(p.uni) + ' - ' + esc(p.program) + '</p>' +
      '<div class="rounded-2xl p-4 text-sm font-extrabold" style="background:var(--sub)">CGPA: ' + h.v.toFixed(2) + ' / 5.00 (' + c.u + ' units released)</div>' + (typeof undoCount === 'function' && undoCount() ? '<button class="btn2 w-full np" onclick="undoImport()">Undo last import</button>' : '') + blocks + '</div>';
  };
  var acadBase = V.acad;
  V.acad = function () {   // pending courses now show inside their semester, so drop the old standalone card
    var h = acadBase(), i = h.indexOf('<div class="card p-5 space-y-2 mt-4"><div class="font-extrabold text-sm">Awaiting results</div>');
    return i > -1 ? h.slice(0, i) : h;
  };

  /* ---------- trajectory: course-by-course build-up toward 5.00 ---------- */
  function stepGraph(cs, title) {
    var N = cs.length;
    if (!N) return '<div class="space-y-1"><div class="text-xs font-extrabold">' + title + '</div><div class="p-3 rounded-xl text-[11px] text-slate-500" style="background:var(--sub)">No results here yet.</div></div>';
    var den = cs.reduce(function (a, c) { return a + (+c.unit); }, 0);
    var Wd = 360, L = 30, R = 14, T = 14, B = 26, RH = N <= 12 ? 22 : N <= 24 ? 14 : 9, H = T + N * RH + B;
    var X = function (g) { return L + g / 5 * (Wd - L - R); }, Y = function (k) { return H - B - k * RH; };
    var cu = 0, cg = 0, pts = [[X(0), Y(0)]], ideal = [[X(0), Y(0)]], dots = '', labs = '', dips = [];
    cs.forEach(function (c, i) {
      var g = gr(c.score), u = +c.unit, gain = g[1] * u / den, prev = pts[i];
      cu += u; cg += gain;
      pts.push([X(cg), Y(i + 1)]); ideal.push([X(5 * cu / den), Y(i + 1)]);
      dots += '<circle cx="' + X(cg).toFixed(1) + '" cy="' + Y(i + 1).toFixed(1) + '" r="' + (N > 24 ? 2 : 3) + '" fill="' + GC[g[0]] + '"/>';
      if (N <= 16) labs += '<text class="tg-t" x="' + ((prev[0] + X(cg)) / 2 - 4).toFixed(1) + '" y="' + ((prev[1] + Y(i + 1)) / 2 - 1).toFixed(1) + '" font-size="7" text-anchor="end">' + gain.toFixed(2) + '</text>';
      if (g[1] < 5) dips.push({ code: c.code, l: g[0], loss: (5 - g[1]) * u / den, gain: gain });
    });
    var poly = function (a) { return a.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); };
    var grid = '', k, g, ls = N <= 20 ? 1 : N <= 40 ? 2 : 5;
    for (g = 0; g <= 5; g++) grid += '<line class="tg-g" x1="' + X(g).toFixed(1) + '" y1="' + T + '" x2="' + X(g).toFixed(1) + '" y2="' + (H - B) + '"/><text class="tg-t" x="' + X(g).toFixed(1) + '" y="' + (H - B + 12) + '" font-size="9" text-anchor="middle">' + g + '</text>';
    for (k = 0; k <= N; k++) {
      if (k > 0 && k % ls && k !== N) continue;
      grid += '<line class="tg-g" x1="' + L + '" y1="' + Y(k).toFixed(1) + '" x2="' + (Wd - R) + '" y2="' + Y(k).toFixed(1) + '"/><text class="tg-t" x="' + (L - 6) + '" y="' + (Y(k) + 3).toFixed(1) + '" font-size="8" text-anchor="end">' + k + '</text>';
    }
    var svg = '<svg viewBox="0 0 ' + Wd + ' ' + H + '" style="width:100%;height:auto"><line x1="' + X(5).toFixed(1) + '" y1="' + T + '" x2="' + X(5).toFixed(1) + '" y2="' + (H - B) + '" stroke="#10b981" stroke-width="1.2" stroke-dasharray="4 3"/>' + grid +
      '<line class="tg-ax" x1="' + L + '" y1="' + (H - B) + '" x2="' + (Wd - R) + '" y2="' + (H - B) + '"/><line class="tg-ax" x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (H - B) + '"/>' +
      '<polyline points="' + poly(ideal) + '" fill="none" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3 3"/>' +
      '<polyline points="' + poly(pts) + '" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linejoin="round"/>' + dots + labs + '</svg>';
    dips.sort(function (a, b) { return b.loss - a.loss; });
    var chips = dips.slice(0, 8).map(function (d) {
      return '<span class="px-2 py-1 rounded-lg text-[10px] font-bold" style="background:var(--sub)"><b style="color:' + GC[d.l] + '">' + d.l + '</b> ' + esc(d.code) + ' -' + d.loss.toFixed(2) + (d.gain === 0 ? ' (no movement)' : '') + '</span>';
    }).join(' ');
    var tail = dips.length
      ? '<div class="space-y-1"><div class="text-[11px] text-slate-500">Where the line fell short of the dashed all-A path (' + dips.length + ' course' + (dips.length > 1 ? 's' : '') + '):</div><div class="flex flex-wrap gap-1">' + chips + (dips.length > 8 ? ' <span class="text-[10px] text-slate-500">+' + (dips.length - 8) + ' more</span>' : '') + '</div></div>'
      : '<div class="text-[11px] font-bold" style="color:#10b981">Straight A line. Nothing fell short.</div>';
    return '<div class="space-y-2"><div class="flex justify-between text-xs"><b>' + title + '</b><b style="color:#10b981">' + cg.toFixed(2) + ' / 5.00</b></div>' + svg + tail + '</div>';
  }
  function coursesOf(list, half, exSup) {
    var out = [];
    list.forEach(function (s) {
      if (half !== null && s.half !== half) return;
      (s.courses || []).forEach(function (c) { if (!(exSup && c.sup)) out.push(c); });
    });
    return out;
  }
  function curLevel() {
    tagAll();
    var lv = parseInt((U.profile || {}).level, 10) || 100, m = String((U.profile || {}).matric || '').match(/^(\d{2})\//);
    if (m) {
      var d = new Date(), start = d.getMonth() >= 8 ? d.getFullYear() : d.getFullYear() - 1, inf = 100 * (start - (2000 + +m[1]) + 1);
      if (inf > lv && inf <= 600) lv = inf;
    }
    (U.semesters || []).forEach(function (s) { if (s.lv > lv) lv = s.lv; });
    return Math.min(600, lv);
  }
  function trajInner() {
    tagAll();
    var sems = U.semesters || [], cur = curLevel();
    var has = function (l) { return sems.some(function (s) { return s.lv === l; }); };
    if (TS.lv == null) { var w = SEM_LV.filter(has); TS.lv = w.length ? w[w.length - 1] : cur; }
    var all = TS.lv === 'all';
    var head = '<div class="flex gap-2 overflow-x-auto pb-1">' + SEM_LV.map(function (l) {
      return '<button type="button" class="' + (TS.lv === l ? 'btn' : 'btn2') + ' whitespace-nowrap" style="' + (l > cur && !has(l) && TS.lv !== l ? 'opacity:.55' : '') + '" onclick="trajSet(' + l + ')">' + l + 'L</button>';
    }).join('') + (sems.length ? '<button type="button" class="' + (all ? 'btn' : 'btn2') + ' whitespace-nowrap" onclick="trajSet(\'all\')">All levels</button>' : '') + '</div>';
    if (!all && !has(TS.lv)) {
      return head + (TS.lv > cur
        ? '<div class="p-5 rounded-2xl space-y-1" style="background:var(--sub)"><div class="font-extrabold">Level not yet reached</div><p class="text-xs text-slate-500">You are in ' + cur + ' Level. The ' + TS.lv + ' Level trajectory opens once you get there and upload those results.</p></div>'
        : '<div class="p-5 rounded-2xl space-y-3" style="background:var(--sub)"><div class="font-extrabold">No ' + TS.lv + ' Level results yet</div><p class="text-xs text-slate-500">Upload your ' + TS.lv + ' Level results from your portal and this trajectory draws itself.</p><button class="btn w-full" onclick="aTab=\'calc\';editing=null;go(\'acad\')">Upload results</button></div>');
    }
    var list = all ? sems : sems.filter(function (s) { return s.lv === TS.lv; }), tag = all ? 'all levels' : TS.lv + ' Level';
    var pend = list.reduce(function (a, s) { return a + (s.pending || []).length; }, 0);
    var legend = '<div class="flex gap-3 text-[10px] text-slate-500 items-center flex-wrap">' + 'ABCDEF'.split('').map(function (x) { return '<b style="color:' + GC[x] + '">' + x + '</b>'; }).join('') + '<span>Dashed grey = all A. Rows are courses, across is GPA.</span></div>';
    return head + stepGraph(coursesOf(list, 0, all), 'First semester - ' + tag) + stepGraph(coursesOf(list, 1, all), 'Second semester - ' + tag) +
      stepGraph(coursesOf(list, null, all), all ? 'CGPA - all semesters' : 'Whole session - ' + tag) + legend +
      (pend ? '<p class="text-[11px] text-slate-500">' + pend + ' course' + (pend > 1 ? 's are' : ' is') + ' awaiting upload and not plotted yet.</p>' : '');
  }
  W.trajSet = function (v) { TS.lv = v; var c = $('traj-card'); if (c) c.innerHTML = trajInner(); };
  V.traj = function () {
    return '<div class="space-y-5"><div class="flex items-center gap-3"><button type="button" class="btn2 px-3" onclick="go(\'home\')">' + ic('l') + '</button><div class="font-extrabold text-lg">GPA Trajectory</div></div><div class="card p-6 space-y-4" id="traj-card">' + trajInner() + '</div></div>';
  };

  /* ---------- home: wire cards by rewriting markup (no timers, no text matching) ---------- */
  var homeBase = V.home;
  V.home = function () {
    var h = homeBase();
    try {
      h = h.replace('<div class="grad rounded-3xl p-6 space-y-3 shadow-lg">', '<div class="grad rounded-3xl p-6 space-y-3 shadow-lg" style="cursor:pointer" onclick="cgpaBreakdown()">');
      if (U.portalCGPA != null) {
        var pc = +U.portalCGPA;
        h = h.replace('<div class="text-4xl font-extrabold">' + cum().g.toFixed(2) + '<span class="text-base opacity-75"> / 5.00</span>', '<div class="text-4xl font-extrabold">' + pc.toFixed(2) + '<span class="text-base opacity-75"> / 5.00</span>');
        h = h.replace(/(<div class="h-2 rounded-full bg-white" style="width:)[^"]*(")/, '$1' + (pc / 5 * 100) + '%$2');
      }
      h = h.replace('onclick="setTarget()"', 'onclick="event.stopPropagation();setTarget()"');
      h = h.replace('<div class="card p-6 flex items-center justify-between gap-4">', '<div class="card p-6 flex items-center justify-between gap-4" style="cursor:pointer" onclick="aTab=\'rec\';editing=null;go(\'acad\')">');
      h = h.replace('<div class="card p-6 space-y-2"><div class="font-extrabold">Notifications</div>', '<div class="card p-6 space-y-2" style="cursor:pointer" onclick="notifSheet()"><div class="font-extrabold">Notifications</div>');
      var sems = U.semesters || [], ls = sems[sems.length - 1];
      if (ls && (ls.pending || []).length)
        h = h.replace(/(\d+ courses \u2022 \d+ units)(<\/div>)/, '$1<span style="color:#d97706;font-weight:700"> \u2022 ' + ls.pending.length + ' awaiting upload</span>$2');
      var low = lowestRows();
      if (low.length) { var r = low[low.length - 1]; h = h.replace(/Lowest score last semester:[^<]*/, esc(lvl2(r.s) + ' lowest: ' + r.c.code + ' (' + r.c.score + '). Tap for all.')); }
      var a = h.indexOf('<div class="card p-6 space-y-4"><div class="font-extrabold">GPA Trajectory</div>'), b = h.indexOf('<div class="card p-6 space-y-3"><div class="font-extrabold">Quick Actions</div>');
      if (a > -1 && b > a) h = h.slice(0, a) + arrowCard('GPA Trajectory', "go('traj')") + h.slice(b);
    } catch (e) { console.error('academics home patch', e); }
    return h;
  };

  /* ---------- calculator: level + First/Second/Both, rows appear after "Add courses manually" ---------- */
  var calcBase = ACAD.calc;
  ACAD.calc = function () {
    W._semHalf = null; W._pasted = false;
    calcBase();
    try { calcRestructure(); } catch (e) { console.error(e); showToast('Layout error: ' + e.message, 'error'); }
  };
  function calcRestructure() {
    var nm = $('c-name'), rows = $('rows');
    if (editing !== null || !nm || !rows || nm.dataset.v64) return;
    nm.dataset.v64 = '1'; nm.style.display = 'none';
    var box = nm.parentNode, lab = box.querySelector('.lbl'), lv = parseInt((U.profile || {}).level, 10) || 100;
    if (lab) lab.textContent = 'Session and semester';
    var d = document.createElement('div');
    d.className = 'space-y-2 mt-1';
    d.innerHTML = '<select id="sem-lv" class="inp" onchange="semPick()">' + SEM_LV.map(function (l) { return '<option value="' + l + '"' + (l === lv ? ' selected' : '') + '>' + l + ' Level</option>'; }).join('') + '</select>' +
      '<div class="grid grid-cols-3 gap-2">' + [['first', 'First'], ['second', 'Second'], ['both', 'Both']].map(function (x) { return '<button type="button" id="sh-' + x[0] + '" class="btn2 justify-center" onclick="semPick(\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div><p id="sem-note" class="text-[11px] text-slate-500"></p>';
    box.appendChild(d);
    var saveBtn = rows.nextElementSibling, head = rows.previousElementSibling, wrap = document.createElement('div'), mb = document.createElement('button');
    wrap.id = 'manual-wrap'; wrap.className = 'space-y-5 hidden';
    mb.type = 'button'; mb.id = 'manual-btn'; mb.className = 'btn2 w-full justify-center'; mb.textContent = 'Add courses manually'; mb.onclick = W.revealManual;
    rows.parentNode.insertBefore(mb, head); rows.parentNode.insertBefore(wrap, head);
    wrap.appendChild(head); wrap.appendChild(rows); wrap.appendChild(saveBtn);
    rows.innerHTML = '';
    if (saveBtn) saveBtn.setAttribute('onclick', 'saveBtn64()');
  }
  W.semPick = function (h) {
    if (h) W._semHalf = h;
    var hh = W._semHalf, lv = ($('sem-lv') || {}).value || '100', nm = $('c-name'), n = $('sem-note');
    ['first', 'second', 'both'].forEach(function (k) { var b = $('sh-' + k); if (b) b.className = (k === hh ? 'btn' : 'btn2') + ' justify-center'; });
    if (nm && hh) nm.value = lv + ' Level - ' + (hh === 'both' ? 'Full Session' : (hh === 'first' ? 'First' : 'Second') + ' Semester');
    if (n) n.textContent = hh === 'both' ? 'Whole session: enter every course in one list. Codes ending in an odd number go to First Semester, even to Second.' : '';
  };
  W.revealManual = function () {
    if (!W._semHalf) return showToast('Pick First, Second or Both first', 'error');
    var w = $('manual-wrap'); if (w) w.classList.remove('hidden');
    if (!document.querySelector('#rows > div')) { addRow(); addRow(); addRow(); }
  };
  var parseBase = parsePasteTrojan;
  W.parsePasteTrojan = function () {
    var r = parseBase.apply(this, arguments), w = $('manual-wrap');
    if (w && document.querySelectorAll('#rows > div').length) { w.classList.remove('hidden'); W._pasted = true; }
    return r;
  };
  W.saveBtn64 = function () { return W._pasted ? saveSem() : W.saveManual64(); };
  W.saveManual64 = function () {
    var half = W._semHalf, lv = parseInt(($('sem-lv') || {}).value, 10) || 100, courses = [];
    if (!half) return showToast('Pick First, Second or Both', 'error');
    document.querySelectorAll('#rows > div').forEach(function (r) {
      var code = r.querySelector('.c-code').value.trim().toUpperCase().replace(/\s+/g, ''), unit = parseFloat(r.querySelector('.c-unit').value), sc = r.querySelector('.c-score').value;
      if (code && unit >= 1 && unit <= 6 && sc !== '' && +sc >= 0 && +sc <= 100) courses.push({ code: code, unit: unit, score: +sc });
    });
    if (!courses.length) return showToast('Enter at least one valid course with a score (0-100)', 'error');
    tagAll();
    var groups = [];
    if (half === 'both') {
      [1, 2].forEach(function (n) { var cs = courses.filter(function (c) { return semOfCode(c.code) === n; }); if (cs.length) groups.push({ h: n - 1, cs: cs }); });
    } else groups.push({ h: half === 'first' ? 0 : 1, cs: courses });
    var msg = [];
    groups.forEach(function (g) {
      var ex = U.semesters.filter(function (s) { return s.lv === lv && s.half === g.h; })[0];
      if (ex) g.cs.forEach(function (c) {
        var o = (ex.courses || []).filter(function (x) { return x.code === c.code; })[0];
        if (o) { o.unit = c.unit; o.score = c.score; } else ex.courses.push(c);
      });
      else U.semesters.push({ id: Date.now() + g.h, name: lv + ' Level - ' + (g.h ? 'Second' : 'First') + ' Semester', courses: g.cs, pending: [], lv: lv, half: g.h });
      msg.push((g.h ? '2nd' : '1st') + ' sem GPA ' + nums(g.cs, false).g.toFixed(2));
    });
    U.semesters.sort(function (a, b) { return (a.lv - b.lv) || (a.half - b.half); });
    refreshCarry(); save();
    try { track('semester_saved', { semesters: U.semesters.length }); } catch (e) {}
    go('home');
    showToast('Saved. ' + msg.join(', ') + ' | CGPA ' + cum().g.toFixed(2));
    try { rwDone(); } catch (e) {}
  };
})();
