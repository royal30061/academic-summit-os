/* Academic Summit - events.js: campus events board.
   Community-driven: any authenticated user adds, all see, delete only your own.
   Kinds: Conference, Program, Event, Competition, Summit, Other.
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
var eventsCache = [];

function fmt(d) {
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

async function loadEvents() {
  try {
    var res = await sb.from('campus_events').select('*').order('event_date', { ascending: true });
    eventsCache = res.data || [];
  } catch (e) { eventsCache = []; }
}

function upcoming(limit) {
  var today = new Date().toISOString().slice(0, 10);
  return eventsCache.filter(function (e) { return e.event_date >= today; }).slice(0, limit || 10);
}

function campusSegment() {
  var up = upcoming();
  var rows = up.length ? up.map(function (e) {
    var own = U && sb.auth && sb.auth.user && e.added_by_uid === sb.auth.user().id;
    return '<div class="flex items-start justify-between gap-3 p-3 rounded-xl" style="background:var(--sub)">' +
      '<div class="flex-1"><div class="flex items-center gap-2 flex-wrap"><span class="px-2 py-0.5 rounded-full text-[10px] font-bold" style="' + (KIND_COLORS[e.kind] || KIND_COLORS.Other) + '">' + esc(e.kind) + '</span>' +
      '<b class="font-bold">' + esc(e.title) + '</b></div>' +
      '<div class="text-xs text-slate-500 mt-1">' + fmt(e.event_date) + (e.venue ? ' \u2022 ' + esc(e.venue) : '') + '</div>' +
      (e.note ? '<div class="text-xs text-slate-500 mt-0.5">' + esc(e.note) + '</div>' : '') +
      (e.added_by_name ? '<div class="text-[10px] text-slate-400 mt-1">by ' + esc(e.added_by_name) + '</div>' : '') +
      '</div>' +
      (own ? '<button class="btn2 shrink-0 text-rose-500" onclick="eventsDelete(' + e.id + ')" aria-label="Delete">x</button>' : '') +
      '</div>';
  }).join('') : '<p class="text-xs text-slate-500 py-4 text-center">No campus events this week. Be the first to add one.</p>';
  var form = '<div class="card p-4 space-y-3">' +
    '<div class="font-bold">Add a campus event</div>' +
    '<input id="ce-title" class="inp" placeholder="Event title">' +
    '<select id="ce-kind" class="inp">' + KINDS.map(function (k) { return '<option>' + k + '</option>'; }).join('') + '</select>' +
    '<input id="ce-date" type="date" class="inp">' +
    '<input id="ce-venue" class="inp" placeholder="Venue (optional)">' +
    '<textarea id="ce-note" class="inp" rows="2" placeholder="One-line note (optional)"></textarea>' +
    '<button class="btn w-full" onclick="eventsAdd()">Add event</button></div>';
  return '<div class="space-y-3"><div class="font-extrabold text-lg">On campus</div>' + rows + form + '</div>';
}

W.eventsAdd = async function () {
  var t = ($('ce-title') || {}).value, k = ($('ce-kind') || {}).value;
  var d = ($('ce-date') || {}).value, v = ($('ce-venue') || {}).value;
  var n = ($('ce-note') || {}).value;
  if (!t || !d) return showToast('Title and date required', 'error');
  try {
    await sb.from('campus_events').insert({
      title: t, kind: k, venue: v, event_date: d, note: n,
      added_by_uid: sb.auth.user().id, added_by_name: U.name
    });
    showToast('Event added');
    await loadEvents();
    go('planner');
  } catch (e) { showToast('Could not add event', 'error'); }
};

W.eventsDelete = async function (id) {
  if (!confirm('Delete this event?')) return;
  try {
    await sb.from('campus_events').delete().eq('id', id);
    showToast('Event deleted');
    await loadEvents();
    go('planner');
  } catch (e) { showToast('Could not delete', 'error'); }
};

/* Home strip: "On campus this week" when an event is within 7 days */
function homeStrip() {
  if (!U) return;
  var today = new Date(), week = new Date(today.getTime() + 7 * 864e5);
  var soon = eventsCache.filter(function (e) {
    var d = new Date(e.event_date);
    return d >= today && d <= week;
  })[0];
  if (!soon) return;
  var strip = document.createElement('div');
  strip.className = 'card p-3 text-xs font-bold flex items-center gap-2';
  strip.style.cssText = 'background:rgba(168,85,247,.12);color:#7e22ce';
  strip.innerHTML = '<span>On campus this week:</span> <span>' + esc(soon.title) + '</span> <span class="text-slate-500">\u2022 ' + fmt(soon.event_date) + '</span>';
  strip.onclick = function () { aTab = 'campus'; go('planner'); };
  var main = $('main');
  if (main) {
    var first = main.querySelector('.card');
    if (first) main.insertBefore(strip, first);
  }
}

/* Planner segment wiring */
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  setTimeout(async function () {
    if (v === 'planner') {
      await loadEvents();
      var seg = document.querySelector('[data-planner-segment]');
      if (seg && seg.dataset.plannerSegment === 'campus') {
        seg.innerHTML = campusSegment();
      }
    }
    if (v === 'home') {
      await loadEvents();
      homeStrip();
    }
  }, 100);
  return r;
};

/* Inject Campus tab into Planner hub */
var plannerB = V.planner;
if (plannerB) {
  V.planner = function () {
    var h = plannerB.apply(this, arguments);
    if (h.indexOf('data-planner-segment') === -1) {
      h = h.replace(/(<button[^>]*>Events<\/button>)/,
        '$1<button class="btn2" data-planner-segment="campus" onclick="aTab=\'campus\';go(\'planner\')">Campus</button>');
    }
    return h;
  };
}
})();
