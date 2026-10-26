/* wire.js: puts zuma-art.js, zuma.js and home2.js into index.html in the right order. Safe to run twice. */
const fs = require('fs');
let s = fs.readFileSync('index.html', 'utf8');
const tag = n => new RegExp('[ \\t]*<script src="' + n.replace('.', '\\.') + '(\\?[^"]*)?"></script>[ \\t]*\\n?', 'g');
['zuma-art.js', 'zuma.js', 'home2.js'].forEach(n => { s = s.replace(tag(n), ''); });
const v = '?v=' + String(Date.now()).slice(-6);
function before(marker, tags) {
  const m = s.match(new RegExp('<script src="' + marker.replace('.', '\\.') + '(\\?[^"]*)?"></script>'));
  const at = m ? s.indexOf(m[0]) : s.lastIndexOf('</body>');
  if (at < 0) throw new Error('no place to insert before ' + marker);
  s = s.slice(0, at) + tags + '\n' + s.slice(at);
}
before('coach.js', '<script src="zuma-art.js' + v + '"></script>\n<script src="zuma.js' + v + '"></script>');
before('delights.js', '<script src="home2.js' + v + '"></script>');
fs.writeFileSync('index.html', s);
console.log('wired');
