const fs = require('fs');
function sub(file, from, to, label) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
sub('plan.js',
  "var tip = t.phase === 'rest' ? '<p class=\"text-xs text-slate-500 mt-4\" style=\"font-style:italic\">' + W.pickTip('rest') + '</p>' : '';",
  "var tip = t.phase === 'rest' ? '<div class=\"flex items-center gap-3 mt-4\">' + (W.zumaImg ? W.zumaImg('read', 56) : '') + '<p class=\"text-xs text-slate-500\" style=\"font-style:italic\">' + W.pickTip('rest') + '</p></div>' : '';",
  'reading Zuma on timer rests');
sub('delights.js',
  "extra += '<div class=\"card p-4 d-mile text-xs font-bold mk-gold\">' + (n === 7 ? 'Seven days in a row. The list is yours now.' : 'Thirty days. This is a habit, not a streak.') + '</div>';",
  "extra += '<div class=\"card p-4 d-mile text-xs font-bold mk-gold flex items-center gap-3\">' + (W.zumaImg ? W.zumaImg('cheer', 52) : '') + '<span>' + (n === 7 ? 'Seven days in a row. The list is yours now.' : 'Thirty days. This is a habit, not a streak.') + '</span></div>';",
  'cheering Zuma on milestones');
sub('read.js',
  "out += '<div class=\"p-3 rounded-xl text-xs font-bold\" style=\"background:rgba(16,185,129,.12);color:#047857\">All done today. Come back tomorrow.</div>';",
  "out += '<div class=\"p-3 rounded-xl text-xs font-bold flex items-center gap-3\" style=\"background:rgba(16,185,129,.12);color:#047857\">' + (W.zumaImg ? W.zumaImg('cheer', 48) : '') + '<span>All done today. Come back tomorrow.</span></div>';",
  'cheering Zuma on all-done');
