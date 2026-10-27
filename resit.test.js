var R = require('./resit.js'), ok = 0, bad = 0;
function eq(name, got, want) { var pass = Math.abs(got - want) < 0.005; pass ? ok++ : bad++; console.log((pass ? 'PASS ' : 'FAIL ') + name + ': ' + got.toFixed(3) + ' (want ' + want + ')'); }
function is(name, got, want) { var pass = got === want; pass ? ok++ : bad++; console.log((pass ? 'PASS ' : 'FAIL ') + name + ': ' + got + ' (want ' + want + ')'); }
var s1 = [
  { code: 'GST111', units: 2, grade: 'C', order: 11 }, { code: 'HIS101', units: 2, grade: 'E', order: 11 },
  { code: 'POS101', units: 3, grade: 'A', order: 11 }, { code: 'POS103', units: 3, grade: 'E', order: 11 },
  { code: 'POS105', units: 2, grade: 'F', order: 11 }, { code: 'POS107', units: 2, grade: 'F', order: 11 },
  { code: 'POS111', units: 2, grade: 'F', order: 11 }, { code: 'POS113', units: 2, grade: 'E', order: 11 },
  { code: 'GNS104', units: 2, grade: 'E', order: 11 }
];
eq('friend 100L first semester', R.cgpa(s1, 'add').cgpa, 1.50);
var rep = [{ code: 'POS 105', units: 2, grade: 'B', order: 21 }, { code: 'POS107', units: 2, grade: 'C', order: 21 }];
var fill = []; for (var i = 0; i < 10; i++) fill.push({ code: 'XYZ2' + i, units: 2, grade: 'A', order: 21 });
var all = s1.concat(fill, rep);
eq('both kept', R.cgpa(all, 'add').cgpa, 3.273);
eq('replace', R.cgpa(all, 'replace').cgpa, 3.60);
is('code spacing normalised', R.repeats(all).join(','), 'POS105,POS107');
is('portal 3.27 -> add', R.infer(all, 3.27).rule, 'add');
is('portal 3.60 -> replace', R.infer(all, 3.60).rule, 'replace');
is('portal 3.45 -> undecided', R.infer(all, 3.45).decided, false);
is('no re-sits -> not decidable', R.infer(s1, 1.50).decided, false);
eq('clear 3 F with B, both kept', R.project(s1, 'add', [{ code: 'POS105', units: 2, grade: 'B' }, { code: 'POS107', units: 2, grade: 'B' }, { code: 'POS111', units: 2, grade: 'B' }]).cgpa, 2.077);
eq('clear 3 F with B, replaced', R.project(s1, 'replace', [{ code: 'POS105', units: 2, grade: 'B' }, { code: 'POS107', units: 2, grade: 'B' }, { code: 'POS111', units: 2, grade: 'B' }]).cgpa, 2.70);
console.log(ok + ' passed, ' + bad + ' failed');
process.exit(bad ? 1 : 0);
