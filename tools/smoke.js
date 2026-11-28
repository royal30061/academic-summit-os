#!/usr/bin/env node
/* Whole-site sanity check:  node tools/smoke.js   (from the repo root)
   - every <script src> in index.html points at a file that exists
   - every local .js file parses
   - the new overlay files carry no emoji
   - SQL files have unique numbers
   Prints what it found; exit code 1 on any problem. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const root = process.cwd(); let bad = 0;
const say = (ok, m) => { if (!ok) bad++; console.log((ok ? '  ok    ' : '  FAIL  ') + m); };
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const srcs = [...html.matchAll(/<script[^>]*\ssrc="([^"#?]+)(?:\?[^"]*)?"/g)].map(m => m[1]).filter(s => !/^https?:/.test(s));
console.log('index.html loads ' + srcs.length + ' local scripts');
srcs.forEach(s => say(fs.existsSync(path.join(root, s)), 'file exists: ' + s));
const seen = {}; srcs.forEach(s => { seen[s] = (seen[s] || 0) + 1; }); Object.keys(seen).filter(k => seen[k] > 1).forEach(k => console.log('  note  ' + k + ' is loaded ' + seen[k] + ' times (older layers do this on purpose; check before removing)'));
const js = fs.readdirSync(root).filter(f => f.endsWith('.js') && !/\.test\.js$/.test(f));
js.forEach(f => { try { cp.execSync('node --check "' + path.join(root, f) + '"', { stdio: 'pipe' }); } catch (e) { say(false, 'syntax error in ' + f); } });
say(true, js.length + ' local .js files parse');
['studyhub2.js', 'lecconsole.js', 'ble.js', 'leccourse.js'].forEach(f => { if (fs.existsSync(path.join(root, f))) say(!/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(fs.readFileSync(path.join(root, f), 'utf8')), 'no emoji in ' + f); });
if (fs.existsSync(path.join(root, 'sql'))) { const n = {}; fs.readdirSync(path.join(root, 'sql')).forEach(f => { const m = f.match(/^(\d+[a-z]?)_/); if (m) (n[m[1]] = n[m[1]] || []).push(f); }); Object.keys(n).forEach(k => say(n[k].length === 1, 'sql number ' + k + (n[k].length === 1 ? ' is unique' : ' used twice: ' + n[k].join(', ')))); }
console.log(bad ? '\n' + bad + ' problem(s)' : '\nAll good'); process.exit(bad ? 1 : 0);
