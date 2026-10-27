/* Academic Summit - resit.js: carryover re-sit logic, pure (no UI, no network).
   Works in the browser (window.Resit) and in Node (require). Portal CGPA is the judge. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Resit = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  var PTS = { A: 5, B: 4, C: 3, D: 2, E: 1, F: 0 };
  function norm(c) { return String(c || '').replace(/\s+/g, '').toUpperCase(); }
  function pts(g, scale) {
    var k = String(g == null ? '' : g).trim().toUpperCase(), sc = scale || PTS;
    return Object.prototype.hasOwnProperty.call(sc, k) ? sc[k] : null;
  }
  function cgpa(attempts, rule, scale) {
    var list = attempts.filter(function (a) { return pts(a.grade, scale) != null && +a.units > 0; });
    if (rule === 'replace') {
      var last = {};
      list.forEach(function (a) { var k = norm(a.code); if (!last[k] || a.order >= last[k].order) last[k] = a; });
      list = Object.keys(last).map(function (k) { return last[k]; });
    }
    var u = 0, p = 0;
    list.forEach(function (a) { u += +a.units; p += pts(a.grade, scale) * +a.units; });
    return u ? { cgpa: p / u, units: u, points: p } : null;
  }
  function repeats(attempts) {
    var seen = {}, rep = {};
    attempts.forEach(function (a) { var k = norm(a.code); if (seen[k]) rep[k] = true; seen[k] = true; });
    return Object.keys(rep);
  }
  function infer(attempts, portal, scale) {
    var rep = repeats(attempts);
    if (!rep.length) return { rule: 'add', decided: false, reason: 'no re-sits yet, both rules give the same number', repeats: rep };
    if (portal == null || isNaN(portal)) return { rule: null, decided: false, reason: 'no portal CGPA to compare', repeats: rep };
    var a = cgpa(attempts, 'add', scale), r = cgpa(attempts, 'replace', scale);
    var da = Math.abs(a.cgpa - portal), dr = Math.abs(r.cgpa - portal), TOL = 0.0051;
    var out = { repeats: rep, add: a.cgpa, replace: r.cgpa, gap: Math.min(da, dr) };
    if (da <= TOL && dr <= TOL) { out.rule = null; out.decided = false; out.reason = 'both rules match, ambiguous'; }
    else if (da <= TOL) { out.rule = 'add'; out.decided = true; }
    else if (dr <= TOL) { out.rule = 'replace'; out.decided = true; }
    else { out.rule = null; out.decided = false; out.reason = 'neither rule reproduces the portal CGPA. Courses may be missing or awaiting upload'; }
    return out;
  }
  function project(attempts, rule, clears, scale) {
    var next = attempts.reduce(function (m, a) { return Math.max(m, a.order); }, 0) + 1;
    var extra = clears.map(function (c) { return { code: c.code, units: c.units, grade: c.grade, order: next }; });
    return cgpa(attempts.concat(extra), rule, scale);
  }
  return { cgpa: cgpa, infer: infer, project: project, repeats: repeats, norm: norm };
});
