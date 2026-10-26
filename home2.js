/* Academic Summit - home2.js v2: the approved new Home, dressed in your Ember Circuit UI
   (uses .card, .btn, .grad, .lbl, var(--sub/--mut), emerald accent, gold only for earned moments).
   Safe by design: if anything fails, the old Home is shown instead.
   Delete the script tag and the old Home returns untouched.
   Load AFTER zuma.js and BEFORE delights.js (wire.js does this for you). */
(function () {
'use strict';
var W = window;
if (typeof V === 'undefined' || typeof V.home !== 'function') return;
var oldHome = V.home;

var CODE = /^[A-Z]{2,4}[- ]?\d{3}[A-Z]?$/;
var SKIP = /semester|histor|result|file|mark|log|lec/i;

function isoLocal(d) { d = d || new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

/* find the student's registered courses without knowing the field name:
   an array of objects that all have a course-code "code" */
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

/* open a door by whatever the app calls it; never crashes */
var DOORS = { acad: ['academics', 'acad', 'courses', 'study'], att: ['attendance', 'att', 'attend'], plan: ['planner', 'plan'] };
W.h2go = function (kind) {
  var names = DOORS[kind] || [];
  for (var i = 0; i < names.length; i++) if (V[names[i]]) { W.go(names[i]); return; }
  if (W.showToast) W.showToast('Opening soon');
};
W.h2locked = function () { if (W.showToast) W.showToast('Finish your reviews first'); };

function img(pose, px) { return W.zumaImg ? W.zumaImg(pose, px) : ''; }

function home2() {
  var name = ((U.name || (U.profile && U.profile.name) || '') + '').trim().split(/\s+/)[0] || 'there';
  var hr = new Date().getHours(), gr = hr < 12 ? 'Good morning' : hr < 17 ? 'Good afternoon' : 'Good evening';
  var si = W.streakInfo ? W.streakInfo() : null, n = (si && si.n) || 0;
  var cs = myCourses(), log = U.readLog || {};
  var done = log[isoLocal()] || log[new Date().toISOString().slice(0, 10)] || [];
  var unread = cs.filter(function (c) { return done.indexOf(c.code) < 0; });
  var due = []; try { if (W.StudyCore && U.study && U.study.items) due = W.StudyCore.dueNow(U.study.items, isoLocal()); } catch (e) {}
  var locked = due.length > 0;

  var h = '<div class="space-y-4">' +
    '<div class="flex items-center justify-between"><div><div class="text-xs" style="color:var(--mut)">' + gr + ', ' + esc(name) + '</div>' +
    '<div class="text-2xl font-extrabold">Today</div></div>' +
    '<div class="px-3 py-2 rounded-full text-xs font-extrabold" style="background:rgba(5,150,105,.12);color:#059669">' + (n > 0 ? n + '-day streak' : 'Start a streak') + '</div></div>';

  if (locked) {
    var names = {}; due.forEach(function (x) { names[x.course] = 1; });
    h += '<div class="card flex items-center gap-3" style="padding:14px;border:1px solid rgba(16,185,129,.45)">' + img('point', 78) +
      '<div class="flex-1"><div class="font-extrabold">' + due.length + ' quick review' + (due.length > 1 ? 's' : '') + ' first</div>' +
      '<div class="text-xs mb-2" style="color:var(--mut)">Questions on ' + esc(Object.keys(names).slice(0, 3).join(', ')) + '</div>' +
      '<button class="btn" style="min-height:44px;padding:0 18px" onclick="h2go(\'acad\')">Start reviews</button></div></div>';
  }

  if (!cs.length) {
    h += '<div class="card flex items-center gap-3" style="padding:16px">' + img('welcome', 90) +
      '<div class="flex-1"><div class="font-extrabold">Add your courses</div><div class="text-xs mb-2" style="color:var(--mut)">Your daily reading plan starts once your courses are in.</div>' +
      '<button class="btn" style="min-height:44px;padding:0 18px" onclick="h2go(\'acad\')">Add courses</button></div></div>';
  } else if (!unread.length) {
    h += '<div class="card flex items-center gap-3" style="padding:16px">' + img('cheer', 84) +
      '<div class="flex-1"><div class="font-extrabold mk-gold">All done today</div><div class="text-xs" style="color:var(--mut)">Come back tomorrow. Your streak is safe.</div></div></div>';
  } else {
    var c = unread[0];
    h += '<div class="grad" style="padding:18px;border-radius:24px;color:#fff;' + (locked ? 'opacity:.62' : '') + '">' +
      '<div class="lbl" style="color:rgba(255,255,255,.85)">' + (locked ? 'Unlocks after reviews' : 'Today\'s reading') + '</div>' +
      '<div style="font-size:22px;font-weight:800;margin:8px 0 2px">' + esc(c.title || c.code) + '</div>' +
      '<div style="font-size:13px;color:rgba(255,255,255,.85)">' + esc(c.code) + (c.units ? ' | ' + esc(c.units) + ' units' : '') + '</div>' +
      '<button aria-label="Start reading" onclick="' + (locked ? 'h2locked()' : 'h2go(\'acad\')') + '" style="position:relative;margin-top:14px;width:56px;height:56px;border-radius:50%;border:0;background:#fff;display:flex;align-items:center;justify-content:center">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" fill="#059669"/></svg></button></div>';
  }

  if (cs.length) {
    h += '<div class="lbl" style="margin-top:4px">Today\'s courses</div><div class="space-y-2">' +
      cs.slice(0, 4).map(function (c) {
        var rd = done.indexOf(c.code) > -1;
        return '<div class="flex items-center gap-3"><div style="width:46px;height:46px;border-radius:12px;background:var(--sub);color:#059669;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px">' + esc(c.code.replace(/[^A-Za-z]/g, '').slice(0, 3)) + '</div>' +
          '<div class="flex-1"><div class="text-sm font-extrabold">' + esc(c.code) + '</div><div class="text-xs" style="color:var(--mut)">' + esc(c.title || (c.units ? c.units + ' units' : '')) + '</div></div>' +
          '<div class="text-xs font-extrabold" style="color:' + (rd ? '#059669' : 'var(--mut)') + '">' + (rd ? 'Read today' : 'Not read yet') + '</div></div>';
      }).join('') + '</div>';
  }

  h += '<button class="card w-full flex items-center justify-between text-left" onclick="h2go(\'att\')"><span class="font-extrabold">Mark attendance</span><span style="color:var(--mut)">&rsaquo;</span></button>' +
    '</div>';
  return h;
}

V.home = function () {
  try { return home2(); }
  catch (e) { try { console.error('home2 failed, using old home', e); } catch (_) {} return oldHome.apply(this, arguments); }
};
})();
