#!/usr/bin/env node
/* Run every test:  node tests/run.js   (from the repo root; needs only Node). Exit code 1 if anything fails. */
const L = require('./lib');
const files = ['hub', 'ble', 'console', 'leccourse'];
(async () => {
  for (const f of files) { console.log('\n' + f + '.test.js'); try { await require('./' + f + '.test.js')(); } catch (e) { L.check(f + ' ran without crashing: ' + (e && e.message), false); } }
  const s = L.summary(); console.log('\n' + s.pass + ' passed, ' + s.fail + ' failed'); process.exit(s.fail ? 1 : 0);
})();
