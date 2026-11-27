/* Academic Summit - studyhub2.js v2  (unified Study Hub)
   v2: fixes the hub being painted over. studyhub.js listens for taps on the bottom Study button and, 90 ms later, repaints its
   own classic screen over #main. The hub now switches that off while it is showing (and re-paints itself if anything still
   covers it), turns it back on only for the classic screens it hands off to, and retargets the Profile "Open the Study engine"
   button to the hub so the old engine no longer sits behind the profile.
   One home for everything that used to be split between the Study workspace and the Academics engine:
   Study tab -> hub -> (Materials | Practice | Study plan | My progress) -> the SAME course list -> a course page.
   It is a thin layer: it reads your existing data and hands off to the existing screens (nothing is deleted or migrated).
   Course list: asEngineCourses() -> as2Courses() -> h2courses(), the same chain the classic Study screen uses.
   Progress is built only from real records: study log minutes, reading days, and spaced-repetition cards
   (recalled = answered correctly at least once, mastered = passed every spaced review). */
(function () {
'use strict';
var W = window;
if (W.__asHub2) return; W.__asHub2 = '2';

var S = { screen: 'home', fn: 'materials', code: null, classic: false };
var FN = {
  materials: { t: 'My materials', d: 'PDFs, notes and saved topics', ic: 'library' },
  practice:  { t: 'Practice', d: 'Recall, questions and reviews', ic: 'target' },
  plan:      { t: 'Study plan', d: 'Daily targets and revision', ic: 'calendar' },
  progress:  { t: 'My progress', d: 'Mastery and weak areas', ic: 'chart' }
};

/* ---------- small helpers ---------- */
function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function ck(c) { return String(c || '').replace(/\s+/g, '').toUpperCase(); }
function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
function toast(m, t) { try { showToast(m, t); } catch (e) {} }

var IC = {
  library: '<path d="M4 5v14M9 5v14M14 6l4.5 13M3 19h18"/>',
  target: '<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-4-4L4 16v4zM14 6l4 4"/>',
  flame: '<path d="M12 3c1 3.2 4.5 5 4.5 9.2A4.5 4.5 0 0 1 12 17a4.5 4.5 0 0 1-4.5-4.8c0-1.6.7-2.7 1.6-3.6.2 1.3.9 2 1.7 2.2C10.3 8 10.8 5.4 12 3z"/>',
  book: '<path d="M5 4.5h10a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5zM5 17a3 3 0 0 1 3-3h10"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/>'
};
function svg(n, cls) { return '<svg class="' + (cls || 'sx-i') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }

/* ---------- data (all read-only) ---------- */
function courses() {
  var list = [];
  try { if (W.asEngineCourses) list = W.asEngineCourses() || []; } catch (e) {}
  if (!list.length) { try { if (W.as2Courses) list = W.as2Courses() || []; } catch (e) {} }
  if (!list.length) { try { if (W.h2courses) list = (W.h2courses() || []).map(function (c) { return { code: c.code, title: c.title || c.name || '', units: c.units }; }); } catch (e) {} }
  var seen = {}, out = [];
  list.forEach(function (c) { if (!c || !c.code) return; var k = ck(c.code); if (seen[k]) return; seen[k] = 1; out.push({ code: String(c.code).trim(), key: k, title: c.title || c.name || '', units: c.units }); });
  return out;
}
function shState() { try { return (W.__sh && W.__sh.state && W.__sh.state()) || {}; } catch (e) { return {}; } }
function cards(key) { try { return ((U.study && U.study.items) || []).filter(function (x) { return ck(x.course) === key; }); } catch (e) { return []; } }
function matWords(code, key) {
  try {
    var uidv = typeof uid === 'function' ? uid() : (typeof uid !== 'undefined' ? uid : 'me');
    var m = JSON.parse(localStorage.getItem('as_mat_' + uidv)) || {}, v = m[code] || m[key] || null;
    if (!v) { Object.keys(m).forEach(function (k) { if (!v && ck(k) === key) v = m[k]; }); }
    return v ? (v.words || (v.text ? String(v.text).trim().split(/\s+/).length : 0)) : 0;
  } catch (e) { return 0; }
}
function stats(c) {
  var st = shState(), log = (st.log || []).filter(function (e) { return ck(e.course) === c.key && e.status === 'done'; });
  var minutes = log.reduce(function (a, e) { return a + (e.focused || 0); }, 0);
  var cs = cards(c.key), total = cs.length;
  var recalled = cs.filter(function (x) { return x.done || (x.phase || 0) >= 1; }).length;
  var mastered = cs.filter(function (x) { return x.done; }).length;
  var due = cs.filter(function (x) { return !x.done && x.due && x.due <= today(); }).length;
  var weak = cs.filter(function (x) { return (x.weak || 0) >= 2 && !x.done; }).sort(function (a, b) { return (b.weak || 0) - (a.weak || 0); }).slice(0, 3);
  var topics = ((st.topics || {})[c.key] || (st.topics || {})[c.code] || []), tdone = topics.filter(function (t) { return t.s === 2; }).length;
  var rd = 0; try { var rl = U.readLog || {}; Object.keys(rl).forEach(function (d) { if ((rl[d] || []).some(function (x) { return ck(x) === c.key; })) rd++; }); } catch (e) {}
  return { minutes: minutes, sessions: log.length, readDays: rd, total: total, recalled: recalled, mastered: mastered, due: due, weak: weak,
           topics: topics.length, tdone: tdone, words: matWords(c.code, c.key) };
}
function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }

/* ---------- styles (scoped; follows the app's colour variables, light and dark) ---------- */
(function () {
  if (document.getElementById('sx-css')) return;
  var st = document.createElement('style'); st.id = 'sx-css';
  st.textContent = [
    '.sx{font-family:"Plus Jakarta Sans",system-ui,sans-serif;--sx-g:#10b981;--sx-c:#06b6d4}',
    '.sx-i{width:20px;height:20px;flex:none}.sx-i-s{width:16px;height:16px;flex:none}',
    '.sx-mono{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut)}',
    '.sx-h1{font-weight:800;font-size:clamp(1.55rem,6.4vw,1.9rem);line-height:1.1;letter-spacing:-.02em;color:var(--tx)}',
    '.sx-sub{color:var(--mut);font-size:.82rem;line-height:1.45}',
    '.sx-hero{position:relative;border-radius:1.4rem;padding:1px;background:linear-gradient(135deg,rgba(16,185,129,.7),rgba(6,182,212,.35) 55%,rgba(16,185,129,.12))}',
    '.sx-hero>div{border-radius:calc(1.4rem - 1px);padding:18px;background:linear-gradient(180deg,#fff,#eef2f5);position:relative;overflow:hidden}',
    'html.dark .sx-hero>div{background:linear-gradient(180deg,#0a2f23,#06231a)}',
    '.sx-hero>div:before{content:"";position:absolute;right:-60px;top:-70px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(16,185,129,.28),transparent 68%);pointer-events:none}',
    '.sx-bar{height:6px;border-radius:99px;background:rgba(120,140,150,.22);overflow:hidden}',
    '.sx-bar>i{display:block;height:100%;border-radius:99px;background:linear-gradient(90deg,#059669,#10b981 55%,#06b6d4)}',
    '.sx-tile{display:flex;flex-direction:column;gap:12px;text-align:left;width:100%;min-height:132px;padding:16px;border-radius:1.25rem;border:1px solid var(--bd);background:var(--card);box-shadow:var(--sh);position:relative;overflow:hidden;transition:transform .15s ease,border-color .15s ease;-webkit-tap-highlight-color:transparent}',
    ':root:not(.dark) .sx-tile{background:linear-gradient(180deg,#fff,#f0f3f6)}',
    '.sx-tile:active{transform:scale(.975)}',
    '.sx-tile:before{content:"";position:absolute;left:-30px;top:-40px;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle,rgba(16,185,129,.16),transparent 70%);pointer-events:none}',
    'html.dark .sx-tile{border-color:rgba(16,185,129,.22)}',
    '.sx-chip{width:40px;height:40px;border-radius:.9rem;display:flex;align-items:center;justify-content:center;color:#059669;background:linear-gradient(135deg,rgba(16,185,129,.16),rgba(6,182,212,.12));border:1px solid rgba(16,185,129,.28)}',
    'html.dark .sx-chip{color:#34d399}',
    '.sx-t{font-weight:800;font-size:.98rem;color:var(--tx);letter-spacing:-.01em}',
    '.sx-row{display:flex;align-items:center;gap:12px;width:100%;text-align:left;padding:14px;border-radius:1.1rem;border:1px solid var(--bd);background:var(--card);box-shadow:var(--sh);-webkit-tap-highlight-color:transparent}',
    ':root:not(.dark) .sx-row{background:linear-gradient(180deg,#fff,#f0f3f6)}',
    '.sx-row:active{transform:scale(.985)}',
    '.sx-code{font-family:"JetBrains Mono",ui-monospace,monospace;font-weight:700;font-size:.84rem;letter-spacing:.04em;color:var(--tx)}',
    '.sx-pill{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:99px;font-size:.72rem;font-weight:700;color:#047857;background:rgba(16,185,129,.12);border:1px solid rgba(16,185,129,.28)}',
    'html.dark .sx-pill{color:#6ee7b7}',
    '.sx-back{display:inline-flex;align-items:center;gap:6px;color:var(--mut);font-weight:700;font-size:.8rem;padding:6px 10px 6px 4px;-webkit-tap-highlight-color:transparent}',
    '.sx-cta{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:.85rem 1rem;border-radius:.95rem;font-weight:800;font-size:.88rem;color:#fff;background:linear-gradient(135deg,#059669,#10b981 55%,#06b6d4);box-shadow:0 8px 20px -8px rgba(16,185,129,.5)}',
    '.sx-cta.sx-dark{background:#05140e;color:#ecfff7;box-shadow:inset 0 0 0 1px rgba(16,185,129,.35)}',
    '.sx-ghost{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:.8rem 1rem;border-radius:.95rem;font-weight:700;font-size:.84rem;color:var(--tx);border:1px dashed var(--bd);background:transparent}',
    '.sx-sec{border-radius:1.25rem;border:1px solid var(--bd);background:var(--card);box-shadow:var(--sh);padding:16px}',
    ':root:not(.dark) .sx-sec{background:linear-gradient(180deg,#fff,#f0f3f6)}',
    '.sx-sec.sx-on{border-color:rgba(16,185,129,.6);box-shadow:0 0 0 3px rgba(16,185,129,.12),var(--sh)}',
    '.sx-stat{border-radius:1rem;padding:12px;background:var(--sub);border:1px solid var(--bd)}',
    '.sx-n{font-weight:800;font-size:1.25rem;letter-spacing:-.02em;color:var(--tx);font-variant-numeric:tabular-nums}',
    '@media (prefers-reduced-motion:reduce){.sx-tile,.sx-row{transition:none}}'
  ].join('\n');
  document.head.appendChild(st);
})();

/* ---------- screens ---------- */
function last() {
  var st = shState(), l = (st.log || []).filter(function (e) { return e && e.course; }).slice(-1)[0], cs = courses(), c = null;
  if (l) c = cs.filter(function (x) { return x.key === ck(l.course); })[0] || null;
  if (!c) c = cs[0] || null;
  return { c: c, topic: l && l.topic };
}
function streakChip() {
  var n = 0; try { n = (U.study && U.study.streak && U.study.streak.count) || 0; } catch (e) {}
  return n > 0 ? '<span class="sx-pill">' + svg('flame', 'sx-i-s') + n + ' day streak</span>' : '';
}
function home() {
  var cs = courses(), L = last(), body = '';
  var hero;
  if (L.c) {
    var s = stats(L.c), prog = s.total ? pct(s.mastered, s.total) : (s.topics ? pct(s.tdone, s.topics) : null);
    var line = s.total ? (s.recalled + ' of ' + s.total + ' questions recalled') : (s.words ? 'Material saved. Recall not started.' : 'No material yet. Add notes to begin.');
    hero = '<div class="sx-hero"><div>' +
      '<div class="flex items-center justify-between"><span class="sx-mono">Continue learning</span><span class="sx-mono" style="color:var(--sx-g)">' + E(L.c.code) + '</span></div>' +
      '<div class="mt-2" style="font-weight:800;font-size:1.3rem;line-height:1.2;letter-spacing:-.015em;color:var(--tx)">' + E(L.c.title || L.c.code) + '</div>' +
      '<div class="sx-sub mt-1">' + E(L.topic ? 'Last topic: ' + L.topic : line) + '</div>' +
      (prog !== null ? '<div class="sx-bar mt-4"><i style="width:' + Math.max(4, prog) + '%"></i></div><div class="sx-mono mt-2">' + prog + '% mastered</div>' : '<div class="mt-4"></div>') +
      '<button class="sx-cta sx-dark mt-3" onclick="sxResume(\'' + E(L.c.key) + '\')"><span>Resume study</span>' + svg('arrow') + '</button></div></div>';
  } else {
    hero = '<div class="sx-hero"><div><span class="sx-mono">Get started</span>' +
      '<div class="mt-2" style="font-weight:800;font-size:1.25rem;line-height:1.2;color:var(--tx)">Add your courses to begin</div>' +
      '<div class="sx-sub mt-1">Your registered courses appear here once added.</div>' +
      '<button class="sx-cta mt-4" onclick="sxCourses()"><span>Add courses</span>' + svg('plus') + '</button></div></div>';
  }
  var tiles = Object.keys(FN).map(function (k) {
    var f = FN[k];
    return '<button class="sx-tile" onclick="sxPick(\'' + k + '\')"><span class="sx-chip">' + svg(f.ic) + '</span><span><span class="sx-t block">' + f.t + '</span><span class="sx-sub block mt-0.5">' + f.d + '</span></span></button>';
  }).join('');
  return '<div class="sx max-w-md mx-auto space-y-4 pb-28">' +
    '<div class="flex items-start justify-between gap-3 pt-1"><div><div class="sx-mono">Academic Summit</div><h1 class="sx-h1 mt-1">Study Hub</h1><div class="sx-sub mt-1">Your personal academic learning environment</div></div><div class="pt-1">' + streakChip() + '</div></div>' +
    hero + '<div class="grid grid-cols-2 gap-3">' + tiles + '</div>' +
    (cs.length ? '<button class="sx-ghost" onclick="sxCourses()">' + svg('edit', 'sx-i-s') + 'Add or edit courses</button>' : '') + '</div>';
}
function rowStatus(k, c) {
  var s = stats(c);
  if (k === 'materials') return s.words ? s.words.toLocaleString() + ' words saved' : 'No material yet';
  if (k === 'practice') return s.due ? s.due + ' due now' : (s.total ? s.total + ' questions in review' : 'No questions yet');
  if (k === 'plan') return s.topics ? s.tdone + ' of ' + s.topics + ' topics done' : 'No topics yet';
  return s.total ? 'Recall ' + pct(s.recalled, s.total) + '%' : (s.minutes ? s.minutes + ' min studied' : 'Not started');
}
function list() {
  var f = FN[S.fn], cs = courses();
  var rows = cs.map(function (c) {
    return '<button class="sx-row" onclick="sxOpen(\'' + E(c.key) + '\')"><span class="sx-chip" style="width:44px;height:44px">' + svg(f.ic) + '</span>' +
      '<span class="flex-1 min-w-0"><span class="sx-code block">' + E(c.code) + '</span><span class="block truncate" style="font-size:.85rem;font-weight:600;color:var(--tx)">' + E(c.title || 'Untitled course') + '</span>' +
      '<span class="sx-sub block" style="font-size:.74rem">' + E(rowStatus(S.fn, c)) + '</span></span><span style="color:var(--mut)">' + svg('arrow', 'sx-i-s') + '</span></button>';
  }).join('');
  return '<div class="sx max-w-md mx-auto space-y-4 pb-28">' +
    '<button class="sx-back" onclick="sxHome()">' + svg('back', 'sx-i-s') + 'Study Hub</button>' +
    '<div><div class="sx-mono">Choose a course</div><h1 class="sx-h1 mt-1">' + f.t + '</h1><div class="sx-sub mt-1">' + f.d + '</div></div>' +
    (rows ? '<div class="space-y-2.5">' + rows + '</div>' : '<div class="sx-sec"><div class="sx-t">No courses yet</div><div class="sx-sub mt-1">Add the courses you are taking this semester and they will appear here.</div></div>') +
    '<button class="sx-ghost" onclick="sxCourses()">' + svg('plus', 'sx-i-s') + 'Add or edit courses</button></div>';
}
function meter(label, hint, a, b) {
  return '<div class="sx-stat"><div class="sx-mono">' + label + '</div><div class="sx-n mt-1">' + (b ? pct(a, b) + '%' : '0%') + '</div>' +
    '<div class="sx-bar mt-2"><i style="width:' + (b ? Math.max(3, pct(a, b)) : 0) + '%"></i></div><div class="sx-sub mt-1.5" style="font-size:.7rem">' + hint + '</div></div>';
}
function course() {
  var c = courses().filter(function (x) { return x.key === S.code; })[0];
  if (!c) { S.screen = 'list'; return list(); }
  var s = stats(c), on = function (k) { return S.fn === k ? ' sx-on' : ''; };
  var prog = '<div class="sx-sec' + on('progress') + '"><div class="flex items-center gap-2">' + svg('chart') + '<span class="sx-t">Progress</span></div>' +
    '<div class="sx-sub mt-1">Exposure is studying. Recall is answering correctly. Mastery is getting it right again and again over several days.</div>' +
    '<div class="grid grid-cols-3 gap-2 mt-3">' +
    '<div class="sx-stat"><div class="sx-mono">Exposure</div><div class="sx-n mt-1">' + s.minutes + '<span class="sx-sub" style="font-size:.7rem;font-weight:600"> min</span></div><div class="sx-sub mt-2" style="font-size:.7rem">' + s.sessions + ' sessions, ' + s.readDays + ' reading days</div></div>' +
    meter('Recall', s.recalled + ' of ' + s.total + ' answered right', s.recalled, s.total) +
    meter('Mastery', s.mastered + ' of ' + s.total + ' fully retained', s.mastered, s.total) + '</div>' +
    (s.weak.length ? '<div class="sx-mono mt-4">Weak concepts</div><div class="space-y-1.5 mt-2">' + s.weak.map(function (x) { return '<div class="sx-stat" style="padding:10px 12px;font-size:.8rem;color:var(--tx)">' + E(String(x.q || '').slice(0, 110)) + '</div>'; }).join('') + '</div>' : '') + '</div>';
  var mat = '<div class="sx-sec' + on('materials') + '"><div class="flex items-center gap-2">' + svg('library') + '<span class="sx-t">My materials</span></div>' +
    '<div class="sx-sub mt-1">' + (s.words ? s.words.toLocaleString() + ' words saved for this course.' : 'Paste notes or upload a PDF to turn them into questions.') + '</div>' +
    '<button class="sx-cta mt-3" onclick="sxMaterials(\'' + E(c.key) + '\')"><span>' + (s.words ? 'Open materials' : 'Add material') + '</span>' + svg('arrow') + '</button></div>';
  var pr = '<div class="sx-sec' + on('practice') + '"><div class="flex items-center gap-2">' + svg('target') + '<span class="sx-t">Practice</span></div>' +
    '<div class="sx-sub mt-1">' + (s.due ? s.due + ' question' + (s.due > 1 ? 's' : '') + ' ready to review now.' : (s.total ? 'Nothing due. Your next reviews are scheduled.' : 'Add material first, then questions appear here.')) + '</div>' +
    '<button class="sx-cta mt-3" onclick="sxPractice(\'' + E(c.key) + '\')"><span>' + (s.due ? 'Review now' : 'Start recall') + '</span>' + svg('arrow') + '</button></div>';
  var pl = '<div class="sx-sec' + on('plan') + '"><div class="flex items-center gap-2">' + svg('calendar') + '<span class="sx-t">Study plan</span></div>' +
    '<div class="sx-sub mt-1">' + (s.topics ? s.tdone + ' of ' + s.topics + ' topics done.' : 'Break this course into topics and plan your sessions.') + '</div>' +
    (s.topics ? '<div class="sx-bar mt-3"><i style="width:' + Math.max(4, pct(s.tdone, s.topics)) + '%"></i></div>' : '') +
    '<button class="sx-cta mt-3" onclick="sxPlan(\'' + E(c.key) + '\')"><span>Open study plan</span>' + svg('arrow') + '</button></div>';
  var order = { materials: [mat, pr, pl, prog], practice: [pr, mat, pl, prog], plan: [pl, mat, pr, prog], progress: [prog, mat, pr, pl] }[S.fn] || [mat, pr, pl, prog];
  return '<div class="sx max-w-md mx-auto space-y-4 pb-28">' +
    '<button class="sx-back" onclick="sxList()">' + svg('back', 'sx-i-s') + FN[S.fn].t + '</button>' +
    '<div><div class="sx-mono">' + E(c.code) + (c.units ? ' / ' + E(c.units) + ' units' : '') + '</div><h1 class="sx-h1 mt-1">' + E(c.title || c.code) + '</h1></div>' +
    order.join('') + '</div>';
}
function render() { return S.screen === 'list' ? list() : S.screen === 'course' ? course() : home(); }

/* ---------- navigation ---------- */
var goB = W.go, keep = false;
function repaint() { keep = true; try { goB('study'); } finally { keep = false; } }
function shActive(on) { try { if (W.__sh && W.__sh.setActive) W.__sh.setActive(!!on); } catch (e) {} }
function classic(then) {
  S.classic = true; shActive(true); keep = true;
  try { goB('study'); } finally { keep = false; }
  setTimeout(function () { try { if (W.__sh && W.__sh.mount) W.__sh.mount(); } catch (e) {} if (then) setTimeout(then, 60); }, 90);
}
function direct(view, then) { try { goB(view); } catch (e) { toast('Could not open that screen', 'error'); return; } if (then) setTimeout(then, 90); }
W.sxHome = function () { S.screen = 'home'; S.classic = false; repaint(); };
W.sxPick = function (fn) { S.fn = fn; S.screen = 'list'; repaint(); };
W.sxList = function () { S.screen = 'list'; repaint(); };
W.sxOpen = function (key) { S.code = key; S.screen = 'course'; repaint(); };
W.sxCourses = function () { try { W.aTab = 'crs'; } catch (e) {} try { if (typeof aTab !== 'undefined') aTab = 'crs'; if (typeof editing !== 'undefined') editing = null; } catch (e) {} goB('acad'); };
W.sxResume = function (key) { classic(function () { if (W.shStudy) W.shStudy(key); }); };
W.sxMaterials = function (key) {
  var c = courses().filter(function (x) { return x.key === key; })[0]; if (!c) return;
  direct('acad2', function () { if (W.as2StartCourse) W.as2StartCourse(c.code); });
};
W.sxPractice = function (key) {
  var c = courses().filter(function (x) { return x.key === key; })[0]; if (!c) return;
  var due = stats(c).due;
  direct('acad2', function () { if (due && W.as2Reviews) W.as2Reviews(); else if (W.as2StartCourse) W.as2StartCourse(c.code); });
};
W.sxPlan = function (key) { classic(function () { if (W.shOpen) W.shOpen(key); }); };

/* the Study tab always lands on the hub; classic screens open only through the hub (or legacy shortcuts below) */
if (typeof goB === 'function') W.go = function (v) {
  if (v === 'study' && !keep) { S.screen = 'home'; S.classic = false; }
  return goB.apply(this, arguments);
};
var vOrig = (typeof V !== 'undefined') ? V.study : null;
if (typeof V !== 'undefined') V.study = function () {
  if (S.classic && typeof vOrig === 'function') return vOrig.apply(this, arguments);
  shActive(false);
  return render();
};
/* older shortcuts (home cards) that call the classic course page directly keep working */
['shOpen', 'shStudy'].forEach(function (n) {
  var o = W[n]; if (typeof o !== 'function') return;
  W[n] = function () {
    var a = arguments, self = this;
    if (!S.classic) { classic(function () { o.apply(self, a); }); return; }
    return o.apply(this, a);
  };
});

/* ---------- tapping the bottom Study button: land on the hub and keep it there ---------- */
function onStudy() { return typeof view !== 'undefined' && view === 'study'; }
function guard() {
  var tries = 0;
  (function check() {
    if (S.classic) return;
    var m = document.getElementById('main');
    if (m && !m.querySelector('.sx')) { if (onStudy() || tries === 0) { shActive(false); try { repaint(); } catch (e) {} } }
    if (++tries < 4) setTimeout(check, tries === 1 ? 180 : 450);
  })();
}
W.__sxGuard = guard;
document.addEventListener('click', function (e) {
  try {
    var b = e.target && e.target.closest ? e.target.closest('button,a,[role=button]') : null; if (!b || W.__shSkip) return;
    var r = b.getBoundingClientRect();
    if (!(r.width > 0 && r.top > (W.innerHeight || 800) * 0.7)) return;
    if (String(b.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase() === 'study') {
      S.screen = 'home'; S.classic = false; shActive(false); setTimeout(guard, 60);   // runs after studyhub.js has armed its repaint
    }
  } catch (err) {}
}, true);

/* ---------- Profile: the old "Study engine" card now opens the hub ---------- */
function retarget() {
  var m = document.getElementById('main'); if (!m) return;
  var bs = m.querySelectorAll('button');
  for (var i = 0; i < bs.length; i++) {
    var b = bs[i], t = String(b.textContent || '').replace(/\s+/g, ' ').trim();
    if (t === 'Open the Study engine' && !b.getAttribute('data-sx')) {
      b.setAttribute('data-sx', '1'); b.removeAttribute('onclick'); b.textContent = 'Open Study Hub';
      b.onclick = function (ev) { ev.preventDefault(); S.screen = 'home'; S.classic = false; goB('study'); };
      var card = b.parentNode, h = card && card.querySelectorAll ? card.querySelectorAll('div,h2,h3,span') : [];
      for (var j = 0; j < h.length; j++) { if (!h[j].children.length && String(h[j].textContent).trim() === 'Study engine') h[j].textContent = 'Study Hub'; }
    }
  }
}
var tq = 0;
try { new MutationObserver(function () { if (tq) return; tq = setTimeout(function () { tq = 0; retarget(); }, 120); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
})();
