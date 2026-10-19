/* Academic Summit - savefix.js
   Load LAST (after fixes.js). Replaces saveSem with a merge that never
   deletes: incomplete pastes can add and update, never remove. Misread
   codes heal when unit+score match exactly one saved course the paste forgot. */
(function () {
'use strict';
var W = window;
if (typeof W.ocrPick === 'function') {
  var ocrBase = W.ocrPick;
  W.ocrPick = function () { W._ocrUsed = Date.now(); return ocrBase.apply(this, arguments); };
}
function readRows() {
  var out = [];
  document.querySelectorAll('#rows > div').forEach(function (r) {
    var code = r.querySelector('.c-code').value.trim().toUpperCase(), unit = parseFloat(r.querySelector('.c-unit').value), sc = r.querySelector('.c-score').value;
    if (code && unit >= 1 && unit <= 6 && sc !== '' && +sc >= 0 && +sc <= 100) out.push({ code: code, unit: unit, score: +sc });
  });
  return out;
}
function mergeGroup(target, g) {
  target.courses = target.courses || []; target.pending = target.pending || [];
  var saved = {}, paste = {}, healed = [];
  target.courses.forEach(function (c) { saved[c.code] = c; });
  g.courses.forEach(function (c) { paste[c.code] = c; });
  g.courses.forEach(function (c) {
    if (saved[c.code]) return;
    var cands = target.courses.filter(function (s) { return !paste[s.code] && s.unit === c.unit && s.score === c.score; });
    if (cands.length === 1) { cands[0].score = c.score; cands[0].unit = c.unit; paste[cands[0].code] = c; healed.push(c.code + '→' + cands[0].code); c._healed = 1; }
  });
  g.courses.forEach(function (c) {
    if (c._healed) return;
    var ex = saved[c.code];
    if (ex) { ex.score = c.score; ex.unit = c.unit; }
    else target.courses.push({ code: c.code, unit: c.unit, score: c.score });
  });
  var scoredNow = {};
  target.courses.forEach(function (c) { scoredNow[c.code] = 1; });
  (g.pending || []).forEach(function (p) {
    if (scoredNow[p.code]) return;
    var ex = target.pending.filter(function (x) { return x.code === p.code; })[0];
    if (ex) ex.unit = p.unit; else target.pending.push({ code: p.code, unit: p.unit });
  });
  return healed;
}
function diffNote(target, g) {
  var paste = {}; g.courses.forEach(function (c) { paste[c.code] = 1; });
  return {
    added: g.courses.filter(function (c) { return !target.courses.some(function (s) { return s.code === c.code; }); }).map(function (c) { return c.code; }),
    missing: target.courses.filter(function (s) { return !paste[s.code]; }).map(function (s) { return s.code; })
  };
}
function splitGroups(raw, lenBefore) {
  var built = (typeof buildSemesters === 'function') ? buildSemesters(raw, W._parsedRows || []) : null;
  if (!built || !built.length) return [];
  var blob = U.semesters.length > lenBefore ? U.semesters[lenBefore] : null, used = [], healedAll = [], n = 0;
  built.forEach(function (g) {
    if (!g.courses.length && !g.pending.length) return;
    var target = U.semesters.filter(function (s) {
      var codes = (s.courses || []).map(function (c) { return c.code; });
      var hit = g.courses.filter(function (c) { return codes.indexOf(c.code) > -1; }).length;
      return codes.length && hit > 0 && hit / codes.length >= 0.5;
    })[0];
    if (!target) {
      target = { id: Date.now() + (n++), name: g.name === 'first' ? 'First Semester' : g.name === 'second' ? 'Second Semester' : 'Third Semester', courses: [], pending: [] };
      U.semesters.push(target);
    }
    if (W._ocrUsed && Date.now() - W._ocrUsed < 300000) {
      var d = diffNote(target, g);
      if (d.added.length && d.missing.length &&
          !confirm('This screenshot adds ' + d.added.join(', ') + ' and does not mention ' + d.missing.join(', ') + '.\nSaved courses are never deleted. Continue merging?')) return;
    }
    healedAll = healedAll.concat(mergeGroup(target, g));
    used.push(target);
  });
  if (blob && used.indexOf(blob) < 0) { var i = U.semesters.indexOf(blob); if (i > -1) U.semesters.splice(i, 1); }
  return healedAll;
}
W.saveSem = function () {
  var courses = readRows();
  if (!courses.length) return showToast('Enter at least one valid course with score (0-100)', 'error');
  var name = (($('c-name') || {}).value || '').trim() || ('Semester ' + (U.semesters.length + 1));
  var lenBefore = U.semesters.length, raw = editing === null ? (W._lastRaw || '') : '', msg, healed = [];
  if (editing !== null) {
    var cur = U.semesters.filter(function (x) { return x.id === editing; })[0];
    if (!cur) { editing = null; return showToast('That semester no longer exists', 'error'); }
    cur.name = name; cur.courses = courses; editing = null;
    msg = function () { return 'Updated! GPA ' + semS(cur).g.toFixed(2) + ' | CGPA ' + cum().g.toFixed(2); };
  } else {
    if (U.semesters.some(function (s) { return semPrint(s) === semPrint({ name: name, courses: courses }); })) return showToast('Already recorded - duplicate blocked', 'error');
    var match = U.semesters.filter(function (s) {
      var sc = (s.courses || []).map(function (c) { return c.code; });
      return sc.length && courses.filter(function (c) { return sc.indexOf(c.code) > -1; }).length / courses.length >= 0.6;
    })[0];
    if (match) {
      var g0 = cum().g;
      healed = mergeGroup(match, { courses: courses, pending: [] });
      refreshCarry();
      (U.cgpaLog = U.cgpaLog || []).push({ t: Date.now(), g: cum().g, d: cum().g - g0 });
      msg = function () { var d = cum().g - g0; return 'Merged (nothing deleted). CGPA ' + cum().g.toFixed(2) + ' (' + (d >= 0 ? '+' : '') + d.toFixed(2) + ')' + (healed.length ? ' | healed: ' + healed.join(', ') : ''); };
    } else {
      var same = U.semesters.filter(function (s) { return (s.name || '') === name; })[0];
      if (same) { if (!confirm(name + ' exists with different results. Replace it?')) return; same.courses = courses; }
      else U.semesters.push({ id: Date.now(), name: name, courses: courses, pending: [] });
      msg = function () { return 'Saved! Semester GPA: ' + semS({ courses: courses }).g.toFixed(2) + ' | New CGPA: ' + cum().g.toFixed(2); };
    }
    if (raw) {
      healed = healed.concat(splitGroups(raw, lenBefore));
      var m = raw.match(/CUMMULATIVE\s+GRADE\s+POINT\s+AVERAGE\s*:?\s*([0-5]\.\d{1,2})/i) || raw.match(/CUMULATIVE[^0-9]{0,8}([0-5]\.\d{1,2})/i);
      if (m) { U.portalCGPA = parseFloat(m[1]); U.portalCGPAAt = Date.now(); }
      try { capturePortalGPAs(); } catch (e) {}
    }
    if (U.semesters.length > lenBefore) {
      try { _introMark('calc'); } catch (e) {}
      try { if (W.posthog) posthog.setPersonProperties({ has_results: true, semesters: U.semesters.length }); track('semester_saved', { semesters: U.semesters.length }); if (lenBefore === 0) track('first_result_saved', {}); } catch (e) {}
    }
  }
  W._lastRaw = ''; W._lastPasteRaw = ''; W._parsedRows = []; W._pasted = false;
  refreshCarry(); save();
  go('home');
  showToast(msg());
  try { rwDone(); } catch (e) {}
};
})();
