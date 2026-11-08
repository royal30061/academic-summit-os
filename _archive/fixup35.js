const fs = require('fs');
let s = fs.readFileSync('tune.js', 'utf8');
function parses(code) { try { new Function(code); return true; } catch (e) { return false; } }
if (parses(s)) { console.log('tune.js already parses - nothing to do'); process.exit(0); }
const MARK = 'scrubX(sh);';
const w = s.indexOf('W.zumaRemind');
const i = s.lastIndexOf(MARK, w);
const cand = [];
if (i > -1 && w > -1) {
  const head = s.slice(0, i + MARK.length);
  const seg = s.slice(i + MARK.length, w);
  const tail = s.slice(w);
  cand.push(head + seg.replace('\n}\n}', '\n}') + tail);
  cand.push(head + seg.replace('\n}\n\n}', '\n}') + tail);
  cand.push(head + seg.replace(/\n\}\s*\n\}/, '\n}') + tail);
}
cand.push(s.replace('scrubX(sh);\n}\n}\n', 'scrubX(sh);\n}\n'));
let done = false;
for (let k = 0; k < cand.length; k++) {
  if (cand[k] !== s && parses(cand[k])) {
    fs.writeFileSync('tune.js', cand[k]);
    console.log('tune.js repaired via candidate ' + (k + 1) + ' and self-verified by the parser');
    done = true;
    break;
  }
}
if (!done) {
  console.log('NO CANDIDATE PARSED - do not push; paste this window to Royal:');
  console.log(s.slice(Math.max(0, w - 260), w + 60));
  process.exitCode = 1;
}
