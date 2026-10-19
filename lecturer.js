/* Academic Summit - lecturer.js (consolidation stage 5)
   Replaces the inline blocks for: teaching profile (ls2*), roster
   (discoverSid / loadRoster / paintRoster / rosterSort / exportRosterCSV /
   deleteRoster), and the lecturer Delete Account + settings screen.
   Load order: academics.js -> ocr.js -> reps.js -> lecturer.js -> auth.js     */
(function () {
  'use strict';
var MODULE_NAME = 'LECTURER';
try {

  var W = window;
  var LEVELS = [100, 200, 300, 400, 500, 600];
  var INSTITUTIONS = ['University of Abuja', 'University of Lagos', 'University of Ibadan', 'Ahmadu Bello University', 'Obafemi Awolowo University',
    'University of Nigeria, Nsukka', 'University of Benin', 'University of Ilorin', 'Federal University of Technology, Minna'];
  var val = function (id) { return (($(id) || {}).value || '').trim(); };

  /* =================== teaching profile =================== */
  function courseRow(code, level) {
    var d = document.createElement('div');
    d.className = 'ls2-row grid grid-cols-12 gap-2 items-center';
    d.innerHTML = '<input class="inp col-span-6 uppercase font-mono ls2-code" placeholder="Course code" value="' + esc(code || '') + '">' +
      '<select class="inp col-span-4 ls2-level">' + LEVELS.map(function (l) { return '<option' + (String(level || '200') === String(l) ? ' selected' : '') + '>' + l + '</option>'; }).join('') + '</select>' +
      '<button type="button" class="col-span-2 text-rose-500 font-bold" aria-label="Remove course" onclick="this.parentNode.remove()">x</button>';
    $('ls2-rows').appendChild(d);
  }
  W.ls2Row = courseRow;
  W.ls2Open = W.lecSetup = function () {
    var p = U.profile || {}, L = U.lec || {};
    var titles = ['', 'Mr', 'Mrs', 'Ms', 'Dr', 'Prof'].map(function (t) { return '<option value="' + t + '"' + (p.title === t ? ' selected' : '') + '>' + (t || '-') + '</option>'; }).join('');
    fullScreen('Teaching profile', '<div class="card p-5 space-y-3">' +
      '<p class="text-xs text-slate-500">Two minutes, and you can skip it. It lets the console fill in your course and level when you start a class.</p>' +
      '<div class="grid grid-cols-3 gap-2"><div><label class="lbl block mb-1">Title</label><select id="ls2-title" class="inp">' + titles + '</select></div>' +
      '<div class="col-span-2"><label class="lbl block mb-1">Institution</label><input id="ls2-inst" list="ls2-insts" class="inp" value="' + esc(p.uni || '') + '" placeholder="Where you teach"><datalist id="ls2-insts">' +
      INSTITUTIONS.map(function (n) { return '<option value="' + esc(n) + '">'; }).join('') + '</datalist></div></div>' +
      '<div><label class="lbl block mb-1">Faculty (optional)</label><input id="ls2-fac" class="inp" value="' + esc(p.faculty || '') + '"></div>' +
      '<div><label class="lbl block mb-1">Department</label><input id="ls2-dept" class="inp" value="' + esc(p.program || '') + '" placeholder="e.g. Political Science"></div>' +
      '<div class="lbl pt-1">Courses you teach (add as many as you like)</div><div id="ls2-rows" class="space-y-2"></div>' +
      '<button type="button" class="text-xs font-bold text-emerald-600" onclick="ls2Row()">+ Add another course</button>' +
      '<button class="btn w-full" onclick="ls2Save()">Save &amp; continue</button><button class="btn2 w-full" onclick="ls2Skip()">Skip for now</button></div>');
    (L.courses && L.courses.length ? L.courses : [{ code: '', level: '200' }]).forEach(function (c) { courseRow(c.code, c.level); });
  };
  W.ls2Save = function () {
    var inst = val('ls2-inst'), dept = val('ls2-dept'), courses = [];
    if (!inst || !dept) return showToast('Add your institution and department, or tap Skip', 'error');
    document.querySelectorAll('#ls2-rows .ls2-row').forEach(function (r) {
      var code = r.querySelector('.ls2-code').value.trim().toUpperCase().replace(/\s+/g, ' ');
      if (code && !courses.some(function (c) { return c.code === code; })) courses.push({ code: code, level: r.querySelector('.ls2-level').value, dept: dept });
    });
    U.profile = Object.assign(U.profile || {}, { title: $('ls2-title').value, uni: inst, program: dept, faculty: val('ls2-fac') });
    U.lec = U.lec || {}; U.lec.courses = courses; U.lec.setupDone = true;
    save();
    sb.from('profiles').update({ uni: inst, program: dept, faculty: U.profile.faculty }).eq('id', uid).then(function () {});
    closeSheet(); go('home');
    showToast(courses.length ? 'Teaching profile saved - ' + courses.length + ' course(s)' : 'Teaching profile saved');
  };
  W.ls2Skip = function () { U.lec = U.lec || {}; U.lec2Seen = true; W._lecSkip = 1; save(); closeSheet(); go('home'); };
  function prefillLevel() {                         // picking a course fills its level
    var sel = $('lec-course'), lv = $('lec-level'), cs = (U.lec && U.lec.courses) || [];
    if (!sel || !lv || sel.tagName !== 'SELECT' || !cs.length) return;
    var fill = function () { var c = cs.filter(function (x) { return x.code === sel.value; })[0]; if (c) lv.value = c.level; };
    sel.addEventListener('change', fill);
    if (!lv.value) fill();
  }
  W.ls2Prefill = prefillLevel;
  var homeShownBase = W.onHomeShown;
  W.onHomeShown = function () {
    homeShownBase.apply(this, arguments);
    if (!U || U.role !== 'lecturer') return;
    prefillLevel();
    if ((U.lec && U.lec.setupDone) || U.lec2Seen) return;
    setTimeout(function () {                        // first visit only, and only if nothing else is open
      var sh = $('sheet');
      if (sh && !sh.innerHTML.trim() && !U.lec2Seen) { U.lec2Seen = true; save(); W.ls2Open(); }
    }, 1100);
  };

  /* =================== roster =================== */
  function matricKey(m) {
    var s = String(m || '').toUpperCase();
    return { g: (s.match(/\/([A-Z]{2,6})\//) || [])[1] || (s.match(/[A-Z]{2,6}/) || [])[0] || 'ZZZ', n: (s.match(/\d+/g) || ['0']).map(Number) };
  }
  function rosterSort(rows) {                       // by department code, then numerically through the matric
    return (rows || []).slice().sort(function (a, b) {
      var A = matricKey(a.profiles && a.profiles.matric), B = matricKey(b.profiles && b.profiles.matric);
      if (A.g !== B.g) return A.g < B.g ? -1 : 1;
      for (var i = 0, L = Math.max(A.n.length, B.n.length); i < L; i++) { var x = A.n[i] || 0, y = B.n[i] || 0; if (x !== y) return x - y; }
      return 0;
    });
  }
  function courseOf(r) { return r.course || (r.sessions && r.sessions.course) || ''; }
  W.paintRoster = function () {
    var body = $('roster-body'); if (!body) return;
    body.innerHTML = rosterRows.map(function (r, i) {
      var p = r.profiles || {};
      return '<tr><td class="p-3">' + (i + 1) + '</td><td class="p-3 font-mono text-xs">' + esc(p.matric || p.name || '\u2014') + (p.matric ? '' : ' \u26A0\uFE0F') + '</td><td class="p-3 text-xs">' + esc(courseOf(r)) +
        '</td><td class="p-3 text-xs">' + fmtD(r.marked_at || r.created_at || '') + '</td><td class="p-3 text-xs">' + (r.method === 'manual' ? 'M' : 'OTP') + '</td></tr>';
    }).join('') || '<tr><td class="p-3 text-slate-400" colspan="5">No attendance recorded yet.</td></tr>';
  };
  async function currentSid() {                     // the class running now, else the latest one this lecturer started
    var live = typeof liveGet === 'function' ? liveGet() : null;
    if (live && live.id) return live.id;
    if (W._rosterSid) return W._rosterSid;
    var cols = ['lecturer_id', 'lecturer', 'user_id', 'owner'];
    for (var i = 0; i < cols.length; i++) {
      var r = await sb.from('sessions').select('id').eq(cols[i], uid).order('created_at', { ascending: false }).limit(1);
      if (!r.error && r.data && r.data.length) return r.data[0].id;
    }
    return null;
  }
  W.loadRoster = async function () {
    var sid = await currentSid(); W._rosterSid = sid;
    var q = sb.from('attendance').select('*, profiles(matric,name), sessions(course)');
    if (sid) q = q.eq('session_id', sid);
    var r = await q.order('marked_at', { ascending: true });
    if (r.error) return showToast(r.error.message, 'error');
    rosterRows = rosterSort(r.data || []);
    W.paintRoster();
  };
  W.exportRosterCSV = function () {
    var cell = function (v) { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; };
    var rows = rosterSort(rosterRows).map(function (r, i) {
      var m = (r.profiles && r.profiles.matric) || '';
      return [i + 1, m, matricKey(m).g, courseOf(r), r.marked_at, r.method || 'otp'];
    });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([[['No', 'Matric', 'Dept', 'Course', 'Date', 'Method']].concat(rows).map(function (r) { return r.map(cell).join(','); }).join('\n')], { type: 'text/csv' }));
    a.download = 'attendance-roster.csv'; a.click();
    showToast('Roster exported - sorted by department');
  };
  W.deleteRoster = async function () {
    var sid = W._rosterSid;
    if (!sid) return showToast('Open a roster first', 'error');
    if (!confirm('WARNING: this permanently deletes this class roster and every attendance record inside it. Export the CSV first if you need it. Proceed?')) return;
    if (!confirm('Final check - delete this roster for good?')) return;
    var a = await sb.from('attendance').delete().eq('session_id', sid);
    if (a.error) return showToast(a.error.message, 'error');
    var s = await sb.from('sessions').delete().eq('id', sid);
    if (s.error) return showToast(s.error.message, 'error');
    showToast('Roster deleted'); W._rosterSid = null;
    try { localStorage.removeItem('as_live_' + uid); } catch (e) {}
    W.loadRoster();
  };
  var rosterBase = LECTURER_VIEWS.roster;           // the old danger-zone patch targeted V.roster, which lecturers never use
  LECTURER_VIEWS.roster = function () {
    return rosterBase() + '<div class="card p-4 mt-4 space-y-2" style="border:1px solid rgba(225,29,72,.4)"><div class="font-extrabold text-xs" style="color:#e11d48">Danger zone</div>' +
      '<p class="text-[11px] text-slate-500">Deletes the open roster and every attendance record inside it. Export the CSV first if you need it.</p><button class="btn2 w-full" style="color:#e11d48" onclick="deleteRoster()">Delete this roster</button></div>';
  };

  /* =================== lecturer settings =================== */
  W.deleteLecAccount = async function () {
    if (!confirm('Delete your account permanently? This cannot be undone.')) return;
    var r = await sb.rpc('delete_my_account');
    if (r.error) return showToast('Could not delete: ' + r.error.message, 'error');
    await sb.auth.signOut(); location.reload();
  };
  LECTURER_VIEWS.prof = function () {               // the old Delete Account patch targeted V.prof, so lecturers never saw it
    var p = U.profile || {};
    var f = function (id, label, v, ro) { return '<div><label class="lbl block mb-1">' + label + '</label><input ' + (id ? 'id="' + id + '" ' : '') + 'class="inp" value="' + esc(v || '') + '"' + (ro ? ' readonly' : '') + '></div>'; };
    return '<div class="space-y-5 max-w-2xl"><div class="card p-6 space-y-3"><div class="font-extrabold">Lecturer Settings</div><div class="space-y-3">' +
      f('lp-n', 'Full Name', U.name) + f('lp-u', 'Institution', p.uni) + f('lp-d', 'Department', p.program) + f('', 'Email', email, true) + '</div>' +
      '<div class="flex gap-2"><button class="btn flex-1" onclick="saveLecProfile()">Save Changes</button><button class="btn2 flex-1" onclick="ls2Open()">Teaching profile</button></div></div>' +
      '<div class="card p-5 space-y-2"><div class="lbl">App</div><button class="btn w-full" onclick="installApp()">Download Lecturer App</button><p class="text-[11px] text-slate-400">Installs to home screen, works offline, opens full-screen.</p></div>' +
      '<button class="btn2 w-full !text-rose-500" onclick="deleteLecAccount()">Delete Account</button><button class="btn2 w-full !text-rose-500" onclick="logout()">Log Out Console</button></div>';
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
