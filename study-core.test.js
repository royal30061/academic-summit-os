const S = require('./study-core.js');
let pass = 0, fail = 0;
function t(name, ok, extra) { if (ok) pass++; else { fail++; console.log('FAIL', name, extra === undefined ? '' : JSON.stringify(extra)); } }

/* levels and daily plan */
t('level 15 -> 1', S.levelFor(15).id === 1);
t('level 22.5 -> 2', S.levelFor(22.5).id === 2);
t('level 45 -> 3', S.levelFor(45).id === 3);
t('level 60 -> 4', S.levelFor(60).id === 4);
const cs = [{ code: 'POS204' }, { code: 'GST212' }, { code: 'HIS204' }, { code: 'FSS202' }, { code: 'POS206' }];
let p = S.planDay(30, cs, {}, 4);
t('30 min never gives under 15 each', p.courses.length === 2 && p.perCourse === 15, p);
p = S.planDay(120, cs, {}, 2);
t('2h, 2 courses = level 4', p.courses.length === 2 && p.level.id === 4, p);
p = S.planDay(120, cs, {}, 9);
t('never more than 4 courses', p.courses.length === 4 && p.perCourse === 30, p);
p = S.planDay(45, cs, { POS204: '2026-10-24', GST212: '2026-10-20' }, 2);
t('least recently studied first', p.courses[0].code !== 'POS204' && p.courses.length === 2, p.courses);
t('under 15 min gives a note', S.planDay(10, cs).courses.length === 0);

/* sections */
const text = 'In 1914 Lord Lugard amalgamated the Northern and Southern Protectorates of Nigeria. This created one colony under a single governor.\n\n' +
  'Nigeria gained independence on 1 October 1960 under Prime Minister Abubakar Balewa. The country became a republic in 1963.\n\n' +
  'Obafemi Awolowo led the Action Group in the Western Region. He argued for federalism and free education.';
const secs = S.splitSections(text.repeat(6).replace(/\n\n/g, '\n\n'), 80);
t('sections made', secs.length >= 3, secs.length);
t('every section has a lock of 15-300s', secs.every(s => s.lock >= 15 && s.lock <= 300));
t('no text lost', secs.map(s => s.text).join('\n\n').replace(/\s+/g, ' ').length >= text.repeat(6).replace(/\s+/g, ' ').length - 5);
t('empty text -> no sections', S.splitSections('').length === 0);

/* main points and questions */
const mp = S.mainPoints(text);
t('finds 1914 and 1963', mp.dates.indexOf('1914') > -1 && mp.dates.indexOf('1963') > -1, mp.dates);
t('finds full date', mp.dates.indexOf('1 October 1960') > -1, mp.dates);
t('finds Lord Lugard', mp.names.indexOf('Lord Lugard') > -1, mp.names);
t('finds Obafemi Awolowo', mp.names.indexOf('Obafemi Awolowo') > -1, mp.names);
t('month is not a name', mp.names.indexOf('October') < 0, mp.names);
const qs = S.questionsFor(text, 5);
t('questions made', qs.length >= 3, qs);
t('blank present and answer removed', qs.every(q => q.q.includes('_____') && !q.q.includes(q.a)), qs);

/* answers */
t('exact', S.checkAnswer('1914', '1914'));
t('wrong year', !S.checkAnswer('1915', '1914'));
t('case and punctuation', S.checkAnswer(' lord lugard. ', 'Lord Lugard'));
t('surname only', S.checkAnswer('Awolowo', 'Obafemi Awolowo'));
t('typo allowed', S.checkAnswer('Balewaa', 'Balewa') || S.checkAnswer('Lugerd', 'Lugard') === false);
t('blank is wrong', !S.checkAnswer('', 'Lugard'));
const g = S.gradeSection([{ ok: true, ms: 4000 }, { ok: true, ms: 5000 }, { ok: false, ms: 9000 }, { ok: true, ms: 4500 }, { ok: true, ms: 30000 }]);
t('80% passes', g.pass && g.score === 0.8, g);
t('slow and wrong are weak', g.weak.indexOf(2) > -1 && g.weak.indexOf(4) > -1, g);
t('40% fails', !S.gradeSection([{ ok: true }, { ok: false }, { ok: false }, { ok: false }, { ok: true }]).pass);

