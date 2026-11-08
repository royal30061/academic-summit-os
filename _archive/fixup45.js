const fs = require('fs');
let s = fs.readFileSync('study-core.js', 'utf8'), bad = false;
const subs = [
  { label: 'streakFromDays function', done: 'function streakFromDays(',
    from: 'function streakStatus(st, today, rest) {',
    to: `/* Streak rebuilt from the dates the student really studied, plus any missed days they
   made up (repaired). A made-up day counts as a studied day. Pure: no UI, no storage. */
function streakFromDays(days, today, rest, repaired) {
  var seen = {}, all = [];
  (days || []).concat(repaired || []).forEach(function (d) { if (d && d <= today && !seen[d]) { seen[d] = 1; all.push(d); } });
  all.sort();
  if (!all.length) return { count: 0, last: null, best: 0 };
  var run = 1, best = 1;
  for (var i = 1; i < all.length; i++) {
    run = missed(all[i - 1], all[i], rest) === 0 ? run + 1 : 1;
    if (run > best) best = run;
  }
  var last = all[all.length - 1];
  var alive = last === today || missed(last, today, rest) === 0;
  return { count: alive ? run : 0, last: last, best: best };
}
function streakStatus(st, today, rest) {` },
  { label: 'export streakFromDays', done: 'streakFromDays: streakFromDays',
    from: 'updateStreak: updateStreak, streakStatus: streakStatus, pickCgpa: pickCgpa };',
    to: 'updateStreak: updateStreak, streakStatus: streakStatus, streakFromDays: streakFromDays, pickCgpa: pickCgpa };' }
];
subs.forEach(function (x) {
  if (s.indexOf(x.done) > -1) return console.log(x.label + ': already applied');
  if (s.indexOf(x.from) === -1) { console.log('ANCHOR MISSING: ' + x.label); bad = true; return; }
  s = s.split(x.from).join(x.to); console.log(x.label + ': applied');
});
if (!bad) fs.writeFileSync('study-core.js', s); else process.exitCode = 1;
