/* Study Hub: the repaint bug, hand-offs with fallback, and the in-hub notes / practice / plan panels (real study-core.js). */
const L = require('./lib'), core = require('../study-core.js');
module.exports = async function () {
  const T = (l, v) => L.check(l, !!v), hub = c => /class="sx /.test(c.main.innerHTML);
  /* --- the old Study screen repainting over the hub 90 ms after tapping Study --- */
  let c = L.world();
  c.listeners.push(['click', e => { const b = e.target.closest(); if (/^study$/i.test(b.textContent.trim())) { c.__sh.setActive(true); c.setTimeout(() => c.__sh.mount(), 90); } }]);
  c.load('studyhub2.js');
  const btn = { textContent: 'Study', getBoundingClientRect: () => ({ width: 60, top: 950 }) };
  const tap = () => { c.listeners.filter(l => l[0] === 'click').forEach(l => l[1]({ target: { closest: () => btn } })); c.go('study'); };
  tap(); c.run(130); T('tapping Study shows the hub and the classic screen does not paint over it', hub(c));
  c.run(800); T('...and it is still the hub after the watchdog window', hub(c));
  tap(); c.main.innerHTML = 'SOMETHING ELSE'; c.run(1500); T('if anything else covers the hub it repaints itself', hub(c));
  /* --- titles --- */
  c = L.world(); c.load('studyhub2.js'); c.go('study');
  T('"(manual)" titles are hidden on the home card', !/\(manual\)/.test(c.main.innerHTML));
  c.sxPick('materials'); T('course list hides "(manual)" and blank titles', !/\(manual\)|Untitled/.test(c.main.innerHTML) && /Course added manually/.test(c.main.innerHTML));
  c.sxOpen('POS213'); T('course page has four panel tabs', (c.main.innerHTML.match(/class="sx-seg( on)?"/g) || []).length === 4);
  /* --- hand-offs: success, missing screen, dead screen, step failure --- */
  c.sxMaterials('POS213'); c.run(600); T('PDF/notes hand-off opens the engine screen', c.main.innerHTML === 'ACAD2 SCREEN' && c.calls.includes('as2StartCourse:POS 213'));
  c = L.world({ acad2: false }); c.load('studyhub2.js'); c.go('study'); c.sxOpen('POS213'); c.calls.length = 0; c.sxMaterials('POS213'); c.run(900);
  T('missing screen: says why and opens the classic course page', c.toasts.some(t => /acad2 is not loaded/.test(t)) && c.calls.includes('shOpen:POS213'));
  c = L.world({ deadGo: true }); c.load('studyhub2.js'); c.go('study'); c.sxOpen('POS213'); c.calls.length = 0; c.sxMaterials('POS213'); c.run(900);
  T('a tap that does nothing is detected and falls back', c.toasts.some(t => /nothing happened/.test(t)) && c.calls.includes('shOpen:POS213'));
  c = L.world(); c.load('studyhub2.js'); c.go('study'); c.calls.length = 0; c.sxCourses(); c.run(900); T('Add or edit courses opens the courses screen', c.main.innerHTML === 'ACAD SCREEN');
  c = L.world({ deadGo: true }); c.load('studyhub2.js'); c.go('study'); c.calls.length = 0; c.sxCourses(); c.run(900); T('...and falls back to the classic Courses tab if it cannot', c.calls.includes('shTab:courses'));
  /* --- in-hub engine --- */
  const NOTES = 'Thomas Hobbes published Leviathan in 1651 during the English Civil War. The Peace of Westphalia was signed in 1648 and ended the Thirty Years War in Europe. Niccolo Machiavelli wrote The Prince in 1513 for the Medici family in Florence. Hans Morgenthau published Politics Among Nations in 1948 and shaped classical realism after the Second World War. Kenneth Waltz published Theory of International Politics in 1979 and founded structural realism in the discipline.';
  const html = x => x.main.innerHTML;
  c = L.world({ core, courses: [{ code: 'POS 213', title: '(manual)', units: 2 }] }); c.load('studyhub2.js'); c.go('study'); c.sxPick('practice'); c.sxOpen('POS213'); c.sxTab('materials');
  c.els['sx-notes'] = { value: 'too short' }; c.sxMatSave(false); T('notes: too-short text is refused with a message', c.toasts.some(t => /a little more/.test(t)) && !c.store.as_mat_u1);
  c.els['sx-notes'] = { value: NOTES }; c.sxMatSave(false);
  const m = JSON.parse(c.store.as_mat_u1); T('notes: saved in the same format the classic engine reads', m['POS 213'] && m['POS 213'].text === NOTES && m['POS 213'].words > 50 && /^\d{4}-\d\d-\d\d$/.test(m['POS 213'].added));
  c.sxTab('practice'); c.sxPrStart('new'); const n = +(html(c).match(/Question 1 of (\d+)/) || [0, 0])[1]; T('practice: real questions are made from the notes (max 8)', n > 0 && n <= 8);
  const qs = core.questionsFor(NOTES, 4), esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  let steps = 0, rights = 0;
  while (/Check answer/.test(html(c)) && steps < 20) { steps++; const right = steps % 2 === 1, item = qs.find(x => html(c).includes(esc(x.q))); c.els['sx-ans'] = { value: right && item ? item.a : 'zzzz wrong' }; c.sxPrCheck(); if (/>Correct</.test(html(c))) rights++; c.sxPrNext(); }
  const items = c.U.study.items;
  T('practice: session ends with results', /Session complete/.test(html(c)));
  T('practice: every asked question is saved for review (phase 0, this course)', items.length === n && items.every(x => x.phase === 0 && x.course === 'POS 213'));
  T('practice: wrong answers are flagged weak, right ones are not', items.filter(x => x.weak > 0).length === n - rights);
  const today = new Date(), iso = d => d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  const mk = (id, q, a, due, phase, weak) => ({ id, course: 'POS213', section: 0, q, a, kind: 'name', created: '2026-11-01', due, phase, weak, done: false });
  c = L.world({ core, courses: [{ code: 'POS 213', title: 'x', units: 2 }] }); c.load('studyhub2.js'); c.go('study'); c.sxOpen('POS213');
  c.U.study.items = [mk('i1', 'Who wrote The Prince?', 'Machiavelli', iso(today), 0, 0), mk('i2', 'Year of Westphalia?', '1648', iso(today), 1, 3), mk('i3', 'Not due?', 'x', '2099-01-01', 0, 0)];
  c.sxTab('practice'); T('review: shows the due count and the review button', /Review 2 due questions/.test(html(c)));
  c.sxPrStart('review'); T('review: the weakest question comes first', /Year of Westphalia/.test(html(c)));
  c.els['sx-ans'] = { value: '1648' }; c.sxPrCheck(); const i2 = c.U.study.items.find(x => x.id === 'i2'); T('review: a right answer moves the item to its next review', i2.phase === 2 && i2.due > iso(today));
  c.sxPrNext(); c.els['sx-ans'] = { value: 'Plato' }; c.sxPrCheck(); const i1 = c.U.study.items.find(x => x.id === 'i1'); T('review: a wrong answer comes back tomorrow and is flagged weak', i1.weak === 2 && i1.due > iso(today));
  c.sxPrNext(); T('review: results show 1 of 2 right and untouched items stay untouched', /1 of 2 right/.test(html(c)) && c.U.study.items.find(x => x.id === 'i3').due === '2099-01-01');
  c.sxTab('plan'); c.els['sh-nt'] = { value: 'The Westphalian system' }; c.sxTopicAdd(); T('plan: a topic can be added and is shown', /The Westphalian system/.test(html(c)));
  c.sxTopicTap(0); T('plan: tapping moves the topic to In progress', /In progress/.test(html(c)));
  c.sxTopicDel(0); T('plan: a topic can be removed', !/The Westphalian system/.test(html(c)));
  c.sxTab('progress'); T('progress: exposure, recall and mastery are shown', /Exposure/.test(html(c)) && /Mastery/.test(html(c)));
  c = L.world({ courses: [{ code: 'POS 213', title: 'x', units: 2 }] }); c.load('studyhub2.js'); c.go('study'); c.sxOpen('POS213'); c.sxTab('practice'); c.sxPrStart('new');
  T('engine missing: a clear message instead of a crash', c.toasts.some(t => /not loaded/.test(t)));
  c = L.world(); c.asEngineCourses = () => []; c.load('studyhub2.js'); c.go('study'); T('no courses yet: friendly empty state', /Add your courses to begin/.test(c.main.innerHTML));
  T('no emoji in the hub file', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(L.read('studyhub2.js')));
};