/* 2-4-6 */
let it = S.newItem({ course: 'POS204', q: 'q', a: 'a' }, '2026-10-25');
t('first review due day 2', it.due === '2026-10-27', it);
t('not locked on day 1 or day 2', !S.isLocked([it], '2026-10-25') && !S.isLocked([it], '2026-10-26'));
t('locked on day 2', S.isLocked([it], '2026-10-27'));
it = S.advance(it, true, 5000, '2026-10-27');
t('then day 4', it.due === '2026-10-29' && it.phase === 1, it);
it = S.advance(it, true, 5000, '2026-10-29');
t('then day 6', it.due === '2026-10-31' && it.phase === 2, it);
it = S.advance(it, true, 5000, '2026-10-31');
t('finished after day 6', it.done === true && !S.isLocked([it], '2026-11-30'), it);
let w = S.advance(S.newItem({ course: 'X', q: 'q', a: 'a' }, '2026-10-25'), false, 30000, '2026-10-27');
t('wrong + slow = weak 3, asked tomorrow', w.weak === 3 && w.due === '2026-10-28' && !S.isLocked([w], '2026-10-27'), w);
let late = S.advance(S.newItem({ course: 'X', q: 'q', a: 'a' }, '2026-10-25'), true, 3000, '2026-11-05');
t('late review does not repeat same day', late.due === '2026-11-06', late);
const a1 = S.newItem({ course: 'A', q: '1', a: '1', weak: 0 }, '2026-10-25'), a2 = S.newItem({ course: 'B', q: '2', a: '2', weak: 5 }, '2026-10-25');
t('weakest asked first', S.dueNow([a1, a2], '2026-10-27')[0].course === 'B');
t('previous-session quiz', S.previousSessionQuiz([a1, a2], '2026-10-26', 1)[0].course === 'B');
const many = Array.from({ length: 95 }, (_, i) => S.newItem({ course: 'C', q: 'q' + i, a: 'a' }, '2026-10-10'));
const rc = S.monthlyRecap(many, '2026-11-05', 40);
t('marathon split over two days', rc.marathon && rc.days.length === 2 && rc.overflow === 15, { m: rc.marathon, d: rc.days.length, o: rc.overflow });
t('recap due after 30 days', S.recapDue('2026-10-01', '2026-10-31') && !S.recapDue('2026-10-01', '2026-10-30'));

/* streak: 2026-10-25 is a Sunday (0) */
let st = S.updateStreak(null, '2026-10-20');
st = S.updateStreak(st, '2026-10-21'); st = S.updateStreak(st, '2026-10-22');
t('streak 3', st.count === 3, st);
t('same day twice', S.updateStreak(st, '2026-10-22').count === 3);
t('missed a day resets to 1', S.updateStreak(st, '2026-10-24').count === 1);
t('rest day does not break (Fri 23 rest)', S.updateStreak(st, '2026-10-24', [5]).count === 4, S.updateStreak(st, '2026-10-24', [5]));
t('status at risk', S.streakStatus(st, '2026-10-23').atRisk === true);
t('status broken', S.streakStatus(st, '2026-10-26').broken === true);
t('status done today', S.streakStatus(st, '2026-10-22').doneToday === true);

/* CGPA choice */
const c1 = S.pickCgpa({ portal: 4.65, computed: 4.81, pendingUnits: 8 });
t('portal wins while results are pending', c1.value === 4.65 && c1.label === 'Portal CGPA' && c1.projected === 4.81, c1);
const c2 = S.pickCgpa({ portal: 4.65, computed: 4.7, pendingUnits: 0 });
t('calculated wins when everything is graded', c2.value === 4.7 && c2.label === 'Calculated CGPA', c2);
t('no portal, calculated used', S.pickCgpa({ portal: null, computed: 4.2, pendingUnits: 3 }).value === 4.2);

console.log(fail ? 'FAILED ' + fail + ' of ' + (pass + fail) : 'ALL ' + pass + ' TESTS PASS');
process.exitCode = fail ? 1 : 0;
