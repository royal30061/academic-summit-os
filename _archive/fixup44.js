const fs = require('fs');
function patch(file, subs) {
  let s = fs.readFileSync(file, 'utf8'), bad = false;
  subs.forEach(function (x) {
    if (x.done && s.indexOf(x.done) > -1) return console.log(file + ': ' + x.label + ': already applied');
    if (s.indexOf(x.from) === -1) { console.log(file + ': ANCHOR MISSING: ' + x.label); bad = true; return; }
    s = s.split(x.from).join(x.to); console.log(file + ': ' + x.label + ': applied');
  });
  if (!bad) fs.writeFileSync(file, s); else process.exitCode = 1;
}
patch('reg2.js', [
  { label: 'entry route selector',
    done: 'id="rg-entry"',
    from: `'<input id="rg-sem" class="inp" value="' + esc(U.regSem || semGuess()) + '">' +`,
    to: `'<input id="rg-sem" class="inp" value="' + esc(U.regSem || semGuess()) + '">' +
    '<div class="card p-3 space-y-2"><div class="lbl">How did you enter the university?</div>' +
    '<select id="rg-entry" class="inp">' +
    [[100, 'Started in 100 Level'], [200, 'Direct entry into 200 Level'], [300, 'Direct entry into 300 Level']].map(function (o) {
      return '<option value="' + o[0] + '"' + (((U.entry && +U.entry.startLevel) || 100) === o[0] ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('') + '</select>' +
    '<p class="text-[11px]" style="color:var(--mut)">Direct-entry students never took the earlier levels here, so a lower-level course they take later is a first attempt, not a carryover.</p></div>' +` },
  { label: 'save entry route',
    done: 'U.entry = {',
    from: `U.regSem = (($('rg-sem') || {}).value) || semGuess();`,
    to: `U.regSem = (($('rg-sem') || {}).value) || semGuess();
  var ev = +((($('rg-entry') || {}).value) || 0);
  if (ev) U.entry = { startLevel: ev, route: ev > 100 ? 'de' : 'utme' };` }
]);
patch('homeflow.js', [
  { label: 'tag helper',
    done: 'function hfTag(',
    from: `function todayKey() {`,
    to: `function hfTag(tm, c) {
  var t = tm && tm.get(c); if (!t || t.kind === 'first') return '';
  var lab = t.kind === 'resit' ? 'Re-sit' : t.kind === 'late-first' ? 'First attempt' : 'Earlier result missing';
  return ' <span style="font-size:9px;font-weight:700;opacity:.7;border:1px solid var(--bd);border-radius:6px;padding:0 4px">' + lab + '</span>';
}
function todayKey() {` },
  { label: 'compute tags',
    done: 'Resit.tagMap(U.semesters',
    from: `var totU = 0, totP = 0, cum = [];`,
    to: `var totU = 0, totP = 0, cum = [];
  var tm = (window.Resit && Resit.tagMap) ? Resit.tagMap(U.semesters || [], U.entry) : null;` },
  { label: 'show tag on course row',
    done: 'esc(c.code) + hfTag(tm, c)',
    from: `<span>' + esc(c.code) + '</span><b>'`,
    to: `<span>' + esc(c.code) + hfTag(tm, c) + '</span><b>'` }
]);
