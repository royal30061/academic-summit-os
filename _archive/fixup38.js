const fs = require('fs');
function subFile(file, from, to, label) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
/* doors: the role is asked at paint time, never frozen at load */
subFile('doors.js',
  "var ORDER = (U && U.role === 'lecturer') ? ['home', 'roster', 'reps', 'prof'] : ['home', 'study', 'traj', 'att', 'fin'];",
  "function orderFor() { return (U && U.role === 'lecturer') ? ['home', 'roster', 'reps', 'prof'] : ['home', 'study', 'traj', 'att', 'fin']; }",
  'order becomes a function');
subFile('doors.js', "bar.innerHTML = ORDER.map(function (v) {",
  "bar.innerHTML = orderFor().map(function (v) {", 'paint asks live');
/* tune: the streak pill remembers the calendar */
subFile('tune.js', "var grad = m.querySelector('.grad');",
  "var pill = Array.from(m.querySelectorAll('div,span')).find(function (n) {\n" +
  "    return /^(day \\d+ streak|\\d+-day streak|start a streak)$/i.test((n.textContent || '').trim());\n" +
  "  });\n" +
  "  if (pill && !pill.dataset.tuned && W.streakCal) {\n" +
  "    pill.dataset.tuned = '1';\n" +
  "    pill.style.cursor = 'pointer';\n" +
  "    pill.setAttribute('role', 'button');\n" +
  "    pill.addEventListener('click', function () { W.streakCal(); });\n" +
  "  }\n" +
  "  var grad = m.querySelector('.grad');",
  'pill taps to calendar');
/* tune: the whole session card and its play circle open the reading session */
subFile('tune.js',
  "if (big && small && big.textContent.trim() === small.textContent.trim()) small.style.display = 'none';\n  }",
  "if (big && small && big.textContent.trim() === small.textContent.trim()) small.style.display = 'none';\n" +
  "    if (!grad.dataset.wired) {\n" +
  "      grad.dataset.wired = '1';\n" +
  "      grad.style.cursor = 'pointer';\n" +
  "      grad.addEventListener('click', function () {\n" +
  "        if (grad.style.opacity === '0.62') { if (W.h2locked) W.h2locked(); return; }\n" +
  "        W.go(V.sess ? 'sess' : 'read');\n" +
  "      });\n" +
  "    }\n" +
  "    var pb = grad.querySelector('button[aria-label=\"Start reading\"]');\n" +
  "    if (pb) pb.setAttribute('onclick', \"go('sess')\");\n" +
  "  }",
  'session card leads to the timer');
