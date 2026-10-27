var R = require('./resit.js'), ok = 0, bad = 0;
function is(name, got, want) { var p = got === want; p ? ok++ : bad++; console.log((p ? 'PASS ' : 'FAIL ') + name + ': ' + got + ' (want ' + want + ')'); }
function sem(lv, half, codes) { return { lv: lv, half: half, courses: codes.map(function (c) { return { code: c, unit: 2, score: 50 }; }) }; }
function kind(sems, entry, s, i) { return R.tagMap(sems, entry).get(sems[s].courses[i]).kind; }
is('levelOf POS105', R.levelOf('POS105'), 100);
is('levelOf CSS 201', R.levelOf('CSS 201'), 200);
is('levelOf junk', R.levelOf('XYZ'), null);
var a = [sem(100, 0, ['POS105', 'GST111']), sem(200, 0, ['POS 105', 'POS201'])];
is('utme resit', kind(a, null, 1, 0), 'resit');
is('utme new 200 course', kind(a, null, 1, 1), 'first');
is('100L original stays first', kind(a, null, 0, 0), 'first');
var d = [sem(200, 0, ['GST111', 'POS201'])];
is('DE flag: 100-level course is first attempt', kind(d, { startLevel: 200 }, 0, 0), 'late-first');
is('DE flag: 100L level skipped', R.levelStatus(d, { startLevel: 200 }, 200, 100), 'skipped');
is('no flag, no 100L data: not a re-sit', kind(d, null, 0, 0), 'late-first');
is('UTME flag, 100L missing: history-missing', kind(d, { startLevel: 100 }, 0, 0), 'history-missing');
is('UTME flag, 100L missing: prompt upload', R.levelStatus(d, { startLevel: 100 }, 200, 100), 'upload');
var r = [sem(200, 0, ['GST111']), sem(300, 0, ['GST111'])];
is('DE retake is a re-sit', kind(r, { startLevel: 200 }, 1, 0), 'resit');
var h = [sem(100, 0, ['POS101', 'POS103'])];
is('100L all first', kind(h, null, 0, 1), 'first');
is('level above current is future', R.levelStatus(h, null, 100, 200), 'future');
is('level with results is ok', R.levelStatus(h, null, 100, 100), 'ok');
var shuffled = [a[1], a[0]];
is('semester order does not matter', R.tagMap(shuffled, null).get(a[1].courses[0]).kind, 'resit');
console.log(ok + ' passed, ' + bad + ' failed');
process.exit(bad ? 1 : 0);
