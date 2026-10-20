/* Academic Summit - core.js (consolidation stage 6)
   One version each of go(), start() and saveSem(), replacing the stacked
   wrappers (the setTimeout patchers, normSems, label/CGPA display scrapers).
   Load order: core.js FIRST -> academics.js -> ocr.js -> reps.js -> lecturer.js -> auth.js
   Keeps using these inline helpers (pure functions, leave them in index.html):
   semGroupsFromRaw, buildSemesters, capturePortalGPAs, deduceMissing, headGpa,
   reconcileProfile, sanitizeSems, gateCard, showInstantDetective, parsePasteTrojan chain. */
(function () {
  'use strict';
  var W = window;

  /* ---------- install buttons: hide once the app is installed (no timers) ---------- */
  function installed() {
    try { return !!(localStorage.getItem('as_installed') || matchMedia('(display-mode: standalone)').matches || navigator.standalone); } catch (e) { return false; }
  }
  function hideInstall() {
    if (!installed()) return;
    document.querySelectorAll('.card').forEach(function (c) { if (/Installs to home screen/i.test(c.textContent || '')) c.remove(); });
    Array.prototype.forEach.call(document.querySelectorAll('button'), function (b) { if (/^Download .*App$/i.test((b.textContent || '').trim())) b.remove(); });
  }
  addEventListener('appinstalled', function () { localStorage.setItem('as_installed', '1'); hideInstall(); });

  /* ---------- go ---------- */
  var gateCool = false;
  W.go = function (v) {
    var lec = U.role === 'lecturer', noResults = false;   // first-run setup now lives on the home screen (home.js)
    if (noResults) {                                    // before the first result only Academics and Profile open
      if (v !== 'acad' && v !== 'prof') {
        aTab = 'calc'; v = 'acad';
        if (!gateCool) { gateCool = true; setTimeout(function () { gateCool = false; }, 6000); showToast('Paste your first result to unlock the rest'); }
      } else if (v === 'acad' && ['det', 'tgt', 'dec', 'rec'].indexOf(aTab) > -1) aTab = 'calc';
    }
    view = v;
    document.querySelectorAll('.nv').forEach(function (b) { b.className = 'nv w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-3 ' + (b.dataset.n === v ? 'nav-on' : 'text-slate-300 hover:bg-violet-900/40'); });
    document.querySelectorAll('.bn').forEach(function (b) { b.className = 'bn flex-1 py-2 text-[10px] font-semibold flex flex-col items-center gap-1 ' + (b.dataset.n === v ? 'text-violet-600 dark:text-violet-400' : 'text-slate-400'); });
    $('main').innerHTML = lec ? (LECTURER_VIEWS[v] || LECTURER_VIEWS.home)() : (V[v] || V.home)();
    if (!lec && v === 'acad') ACAD[aTab]();
    if (lec && v === 'roster') loadRoster();
    if (v === 'home') onHomeShown();
    if (noResults && v === 'acad' && aTab === 'calc') { try { gateCard(); } catch (e) {} }
    hideInstall();
    scrollTo(0, 0);
  };

  /* ---------- start (shell: sidebar, bottom nav, top bar) ---------- */
  W.start = function () {
    try { sanitizeSems(); } catch (e) {}
    $('auth').innerHTML = ''; $('app').classList.remove('hidden');
    document.body.dataset.role = U.role || 'student';
    var lec = U.role === 'lecturer', nav = lec ? LECTURER_NAV : STUDENT_NAV;
    $('side').innerHTML = '<div class="flex items-center gap-3 mb-8 px-2"><div class="w-10 h-10 shrink-0">' + MTN('w-10 h-10') + '</div><div><div class="font-extrabold text-lg leading-tight">Academic</div><div class="text-xs text-violet-400 font-bold uppercase tracking-wider">' + (lec ? 'Lecturer Console' : 'Summit v13') + '</div></div></div>' +
      '<div class="space-y-1 flex-1 overflow-y-auto pr-1">' + nav.map(function (n) { return '<button data-n="' + n[0] + '" onclick="go(\'' + n[0] + '\')" class="nv w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-violet-900/40 flex items-center gap-3">' + ic(n[2]) + '<span>' + n[1] + '</span></button>'; }).join('') + '</div>' +
      '<div class="mt-auto pt-4"><div class="rounded-2xl p-4 text-xs bg-violet-900/40 border border-violet-800/40 space-y-1"><div class="mb-2">' + MTN('w-12 h-12') + '</div><b class="text-white block text-sm">' + (lec ? 'Active Session' : 'Target CGPA: ' + U.target.toFixed(2)) + '</b><p class="text-violet-300/80">Higher Goals, Bigger Future.</p></div></div>';
    var short = { home: 'Home', acad: 'Academics', plan: 'Planner', fin: 'Finance', roster: 'Roster', prof: 'Profile' };
    $('bnav').innerHTML = nav.slice(0, 2).concat([['+']]).concat(nav.slice(2, 4)).map(function (n) {
      return n[0] === '+'
        ? '<button onclick="openSheet()" class="grad w-12 h-12 -mt-5 rounded-full shadow-lg flex items-center justify-center text-white text-xl font-bold" aria-label="Quick actions">+</button>'
        : '<button data-n="' + n[0] + '" onclick="go(\'' + n[0] + '\')" class="bn flex-1 py-2 text-[10px] font-semibold text-slate-400 flex flex-col items-center gap-1">' + ic(n[2], 'w-5 h-5') + (short[n[0]] || n[1]) + '</button>';
    }).join('');
    var ini = U.name.split(' ').map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
    $('top').innerHTML = '<div><div class="text-xs text-slate-500 font-semibold">' + new Date().toDateString() + '</div><div class="text-sm font-extrabold">Academic Summit</div></div><div class="flex items-center gap-3">' +
      '<button onclick="toggleTheme()" class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm" aria-label="Toggle theme">' + ic(isDark ? 'sun' : 'moon') + '</button>' +
      '<button onclick="go(\'prof\')" class="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800"><span class="text-right text-xs hidden sm:block"><b class="block">' + esc(U.name) + '</b><span class="text-slate-400">' +
      (U.profile && U.profile.matric ? esc(U.profile.matric) : esc((U.profile && U.profile.program) || (lec ? 'Lecturer' : 'Student'))) + '</span></span><span class="grad w-9 h-9 rounded-full grid place-items-center text-xs font-bold">' + esc(ini) + '</span></button></div>';
    try { deduceMissing(); } catch (e) {}
    go(view);
  };

  /* ---------- saveSem ---------- */
  function readRows() {
    var out = [];
    document.querySelectorAll('#rows > div').forEach(function (r) {
      var code = r.querySelector('.c-code').value.trim().toUpperCase(), unit = parseFloat(r.querySelector('.c-unit').value), sc = r.querySelector('.c-score').value;
      if (code && unit >= 1 && unit <= 6 && sc !== '' && +sc >= 0 && +sc <= 100) out.push({ code: code, unit: unit, score: +sc });
    });
    return out;
  }
  /* The portal prints "2025/2026 First Semester" headers: split one big paste into the right semesters. */
  function mergeInto(t, g) {
var have = {}, added = 0, conflict = 0, pend = {};
t.courses = t.courses || []; t.pending = t.pending || [];
t.courses.forEach(function (c) { have[c.code] = c; });
g.courses.forEach(function (c) {
var o = have[c.code];
if (!o) { t.courses.push(c); have[c.code] = c; added++; }
else if (o.score !== c.score) conflict++;
});
t.pending.concat(g.pending || []).forEach(function (p) { if (!have[p.code]) pend[p.code] = p; });
t.pending = Object.keys(pend).map(function (k) { return pend[k]; });
return { added: added, conflict: conflict };
}
function splitByPortal(raw, lenBefore) {
    var built = buildSemesters(raw, W._parsedRows || []);
    var stats = { added: 0, conflict: 0 };
if (!built || !built.length) return stats;
    var blob = U.semesters.length > lenBefore ? U.semesters[lenBefore] : null, used = [], n = 0;
    built.forEach(function (g) {
      if (!g.courses.length && !g.pending.length) return;
      var target = U.semesters.filter(function (s) {
        var codes = (s.courses || []).map(function (c) { return c.code; });
        var hit = g.courses.filter(function (c) { return codes.indexOf(c.code) > -1; }).length;
        return codes.length && hit > 0 && hit / codes.length >= 0.5;
      })[0];
      if (target) { var mr = mergeInto(target, g); stats.added += mr.added; stats.conflict += mr.conflict; used.push(target); }
      else {                                              // a fresh object: the old clone copied id, level and GPA fields from another semester
        var e = { id: Date.now() + (n++), name: g.name === 'first' ? 'First Semester' : g.name === 'second' ? 'Second Semester' : 'Third Semester', courses: g.courses.slice(), pending: g.pending.slice() };
        U.semesters.push(e); used.push(e);
      }
    });
    if (blob && used.indexOf(blob) < 0) { var i = U.semesters.indexOf(blob); if (i > -1) U.semesters.splice(i, 1); }
  }

  W.saveSem = function () {
    var courses = readRows();
    if (!courses.length) return showToast('Enter at least one valid course with score (0-100)', 'error');
    var name = (($('c-name') || {}).value || '').trim() || ('Semester ' + (U.semesters.length + 1));
    var lenBefore = U.semesters.length, raw = editing === null ? (W._lastRaw || '') : '', msg, snap = null, extra = '';

    if (editing !== null) {
      var cur = U.semesters.filter(function (x) { return x.id === editing; })[0];
      if (!cur) { editing = null; return showToast('That semester no longer exists', 'error'); }
      cur.name = name; cur.courses = courses; editing = null;
      msg = function () { return 'Updated! GPA ' + semS(cur).g.toFixed(2) + ' | CGPA ' + cum().g.toFixed(2); };
    } else {
      if (U.semesters.some(function (s) { return semPrint(s) === semPrint({ name: name, courses: courses }); })) return showToast('Already recorded - duplicate blocked', 'error');
   snap = JSON.parse(JSON.stringify({ semesters: U.semesters, portalCGPA: U.portalCGPA }));
      var codes = courses.map(function (c) { return c.code; });
      var match = U.semesters.filter(function (s) {
        var sc = (s.courses || []).map(function (c) { return c.code; });
        return codes.filter(function (c) { return sc.indexOf(c) > -1; }).length / codes.length >= 0.6;
      })[0];
      if (match) {                                        // same courses again, results have moved: update in place
        var g0 = cum().g, upd = 0, add = 0;
        courses.forEach(function (c) {
          var ex = match.courses.filter(function (x) { return x.code === c.code; })[0];
          if (ex) { if (ex.score !== c.score || ex.unit !== c.unit) { if (W._ocr) extra = ' | a screenshot score differed, kept your saved one'; else { ex.score = c.score; ex.unit = c.unit; upd++; } } }
          else { match.courses.push(c); add++; match.pending = (match.pending || []).filter(function (p) { return p.code !== c.code; }); }
        });
        refreshCarry();
        (U.cgpaLog = U.cgpaLog || []).push({ t: Date.now(), g: cum().g, d: cum().g - g0 });
        try { track('semester_merged', { updated: upd, added: add }); } catch (e) {}
        msg = function () { var d = cum().g - g0; return 'Merged: ' + upd + ' updated, ' + add + ' added. CGPA ' + cum().g.toFixed(2) + ' (' + (d >= 0 ? '+' : '') + d.toFixed(2) + ')'; };
      } else {
        var same = U.semesters.filter(function (s) { return (s.name || '') === name; })[0];
        if (same) { if (!confirm(name + ' exists with different results. Replace it?')) return; same.courses = courses; }
        else U.semesters.push({ id: Date.now(), name: name, courses: courses });
        msg = function () { return 'Saved! Semester GPA: ' + semS({ courses: courses }).g.toFixed(2) + ' | New CGPA: ' + cum().g.toFixed(2); };
      }
      /* once-only follow-ups, only for a fresh paste of a portal page */
      try { reconcileProfile(courses.map(function (c) { return { code: c.code }; }), W._lastPasteRaw || raw); } catch (e) {}
      if (raw) {
        try { var sp = splitByPortal(raw, lenBefore); if (sp && sp.conflict) extra = ' | ' + sp.conflict + ' score(s) differed, kept your saved ones'; } catch (e) { console.error('split', e); }
        var m = raw.match(/CUMMULATIVE\s+GRADE\s+POINT\s+AVERAGE\s*:?\s*([0-5]\.\d{1,2})/i) || raw.match(/CUMULATIVE[^0-9]{0,8}([0-5]\.\d{1,2})/i);
        if (m) { U.portalCGPA = parseFloat(m[1]); U.portalCGPAAt = Date.now(); }
        try { capturePortalGPAs(); } catch (e) {}
      }
      if (U.semesters.length > lenBefore) {
        try { _introMark('calc'); } catch (e) {}
        try {
          if (W.posthog) posthog.setPersonProperties({ has_results: true, semesters: U.semesters.length });
          track('semester_saved', { semesters: U.semesters.length });
          if (lenBefore === 0) track('first_result_saved', {});
        } catch (e) {}
      }
    }
    W._lastRaw = ''; W._lastPasteRaw = ''; W._parsedRows = []; W._pasted = false; W._ocr = false;
if (snap) { try { var st = JSON.parse(localStorage.getItem('as_undo') || '[]'); st.push({ t: Date.now(), d: snap }); localStorage.setItem('as_undo', JSON.stringify(st.slice(-2))); } catch (e) {} }   // a later manual save must not reuse this paste
    verifyPortalGPAs();
refreshCarry(); save();
    go('home');
    showToast(msg() + extra);
    try { rwDone(); } catch (e) {}
  };

var pendUnits = function (s) { return (s.pending || []).reduce(function (a, cc) { return a + (+cc.unit || 0); }, 0); };
function verifyPortalGPAs() {
var changed = false;
(U.semesters || []).forEach(function (s) {
if (s.portalGPA == null) return;
var st = semS({ courses: s.courses || [] }), reg = st.u + pendUnits(s);
if (!st.u) return;
var ok = Math.abs(st.q / reg - s.portalGPA) <= 0.015 || Math.abs(st.q / st.u - s.portalGPA) <= 0.015;
if (!ok) { s.portalGPAUnverified = s.portalGPA; delete s.portalGPA; s.check = 'mismatch'; changed = true; }
else if (s.check) { delete s.check; changed = true; }
});
if (changed) save();
}
W.capturePortalGPAs = function () {
var groups = typeof semGroupsFromRaw === 'function' ? semGroupsFromRaw(W._lastRaw || '') : null;
if (!groups) return;
groups.forEach(function (g) {
var m = g.section.match(/Grade Point Average\s*\(GPA\)\s*:?\s*([0-5]\.\d{1,2})/i);
if (!m) return;
var codes = g.section.match(/\b[A-Z]{2,6}(?:-[A-Z]{2,6})?\d{3}\b/g) || [], best = null, bh = 0;
(U.semesters || []).forEach(function (s) {
var have = (s.courses || []).concat(s.pending || []).map(function (x) { return x.code; });
var hit = codes.filter(function (x) { return have.indexOf(x) > -1; }).length;
if (hit > bh) { bh = hit; best = s; }
});
if (best) { best.portalGPA = parseFloat(m[1]); delete best.portalGPAUnverified; delete best.check; }
});
verifyPortalGPAs();
try { deduceMissing(); } catch (e) {}
save();
};
W.undoCount = function () { try { return JSON.parse(localStorage.getItem('as_undo') || '[]').length; } catch (e) { return 0; } };
W.undoImport = function () {
var st = []; try { st = JSON.parse(localStorage.getItem('as_undo') || '[]'); } catch (e) {}
var u = st.pop(); try { localStorage.setItem('as_undo', JSON.stringify(st)); } catch (e) {}
if (!u) return showToast('Nothing to undo on this device', 'error');
U.semesters = u.d.semesters;
if (u.d.portalCGPA == null) delete U.portalCGPA; else U.portalCGPA = u.d.portalCGPA;
refreshCarry(); save(); aTab = 'rec'; go('acad');
showToast('Last import undone');
};
var startBase2 = W.start;
W.start = function () { try { if (U && U.undo) { delete U.undo; save(); } } catch (e) {} try { verifyPortalGPAs(); } catch (e) {} return startBase2.apply(this, arguments); };
})();
