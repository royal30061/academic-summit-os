const fs = require('fs');
function sub(file, from, to, label) {
  const s0 = fs.readFileSync(file, 'utf8');
  if (s0.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s0.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s0.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
sub('academics.js',
"var note = h.src === 'released' ? '' : '<p class=\"text-[11px] text-slate-500\">' + (h.src === 'portal' ? 'Portal GPA. ' : 'Deduced from your portal CGPA. ') + 'Released courses only: ' + x.g.toFixed(2) + '.</p>';",
"var note = h.src === 'released' ? '' : '<p class=\"text-[11px] text-slate-500\">' + (h.src === 'portal' ? 'Portal GPA. ' : 'Deduced from your portal CGPA. ') + 'Released courses only: ' + x.g.toFixed(2) + '.</p>';\nif (s.check === 'mismatch') note += '<p class=\"text-[11px] font-bold\" style=\"color:#d97706\">The portal GPA' + (s.portalGPAUnverified != null ? ' (' + (+s.portalGPAUnverified).toFixed(2) + ')' : '') + ' does not match the courses saved here, so it is not used. A course may be missing: upload this semester again and only the missing ones are added.</p>';",
'mismatch-note');
sub('ocr.js',
"var ta = $('paste-a'); if (ta) ta.value = text;",
"if (W._ocrSink) { var sink = W._ocrSink; W._ocrSink = null; sink(text); say('Read. Check the text below, then tap Save my courses.'); input.value = ''; return; }\nvar ta = $('paste-a'); if (ta) ta.value = text;\nW._ocr = true;",
'sink+ocr-flag');
