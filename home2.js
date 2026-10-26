/* Academic Summit - home2.js v3: the approved Home, no play button.
   The gradient card IS the door (tap anywhere -> Study session).
   Reviews-first card when spaced reviews are due; course rows carry %.
   Load AFTER zuma.js, BEFORE delights.js. */
(function () {
'use strict';
var W = window;
if (typeof V === 'undefined' || typeof V.home !== 'function') return;
var oldHome = V.home;
var CODE = /^[A-Z]{2,4}[- ]?\d{3}[A-Z]?$/;
var SKIP = /semester|histor|result|file|mark|log|lec/i;
var LMIN = { 1: 15, 2: 23, 3: 45, 4: 60 };
function isoLocal(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function scan(o, path, depth, found) {
  if (!o || typeof o !== 'object' || depth > 3) return;
  if (Array.isArray(o)) {
    var ok = o.length && o.every(function (x) { return x && typeof x === 'object' && typeof x.code === 'string' && CODE.test(x.code.replace(/^UA-/i, '').trim().toUpperCase()); });
    if (ok) found.push({ path: path, list: o });
    return;
  }
  Object.keys(o).forEach(function (k) { if (!SKIP.test(k)) scan(o[k], path + '.' + k, depth + 1, found); });
}
function myCourses() {
  var f = []; try { scan(U, 'U', 0, f); } catch (e) {}
  if (!f.length) return [];
  f.sort(function (a, b) { return (/reg|current|course/i.test(b.path) ? 1000 : 0) + b.list.length - ((/reg|current|course/i.test(a.path) ? 1000 : 0) + a.list.length); });
  var seen = {}, out = [];
  f[0].list.forEach(function (c) {
    var k = c.code.toUpperCase(); if (seen[k]) return; seen[k] = 1;
    out.push({ code: c.code, title: c.title || c.name || '', units: c.units || c.unit || '' });
  });
  return out;
}
W.h2courses = myCourses;
var DOORS = { study: ['study'], acad: ['study'], res: ['traj'], att: ['att', 'attendance'], plan: ['planner', 'plan'], read: ['read'] };
W.h2go = function (kind) {
  var names = DOORS[kind] || [];
  for (var i = 0; i < names.length; i++) if (V[names[i]]) { W.go(names[i]); return; }
  if (W.showToast) W.showToast('Opening soon');
};
W.h2locked = function () { if (W.showToast) W.showToast('Finish your reviews first'); };
function img(pose, px) { return W.zumaImg ? W.zumaImg(pose, px) : ''; }
function prog(code) {
  try {
    var c = U.study && U.study.courses && U.study.courses[code]; if (!c) return null;
    var tot = 0, dn = 0;
    (c.topics || []).forEach(function (t) { (t.sections || []).forEach(function (s) { tot++; if (s.doneOn) dn++; }); });
    return tot ? Math.round(dn / tot * 100) : 0;
  } catch (e) { return null; }
}
function nextSec(code) {
  try {
    var c = U.study && U.study.courses && U.study.courses[code]; if (!c) return null;
    var i = 0, tot = 0;
    (c.topics || []).forEach(function (t) { (t.sections || []).forEach(function (s) { tot++; if (!s.doneOn && !i) i = tot; }); });
    if (!i) return null;
    return { n: i, tot: tot, min: LMIN[c.level || 1] || 15, title: c.sectionTitle || '' };
  } catch (e) { return null; }
}
function dueReviews() {
  try {
    var t = isoLocal();
    return ((U.study && U.study.reviews) || []).filter(function (r) { return !r.doneOn && r.dueOn <= t; });
  } catch (e) { return []; }
}
function home2() {
if (U && U.role === 'lecturer') return oldHome.apply(this, arguments);
  var name = ((U.name || (U.profile && U.profile.name) || '') + '').trim().split(/\s+/)[0] || 'there';
  var hr = new Date().getHours(), gr = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  var si = W.streakInfo ? W.streakInfo() : null, n = (si && si.n) || 0;
  var cs = myCourses(), log = U.readLog || {};
  var done = log[isoLocal()] || [];
  var unread = cs.filter(function (c) { return done.indexOf(c.code) < 0; });
  var due = dueReviews(), locked = due.length > 0;
  var h = '<div class="space-y-4">' +
    '<div class="flex items-center justify-between"><div><div class="text-xs" style="color:var(--mut)">' + gr + ', ' + esc(name) + '</div>' +
    '<div class="text-2xl font-extrabold">Today</div></div>' +
    '<div class="px-3 py-2 rounded-full text-xs font-extrabold" style="background:rgba(5,150,105,.12);color:#059669">' + (n > 0 ? 'Day ' + n + ' streak' : 'Start a streak') + '</div></div>';
  if (locked) {
    var names = {}; due.forEach(function (x) { names[x.code] = 1; });
    h += '<div class="card flex items-center gap-3" style="padding:14px;border:1px solid rgba(16,185,129,.45)">' + img('point', 78) +
      '<div class="flex-1"><div class="font-extrabold">' + due.length + ' quick review' + (due.length > 1 ? 's' : '') + ' first</div>' +
      '<div class="text-xs mb-2" style="color:var(--mut)">Day-' + due[0].phase + ' questions on ' + esc(Object.keys(names).slice(0, 2).join(' and ')) + '</div>' +
      '<button class="btn" style="min-height:44px;padding:0 18px" onclick="h2go(\'study\')">Start reviews</button></div></div>';
  }
  if (!cs.length) {
    h += '<div class="card flex items-center gap-3" style="padding:16px">' + img('welcome', 90) +
      '<div class="flex-1"><div class="font-extrabold">Add your courses</div><div class="text-xs mb-2" style="color:var(--mut)">Your daily study plan starts once your courses are in.</div>' +
      '<button class="btn" style="min-height:44px;padding:0 18px" onclick="h2go(\'acad\')">Add courses</button></div></div>';
  } else if (!unread.length) {
    h += '<div class="card flex items-center gap-3" style="padding:16px">' + img('cheer', 84) +
      '<div class="flex-1"><div class="font-extrabold mk-gold">All done today</div><div class="text-xs" style="color:var(--mut)">Come back tomorrow. Your streak is safe.</div></div></div>';
  } else {
    var c = unread[0], ns = nextSec(c.code), p = prog(c.code);
    h += '<button type="button" class="grad w-full text-left" style="padding:18px;border-radius:24px;color:#fff;border:none;cursor:pointer;' + (locked ? 'opacity:.62' : '') + '" onclick="' + (locked ? 'h2locked()' : 'h2go(\'study\')') + '">' +
      '<div class="lbl" style="color:rgba(255,255,255,.85)">' + (locked ? 'Unlocks after reviews' : 'Today\'s session') + '</div>' +
      '<div style="font-size:22px;font-weight:800;margin:8px 0 2px">' + esc(c.title || c.code) + '</div>' +
      '<div style="font-size:13px;color:rgba(255,255,255,.85)">' + esc(c.code) + (ns ? ' | Section ' + ns.n + ' of ' + ns.tot + ' | ' + ns.min + ' min' : (c.units ? ' | ' + esc(c.units) + ' units' : '')) + '</div>' +
      '<div style="height:6px;border-radius:3px;background:rgba(255,255,255,.18);margin-top:14px"><div style="height:100%;border-radius:3px;width:' + (p == null ? 0 : p) + '%;background:#34d399"></div></div></button>';
  }
  if (cs.length) {
    h += '<div class="lbl" style="margin-top:4px">Today\'s courses</div><div class="space-y-2">' +
      cs.slice(0, 4).map(function (c) {
        var rd = done.indexOf(c.code) > -1, p = prog(c.code);
        return '<div class="flex items-center gap-3"><div style="width:46px;height:46px;border-radius:12px;background:var(--sub);color:#059669;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px">' + esc(c.code.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()) + '</div>' +
          '<div class="flex-1"><div class="text-sm font-extrabold">' + esc(c.code) + '</div><div class="text-xs" style="color:var(--mut)">' + (nextSec(c.code) ? nextSec(c.code).min + ' min | Level ' + ((U.study && U.study.courses && U.study.courses[c.code] || {}).level || 1) : (c.units ? c.units + ' units' : '')) + '</div></div>' +
          '<div class="text-xs font-extrabold" style="color:' + (rd ? '#059669' : 'var(--mut)') + '">' + (p != null ? p + '%' : (rd ? 'Read today' : 'Not read yet')) + '</div></div>';
      }).join('') + '</div>';
  }
  h += '<button class="card w-full flex items-center justify-between text-left" onclick="h2go(\'att\')"><span class="font-extrabold">Mark attendance</span><span style="color:var(--mut)">›</span></button>' +
    '</div>';
  return h;
}
V.home = function () {
  try { return home2(); }
  catch (e) { try { console.error('home2 failed, using old home', e); } catch (_) {} return oldHome.apply(this, arguments); }
};
})();
