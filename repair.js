/* Academic Summit - repair.js v2: make up a missed day from the streak calendar.
   Tap a missed day (last 7 days) -> study 120 verified minutes within 48 hours -> the day counts.
   A completed make-up writes the day into the reading log, so the calendar, the streak chip and
   the badges all see it without touching pulse.js. One make-up per week. Isolated: one click
   listener, one observer, every step guarded. Load after pulse.js and study-core.js.
   v2: finds your user id the way the rest of the app does (it used to give up and never finish). */
(function () {
'use strict';
var W = window, NEED = 120, WINDOW_DAYS = 7, HOURS = 48, COOLDOWN_DAYS = 7;
var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var sel = null, note = '', checking = false, lastCheck = 0;
function txt(n) { return ((n && n.textContent) || '').replace(/\s+/g, ' ').trim(); }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function up(t, test, max) { for (var n = t, i = 0; n && n !== document.body && i < (max || 6); n = n.parentNode, i++) if (test(n)) return n; return null; }
function leafWith(text) {
  return Array.from(document.querySelectorAll('div,span,p,h1,h2,h3,b')).filter(function (n) { return n.children.length === 0 && txt(n) === text; })[0] || null;
}
function pad(n) { return (n < 10 ? '0' : '') + n; }
function iso(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
function today() { return iso(new Date()); }
function utc(k) { return Date.UTC(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10)); }
function dayDiff(a, b) { return Math.round((utc(b) - utc(a)) / 864e5); }
function hasLog(k) { var v = (U.readLog || {})[k]; return !!(v && (v.length === undefined || v.length > 0)); }
function pretty(k) {
  var d = new Date(+k.slice(0, 4), +k.slice(5, 7) - 1, +k.slice(8, 10));
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getDay()] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()].slice(0, 3);
}
function shownMonth() {
  var re = new RegExp('^(' + MONTHS.join('|') + ') (\\d{4})$');
  var l = Array.from(document.querySelectorAll('div,span,b,p')).filter(function (n) { return !n.children.length && re.test(txt(n)); })[0];
  if (!l) return null;
  var m = txt(l).match(re); return { y: +m[2], m: MONTHS.indexOf(m[1]) + 1 };
}
function cellKey(cell, sm) { var d = parseInt(txt(cell), 10); return (isNaN(d) || !sm) ? null : sm.y + '-' + pad(sm.m) + '-' + pad(d); }

