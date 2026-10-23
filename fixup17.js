const fs = require('fs');
function sub(file, from, to, label) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
function spliceOut(file, startMark, label) {
  const s = fs.readFileSync(file, 'utf8');
  const i = s.indexOf(startMark);
  if (i === -1) { console.log(file + ': ' + label + ' already gone'); return; }
  const j = s.indexOf('\n}', i);
  if (j === -1) { console.log(file + ': END MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.slice(0, i) + s.slice(j + 2));
  console.log(file + ': ' + label + ' removed');
}
/* 1. calendar explanatory paragraph (the one that kept surviving) */
(function () {
  let s = fs.readFileSync('pulse.js', 'utf8');
  const a = "'<p class=\"text-[11px] text-slate-500\">Every day you read";
  const b = "</p>' +";
  const i = s.indexOf(a);
  if (i === -1) { console.log('pulse.js: paragraph already gone'); return; }
  const j = s.indexOf(b, i);
  if (j === -1) { console.log('pulse.js: END ANCHOR MISSING - not touching'); process.exitCode = 1; return; }
  fs.writeFileSync('pulse.js', s.slice(0, i) + s.slice(j + b.length));
  console.log('pulse.js: calendar paragraph removed');
})();
/* 2. date under the greeting: stop adding it, then delete the function */
sub('read.js', "if (v === 'home') { dateUnderGreeting(); compactReading(); }",
  "if (v === 'home') { compactReading(); }", 'date call removed');
spliceOut('read.js', 'function dateUnderGreeting() {', 'dateUnderGreeting function');
/* 3. header: compact flame+number chip (no duplicate pill) + tappable mountain logo */
sub('read.js', "var chip = U.role === 'student' ? streakBtn() : '';",
  "var chip = U.role === 'student' ? '<button type=\"button\" class=\"streak-btn px-2.5 py-1 rounded-full text-xs font-extrabold\" style=\"background:rgba(16,185,129,.15);color:#047857\" onclick=\"streakCal()\" aria-label=\"Open your reading calendar\">' + FLAME + ' <b>' + ((W.streakInfo ? W.streakInfo() : { n: 0 }).n) + '</b></button>' : '';",
  'compact header chip');
sub('read.js', "'<div class=\"flex items-center gap-2.5\">' + MTN('w-8 h-8') + chip + '</div>'",
  "'<div class=\"flex items-center gap-2.5\"><button type=\"button\" onclick=\"go(\\'home\\')\" aria-label=\"Go to home\" style=\"cursor:pointer;display:inline-flex;background:none;border:none;padding:0\">' + MTN('w-8 h-8') + '</button>' + chip + '</div>'",
  'logo taps home');
/* 4. coach: the real brand mountain, centred, and tappable to home */
sub('coach.js', "W.coachShow = function (force) {",
  "W.coachHome = function () { closeSheet(); go('home'); };\nW.coachShow = function (force) {",
  'coachHome added');
sub('coach.js', "var PEAKS = '<svg viewBox=\"0 0 48 32\" width=\"104\" height=\"70\" aria-hidden=\"true\"><path d=\"M2 30 L18 6 L28 20 L34 12 L46 30 Z\" fill=\"rgba(16,185,129,.14)\" stroke=\"#10b981\" stroke-width=\"2.5\" stroke-linejoin=\"round\"/></svg>';",
  "var PEAKS = '<button type=\"button\" onclick=\"coachHome()\" aria-label=\"Back to home\" style=\"cursor:pointer;background:none;border:none;padding:0\">' + MTN('w-28 h-28') + '</button>';",
  'brand mountain on coach');
