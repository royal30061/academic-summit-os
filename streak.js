/* Academic Summit - streak.js: strict reading streaks, visual stakes, freeze tokens.
   Load AFTER home.js. Client-side only: the truth lives in U.readLog (already synced). */
(function () {
'use strict';
var W = window, MAX_BANK = 2, MILESTONE = 7;
var localIso = function (d) { var z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4); return z.toISOString().slice(0, 10); };
function log() { return U.readLog || {}; }
function has(iso) { var l = log()[iso]; return (!!l && l.length > 0) || iso === U.freezeGap; }
function left() { return Math.max(0, U.freezes || 0); }
function chainFrom(iso) { var d = new Date(iso + 'T12:00:00'), n = 0; while (has(localIso(d))) { n++; d.setDate(d.getDate() - 1); } return n; }
W.streakInfo = function () {
  var t = localIso(new Date()), y = localIso(new Date(Date.now() - 864e5)), d2 = localIso(new Date(Date.now() - 2 * 864e5));
  if (has(t)) return { n: chainFrom(t), state: 'safe' };
  if (has(y)) return { n: chainFrom(y), state: 'atrisk' };
  if (U.freezeGap === y) return { n: chainFrom(d2), state: 'atrisk', frozen: true };
  if (has(d2) && left() > 0) return { n: chainFrom(d2), state: 'freezable' };
  return { n: 0, state: 'broken' };
};
var readBase = W.readDone;
W.readDone = function (code) {
  var t = localIso(new Date()), y = localIso(new Date(Date.now() - 864e5)), d2 = localIso(new Date(Date.now() - 2 * 864e5));
  if (!has(t) && !has(y) && has(d2) && left() > 0 && U.freezeGap !== y) {
    U.freezeGap = y; U.freezes = left() - 1; U.freezeSpent = (U.freezeSpent || 0) + 1;
    setTimeout(function () { showToast('❄ Freeze used - your streak survived yesterday'); }, 400);
  }
  readBase(code);
  var si = W.streakInfo();
  if (si.n > 0 && si.n % MILESTONE === 0 && (U.freezeEarnedAt || 0) < si.n && left() < MAX_BANK) {
    U.freezeEarnedAt = si.n; U.freezes = left() + 1; save();
    setTimeout(function () { showToast('❄ Freeze token earned at ' + si.n + ' days. It guards one missed day.'); }, 900);
  }
};
function strip() {
  var si = W.streakInfo(), f = left();
  if (si.state === 'safe' && !f && si.n < 3) return '';
  var m = {
    safe: ['🔥', si.n + '-day streak locked in today.' + (f ? ' ❄' + f + ' freeze banked for emergencies.' : ''), '#047857'],
    atrisk: ['⏳', si.n + '-day streak at risk - complete one reading today to keep it.' + (si.frozen ? ' (❄ covered yesterday)' : ''), '#d97706'],
    freezable: ['❄', 'Missed yesterday. Read today and a freeze token (' + f + ' banked) covers the gap.', '#0284c7'],
    broken: ['💤', Object.keys(log()).length ? 'Streak reset. One reading today starts a new one.' : 'Start your first streak: tick one reading today.', '#94a3b8']
  }[si.state];
  return '<div class="card p-4 flex items-center gap-3" style="border-left:4px solid ' + m[2] + '"><span class="text-xl">' + m[0] + '</span><p class="text-xs font-bold" style="color:' + m[2] + '">' + m[1] + '</p></div>';
}
var vh = V.home;
V.home = function () {
  var h = vh.apply(this, arguments);
  var a = '<button type="button" class="rounded-3xl p-6 grad shadow-lg';
  if (h.indexOf(a) > -1) h = h.replace(a, strip() + a);
  return h;
};
})();
