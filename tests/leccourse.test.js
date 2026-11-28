/* leccourse.js v3: only the baked POS204 example is replaced; nothing the lecturer types or picks is overwritten. */
const L = require('./lib');
module.exports = async function () {
  const T = (l, v) => L.check(l, !!v);
  const el = o => Object.assign({ tagName: 'INPUT', id: '', value: '', _a: {}, options: [], firstChild: null, insertBefore(n) { this.options.unshift(n); }, getAttribute(k) { return this._a[k] || null; }, setAttribute(k, v) { this._a[k] = v; } }, o);
  const world = () => {
    const els = [el({ id: 'lec-course', tagName: 'SELECT', value: '', options: [{ value: '' }, { value: 'PSS 203' }, { value: 'POS 213' }, { value: 'GST 101' }] }), el({ id: 'lec-level' }), el({ id: 'lec-topic' }), el({ id: 'lr-m' }),
      el({ id: 'ls2-a', value: 'PSS 203' }), el({ id: 'ls2-b', value: 'POS 213' }), el({ id: 'ls2-c', value: 'GST 101' }), el({ id: 'pl-level', tagName: 'SELECT', value: '200', options: [{ value: '100' }, { value: '200' }] }), el({ id: 'stray', value: 'POS204' })];
    const ls = { as_lec_course_u1: 'PSS203' }, hooks = {};
    const ctx = { U: { role: 'lecturer', lec: { courses: [{ code: 'PSS 203' }, { code: 'POS 213' }, { code: 'GST 101' }] } }, uid: 'u1', localStorage: { getItem: k => ls[k] || null, setItem(k, v) { ls[k] = v; } }, ls,
      sb: { rpc: async () => ({}) }, go: () => {}, document: { getElementById: i => i === 'main' ? { querySelectorAll: () => els } : null, querySelectorAll: () => els, createElement: () => ({}), addEventListener: (t, f) => { (hooks[t] = hooks[t] || []).push(f); } },
      setInterval: f => { ctx.tick = f; }, setTimeout: () => 1, hooks, els };
    ctx.window = ctx; L.vm.createContext(ctx); L.vm.runInContext(L.read('leccourse.js'), ctx); return ctx;
  };
  const val = (c, id) => c.els.find(e => e.id === id).value;
  let c = world(); c.tick();
  T('Level, Topic and rep matric are left alone', val(c, 'lec-level') === '' && val(c, 'lec-topic') === '' && val(c, 'lr-m') === '');
  T('three different teaching-profile courses keep their own values', val(c, 'ls2-a') === 'PSS 203' && val(c, 'ls2-b') === 'POS 213' && val(c, 'ls2-c') === 'GST 101');
  T('other dropdowns are not forced to a course', val(c, 'pl-level') === '200');
  T('an empty main Course box starts with the last course used', val(c, 'lec-course') === 'PSS 203');
  T('the baked POS204 example elsewhere is replaced', val(c, 'stray') === 'PSS203');
  const sel = c.els.find(e => e.id === 'lec-course'); sel.value = 'POS 213'; c.hooks.change.forEach(f => f({ isTrusted: true, target: sel })); for (let i = 0; i < 5; i++) c.tick();
  T('a course the lecturer picks stays picked', sel.value === 'POS 213');
  const top = c.els.find(e => e.id === 'lec-topic'); top.value = 'Westphalia'; c.hooks.input.forEach(f => f({ isTrusted: true, target: top })); top.value = ''; for (let i = 0; i < 5; i++) c.tick();
  T('a box the lecturer cleared stays cleared', top.value === '');
  const fresh = el({ id: 'lec-course', tagName: 'SELECT', value: '', options: [{ value: '' }, { value: 'PSS 203' }] }); c.els.splice(0, 1, fresh); c.tick();
  T('a freshly drawn empty Course box is pre-filled once, and clearing it is respected', fresh.value === 'PSS 203' && (fresh.value = '', c.tick(), fresh.value === ''));
  c.sb.rpc('start_session', { p_course: 'pos 213' }); T('the course used to start a class is remembered per account', c.ls.as_lec_course_u1 === 'POS 213');
  const d = world(); d.U.lec.courses = [{ code: 'POS 204' }]; d.els.find(e => e.id === 'stray').value = 'POS 204'; d.tick(); T('a lecturer who really teaches POS204 keeps it', d.els.find(e => e.id === 'stray').value === 'POS 204');
  const s = world(); s.U.role = 'student'; s.tick(); T('students are never touched', val(s, 'lec-course') === '' && val(s, 'stray') === 'POS204');
};
