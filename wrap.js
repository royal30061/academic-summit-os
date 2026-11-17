const fs = require('fs');
const MAP = { 'core.js':'CORE','academics.js':'ACADEMICS','ocr.js':'OCR','reps.js':'REPS','lecturer.js':'LECTURER','auth.js':'AUTH','fixes.js':'FIXES','coach.js':'COACH' };
const guard = [
"/* Academic Summit - guard.js: load FIRST, before every module */",
"(function () {",
"'use strict';",
"window._featureFailures = window._featureFailures || {};",
"window._cbNotify = function (mod) {",
"  try { showToast(mod + ' hit an error and was safely disabled - the rest of the app is fine.', 'error'); } catch (e) {}",
"};",
"window.addEventListener('error', function (ev) {",
"  try {",
"    var key = String(ev.filename || 'app').split('/').pop();",
"    var f = window._featureFailures[key] = window._featureFailures[key] || { count: 0 };",
"    f.count += 1; f.last = ev.message;",
"  } catch (e) {}",
"});",
"})();",
""].join('\n');
fs.writeFileSync('guard.js', guard);
console.log('guard.js written');
for (const f in MAP) {
  if (!fs.existsSync(f)) { console.log(f + ': not found, skipped'); continue; }
  let s = fs.readFileSync(f, 'utf8');
  if (s.indexOf('CIRCUIT BREAKER') > -1) { console.log(f + ': already wrapped'); continue; }
  const i = s.indexOf("'use strict';");
  const j = s.lastIndexOf('})();');
  if (i < 0 || j < 0 || j < i) { console.log(f + ': structure not recognised, SKIPPED'); continue; }
  const name = MAP[f];
  const head = "'use strict';\nvar MODULE_NAME = '" + name + "';\ntry {\n";
  const tail =
    "} catch (err) {\n" +
    "  console.error('[CIRCUIT BREAKER] ' + MODULE_NAME + ' failed to load:', err);\n" +
    "  try {\n" +
    "    (window._featureFailures = window._featureFailures || {})[MODULE_NAME] = { time: Date.now(), message: (err && err.message) || String(err) };\n" +
    "    if (window._cbNotify) window._cbNotify(MODULE_NAME);\n" +
    "  } catch (e) {}\n" +
    "  if (MODULE_NAME === 'CORE' || MODULE_NAME === 'AUTH') throw err;\n" +
    "}\n" +
    "})();\n";
  s = s.slice(0, i) + head + s.slice(i + "'use strict';".length, j) + tail;
  fs.writeFileSync(f, s);
  console.log(f + ': wrapped as ' + name);
}
