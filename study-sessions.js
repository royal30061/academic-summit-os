/* Academic Summit - study-sessions.js: server-timed sessions, anti-cheat.
   started_at/ended_at come from Supabase now(); pauses (incl. backgrounding
   via Page Visibility) never count; under 5 minutes never counts to streak. */
(function () {
'use strict';
var W = window, SS = W.SS = {};
var cur = null, offset = 0, pausedMs = 0, hiddenAt = 0;
function uid() { return W._uid || (U && U.uid) || null; }
function todayKey() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
SS.start = function (code, planned) {
  pausedMs = 0; offset = 0; hiddenAt = 0;
  return sb.from('study_sessions')
    .insert({ uid: uid(), course: code, planned_min: planned || null, app_opened_at: new Date().toISOString() })
    .select().single().then(function (r) {
      if (r && r.data) { cur = r.data; offset = new Date(cur.started_at).getTime() - Date.now(); }
      return cur;
    }).catch(function () { cur = { id: null, course: code, started_at: new Date().toISOString() }; offset = 0; return cur; });
};
SS.now = function () { return Date.now() + offset; };
SS.elapsed = function () { if (!cur) return 0; return Math.max(0, SS.now() - new Date(cur.started_at).getTime() - pausedMs); };
SS.can = function () { return SS.elapsed() >= 300000; };
SS.leftMin = function () { return Math.max(0, Math.ceil((300000 - SS.elapsed()) / 60000)); };
SS.active = function () { return !!cur; };
SS.finish = function () {
  if (!cur) return Promise.resolve(null);
  var mins = Math.round(SS.elapsed() / 60000), ok = SS.can(), id = cur.id, course = cur.course;
  var p = id
    ? sb.rpc('sess_finish', { sid: id, mins: mins, ok: ok }).catch(function () {
        return sb.from('study_sessions').update({ minutes: mins, valid: ok, ended_at: new Date().toISOString() }).eq('id', id);
      })
    : Promise.resolve();
  return p.then(function () {
    if (ok) {
      U.readLog = U.readLog || {}; U.readLog[todayKey()] = U.readLog[todayKey()] || [];
      if (U.readLog[todayKey()].indexOf(course) < 0) U.readLog[todayKey()].push(course);
      U.reads = U.reads || {}; U.reads[course] = todayKey();
      save();
    }
    var done = cur; cur = null; return done;
  });
};
SS.history = function (code) {
  return sb.from('study_sessions').select('*').eq('uid', uid()).eq('course', code)
    .order('started_at', { ascending: false })
    .then(function (r) { return r.data || []; }).catch(function () { return []; });
};
document.addEventListener('visibilitychange', function () {
  if (!cur) return;
  if (document.visibilityState === 'hidden') hiddenAt = Date.now();
  else if (hiddenAt) { pausedMs += Date.now() - hiddenAt; hiddenAt = 0; }
});
})();
