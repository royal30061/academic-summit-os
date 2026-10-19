/* Academic Summit - reps.js (consolidation stage 3)
   Replaces the v68 block of patch.js, so patch.js can be deleted entirely.
   Needs sql/003_course_reps.sql; without it the screens stay quiet.
   Load order: academics.js -> ocr.js -> reps.js                              */
(function () {
  'use strict';
var MODULE_NAME = 'REPS';
try {

  var W = window;
  var REASONS = { no_phone: 'No phone', network: 'Network problem', battery: 'Battery dead', other: 'Other' };
  var STATUS_COL = { approved: '#10b981', rejected: '#e11d48', pending: '#d97706' };
  var POLL_REP = 3000, POLL_LEC = 4000;

  var rpc = function (name, args) { return sb.rpc(name, args || {}).then(function (r) { if (r.error) throw r.error; return r.data; }); };
  var fail = function (e) { showToast((e && e.message) || 'Something went wrong', 'error'); };
  var back = function (title) {
    return '<div class="flex items-center gap-3"><button type="button" class="btn2 px-3" onclick="go(\'home\')">' + ic('l') + '</button><div class="font-extrabold text-lg">' + title + '</div></div>';
  };

  /* ---------- "opened the app" signal: refresh last_seen at most hourly ---------- */
  function touchSeen() {
    if (!U || U.role !== 'student' || !uid) return;
    try {
      var k = 'as_seen_' + uid;
      if (Date.now() - (+localStorage.getItem(k) || 0) < 36e5) return;
      localStorage.setItem(k, String(Date.now()));
      sb.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', uid).then(function () {});
    } catch (e) {}
  }

  /* =================== STUDENT: class rep desk =================== */
  var repCourses = null, repChecked = false, repT = null, repBuilt = false;

  function repInit() {
    if (!U || U.role !== 'student' || repChecked) return;
    repChecked = true;
    rpc('my_rep_courses').then(function (rows) {
      repCourses = rows || [];
      if (repCourses.length && view === 'home') go('home');
    }).catch(function () {});               // function missing = SQL not installed: stay quiet
  }
  var attBarBase = W.attBar;
  W.attBar = function () {
    var h = attBarBase();
    if (repCourses && repCourses.length) {
      h += '<button type="button" class="card p-6 text-left w-full flex items-center justify-between" onclick="go(\'rep\')"><span><span class="font-extrabold block">Class rep desk</span><span class="text-[11px] text-slate-500">' +
        esc(repCourses.map(function (c) { return c.r_course; }).join(', ')) + '</span></span>' + ic('r', 'w-5 h-5') + '</button>';
    }
    return h;
  };

  function repStop() { clearInterval(repT); repT = null; repBuilt = false; }
  V.rep = function () {
    setTimeout(function () { repStop(); repPoll(true); repT = setInterval(function () { repPoll(false); }, POLL_REP); }, 60);
    return '<div class="space-y-5">' + back('Class rep desk') +
      '<p class="text-xs text-slate-500">Your lecturer starts the class and you run it: call out the code, re-issue it when it expires, and send the lecturer the names of anyone who cannot mark. The lecturer approves each one.</p>' +
      '<div id="rep-root" class="space-y-4"><div class="card p-6 text-xs text-slate-500">Loading...</div></div></div>';
  };
  function repPoll(first) {
    rpc('rep_current_session').then(function (rows) {
      if (view !== 'rep') return repStop();
      repPaint(rows || []);
    }).catch(function (e) { if (first) fail(e); });
  }
  function repPaint(rows) {
    var root = $('rep-root'); if (!root) return;
    if (!rows.length) { root.innerHTML = '<div class="card p-6 text-xs text-slate-500">You are not a class rep for any course.</div>'; repBuilt = false; return; }
    if (!repBuilt || root.children.length !== rows.length) {          // build the form shells once so typing is never wiped
      repBuilt = true;
      root.innerHTML = rows.map(function (r, i) {
        return '<div class="card p-5 space-y-3" id="rc-' + i + '"><div class="flex justify-between text-xs"><b>' + esc(r.r_course) + '</b><span class="text-slate-500">Lecturer: ' + esc(r.r_lecturer || '') + '</span></div>' +
          '<div class="rc-live"></div><div class="space-y-2 pt-3 border-t" style="border-color:var(--bd)"><div class="lbl">Request a name</div>' +
          '<input class="inp font-mono uppercase rc-m" placeholder="Matric number">' +
          '<select class="inp rc-r">' + Object.keys(REASONS).map(function (k) { return '<option value="' + k + '">' + REASONS[k] + '</option>'; }).join('') + '</select>' +
          '<button class="btn w-full" onclick="repAdd(' + i + ')">Send to lecturer</button></div><div class="rc-reqs space-y-1"></div></div>';
      }).join('');
    }
    rows.forEach(function (r, i) {
      var c = $('rc-' + i); if (!c) return;
      c.dataset.sid = r.r_session_id || '';
      var live = c.querySelector('.rc-live'), box = c.querySelector('.rc-reqs');
      if (!r.r_session_id) {
        live.innerHTML = '<div class="p-4 rounded-2xl text-xs text-slate-500" style="background:var(--sub)">Waiting for ' + esc(r.r_lecturer || 'your lecturer') + ' to start the class.</div>';
        box.innerHTML = ''; return;
      }
      var left = r.r_code ? Math.max(0, Math.round((new Date(r.r_expires) - Date.now()) / 1000)) : 0;
      live.innerHTML = '<div class="text-center p-4 rounded-2xl space-y-1" style="background:var(--sub)"><div class="text-5xl font-extrabold tracking-widest font-mono" style="color:#10b981">' + (left > 0 ? esc(r.r_code) : 'EXPIRED') + '</div>' +
        '<div class="text-xs font-bold text-slate-500">' + (left > 0 ? 'Expires in ' + left + 's' : 'Re-issue to get a new code') + ' - ' + r.r_present + ' present</div></div><button class="btn2 w-full" onclick="repReissue(' + i + ')">Re-issue code</button>';
      rpc('rep_my_requests', { p_session_id: r.r_session_id }).then(function (list) {
        box.innerHTML = (list || []).map(function (q) {
          return '<div class="flex justify-between text-xs py-1.5 border-b border-slate-200/40"><span>' + esc(q.r_name || q.r_matric) + ' <span class="text-slate-400">' + esc(REASONS[q.r_reason] || '') + '</span></span><b style="color:' + (STATUS_COL[q.r_status] || '#d97706') + '">' + esc(q.r_status) + '</b></div>';
        }).join('');
      }).catch(function () {});
    });
  }
  W.repAdd = function (i) {
    var c = $('rc-' + i); if (!c) return;
    var sid = c.dataset.sid, m = c.querySelector('.rc-m').value.trim(), why = c.querySelector('.rc-r').value;
    if (!sid) return showToast('Your lecturer has not started the class yet', 'error');
    if (!m) return showToast('Enter the matric number', 'error');
    rpc('rep_request_add', { p_session_id: sid, p_matric: m, p_reason: why }).then(function (st) {
      c.querySelector('.rc-m').value = '';
      showToast(st === 'approved' ? 'Added: this student is tagged as having no phone' : 'Sent to your lecturer for approval');
      repPoll(false);
    }).catch(fail);
  };
  W.repReissue = function (i) {
    var c = $('rc-' + i); if (!c || !c.dataset.sid) return;
    rpc('rep_reissue', { p_session_id: c.dataset.sid }).then(function () { showToast('New code ready'); repPoll(false); }).catch(fail);
  };

  /* =================== LECTURER: reps + request review =================== */
  var lecT = null, lecBuilt = false, lecErrShown = false;
  function lecStop() { clearInterval(lecT); lecT = null; lecBuilt = false; }
  function lecErr(e) { if (!lecErrShown) { lecErrShown = true; fail(e); } }

  function lecExtrasStart() {
    var ex = $('lec-extras'); if (!ex) return;
    if (!lecBuilt) {
      lecBuilt = true;
      ex.innerHTML = '<div class="card p-6 space-y-3"><div class="font-extrabold">Class reps</div>' +
        '<p class="text-[11px] text-slate-500">A class rep sees your live code, can re-issue it and can request names for students who cannot mark. You approve every request.</p>' +
        '<div id="lr-list" class="space-y-2"></div>' +
        '<div class="grid grid-cols-2 gap-2"><input id="lr-m" class="inp font-mono uppercase" placeholder="Rep matric"><input id="lr-c" class="inp font-mono uppercase" placeholder="Course (POS 204)"></div>' +
        '<button class="btn w-full" onclick="lecAppoint()">Appoint class rep</button></div>' +
        '<div class="card p-6 space-y-3"><div class="flex justify-between items-center"><div class="font-extrabold">Requests from your class rep</div><span id="lq-count" class="text-xs font-extrabold" style="color:#d97706"></span></div>' +
        '<div id="lq-list" class="space-y-2"><p class="text-xs text-slate-500">Start a class to see requests.</p></div></div>';
      lecReps();
    }
    lecReqs();
    clearInterval(lecT); lecT = setInterval(lecReqs, POLL_LEC);
  }
  function lecReps() {
    rpc('lecturer_reps').then(function (rows) {
      var b = $('lr-list'); if (!b) return;
      b.innerHTML = (rows || []).map(function (r) {
        return '<div class="flex justify-between items-center text-xs p-3 rounded-xl" style="background:var(--sub)"><span><b>' + esc(r.r_name || r.r_matric) + '</b> <span class="text-slate-500">' + esc(r.r_course) + '</span></span><button class="text-rose-500 font-bold" onclick="lecRemoveRep(\'' + esc(r.r_id) + '\')">Remove</button></div>';
      }).join('') || '<p class="text-xs text-slate-500">No class reps yet.</p>';
    }).catch(lecErr);
  }
  W.lecAppoint = function () {
    var m = (($('lr-m') || {}).value || '').trim(), c = (($('lr-c') || {}).value || '').trim();
    if (!m || !c) return showToast('Enter the rep matric and the course', 'error');
    rpc('appoint_rep', { p_matric: m, p_course: c }).then(function (name) {
      $('lr-m').value = ''; $('lr-c').value = '';
      showToast(name + ' is now class rep for ' + c.toUpperCase()); lecReps();
    }).catch(fail);
  };
  W.lecRemoveRep = function (id) {
    if (confirm('Remove this class rep?')) rpc('remove_rep', { p_id: id }).then(lecReps).catch(fail);
  };

  function flagLine(q) {
    var manual = '<span' + (q.r_manual_adds >= 3 ? ' style="color:#e11d48;font-weight:800"' : '') + '>' + q.r_manual_adds + ' manual add' + (q.r_manual_adds === 1 ? '' : 's') + ' in 30 days</span>';
    return [manual, 'opened the app in 24h: ' + (q.r_active_today ? 'yes' : 'no')].concat(q.r_no_phone ? ['<b>tagged no phone</b>'] : []).join(' - ');
  }
  function refreshLive() { if (typeof livePollOnce === 'function') livePollOnce(); }
  function lecReqs() {
    var s = typeof liveGet === 'function' ? liveGet() : null, list = $('lq-list'), cnt = $('lq-count');
    if (!list) return;
    if (!s) { list.innerHTML = '<p class="text-xs text-slate-500">Start a class to see requests.</p>'; if (cnt) cnt.textContent = ''; return; }
    rpc('lecturer_requests', { p_session_id: s.id }).then(function (rows) {
      rows = rows || [];
      var pend = rows.filter(function (q) { return q.r_status === 'pending'; });
      if (cnt) cnt.textContent = pend.length ? pend.length + ' waiting' : '';
      if (!rows.length) { list.innerHTML = '<p class="text-xs text-slate-500">No requests yet.</p>'; return; }
      list.innerHTML = (pend.length > 1 ? '<div class="flex gap-2"><button class="btn flex-1" onclick="lecDecideAll(true)">Approve all (' + pend.length + ')</button><button class="btn2 flex-1" onclick="lecDecideAll(false)">Reject all</button></div>' : '') +
        rows.map(function (q) {
          return '<div class="p-3 rounded-xl space-y-1" style="background:var(--sub)"><div class="flex justify-between text-xs"><b>' + esc(q.r_name || q.r_matric) + ' <span class="font-mono text-slate-500">' + esc(q.r_matric || '') + '</span></b><b style="color:' + (STATUS_COL[q.r_status] || '#d97706') + '">' + esc(q.r_status) + (q.r_auto ? ' (auto)' : '') + '</b></div>' +
            '<div class="text-[11px] text-slate-500">' + esc(REASONS[q.r_reason] || '') + ' - requested by ' + esc(q.r_rep || 'rep') + '</div><div class="text-[11px] text-slate-500">' + flagLine(q) + '</div>' +
            (q.r_status === 'pending' ? '<div class="flex gap-2 pt-1"><button class="btn flex-1" onclick="lecDecide(\'' + esc(q.r_id) + '\',true)">Approve</button><button class="btn2 flex-1" onclick="lecDecide(\'' + esc(q.r_id) + '\',false)">Reject</button></div>' : '') + '</div>';
        }).join('');
    }).catch(lecErr);
  }
  W.lecDecide = function (id, ok) { rpc('decide_request', { p_request_id: id, p_approve: ok }).then(function () { lecReqs(); refreshLive(); }).catch(fail); };
  W.lecDecideAll = function (ok) {
    var s = liveGet(); if (!s || (ok && !confirm('Approve every waiting request?'))) return;
    rpc('decide_all_requests', { p_session_id: s.id, p_approve: ok }).then(function (n) {
      showToast((ok ? 'Approved ' : 'Rejected ') + n + ' request' + (n === 1 ? '' : 's')); lecReqs(); refreshLive();
    }).catch(fail);
  };

  /* manual add: show the history first, offer the no-phone tag */
  var lecHomeBase = LECTURER_VIEWS.home;
  LECTURER_VIEWS.home = function () {
    lecBuilt = false;                                   // page is redrawn, so rebuild the panels
    var h = lecHomeBase().replace('onclick="manualAdd()">Add</button></div></div>',
      'onclick="manualAdd()">Add</button></div><label class="flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" id="man-nophone"> This student has no phone. Their class rep can then add them without waiting for approval.</label></div>');
    return h + '<div id="lec-extras" class="space-y-5 mt-5"></div>';
  };
  W.manualAdd = async function () {
    var inp = $('man-matric'), m = ((inp || {}).value || '').trim(), s = liveGet();
    if (!m) return showToast('Enter matric', 'error');
    if (!s) return showToast('Generate a session first', 'error');
    try {
      var f = (await rpc('student_flags', { p_matric: m }))[0];
      if (!f || !f.r_found) return showToast('No student with that matric', 'error');
      var lines = [f.r_name || m, 'Manual adds in the last 30 days: ' + f.r_manual_adds, 'Opened the app in the last 24 hours: ' + (f.r_active_today ? 'yes' : 'no')];
      if (f.r_no_phone) lines.push('Tagged: no phone');
      else if (f.r_manual_adds >= 3 || (f.r_manual_adds >= 1 && f.r_active_today)) lines.push('', 'Check first: this student has been added by hand before.');
      if (!confirm(lines.join('\n') + '\n\nAdd to this class?')) return;
      var nm = $('man-nophone');
      if (nm && nm.checked) await rpc('set_no_phone', { p_matric: m, p_on: true });
      var course = await rpc('add_manual', { p_session_id: s.id, p_matric: m });
      if (inp) inp.value = ''; if (nm) nm.checked = false;
      showToast('Added manually (M) for ' + course); refreshLive();
    } catch (e) { fail(e); }
  };

  /* ---------- wiring ---------- */
  var homeShownBase = W.onHomeShown;
  W.onHomeShown = function () {
    homeShownBase.apply(this, arguments);
    if (U && U.role === 'lecturer') setTimeout(lecExtrasStart, 400);
  };
  var goBase = W.go;
  W.go = function (v) {
    if (v !== 'rep') repStop();
    if (v !== 'home') lecStop();
    return goBase.apply(this, arguments);
  };
  var startBase = W.start;
  W.start = function () {
    startBase.apply(this, arguments);
    try { touchSeen(); repInit(); } catch (e) {}
  };
} catch (err) {
  console.error('[CIRCUIT BREAKER] ' + MODULE_NAME + ' failed to load:', err);
  try {
    (window._featureFailures = window._featureFailures || {})[MODULE_NAME] = { time: Date.now(), message: (err && err.message) || String(err) };
    if (window._cbNotify) window._cbNotify(MODULE_NAME);
  } catch (e) {}
  if (MODULE_NAME === 'CORE' || MODULE_NAME === 'AUTH') throw err;
}
})();
