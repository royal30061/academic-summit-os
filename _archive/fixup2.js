const fs = require('fs');
function sub(file, from, to, label) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
const MERGE = "function mergeInto(t, g) {\nvar have = {}, added = 0, conflict = 0, pend = {};\nt.courses = t.courses || []; t.pending = t.pending || [];\nt.courses.forEach(function (c) { have[c.code] = c; });\ng.courses.forEach(function (c) {\nvar o = have[c.code];\nif (!o) { t.courses.push(c); have[c.code] = c; added++; }\nelse if (o.score !== c.score) conflict++;\n});\nt.pending.concat(g.pending || []).forEach(function (p) { if (!have[p.code]) pend[p.code] = p; });\nt.pending = Object.keys(pend).map(function (k) { return pend[k]; });\nreturn { added: added, conflict: conflict };\n}\n";
/* ---- core.js ---- */
sub('core.js',
"var lec = U.role === 'lecturer', noResults = !lec && U.role === 'student' && !(U.semesters || []).length;",
"var lec = U.role === 'lecturer', noResults = false;   // first-run setup now lives on the home screen (home.js)",
'gate-off');
sub('core.js',
"function splitByPortal(raw, lenBefore) {\nvar built = buildSemesters(raw, W._parsedRows || []);\nif (!built || !built.length) return;",
MERGE + "function splitByPortal(raw, lenBefore) {\nvar built = buildSemesters(raw, W._parsedRows || []);\nvar stats = { added: 0, conflict: 0 };\nif (!built || !built.length) return stats;",
'mergeInto+stats');
sub('core.js',
"if (target) { target.courses = g.courses.slice(); target.pending = g.pending.slice(); used.push(target); }",
"if (target) { var mr = mergeInto(target, g); stats.added += mr.added; stats.conflict += mr.conflict; used.push(target); }",
'merge-not-replace');
sub('core.js',
"U.semesters.splice(i, 1); }\n}",
"U.semesters.splice(i, 1); }\nreturn stats;\n}",
'return-stats');
sub('core.js',
"var lenBefore = U.semesters.length, raw = editing === null ? (W._lastRaw || '') : '', msg;",
"var lenBefore = U.semesters.length, raw = editing === null ? (W._lastRaw || '') : '', msg, snap = null, extra = '';",
'snap+extra');
sub('core.js',
"return showToast('Already recorded - duplicate blocked', 'error');",
"return showToast('Already recorded - duplicate blocked', 'error');\n   snap = JSON.parse(JSON.stringify({ semesters: U.semesters, portalCGPA: U.portalCGPA }));",
'snapshot');
sub('core.js',
"if (ex) { if (ex.score !== c.score || ex.unit !== c.unit) { ex.score = c.score; ex.unit = c.unit; upd++; } }",
"if (ex) { if (ex.score !== c.score || ex.unit !== c.unit) { if (W._ocr) extra = ' | a screenshot score differed, kept your saved one'; else { ex.score = c.score; ex.unit = c.unit; upd++; } } }",
'ocr-keep-saved');
sub('core.js',
"else { match.courses.push(c); add++; }",
"else { match.courses.push(c); add++; match.pending = (match.pending || []).filter(function (p) { return p.code !== c.code; }); }",
'pending-leave');
sub('core.js',
"try { splitByPortal(raw, lenBefore); } catch (e) { console.error('split', e); }",
"try { var sp = splitByPortal(raw, lenBefore); if (sp && sp.conflict) extra = ' | ' + sp.conflict + ' score(s) differed, kept your saved ones'; } catch (e) { console.error('split', e); }",
'conflict-report');
sub('core.js',
"W._lastRaw = ''; W._lastPasteRaw = ''; W._parsedRows = []; W._pasted = false;",
"W._lastRaw = ''; W._lastPasteRaw = ''; W._parsedRows = []; W._pasted = false; W._ocr = false;\nif (snap) { try { var st = JSON.parse(localStorage.getItem('as_undo') || '[]'); st.push({ t: Date.now(), d: snap }); localStorage.setItem('as_undo', JSON.stringify(st.slice(-2))); } catch (e) {} }",
'undo-local');
sub('core.js',
"refreshCarry(); save();\ngo('home');\nshowToast(msg());",
"verifyPortalGPAs();\nrefreshCarry(); save();\ngo('home');\nshowToast(msg() + extra);",
'verify+toast');
/* ---- academics.js ---- */
sub('academics.js',
"var note = h.src === 'released' ? '' : '<p class=\"text-[11px] text-slate-500\">' + (h.src === 'portal' ? 'Portal GPA. ' : 'Deduced from your portal CGPA. ') + 'Released courses only: ' + x.g.toFixed(2) + '.</p>';",
"var note = h.src === 'released' ? '' : '<p class=\"text-[11px] text-slate-500\">' + (h.src === 'portal' ? 'Portal GPA. ' : 'Deduced from your portal CGPA. ') + 'Released courses only: ' + x.g.toFixed(2) + '.</p>';\nif (s.check === 'mismatch') note += '<p class=\"text-[11px] font-bold\" style=\"color:#d97706\">The portal GPA' + (s.portalGPAUnverified != null ? ' (' + (+s.portalGPAUnverified).toFixed(2) + ')' : '') + ' does not match the courses saved here, so it is not used. A course may be missing: upload this semester again and only the missing ones are added.</p>';",
'mismatch-note');
sub('academics.js',
"(' + c.u + ' units released)</div>' + blocks + '</div>';",
"(' + c.u + ' units released)</div>' + (typeof undoCount === 'function' && undoCount() ? '<button class=\"btn2 w-full np\" onclick=\"undoImport()\">Undo last import</button>' : '') + blocks + '</div>';",
'undo-button');
/* ---- ocr.js ---- */
sub('ocr.js',
"var ta = $('paste-a'); if (ta) ta.value = text;",
"if (W._ocrSink) { var sink = W._ocrSink; W._ocrSink = null; sink(text); say('Read. Check the text below, then tap Save my courses.'); input.value = ''; return; }\nvar ta = $('paste-a'); if (ta) ta.value = text;\nW._ocr = true;",
'sink+ocr-flag');
/* ---- core.js tail: integrity + undo functions ---- */
let c = fs.readFileSync('core.js', 'utf8');
if (c.indexOf('verifyPortalGPAs') === -1) {
  const tail = c.lastIndexOf('})();');
  const add = "\nvar pendUnits = function (s) { return (s.pending || []).reduce(function (a, cc) { return a + (+cc.unit || 0); }, 0); };\nfunction verifyPortalGPAs() {\nvar changed = false;\n(U.semesters || []).forEach(function (s) {\nif (s.portalGPA == null) return;\nvar st = semS({ courses: s.courses || [] }), reg = st.u + pendUnits(s);\nif (!st.u) return;\nvar ok = Math.abs(st.q / reg - s.portalGPA) <= 0.015 || Math.abs(st.q / st.u - s.portalGPA) <= 0.015;\nif (!ok) { s.portalGPAUnverified = s.portalGPA; delete s.portalGPA; s.check = 'mismatch'; changed = true; }\nelse if (s.check) { delete s.check; changed = true; }\n});\nif (changed) save();\n}\nW.capturePortalGPAs = function () {\nvar groups = typeof semGroupsFromRaw === 'function' ? semGroupsFromRaw(W._lastRaw || '') : null;\nif (!groups) return;\ngroups.forEach(function (g) {\nvar m = g.section.match(/Grade Point Average\\s*\\(GPA\\)\\s*:?\\s*([0-5]\\.\\d{1,2})/i);\nif (!m) return;\nvar codes = g.section.match(/\\b[A-Z]{2,6}(?:-[A-Z]{2,6})?\\d{3}\\b/g) || [], best = null, bh = 0;\n(U.semesters || []).forEach(function (s) {\nvar have = (s.courses || []).concat(s.pending || []).map(function (x) { return x.code; });\nvar hit = codes.filter(function (x) { return have.indexOf(x) > -1; }).length;\nif (hit > bh) { bh = hit; best = s; }\n});\nif (best) { best.portalGPA = parseFloat(m[1]); delete best.portalGPAUnverified; delete best.check; }\n});\nverifyPortalGPAs();\ntry { deduceMissing(); } catch (e) {}\nsave();\n};\nW.undoCount = function () { try { return JSON.parse(localStorage.getItem('as_undo') || '[]').length; } catch (e) { return 0; } };\nW.undoImport = function () {\nvar st = []; try { st = JSON.parse(localStorage.getItem('as_undo') || '[]'); } catch (e) {}\nvar u = st.pop(); try { localStorage.setItem('as_undo', JSON.stringify(st)); } catch (e) {}\nif (!u) return showToast('Nothing to undo on this device', 'error');\nU.semesters = u.d.semesters;\nif (u.d.portalCGPA == null) delete U.portalCGPA; else U.portalCGPA = u.d.portalCGPA;\nrefreshCarry(); save(); aTab = 'rec'; go('acad');\nshowToast('Last import undone');\n};\nvar startBase2 = W.start;\nW.start = function () { try { if (U && U.undo) { delete U.undo; save(); } } catch (e) {} try { verifyPortalGPAs(); } catch (e) {} return startBase2.apply(this, arguments); };\n";
  fs.writeFileSync('core.js', c.slice(0, tail) + add + c.slice(tail));
  console.log('core.js: integrity tail appended');
} else console.log('core.js: integrity tail already present');
