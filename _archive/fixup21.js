const fs = require('fs');
let s = fs.readFileSync('splash.js', 'utf8');
const from = "var born = Date.now(), gone = false;";
const to =
  "(function hideLegacySplash(){\n" +
  "  try {\n" +
  "    var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), n;\n" +
  "    while ((n = walk.nextNode())) {\n" +
  "      if ((n.nodeValue || '').indexOf('summit starts here') > -1) {\n" +
  "        var el = n.parentNode;\n" +
  "        while (el && el !== document.body) {\n" +
  "          var cs = getComputedStyle(el);\n" +
  "          if (cs.position === 'fixed' || cs.position === 'absolute' || el.id) { el.style.display = 'none'; break; }\n" +
  "          el = el.parentNode;\n" +
  "        }\n" +
  "        break;\n" +
  "      }\n" +
  "    }\n" +
  "  } catch (e) {}\n" +
  "})();\n" +
  "var born = Date.now(), gone = false;";
if (s.indexOf('hideLegacySplash') > -1) console.log('splash.js: sweep already present');
else if (s.indexOf(from) === -1) { console.log('splash.js: ANCHOR MISSING'); process.exitCode = 1; }
else { fs.writeFileSync('splash.js', s.split(from).join(to)); console.log('splash.js: legacy sweep installed'); }
