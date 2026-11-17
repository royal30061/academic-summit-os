/* Academic Summit - announce.js v1: admin announcements and student notifications.
Student side: a bell with an unread count, a notification centre, and one banner on Home per unread announcement.
Admin side: an "Academic Announcements & Notifications" section under the Admin Panel heading.
Everything is stored in your Supabase database (run announcements.sql once). Nothing here uses localStorage
as a stand-in for delivery, because localStorage cannot reach another phone. If the SQL has not been run,
the admin section says so and students simply see no notifications.
Delete the script tag to remove it. Add ?ann=off to the address to switch it off for one visit.
Load after zumaguide.js. */
(function () {
'use strict';
var W = window;
if (typeof document === 'undefined') return;
try { if (/[?&]ann=off/.test(location.search)) return; } catch (e) {}
/* ---------- helpers ---------- */
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function norm(s) { return String(s || '').replace(/\s+/g, ' ').trim().toLowerCase(); }
function toast(m, k) { if (W.showToast) W.showToast(m, k); }
function hasSb() { return typeof sb !== 'undefined' && sb && sb.rpc && sb.from; }
function vis(el) { var r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; }
function when(x) { try { return new Date(x).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
function friendly(err) {
  var m = String((err && err.message) || err || '');
  if (/not allowed/i.test(m)) return 'Only the administrator can do this.';
  if (/does not exist|schema cache|Could not find the function|relation/i.test(m)) return 'Announcements are not set up yet. Run announcements.sql in Supabase.';
  if (/fetch|network|Failed to/i.test(m)) return 'Could not reach the server. Nothing was changed.';
  return m || 'Something went wrong. Nothing was changed.';
}
function call(name, args) {
  try { return sb.rpc(name, args || {}).then(function (r) { return r || { error: { message: 'No response' } }; }, function (e) { return { error: e }; }); }
  catch (e) { return Promise.resolve({ error: e }); }
}
/* ---------- where each action button leads (taps the real buttons, in order) ---------- */
var ACTIONS = {
  results: ['Check My Results', ['Results']], upload: ['Open Upload', ['Results', 'Upload']], record: ['Open Record', ['Results', 'Record']],
  target: ['Open Target', ['Results', 'Target']], detective: ['Open Result Detective', ['Results', 'Detective']], 
  home: ['Open Home', ['Home']], study: ['Open Study', ['Study']], attend: ['Open Attend', ['Attend']], finance: ['Open Finance', ['Finance']]
};
function navBtn(label) {
  var bs = document.querySelectorAll('button,a,[role=button]');
  for (var i = 0; i < bs.length; i++) { var b = bs[i]; if (norm(b.textContent) === label && vis(b) && b.getBoundingClientRect().top > (W.innerHeight || 800) * 0.7) return b; }
  return null;
}
function clickExact(t) {
  t = norm(t); var els = document.querySelectorAll('button,[onclick],a,[role=button]'), exact = null, part = null, pl = 1e9;
  for (var i = 0; i < els.length; i++) {
    var el = els[i]; if (!vis(el) || (el.closest && el.closest('#ann-host'))) continue; var x = norm(el.textContent);
    if (x === t) { exact = el; break; } if (x.indexOf(t) > -1 && x.length < pl) { part = el; pl = x.length; }
  }
  var hit = exact || part; if (hit) { hit.click(); return true; } return false;
}
function navTo(steps) {
  var i = 0, nb = navBtn(norm(steps[0])); if (nb) { nb.click(); i = 1; }
  (function next() { if (i >= steps.length) return; setTimeout(function () { clickExact(steps[i]); i++; next(); }, 300); })();
}
/* =========================================================================================
STUDENT SIDE
========================================================================================= */
var S = { list: [], loaded: false, err: null, open: false, started: false };
function activeUnread() { return S.list.filter(function (a) { return a.status === 'active' && !a.read_at; }); }
function byId(id) { return S.list.filter(function (a) { return a.id === id; })[0]; }
function fetchMine() {
  if (!hasSb()) return Promise.resolve();
  return call('my_announcements').then(function (r) {
    if (r.error) { S.err = friendly(r.error); return; }
    S.err = null; S.loaded = true; S.list = r.data || []; paintBell(); paintBanner(); if (S.open) paintCentre();
  });
}
function markRead(id) {
  var a = byId(id); if (!a || a.read_at) return;
  a.read_at = new Date().toISOString(); paintBell(); paintBanner(); if (S.open) paintCentre();
  call('mark_announcement_read', { p_id: id }).then(function (r) { if (r.error) { a.read_at = null; paintBell(); toast('Could not save that. Try again.', 'error'); } });
} 
function bellSvg() { return '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9a6 6 0 1 1 12 0c0 6 2.5 7.500 2.500 7.500h-17S6 15 6 9z"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>'; }
function findAvatar() {
  var els = document.querySelectorAll('button,div,span,a');
  for (var i = 0; i < els.length; i++) { var el = els[i]; if (el.children && el.children.length) continue; if (!/^[A-Z]{2,3}$/.test((el.textContent || '').trim())) continue; var r = el.getBoundingClientRect(); if (r.top < 120 && r.left > (W.innerWidth || 400) * 0.6 && r.width > 0 && r.width < 90) return el; }
  return null;
}
function injectBell() {
  if (document.getElementById('ann-bell')) return true;
  var av = findAvatar(); if (!av) return false;
  var spot = (av.closest && av.closest('button')) || av, b = document.createElement('button');
  b.id = 'ann-bell'; b.setAttribute('aria-label', 'Notifications'); b.onclick = W.annOpen;
  b.style.cssText = 'position:relative;flex:none;width:42px;height:42px;margin-right:8px;border-radius:14px;border:0;background:rgba(255,255,255,.08);color:#cfe9de;display:inline-flex;align-items:center;justify-content:center';
  b.innerHTML = bellSvg() + '<span id="ann-badge" style="display:none;position:absolute;top:-4px;right:-4px;min-width:18px;height:18px;padding:0 5px;border-radius:9px;background:#ef4444;color:#fff;font-size:11px;font-weight:800;line-height:18px;text-align:center"></span>';
  spot.parentNode.insertBefore(b, spot); paintBell(); return true;
}
function paintBell() {
  var badge = document.getElementById('ann-badge'), bell = document.getElementById('ann-bell'), n = activeUnread().length;
  if (badge) { badge.style.display = n ? 'block' : 'none'; badge.textContent = n > 9 ? '9+' : String(n); }
  if (bell) bell.setAttribute('aria-label', n ? 'Notifications, ' + n + ' unread' : 'Notifications');
}
function onHome() { try { var m = document.getElementById('main'), t = ((m && (m.innerText || m.textContent)) || '').slice(0, 400); return /Cumulative GPA|Good (morning|afternoon|evening)/i.test(t); } catch (e) { return false; } }
function bannerHtml(a, extra) {
  var act = a.action_target && ACTIONS[a.action_target];
  return '<div id="ann-banner" data-ann="' + esc(a.id) + '" style="margin-bottom:14px;padding:14px 16px;border-radius:20px;border:1.5px solid rgba(16,185,129,.5);background:var(--card,#fff);color:inherit">' +
  '<div style="display:flex;align-items:flex-start;gap:8px"><div style="flex:1;min-width:0"><div style="font-weight:800;font-size:15px;line-height:1.3">' + esc(a.title) + '</div>' +
  '<div style="font-size:13px;line-height:1.45;margin-top:4px;color:var(--mut)">' + esc(a.body) + '</div></div>' +
  '<button onclick="annDismiss(\'' + esc(a.id) + '\')" aria-label="Dismiss announcement" style="flex:none;width:44px;height:44px;margin:-8px -8px 0 0;border:0;background:none;color:var(--mut);font-size:20px">×</button></div>' +
  '<div style="display:flex;gap:8px;align-items:center;margin-top:10px">' + (act ? '<button class="btn" style="min-height:44px;padding:0 16px" onclick="annAct(\'' + esc(a.id) + '\')">' + esc(a.action_label || act[0]) + '</button>' : '') +
  (extra ? '<span style="font-size:12px;color:var(--mut)">' + extra + '</span>' : '') + '</div></div>';
}
function paintBanner() {
  try {
    var m = document.getElementById('main'), old = document.getElementById('ann-banner'), un = activeUnread();
    if (!m) return;
    if (!un.length || !onHome()) { if (old && old.parentNode) old.parentNode.removeChild(old); return; }
    if (old && old.getAttribute('data-ann') === un[0].id) return;
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var d = document.createElement('div'); d.innerHTML = bannerHtml(un[0], un.length > 1 ? '+' + (un.length - 1) + ' more in notifications' : ''); m.insertBefore(d.firstChild, m.firstChild);
  } catch (e) {}
}
function centreHtml() {
  var rows = S.list.map(function (a) {
    var act = a.status === 'active' && a.action_target && ACTIONS[a.action_target], unread = !a.read_at && a.status === 'active';
    return '<div onclick="annRead(\'' + esc(a.id) + '\')" style="padding:12px 0;border-top:1px solid var(--bd);cursor:pointer"><div style="display:flex;gap:8px;align-items:flex-start">' +
    '<span aria-hidden="true" style="flex:none;width:9px;height:9px;margin-top:6px;border-radius:50%;background:' + (unread ? '#10b981' : 'transparent') + '"></span>' +
    '<div style="flex:1;min-width:0"><div style="display:flex;justify-content:space-between;gap:8px"><span style="font-weight:' + (unread ? '800' : '600') + ';font-size:15px">' + esc(a.title) + '</span>' +
    '<span style="flex:none;font-size:11px;color:var(--mut);white-space:nowrap">' + (a.status === 'active' ? esc(when(a.published_at)) : 'Ended') + '</span></div>' +
    '<div style="font-size:13px;line-height:1.45;margin-top:4px;color:var(--mut)">' + esc(a.body) + '</div>' +
    (act ? '<button class="btn" style="min-height:44px;padding:0 16px;margin-top:10px" onclick="event.stopPropagation();annAct(\'' + esc(a.id) + '\')">' + esc(a.action_label || act[0]) + '</button>' : '') + '</div></div></div>';
  }).join('');
  return '<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;font-weight:800;font-size:18px">Notifications</div>' +
  (activeUnread().length ? '<button class="btn2" style="min-height:40px;padding:0 12px;font-size:13px" onclick="annReadAll()">Mark all read</button>' : '') +
  '<button onclick="annClose()" aria-label="Close notifications" style="flex:none;width:44px;height:44px;border-radius:50%;border:0;background:var(--sub);font-size:18px;font-weight:800;color:inherit">×</button></div>' +
  (S.err ? '<div style="margin-top:10px;font-size:13px;color:#dc2626">' + esc(S.err) + '<button class="btn2" style="min-height:36px" onclick="annRetry()">Try again</button></div>' : '') +
  (rows || '<div style="display:flex;align-items:center;gap:12px;margin-top:14px">' + (W.zumaImg ? W.zumaImg('notice', 64) : '') + '<div style="font-size:13px;color:var(--mut)">No notifications yet. Announcements from your school will appear here.</div></div>');
}
function host() { var h = document.getElementById('ann-host'); if (!h) { h = document.createElement('div'); h.id = 'ann-host'; document.body.appendChild(h); } return h; }
function paintCentre() {
  host().innerHTML = '<div onclick="annClose()" style="position:fixed;left:0;right:0;top:0;bottom:0;background:rgba(0,0,0,.45);z-index:99997"></div>' +
  '<div role="dialog" aria-modal="true" aria-label="Notifications" style="position:fixed;left:0;right:0;bottom:0;z-index:99998;max-height:80vh;overflow-y:auto;-webkit-overflow-scrolling:touch;border-radius:24px 24px 0 0;background:var(--card,#fff);color:inherit;padding:16px 16px calc(16px + env(safe-area-inset-bottom,0px));box-shadow:0 -10px 40px rgba(0,0,0,.35)">' + centreHtml() + '</div>';
}
W.annOpen = function () { S.open = true; paintCentre(); fetchMine(); };
W.annClose = function () { S.open = false; var h = document.getElementById('ann-host'); if (h) h.innerHTML = ''; };
W.annRetry = function () { fetchMine(); };
W.annRead = function (id) { markRead(id); };
W.annReadAll = function () { S.list.forEach(function (a) { if (a.status === 'active' && !a.read_at) a.read_at = new Date().toISOString(); }); paintBell(); paintBanner(); paintCentre(); call('mark_all_announcements_read'); };
W.annDismiss = function (id) { markRead(id); };
W.annAct = function (id) {
  var a = byId(id), act = a && a.action_target && ACTIONS[a.action_target]; if (!act) return;
  markRead(id); W.annClose(); navTo(act[1]);
};
function ensureSession() {
  try { return sb.auth.getSession().then(function (r) { return !!(r && r.data && r.data.session); }, function () { return false; }); } catch (e) { return Promise.resolve(false); }
}
function startStudent() {
  if (S.started || !hasSb()) return; S.started = true;
  var tries = 0;
  (function wait() { ensureSession().then(function (ok) { if (ok) { fetchMine(); setInterval(fetchMine, 300000); } else if (++tries < 30) setTimeout(wait, 4000); else S.started = false; }); })();
  document.addEventListener('visibilitychange', function () { if (!document.hidden && S.loaded) fetchMine(); });
}
/* =========================================================================================
ADMIN SIDE
=========================================================================================== */
var DEF = {
  results_released: { title: 'Results Released', label: 'Check My Results', target: 'results',
  body: 'Academic results are now available. Students are encouraged to upload or update their semester results, review their CGPA trajectory, verify their academic standing and adjust their academic targets where necessary.' },
  result_detective: { title: 'Result Detective Reminder', label: 'Open Result Detective', target: 'detective',
  body: 'Have you verified your semester results? Use the Result Detective to compare your uploaded results with your academic records, identify discrepancies and monitor changes in your CGPA.' }
};
var AUD = [['all_students', 'All students'], ['lecturers', 'Lecturers'], ['everyone', 'Everyone']];
var AD = { rows: null, stats: {}, draft: {}, err: null, confirm: null, confirmTime: 0, busy: false, isAdmin: null, c: { id: null, title: '', body: '', audience: 'all_students', target: '' } };
function rowOf(kind) { return (AD.rows || []).filter(function (r) { return r.kind === kind; })[0]; }
function statusChip(r) {
  if (!r) return '<span style="color:var(--mut)">Not published</span>';
  var c = r.status === 'active' ? '#059669' : r.status === 'inactive' ? '#d97706' : 'var(--mut)';
  return '<span style="color:' + c + ';font-weight:800">' + (r.status === 'active' ? 'Active' : r.status === 'inactive' ? 'Disabled' : 'Archived') + '</span>';
}
function metaLine(r) {
  if (!r) return 'Never sent.';
  var s = AD.stats[r.id]; return 'Published ' + esc(when(r.published_at)) + (s ? ' | Delivered ' + s.delivered + ' of ' + s.audience_size + ' | Read ' + s.reads : '');
}
function aud(sel, js) { return '<select class="inp" aria-label="Audience" onchange="' + js + '">' + AUD.map(function (a) { return '<option value="' + a[0] + '"' + (a[0] === sel ? ' selected' : '') + '>' + a[1] + '</option>'; }).join('') + '</select>'; }
function fixedCard(kind) {
  var d = DEF[kind], r = rowOf(kind), dr = AD.draft[kind] || (AD.draft[kind] = { body: r ? r.body : d.body, audience: r ? r.audience : 'all_students' });
  return '<div class="card" style="display:flex;flex-direction:column;gap:10px;overflow:hidden"><div style="display:flex;justify-content:space-between;gap:8px;align-items:center"><div style="font-weight:800;font-size:16px">' + esc(d.title) + '</div><div style="font-size:12px">' + statusChip(r) + '</div></div>' +
  '<div style="font-size:12px;color:var(--mut)">' + metaLine(r) + '</div>' +
  '<label class="lbl" for="ann-' + kind + '">Message</label><textarea id="ann-' + kind + '" class="inp" rows="4" maxlength="600" style="width:100%;box-sizing:border-box" oninput="annADraft(\'' + kind + '\',\'body\',this.value)">' + esc(dr.body) + '</textarea>' +
  '<label class="lbl">Audience</label>' + aud(dr.audience, 'annADraft(\'' + kind + '\',\'audience\',this.value)') +
  '<label style="display:flex;align-items:center;gap:10px;min-height:44px;font-size:14px"><input type="checkbox" style="width:22px;height:22px"' + (r && r.status === 'active' ? ' checked' : '') + (r ? '' : ' disabled') + ' onchange="annAToggle(\'' + kind + '\',this.checked)">' + (r ? 'Enabled' : '<span style="color:var(--mut);font-size:12px">(send it once first)</span>') + '</label>' +
  '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" style="min-height:44px;flex:1" ' + (AD.busy ? 'disabled' : '') + ' onclick="annASend(\'' + kind + '\')">' + (AD.confirm === kind ? 'Tap again to send' : r ? 'Send again' : 'Send announcement') + '</button>' +
  (r && r.status !== 'archived' ? '<button class="btn2" style="min-height:44px" onclick="annAArchive(\'' + kind + '\')">Archive</button>' : '') + '</div>' +
  (AD.confirm === kind ? '<div style="font-size:12px;color:var(--mut)">This delivers it to the chosen audience as a new notification.</div>' : '') + '</div>';
}
function customList() {
  var rows = (AD.rows || []).filter(function (r) { return r.kind === 'custom'; });
  return rows.length ? rows.map(function (r) {
    return '<div style="border-top:1px solid var(--bd);padding:10px 0"><div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:14px">' + esc(r.title) + '</b><span style="font-size:12px">' + statusChip(r) + '</span></div>' +
    '<div style="font-size:12px;color:var(--mut)">' + metaLine(r) + '</div><div style="display:flex;gap:8px;margin-top:8px;flex-wrap:wrap">' +
    '<button class="btn2" style="min-height:40px" onclick="annAEdit(\'' + esc(r.id) + '\')">Edit</button>' +
    (r.status === 'active' ? '<button class="btn2" style="min-height:40px" onclick="annASet(\'' + esc(r.id) + '\',\'inactive\')">Disable</button>' : r.status === 'inactive' ? '<button class="btn2" style="min-height:40px" onclick="annASet(\'' + esc(r.id) + '\',\'active\')">Enable</button>' : '') +
    (r.status !== 'archived' ? '<button class="btn2" style="min-height:40px" onclick="annASet(\'' + esc(r.id) + '\',\'archived\')">Archive</button>' : '') + '</div></div>';
  }).join('') : '<div style="font-size:13px;color:var(--mut)">No other announcements yet.</div>';
}
function adminHtml() {
  var head = '<div class="card" style="display:flex;flex-direction:column;gap:6px;overflow:hidden"><div style="font-weight:800;font-size:17px">Academic Announcements & Notifications</div><div style="font-size:13px;color:var(--mut);line-height:1.45">Messages you publish reach students inside the app. Disabling or archiving stops an announcement showing as current. It never deletes anyone\'s records or notification history.</div></div>';
  if (AD.err) return head + '<div class="card" style="color:#dc2626;font-size:14px">' + esc(AD.err) + '<button class="btn2" style="min-height:40px" onclick="annAReload()">Try again</button></div>';
  if (!AD.rows) return head + '<div class="card" style="font-size:13px;color:var(--mut)">Loading announcements...</div>';
  var c = AD.c, edit = !!c.id;
  return head + fixedCard('results_released') + fixedCard('result_detective') +
  '<div class="card" style="display:flex;flex-direction:column;gap:10px;overflow:hidden"><div style="font-weight:800;font-size:16px">' + (edit ? 'Edit announcement' : 'New announcement') + '</div>' +
  '<label class="lbl">Title</label><input class="inp" maxlength="80" value="' + esc(c.title) + '" oninput="annAC(\'title\',this.value)" style="width:100%;box-sizing:border-box">' +
  '<label class="lbl">Message</label><textarea class="inp" rows="3" maxlength="600" oninput="annAC(\'body\',this.value)" style="width:100%;box-sizing:border-box">' + esc(c.body) + '</textarea>' +
  '<label class="lbl">Audience</label>' + aud(c.audience, 'annAC(\'audience\',this.value)') +
  '<label class="lbl">Button on the notification</label><select class="inp" onchange="annAC(\'target\',this.value)"><option value="">None</option>' + Object.keys(ACTIONS).map(function (k) { return '<option value="' + k + '"' + (c.target === k ? ' selected' : '') + '>' + esc(ACTIONS[k][0]) + '</option>'; }).join('') + '</select>' +
  '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" style="min-height:44px;flex:1" ' + (AD.busy ? 'disabled' : '') + ' onclick="annACSend()">' + (edit ? 'Send again as new' : 'Send announcement') + '</button>' +
  (edit ? '<button class="btn2" style="min-height:44px" onclick="annACSave()">Save changes</button><button class="btn2" style="min-height:44px" onclick="annACCancel()">Cancel</button>' : '') + '</div>' +
  '<div style="font-weight:800;font-size:14px;margin-top:6px">Other announcements</div>' + customList() + '</div>';
}
function mountAdmin() {
  if (AD.isAdmin !== true) return;
  if (AD.confirm && Date.now() - AD.confirmTime > 4000) { AD.confirm = null; }
  var node = document.getElementById('ann-admin');
  var leaf = Array.prototype.filter.call(document.querySelectorAll('div,h1,h2,h3,span'), function (n) { return !n.children.length && (n.textContent || '').trim() === 'Admin Panel'; })[0];
  if (!leaf) { if (node && node.parentNode) node.parentNode.removeChild(node); return; }
  if (!node) {
    var anchor = (leaf.closest && leaf.closest('.card')) || leaf.parentNode; node = document.createElement('div'); node.id = 'ann-admin';
    node.style.cssText = 'display:flex;flex-direction:column;gap:14px;margin:14px 0'; anchor.parentNode.insertBefore(node, anchor.nextSibling);
    if (!AD.rows && !AD.err) loadAdmin();
  }
  var html = adminHtml(); if (node.getAttribute('data-h') !== html) { node.innerHTML = html; node.setAttribute('data-h', html); }
}
function loadAdmin() {
  if (!hasSb()) return;
  sb.from('announcements').select('*').order('published_at', { ascending: false }).then(function (r) {
    if (r.error) { AD.err = friendly(r.error); return mountAdmin(); }
    AD.err = null; AD.rows = r.data || []; mountAdmin();
    AD.rows.slice(0, 12).forEach(function (row) { call('announcement_stats', { p_id: row.id }).then(function (s) { if (!s.error && s.data && s.data[0]) { AD.stats[row.id] = s.data[0]; mountAdmin(); } }); });
  }, function (e) { AD.err = friendly(e); mountAdmin(); });
}
function done(msg, r) { AD.busy = false; AD.confirm = null; if (r && r.error) { toast(friendly(r.error), 'error'); return mountAdmin(); } toast(msg); AD.rows = null; loadAdmin(); mountAdmin(); }
function check(title, body) { if (!title || title.trim().length < 3 || title.trim().length > 80) return 'The title must be 3 to 80 characters.'; if (!body || body.trim().length < 10 || body.trim().length > 600) return 'The message must be 10 to 600 characters.'; return ''; }
W.annAReload = function () { AD.err = null; AD.rows = null; loadAdmin(); mountAdmin(); };
W.annADraft = function (kind, f, v) { (AD.draft[kind] = AD.draft[kind] || {})[f] = v; };
W.annASend = function (kind) {
  var d = DEF[kind], dr = AD.draft[kind] || {}, msg = check(d.title, dr.body); if (msg) return toast(msg, 'error');
  if (AD.confirm !== kind) { AD.confirm = kind; AD.confirmTime = Date.now(); mountAdmin(); return; }
  if (AD.busy) return; AD.busy = true; mountAdmin();
  call('publish_announcement', { p_kind: kind, p_title: d.title, p_body: dr.body.trim(), p_action_label: d.label, p_action_target: d.target, p_audience: dr.audience || 'all_students' }).then(function (r) { done('Announcement sent', r); });
};
W.annAToggle = function (kind, on) { var r = rowOf(kind); if (!r) return; call('set_announcement_status', { p_id: r.id, p_status: on ? 'active' : 'inactive' }).then(function (x) { done(on ? 'Announcement enabled' : 'Announcement disabled', x); }); };
W.annAArchive = function (kind) { var r = rowOf(kind); if (!r) return; call('set_announcement_status', { p_id: r.id, p_status: 'archived' }).then(function (x) { done('Announcement archived', x); }); };
W.annASet = function (id, st) { call('set_announcement_status', { p_id: id, p_status: st }).then(function (x) { done(st === 'active' ? 'Announcement enabled' : st === 'inactive' ? 'Announcement disabled' : 'Announcement archived', x); }); };
W.annAC = function (f, v) { AD.c[f] = v; };
W.annAEdit = function (id) { var r = (AD.rows || []).filter(function (x) { return x.id === id; })[0]; if (!r) return; AD.c = { id: r.id, title: r.title, body: r.body, audience: r.audience, target: r.action_target || '' }; node_refresh(); };
function node_refresh() { var n = document.getElementById('ann-admin'); if (n) n.removeAttribute('data-h'); mountAdmin(); }
W.annACCancel = function () { AD.c = { id: null, title: '', body: '', audience: 'all_students', target: '' }; node_refresh(); };
function cArgs() { var c = AD.c; return { p_title: c.title.trim(), p_body: c.body.trim(), p_action_label: c.target ? ACTIONS[c.target][0] : null, p_action_target: c.target || null, p_audience: c.audience }; }
W.annACSend = function () {
  var c = AD.c, msg = check(c.title, c.body); if (msg) return toast(msg, 'error'); if (AD.busy) return; AD.busy = true; mountAdmin();
  var a = cArgs(); a.p_kind = 'custom'; a.p_id = c.id || null;
  call('publish_announcement', a).then(function (r) { if (!(r && r.error)) AD.c = { id: null, title: '', body: '', audience: 'all_students', target: '' }; done('Announcement sent', r); });
};
W.annACSave = function () {
  var c = AD.c, msg = check(c.title, c.body); if (msg) return toast(msg, 'error'); if (!c.id) return;
  var a = cArgs(); a.p_id = c.id; call('update_announcement', a).then(function (r) { if (!(r && r.error)) AD.c = { id: null, title: '', body: '', audience: 'all_students', target: '' }; done('Changes saved', r); });
};
function detectAdmin() {
  if (!hasSb() || AD.isAdmin !== null) return;
  AD.isAdmin = false;
  call('is_app_admin').then(function (r) { AD.isAdmin = !r.error && r.data === true; if (AD.isAdmin) mountAdmin(); });
}
/* ---------- keep everything in place as screens redraw ---------- */
var tm = null;
function tick() { try { if (!hasSb()) return; startStudent(); injectBell(); paintBanner(); detectAdmin(); mountAdmin(); } catch (e) {} }
try { new MutationObserver(function () { clearTimeout(tm); tm = setTimeout(tick, 200); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
setInterval(tick, 4000); setTimeout(tick, 600);
W.__ann = { S: S, AD: AD, centreHtml: centreHtml, bannerHtml: bannerHtml, adminHtml: adminHtml, activeUnread: activeUnread, friendly: friendly, check: check, fetchMine: fetchMine, loadAdmin: loadAdmin, setAdmin: function (v) { AD.isAdmin = v; } };
})();
