/* Academic Summit - events.js v2: campus events board.
   Community-driven: any signed-in user adds, all see, delete only your own.
   The Campus door is appended to Planner by DOM - no fragile string hooks.
   Load after home.js. */
(function () {
'use strict';
var W = window;
var KINDS = ['Conference', 'Program', 'Event', 'Competition', 'Summit', 'Other'];
var KIND_COLORS = {
  Conference: 'background:rgba(16,185,129,.15);color:#047857',
  Program: 'background:rgba(59,130,246,.15);color:#1d4ed8',
  Event: 'background:rgba(168,85,247,.15);color:#7e22ce',
  Competition: 'background:rgba(245,158,11,.15);color:#b45309',
  Summit: 'background:rgba(236,72,153,.15);color:#be185d',
  Other: 'background:rgba(100,116,139,.15);color:#475569'
};
var bootB = W.boot;
W.boot = function (u) { try { W._uid = u && u.id; } catch (e) {} return bootB.apply(this, arguments); };
function fmt(d) { return new Date(d + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
async function loadEvents() {
  try { var r = await sb.from('campus_events').select('*').order('event_date', { ascending: true }); W._ce = r.data || []; }
  catch (e) { W._ce = []; }
}
function upcoming(n) {
  var t = new Date().toISOString().slice(0, 10);
  return (W._ce || []).filter(function (e) { return e.event_date >= t; }).slice(0, n || 10);
}
function campusSegment() {
  var up = upcoming();
  var rows = up.length ? up.map(function (e) {
    var own = e.added_by_uid === W._uid;
    return '<div class="flex items-start justify-between gap-3 p-3 rounded-xl" style="background:var(--sub)">' +
      '<div class="flex-1"><div class="flex items-center gap-2 flex-wrap">' +
      '<span class="px-2 py-0.5 rounded-full text-[10px] font-bold" style="' + (KIND_COLORS[e.kind] || KIND_COLORS.Other) + '">' + esc(e.kind) + '</span>' +
      '<b>' + esc(e.title) + '</b></div>' +
      '<div class="text-xs text-slate-500 mt-1">' + fmt(e.event_date) + (e.venue ? ' \u2022 ' + esc(e.venue) : '') + '</div>' +
      (e.note ? '<div class="text-xs text-slate-500 mt-0.5">' + esc(e.note) + '</div>' : '') +
      (e.added_by_name ? '<div class="text-[10px] text-slate-400 mt-1">by ' + esc(e.added_by_name) + '</div>' : '') +
      '</div>' + (own ? '<button class="btn2 shrink-0 text-rose-500" onclick="eventsDelete(' + e.id + ')" aria-label="Delete">x</button>' : '') + '</div>';
  }).join('') : '<p class="text-xs text-slate-500 py-4 text-center">No campus events yet. Be the first to add one.</p>';
  return '<div class="space-y-3">' + rows +
    '<div class="card p-4 space-y-3"><div class="font-bold">Add a campus event</div>' +
    '<input id="ce-title" class="inp" placeholder="Event title">' +
    '<select id="ce-kind" class="inp">' + KINDS.map(function (k) { return '<option>' + k + '</option>'; }).join('') + '</select>' +
    '<input id="ce-date" type="date" class="inp">' +
    '<input id="ce-venue" class="inp" placeholder="Venue (optional)">' +
    '<textarea id="ce-note" class="inp" rows="2" placeholder="One-line note (optional)"></textarea>' +
    '<button class="btn w-full" onclick="eventsAdd()">Add event</button></div></div>';
}
W.eventsAdd = async function () {
  var t = ($('ce-title') || {}).value, d = ($('ce-date') || {}).value;
  if (!t || !d) return showToast('Title and date required', 'error');
  try {
    await sb.from('campus_events').insert({
      title: t, kind: ($('ce-kind') || {}).value, venue: ($('ce-venue') || {}).value,
      event_date: d, note: ($('ce-note') || {}).value,
      added_by_uid: W._uid, added_by_name: U.name
    });
    showToast('Event added');
    await loadEvents();
    var box = $('ce-box'); if (box) box.innerHTML = campusSegment();
  } catch (e) { showToast('Could not add event', 'error'); }
};
W.eventsDelete = async function (id) {
  if (!confirm('Delete this event?')) return;
  try {
    await sb.from('campus_events').delete().eq('id', id);
    showToast('Event deleted');
    await loadEvents();
    var box = $('ce-box'); if (box) box.innerHTML = campusSegment();
  } catch (e) { showToast('Could not delete', 'error'); }
};
W.ceToggle = function () {
  var box = $('ce-box'); if (!box) return;
  var open = box.style.display === 'none';
  box.style.display = open ? '' : 'none';
  if (open) box.innerHTML = campusSegment();
};
function ensureDoor() {
  var main = $('main');
  if (!main || main.querySelector('[data-ce-door]')) return;
  var host = main.querySelector('.space-y-5') || main.firstElementChild;
  if (!host) return;
  var w = document.createElement('div');
  w.setAttribute('data-ce-door', '1'); w.className = 'space-y-3';
  w.innerHTML = '<button type="button" class="btn2 w-full justify-between" onclick="ceToggle()">On campus' + ic('r', 'w-4 h-4') + '</button><div id="ce-box" style="display:none"></div>';
  host.insertBefore(w, host.firstElementChild);
}
function homeStrip() {
  if (!U) return;
  var today = new Date(), week = new Date(today.getTime() + 7 * 864e5);
  var soon = (W._ce || []).filter(function (e) { var d = new Date(e.event_date + 'T12:00:00'); return d >= today && d <= week; })[0];
  if (!soon) return;
  if (document.querySelector('[data-ce-strip]')) return;
  var s = document.createElement('button');
  s.type = 'button'; s.setAttribute('data-ce-strip', '1');
  s.className = 'card p-3 text-xs font-bold flex items-center gap-2 w-full text-left';
  s.style.cssText = 'background:rgba(168,85,247,.12);color:#7e22ce';
  s.innerHTML = '<span>On campus this week:</span><span>' + esc(soon.title) + '</span><span style="opacity:.7">\u2022 ' + fmt(soon.event_date) + '</span>';
  s.onclick = function () { go('planner'); setTimeout(function () { var b = document.querySelector('[data-ce-door] button'); if (b && $('ce-box') && $('ce-box').style.display === 'none') b.click(); }, 250); };
  var main = $('main'); var first = main && main.querySelector('.card');
  if (main && first) main.insertBefore(s, first);
}
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  setTimeout(async function () {
    if (v === 'planner') { await loadEvents(); ensureDoor(); }
    if (v === 'home') { await loadEvents(); homeStrip(); }
  }, 100);
  return r;
};
})();
