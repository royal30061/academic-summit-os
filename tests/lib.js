/* Tiny test helpers (no dependencies). Run everything with:  node tests/run.js */
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
let pass = 0, fail = 0;
const check = (label, cond) => { if (cond) { pass++; console.log('  ok    ' + label); } else { fail++; console.log('  FAIL  ' + label); } };
/* A stand-in page: just enough DOM, timers and app globals to run the overlay files. Nothing here touches a real browser. */
function world(opts) {
  opts = opts || {};
  const timers = [], els = {}, store = {}, listeners = [];
  let now = 0;
  const main = { innerHTML: '', querySelector(sel) { return sel === '.sx' && /class="sx /.test(this.innerHTML) ? {} : null; }, querySelectorAll() { return main._btns || []; } };
  const ctx = {
    U: { study: { items: [], streak: { count: 0 } } }, uid: 'u1', saves: 0, save() { ctx.saves++; }, toasts: [], calls: [],
    localStorage: { getItem: k => store[k] || null, setItem(k, v) { store[k] = v; }, removeItem(k) { delete store[k]; } }, store,
    asEngineCourses: () => opts.courses || [{ code: 'POS 213', title: '(manual)', units: 2 }, { code: 'POS 215', title: '', units: 3 }],
    view: 'home', innerHeight: 1000, showToast(m) { ctx.toasts.push(m); }, confirm: () => true,
    document: { getElementById: i => i === 'main' ? main : (els[i] || null), createElement: () => ({ style: {}, setAttribute() {} }), head: { appendChild() {} }, body: {},
      addEventListener: (t, f) => listeners.push([t, f]), querySelector: () => null, querySelectorAll: () => [] },
    MutationObserver: function (f) { ctx.moCb = f; this.observe = () => {}; },
    setTimeout: (f, ms) => { timers.push([now + (ms || 0), f]); }, clearTimeout() {}, setInterval: () => 1, clearInterval() {}, Date
  };
  ctx.W = ctx; ctx.window = ctx; ctx.main = main; ctx.els = els; ctx.listeners = listeners;
  ctx.run = ms => { const end = now + ms; for (;;) { timers.sort((a, b) => a[0] - b[0]); if (!timers.length || timers[0][0] > end) break; const t = timers.shift(); now = Math.max(now, t[0]); t[1](); } now = end; };
  ctx.V = { study: () => '<div>CLASSIC STUDY SHELL</div>', acad: () => 'ACAD SCREEN' };
  if (opts.acad2 !== false) ctx.V.acad2 = () => 'ACAD2 SCREEN';
  ctx.go = v => { ctx.calls.push('go:' + v); ctx.view = v; if (opts.deadGo && v !== 'study') return; main.innerHTML = ctx.V[v] ? ctx.V[v]() : ''; };
  let ACTIVE = false;
  const topics = [];
  ctx.__sh = { setActive: v => { ACTIVE = v; }, mount: () => { if (ACTIVE) main.innerHTML = 'CLASSIC course page'; }, state: () => ({ log: [], topics: { POS213: topics } }) };
  ctx.shOpen = k => ctx.calls.push('shOpen:' + k); ctx.shStudy = k => ctx.calls.push('shStudy:' + k); ctx.shTab = t => ctx.calls.push('shTab:' + t);
  ctx.shTopicAdd = k => { const v = (els['sh-nt'] || {}).value; if (v) topics.push({ id: 'x' + topics.length, t: v, s: 0 }); };
  ctx.shTopic = (k, i) => { topics[i].s = (topics[i].s + 1) % 3; }; ctx.shTopicDel = (k, i) => { topics.splice(i, 1); };
  ctx.as2StartCourse = c => ctx.calls.push('as2StartCourse:' + c);
  if (opts.core) ctx.StudyCore = opts.core;
  ctx.load = file => { vm.createContext(ctx); vm.runInContext('var W=window;' + read(file), ctx); return ctx; };
  return ctx;
}
module.exports = { root, read, check, world, vm, summary: () => ({ pass, fail }) };
