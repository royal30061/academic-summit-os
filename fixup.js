const fs = require('fs');
function sub(file, from, to, label) {
  let s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
/* 1. undo stack leaves U (no more 3 snapshots riding every cloud sync) */
sub('core.js',
  "if (snap) U.undo = (U.undo || []).concat([{ t: Date.now(), d: snap }]).slice(-3);",
  "if (snap) { try { var st = JSON.parse(localStorage.getItem('as_undo') || '[]'); st.push({ t: Date.now(), d: snap }); localStorage.setItem('as_undo', JSON.stringify(st.slice(-2))); } catch (e) {} }",
  'undo->localStorage');
sub('core.js',
  "W.undoImport = function () {\nvar u = (U.undo || []).pop();\nif (!u) return showToast('Nothing to undo', 'error');",
  "W.undoCount = function () { try { return JSON.parse(localStorage.getItem('as_undo') || '[]').length; } catch (e) { return 0; } };\nW.undoImport = function () {\nvar st = []; try { st = JSON.parse(localStorage.getItem('as_undo') || '[]'); } catch (e) {}\nvar u = st.pop(); try { localStorage.setItem('as_undo', JSON.stringify(st)); } catch (e) {}\nif (!u) return showToast('Nothing to undo on this device', 'error');",
  'undoImport->localStorage');
/* 2. migrate: drop any old U.undo payload from synced data, once */
sub('core.js',
  "W.start = function () { try { verifyPortalGPAs(); } catch (e) {} return startBase.apply(this, arguments); };",
  "W.start = function () { try { if (U && U.undo) { delete U.undo; save(); } } catch (e) {} try { verifyPortalGPAs(); } catch (e) {} return startBase.apply(this, arguments); };",
  'undo-migration');
/* 3. screenshot trust flag must survive navigation; only saveSem clears it */
sub('academics.js',
  "W._semHalf = null; W._pasted = false; W._ocr = false;",
  "W._semHalf = null; W._pasted = false;",
  'ocr-flag-persists');
/* 4. undo button reads the new local counter */
sub('academics.js',
  "(U.undo && U.undo.length ?",
  "(typeof undoCount === 'function' && undoCount() ?",
  'undo-button-source');
/* 5. manifest check: a missing module tag becomes a named absence, not a ghost */
if (fs.readFileSync('fixes.js', 'utf8').indexOf('manifest') === -1) {
  fs.appendFileSync('fixes.js', "\n/* 7. load-order manifest check (diagnostic only) */\n(function(){\nvar NEED=['attBar','ocrPick','regOpen','filesOpen','repAdd','lecAppoint','deleteLecAccount','doLogin','undoImport','coachGo'];\nfunction check(){\nvar missing=NEED.filter(function(n){return typeof window[n]!=='function';});\nif(missing.length){console.warn('[manifest] missing:',missing.join(', '));try{track('manifest_missing',{missing:missing.join(',')});}catch(e){}}\n}\nvar s0=window.start;window.start=function(){var r=s0.apply(this,arguments);setTimeout(check,900);return r;};\n})();\n");
  console.log('fixes.js: manifest check appended');
} else console.log('fixes.js: manifest already present');
