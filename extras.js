/* Academic Summit - extras.js
   1. "Course registration is live" flag, per level, switched from the admin panel
   2. Private per-course files (PDF / Word / PowerPoint)
   Needs extras.sql. Without it both features stay quiet.
   Load order: core -> academics -> ocr -> home -> extras -> reps -> lecturer -> auth */
(function () {
  'use strict';
  var W = window, REG = {}, flagsAt = 0;

  /* =================== registration flag =================== */
  function liveFor() {                                   // {since} when this student's level is live, else null
    var lv = String((U && U.profile && U.profile.level) || '');
    return REG[lv] ? { since: +REG[lv] } : null;
  }
  W.regLive = liveFor;

  function loadFlags(force) {
    if (!force && Date.now() - flagsAt < 6e5) return;     // at most every 10 minutes
    flagsAt = Date.now();
    sb.from('app_flags').select('value').eq('key', 'reg_live').maybeSingle().then(function (r) {
      if (r.error) return;                                // table missing: stay quiet
      var before = JSON.stringify(liveFor()), after;
      REG = (r.data && r.data.value) || {};
      after = JSON.stringify(liveFor());
      if (before !== after && (view === 'home' || view === 'admin')) go(view);
    });
  }
  var startBase = W.start;
  W.start = function () {
    startBase.apply(this, arguments);
    try { if (U && U.role === 'student') loadFlags(false); } catch (e) {}
  };
  document.addEventListener('visibilitychange', function () {
    try { if (document.visibilityState === 'visible' && U && U.role === 'student') loadFlags(false); } catch (e) {}
  });

  var adminBase = V.admin;
  V.admin = function () {
    var h = adminBase();
    if (typeof isAdmin !== 'function' || !isAdmin()) return h;
    if (Date.now() - flagsAt > 5000) loadFlags(true);
    return h + '<div class="card p-6 space-y-3 mt-5"><div class="font-extrabold">Course registration is live</div>' +
      '<p class="text-[11px] text-slate-500">Turning a level on shows every student of that level a banner asking for the new registration.</p>' +
      '<div class="grid grid-cols-3 gap-2">' + [100, 200, 300, 400, 500, 600].map(function (l) {
        var on = !!REG[l];
        return '<button class="' + (on ? 'btn' : 'btn2') + ' justify-center" onclick="adminToggleReg(' + l + ')">' + l + 'L ' + (on ? 'ON' : 'off') + '</button>';
      }).join('') + '</div></div>';
  };
  W.adminToggleReg = function (l) {
    var next = Object.assign({}, REG);
    if (next[l]) delete next[l]; else next[l] = Date.now();
    sb.from('app_flags').upsert({ key: 'reg_live', value: next, updated_at: new Date().toISOString() }).then(function (r) {
      if (r.error) return showToast(r.error.message, 'error');
      REG = next; showToast(l + 'L registration ' + (next[l] ? 'is live' : 'switched off')); go('admin');
    });
  };

  /* =================== private course files =================== */
  var BUCKET = 'course-files', MAX = 15 * 1024 * 1024, OK = /\.(pdf|docx?|pptx?)$/i;
  var kb = function (n) { return n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB'; };

  W.fileCount = function (code) {
    var n = (U.courseFiles || []).filter(function (f) { return f.code === code; }).length;
    return n ? ' (' + n + ')' : '';
  };
  W.filesOpen = function (code) {
    var all = U.courseFiles || [];
    var rows = all.map(function (f, i) {
      if (f.code !== code) return '';
      return '<div class="flex items-center justify-between gap-2 p-3 rounded-xl text-xs" style="background:var(--sub)"><span class="min-w-0"><b class="block truncate">' + esc(f.name) + '</b><span class="text-slate-500">' + kb(f.size) + ' \u2022 ' + fmtD(f.at) + '</span></span>' +
        '<span class="flex gap-3 shrink-0"><button class="font-bold text-violet-600" onclick="fileView(' + i + ')">Open</button><button class="font-bold text-rose-500" onclick="fileDel(' + i + ')">Delete</button></span></div>';
    }).join('');
    fullScreen(esc(code) + ' files',
      '<div class="card p-5 space-y-3"><p class="text-xs text-slate-500">Keep your handouts, notes and course outline for this course in one place. Files are private to you.</p>' +
      '<div class="space-y-2">' + (rows || '<p class="text-xs text-slate-500">No files yet.</p>') + '</div>' +
      '<label class="flex items-start gap-2 text-[11px] text-slate-500"><input type="checkbox" id="cf-ai" class="mt-0.5"> Allow Academic Summit to use files I add to improve its features. Optional, and your files stay private either way.</label>' +
      '<label class="btn w-full" style="cursor:pointer;position:relative">Add file<input type="file" accept=".pdf,.doc,.docx,.ppt,.pptx" style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer" onchange="fileUp(this,\'' + esc(code) + '\')"></label>' +
      '<p class="text-[11px] text-slate-500">PDF, Word or PowerPoint, up to 15 MB each.</p></div>');
  };
  W.fileUp = async function (inp, code) {
    var f = inp.files && inp.files[0];
    if (!f) return;
    if (!OK.test(f.name)) { inp.value = ''; return showToast('Use a PDF, Word or PowerPoint file', 'error'); }
    if (f.size > MAX) { inp.value = ''; return showToast('That file is over 15 MB', 'error'); }
    var ai = !!(($('cf-ai') || {}).checked), path = uid + '/' + code + '/' + Date.now() + '_' + f.name.replace(/[^A-Za-z0-9._-]/g, '');
    showToast('Uploading...');
    var r = await sb.storage.from(BUCKET).upload(path, f);
    inp.value = '';
    if (r.error) return showToast(r.error.message, 'error');
    (U.courseFiles = U.courseFiles || []).push({ code: code, name: f.name, path: path, size: f.size, at: Date.now(), ai: ai });
    save(); filesOpen(code); showToast('File saved');
  };
  W.fileView = async function (i) {
    var f = (U.courseFiles || [])[i]; if (!f) return;
    var r = await sb.storage.from(BUCKET).createSignedUrl(f.path, 120);
    if (r.error) return showToast(r.error.message, 'error');
    window.open(r.data.signedUrl, '_blank', 'noopener');
  };
  W.fileDel = async function (i) {
    var f = (U.courseFiles || [])[i];
    if (!f || !confirm('Delete ' + f.name + '?')) return;
    var r = await sb.storage.from(BUCKET).remove([f.path]);
    if (r.error) return showToast(r.error.message, 'error');
    U.courseFiles.splice(i, 1); save(); filesOpen(f.code);
  };
})();
