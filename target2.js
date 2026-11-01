/* Academic Summit - target2.js v1: Target Setup rebuilt as a live, offline planner.
   Modes: finish average | next-semester push | semester-by-semester plan, plus a
   what-if simulator. Reads real cum() data; recalculates on every keystroke. Load last. */
(function () {
'use strict';
var W = window;
if (typeof document === 'undefined') return;
function UU() { return (typeof U !== 'undefined' && U) ? U : null; }
function E(s) { return (typeof esc === 'function') ? esc(s) : String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function gid(id) { return document.getElementById(id); }
function toast(m, k) { if (W.showToast) W.showToast(m, k); }
function num(id, fb) { var el = gid(id); var v = el ? parseFloat(el.value) : NaN; return isNaN(v) ? fb : v; }
function cur() { return (typeof cum === 'function') ? cum() : { u: 0, q: 0, g: 0 }; }
function col(need) { return need < 0 ? '#059669' : need <= 3.5 ? '#10b981' : need <= 4.5 ? '#f59e0b' : need <= 5 ? '#d97706' : '#e11d48'; }
function shape(need) {
  if (need <= 0) return 'You are already at or above this dream - protect it.';
  if (need >= 5) return 'Only a straight 5.00 (all A) gets there.';
  if (need >= 4) return 'Roughly ' + Math.round((need - 4) * 100) + '% of your remaining units at A, the rest at B.';
  if (need >= 3) return 'Roughly ' + Math.round((need - 3) * 100) + '% at B, the rest at C - very climbable.';
  if (need >= 2) return 'Mostly C with some D - comfortable margin.';
  return 'Below C average - consider whether your dream is ambitious enough.';
}
function verdict(need, maxFin) {
  if (need < 0) return 'Already secured - your current CGPA exceeds this dream.';
  if (need > 5) return 'Out of reach in the remaining units. Even straight 5.00 finishes you at ' + maxFin.toFixed(2) + ' - aim there, or add units through retakes and extra courses.';
  if (need >= 4.5) return 'Elite territory - near-straight As. Possible, but demanding.';
  if (need >= 3.5) return 'A strong B/A mix gets you there. Fully realistic.';
  return 'Very achievable with steady work.';
}
ACAD.tgt = function () {
  var u = UU(); if (!u) return;
  var c = cur();
  var T = num('tg-t', (u.profile && u.profile.totalUnits) || 120);
  var D = num('tg-d', u.target || 4.5);
  var avgSem = (c.u && (u.semesters || []).length) ? Math.round(c.u / u.semesters.length) : 20;
  var pend = 0; (u.semesters || []).forEach(function (s) { (s.pending || []).forEach(function (p) { pend += +p.unit || 0; }); });
  var R = Math.max(0, T - c.u);
  var defN = pend || avgSem || 20;
  var defK = Math.max(1, Math.ceil(R / (avgSem || 20)));
  var m = W.tgtMode || 'finish';
  var chipB = function (k, t) { return '<button onclick="tgtSetMode(\'' + k + '\')" class="' + (m === k ? 'btn' : 'btn2') + ' whitespace-nowrap text-xs">' + t + '</button>'; };
  var row = function (id, lbl, val, ph, hide) { return '<div id="wrap-' + id + '"' + (hide ? ' style="display:none"' : '') + '><div class="lbl">' + lbl + '</div><input id="' + id + '" type="number" step="0.01" class="inp mt-1" value="' + val + '" placeholder="' + ph + '" oninput="tgtCalc()"></div>'; };
  $('sub').innerHTML = '<div class="card p-6 space-y-4">' +
    '<div class="space-y-1"><div class="font-extrabold">Target Setup</div><p class="text-xs text-slate-500">Live planner - every field recalculates instantly, on-device, from your real results. No internet needed.</p></div>' +
    '<div class="flex gap-2 overflow-x-auto pb-1">' + chipB('finish', 'Finish average') + chipB('next', 'Next-semester push') + chipB('plan', 'Semester-by-semester') + '</div>' +
    '<div class="grid grid-cols-3 gap-3 p-4 rounded-2xl" style="background:var(--sub)">' +
    '<div><div class="lbl">Current CGPA</div><div class="text-2xl font-extrabold">' + c.g.toFixed(2) + '</div></div>' +
    '<div><div class="lbl">Units done</div><div class="text-2xl font-extrabold">' + c.u + '</div></div>' +
    '<div><div class="lbl">Points banked</div><div class="text-2xl font-extrabold">' + c.q.toFixed(1) + '</div></div>' +
    '<p class="text-[11px] text-slate-500 col-span-3">' + (u.semesters || []).length + ' semester(s) released • ' + R + ' units remaining of ' + T + '.</p></div>' +
    '<div class="grid sm:grid-cols-2 gap-3">' +
    row('tg-d', 'Dream CGPA', D, '4.70', false) +
    row('tg-t', 'Total graduation units', T, '120', false) +
    row('tg-n', 'Next semester units', num('tg-n', defN), '20', m !== 'next') +
    row('tg-k', 'Remaining semesters', num('tg-k', defK), '4', m !== 'plan') +
    '</div>' +
    '<div id="tgt-res" class="space-y-3"></div>' +
    '<div class="p-4 rounded-2xl space-y-2" style="background:var(--sub)"><div class="lbl">What-if simulator</div><div class="flex items-center gap-2"><input id="tg-w" type="number" step="0.01" class="inp" value="' + (num('tg-w', NaN) || '') + '" placeholder="Average you expect to score" oninput="tgtCalc()"><span class="text-xs text-slate-500 shrink-0">from here to finish</span></div><div id="tg-wres" class="text-xs"></div></div>' +
    '<div class="flex gap-2 flex-wrap"><button class="btn2" onclick="tgtSaveTarget()">Set dream as my target</button><button class="btn2" onclick="tgtCopy()">Copy my plan</button></div>' +
    '</div>';
  tgtCalc();
};
W.tgtSetMode = function (m) { W.tgtMode = m; ACAD.tgt(); };
W.tgtSaveTarget = function () {
  var d = num('tg-d', 0); if (!(d > 0 && d <= 5)) return toast('Dream must be between 0 and 5', 'error');
  var u = UU(); u.target = d; try { if (typeof save === 'function') save(); } catch (e) {}
  toast('Target updated to ' + d.toFixed(2));
};
W.tgtCalc = function () {
  var u = UU(); if (!u) return;
  var c = cur();
  var T = num('tg-t', (u.profile && u.profile.totalUnits) || 120);
  var D = num('tg-d', u.target || 4.5);
  var n = num('tg-n', 20), k = Math.max(1, num('tg-k', 2)), w = num('tg-w', NaN);
  var R = Math.max(0, T - c.u);
  var maxFin = R ? (c.q + 5 * R) / T : c.g;
  var m = W.tgtMode || 'finish';
  var need = null, head = '', sub = '';
  if (m === 'finish') { need = R ? (D * T - c.q) / R : null; head = 'Average needed across ALL remaining units'; sub = 'Over ' + R + ' remaining units to finish at ' + D.toFixed(2) + '.'; }
  else if (m === 'next') { need = n ? (D * (c.u + n) - c.q) / n : null; head = 'GPA needed NEXT semester only'; sub = 'Assumes ' + n + ' units next semester and reaches ' + D.toFixed(2) + ' right after it.'; }
  else { need = R ? (D * T - c.q) / R : null; head = 'Average needed EACH remaining semester'; sub = k + ' semester(s) of about ' + Math.round(R / k) + ' units each.'; }
  var html = '';
  if (!c.u) html += '<p class="text-xs text-slate-500">Import your first result and these numbers become real.</p>';
  if (need === null) html += '<p class="text-xs text-slate-500">Adjust the units above to see the plan.</p>';
  else {
    var cc = col(need);
    html += '<div class="p-5 rounded-2xl text-center space-y-1" style="background:var(--sub);border-left:4px solid ' + cc + '"><div class="lbl">' + head + '</div><div class="text-4xl font-extrabold" style="color:' + cc + '">' + (need < 0 ? '—' : need.toFixed(2)) + '</div><div class="font-extrabold text-xs">' + sub + '</div></div>';
    html += '<div class="p-4 rounded-2xl text-xs space-y-1" style="background:var(--sub)"><p class="font-semibold" style="color:' + cc + '">' + verdict(need, maxFin) + '</p><p class="text-slate-500">' + shape(need) + '</p><p class="text-slate-500">Ceiling check: straight 5.00 from here finishes you at <b>' + maxFin.toFixed(2) + '</b>.</p></div>';
    if (m === 'plan' && R > 0 && need >= 0 && need <= 5) {
      var s = R / k, rows = '';
      for (var i = 1; i <= k && i <= 8; i++) { var uu = c.u + s * i, qq = c.q + need * s * i; rows += '<div class="flex justify-between text-xs py-1.5 border-b border-slate-200/40"><span>After semester ' + i + '</span><b>' + (qq / uu).toFixed(2) + '</b></div>'; }
      html += '<div class="p-4 rounded-2xl space-y-1" style="background:var(--sub)"><div class="lbl">Your climb if you hold ' + need.toFixed(2) + ' each semester</div>' + rows + '</div>';
    }
  }
  var res = gid('tgt-res'); if (res) res.innerHTML = html;
  var wr = gid('tg-wres');
  if (wr) {
    if (!isNaN(w) && R) {
      var fin = (c.q + w * R) / T;
      wr.innerHTML = '<p class="font-semibold">Averaging ' + w.toFixed(2) + ' across ' + R + ' remaining units finishes you at <b style="color:' + col(fin) + '">' + fin.toFixed(2) + '</b> vs dream ' + D.toFixed(2) + ' (' + (fin >= D ? 'ahead by ' + (fin - D).toFixed(2) : 'short by ' + (D - fin).toFixed(2)) + ').</p>';
    } else wr.innerHTML = '<p class="text-[11px] text-slate-500">Type any average (e.g. 4.30) to see exactly where it lands you.</p>';
  }
  W.__tgtPlan = { mode: m, dream: D, need: need, maxFin: maxFin, cgpa: c.g, units: c.u };
  try { if (typeof track === 'function') track('target_calculated', { mode: m }); } catch (e) {}
};
W.tgtCopy = function () {
  var p = W.__tgtPlan || {};
  var t = 'Academic Summit plan\nCurrent CGPA ' + (p.cgpa || 0).toFixed(2) + ' over ' + (p.units || 0) + ' units\nDream ' + (p.dream || 0).toFixed(2) + '\nMode: ' + p.mode + ' - required ' + (p.need != null ? p.need.toFixed(2) : 'n/a') + '\nCeiling with straight 5.00: ' + (p.maxFin || 0).toFixed(2);
  function legacy() { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); toast('Plan copied'); } catch (e) { toast('Copy not supported'); } ta.remove(); }
  if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(function () { toast('Plan copied'); }, legacy); else legacy();
};
})();
