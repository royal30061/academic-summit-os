/* Academic Summit - resit.js v2: carryover tagging from the student's own history.
   Pure logic (no UI, no network, no CGPA maths: the trajectory already owns that).
   Rule: a course code's first digit is its level (1xx = 100). A course below the
   semester's level is a re-sit only if an earlier attempt of that same code is on file.
   Direct-entry students start higher, so their lower-level courses are first attempts. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Resit = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  function norm(c) { return String(c || '').replace(/\s+/g, '').toUpperCase(); }
  function levelOf(code) { var m = String(code || '').match(/(\d)\d{2}/); return m ? +m[1] * 100 : null; }
  function ord(s) { return (+s.lv || 0) * 2 + (s.half ? 1 : 0); }
  function startLevel(semesters, entry) {
    if (entry && +entry.startLevel) return +entry.startLevel;
    var lvs = (semesters || []).filter(function (s) { return s.courses && s.courses.length; }).map(function (s) { return +s.lv || 0; }).filter(Boolean);
    return lvs.length ? Math.min.apply(null, lvs) : 100;
  }
  function tagMap(semesters, entry) {
    var map = new Map(), sorted = (semesters || []).slice().sort(function (a, b) { return ord(a) - ord(b); });
    var start = startLevel(semesters, entry), seen = {};
    sorted.forEach(function (s) {
      var L = +s.lv || 0, mine = [];
      (s.courses || []).forEach(function (c) {
        var k = norm(c.code), cl = levelOf(c.code), kind = 'first';
        if (seen[k]) kind = 'resit';
        else if (cl != null && L && cl < L) kind = start > cl ? 'late-first' : 'history-missing';
        map.set(c, { kind: kind, from: seen[k] || null });
        mine.push([k, s]);
      });
      mine.forEach(function (p) { if (!seen[p[0]]) seen[p[0]] = (+p[1].lv || 0); });
    });
    return map;
  }
  function levelStatus(semesters, entry, currentLevel, lv) {
    if (currentLevel && lv > currentLevel) return 'future';
    if (lv < startLevel(semesters, entry)) return 'skipped';
    var has = (semesters || []).some(function (s) { return (+s.lv || 0) === lv && s.courses && s.courses.length; });
    return has ? 'ok' : 'upload';
  }
  return { tagMap: tagMap, levelStatus: levelStatus, levelOf: levelOf, startLevel: startLevel, norm: norm };
});