/* null = nothing to make up here; {ok:false, why} = explain; {ok:true} = can start */
function check(key) {
  var t = today(), p = U.repairPending;
  if (key >= t) return null;
  if (hasLog(key) || key === U.freezeGap) return null;
  if (dayDiff(key, t) > WINDOW_DAYS) return { ok: false, why: 'Only the last ' + WINDOW_DAYS + ' days can be made up.' };
  var last = (U.repairs || []).slice(-1)[0];
  if (last && Date.now() - new Date(last.at).getTime() < COOLDOWN_DAYS * 864e5 && !(p && p.date === key))
    return { ok: false, why: 'You already made up a day this week. One make-up a week keeps your streak honest.' };
  if (p && p.date !== key) return { ok: false, why: 'Finish your current make-up for ' + pretty(p.date) + ' first.' };
  return { ok: true };
}
function preview(key) {
  var SC = W.StudyCore; if (!SC || !SC.streakFromDays) return null;
  var log = U.readLog || {}, days = Object.keys(log).filter(hasLog), extra = U.freezeGap ? [U.freezeGap] : [];
  return { before: SC.streakFromDays(days, today(), [], extra).count, after: SC.streakFromDays(days, today(), [], extra.concat([key])).count };
}
/* who am I: the app's own id first, then the signed-in Supabase user */
function meId() {
  try { if (typeof uid !== 'undefined') { var v = typeof uid === 'function' ? uid() : uid; if (v) return Promise.resolve(v); } } catch (e) {}
  try { if (W._uid) return Promise.resolve(W._uid); if (U && U.uid) return Promise.resolve(U.uid); } catch (e) {}
  try { if (W.sb && W.sb.auth && W.sb.auth.getUser) return W.sb.auth.getUser().then(function (r) { return r && r.data && r.data.user ? r.data.user.id : null; }); } catch (e) {}
  return Promise.resolve(null);
}
function minutesSince(from) {
  if (!W.sb) return Promise.resolve(null);
  return meId().then(function (id) {
    if (!id) return null;
    return W.sb.from('study_sessions').select('minutes,valid,started_at').eq('uid', id).gte('started_at', from)
      .then(function (r) {
        if (!r || r.error) return null;
        return (r.data || []).reduce(function (a, x) { return a + (x.valid ? (+x.minutes || 0) : 0); }, 0);
      });
  }).catch(function () { return null; });
}
function box(inner) { return '<div style="font-weight:800;font-size:15px">' + inner; }
function cardHtml() {
  var p = U.repairPending, n = note ? '<p style="font-size:12px;margin-top:8px;color:var(--mut)">' + esc(note) + '</p>' : '';
  if (p) {
    var need = p.need || NEED, got = Math.min(need, p.got || 0), pct = Math.round(got / need * 100);
    var left = Math.max(0, Math.ceil((HOURS * 36e5 - (Date.now() - new Date(p.startedAt).getTime())) / 36e5));
    return box('Making up ' + esc(pretty(p.date)) + '</div>') +
      '<div style="height:10px;border-radius:6px;background:var(--sub);margin:10px 0;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:#f59e0b"></div></div>' +
      '<div style="font-size:13px;color:var(--mut)">' + got + ' of ' + need + ' verified minutes. About ' + left + ' hours left.</div>' + n +
      '<div style="display:flex;gap:8px;margin-top:10px"><button class="btn flex-1" onclick="asrCheck()">Check progress</button><button class="btn2 flex-1" onclick="asrCancel()">Cancel</button></div>';
  }
  if (!sel) return n ? box('Make-up</div>') + n : '';
  var c = check(sel); if (!c) return '';
  if (!c.ok) return box('Can\u2019t make up ' + esc(pretty(sel)) + '</div>') + '<p style="font-size:13px;margin-top:6px;color:var(--mut)">' + esc(c.why) + '</p>';
  var pv = preview(sel), line = '';
  if (pv) line = pv.after > pv.before ? 'Your streak goes from ' + pv.before + ' to ' + pv.after + '.' : 'This fills the gap, but your current streak stays at ' + pv.before + ' until the later gap is made up too.';
  return box('Make up ' + esc(pretty(sel)) + '?</div>') +
    '<p style="font-size:13px;margin:6px 0;color:var(--mut)">Study ' + NEED + ' minutes in verified sessions within ' + HOURS + ' hours and this day counts. One make-up a week.</p>' +
    (line ? '<p style="font-size:13px;font-weight:700;margin-bottom:8px">' + esc(line) + '</p>' : '') + n +
    '<div style="display:flex;gap:8px"><button class="btn flex-1" onclick="asrStart()">Start make-up</button><button class="btn2 flex-1" onclick="asrNo()">Not now</button></div>';
}
function decorate() {
  var sm = shownMonth(); if (!sm) return;
  var reps = (U.repairs || []).map(function (r) { return r.date; }), p = U.repairPending;
  Array.from(document.querySelectorAll('.d-cal')).forEach(function (cell) {
    var k = cellKey(cell, sm); if (!k) return;
    var c = check(k);
    if (reps.indexOf(k) > -1) cell.style.boxShadow = 'inset 0 0 0 1.5px #f59e0b';
    else if (p && p.date === k) { cell.style.boxShadow = 'inset 0 0 0 1.5px #f59e0b'; cell.style.outline = '1.5px dashed #f59e0b'; cell.style.outlineOffset = '-3px'; }
    else if (c && c.ok) { cell.style.outline = '1.5px dashed #f59e0b'; cell.style.outlineOffset = '-3px'; }
  });
}
function mount() {
  if (!leafWith('Reading calendar')) return;
  var p = U.repairPending;
  if (p && Date.now() - new Date(p.startedAt).getTime() > HOURS * 36e5) {
    note = 'Your make-up for ' + pretty(p.date) + ' ran out of time. You can start another any time.';
    U.repairPending = null; try { save(); } catch (e) {}
  }
  var close = Array.from(document.querySelectorAll('button')).filter(function (b) { return txt(b) === 'Close'; })[0];
  if (!close || !close.parentNode) return;
  decorate();
  var html = cardHtml(), old = document.querySelector('[data-asr]');
  if (!html) { if (old && old.parentNode) old.parentNode.removeChild(old); return; }
  if (old && old.dataset.asr === html) return;
  if (old && old.parentNode) old.parentNode.removeChild(old);
  var card = document.createElement('div');
  card.dataset.asr = html;
  card.style.cssText = 'margin:14px 0;padding:14px 16px;border-radius:22px;background:var(--card);border:1.5px solid #f59e0b';
  card.innerHTML = html;
  close.parentNode.insertBefore(card, close);
  if (U.repairPending && !checking && Date.now() - lastCheck > 20000) refresh(false);
}
function refresh(manual) {
  var p = U.repairPending; if (!p || checking) return Promise.resolve();
  checking = true; lastCheck = Date.now();
  if (manual) { note = 'Checking your sessions...'; mount(); }
  var from = new Date(new Date(p.startedAt).getTime() - 120000).toISOString();
  return minutesSince(from).then(function (m) {
    checking = false;
    if (m == null) { note = 'Could not check right now. Try again when you are online.'; return mount(); }
    p.got = m; note = '';
    if (m >= (p.need || NEED)) return complete(p);
    try { save(); } catch (e) {}
    mount();
  });
}
function complete(p) {
  U.readLog = U.readLog || {};
  if (!hasLog(p.date)) U.readLog[p.date] = ['REPAIR'];
  U.repairs = U.repairs || []; U.repairs.push({ date: p.date, at: new Date().toISOString() });
  U.repairPending = null; sel = null; note = '';
  try { var si = W.streakInfo && W.streakInfo(); if (si && si.n > (U.bestStreak || 0)) U.bestStreak = si.n; } catch (e) {}
  try { save(); } catch (e) {}
  if (typeof showToast === 'function') showToast('Day made up. Your streak is back.');
  if (W.streakCal) W.streakCal(); else mount();
}
W.asrStart = function () {
  var c = sel && check(sel); if (!c || !c.ok) return;
  U.repairPending = { date: sel, startedAt: new Date().toISOString(), need: NEED, got: 0 };
  sel = null; note = '';
  try { save(); } catch (e) {}
  if (typeof showToast === 'function') showToast('Make-up started. Study ' + NEED + ' minutes in the next ' + HOURS + ' hours.');
  mount();
};
W.asrCancel = function () { U.repairPending = null; sel = null; note = ''; try { save(); } catch (e) {} mount(); };
W.asrNo = function () { sel = null; note = ''; mount(); };
W.asrCheck = function () { lastCheck = 0; refresh(true); };
W.__asr = { check: check, preview: preview, refresh: refresh };
document.addEventListener('click', function (e) {
  try {
    if (!leafWith('Reading calendar')) return;
    var cell = up(e.target, function (n) { return /\bd-cal\b/.test(typeof n.className === 'string' ? n.className : ''); }, 4);
    if (!cell) return;
    var k = cellKey(cell, shownMonth()); if (!k) return;
    sel = check(k) ? k : null; note = '';
    mount();
  } catch (err) { console.error('repair', err); }
});
var tm = null;
new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(function () { try { mount(); } catch (e) { console.error('repair', e); } }, 150); })
  .observe(document.body, { childList: true, subtree: true });
})();
