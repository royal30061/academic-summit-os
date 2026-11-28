/* Lecturer console + student Attend screen: Nearby check-in switch, hidden range picker, field guard. */
const L = require('./lib');
module.exports = async function () {
  const T = (l, v) => L.check(l, !!v);
  const mk = o => {
    const inserted = [], calls = [], parent = { insertBefore: (n, ref) => { inserted.push(n); n.nextSibling = ref; } }, btn = { parentNode: parent };
    const ctx = { localStorage: { _d: {}, getItem(k) { return this._d[k] || null; }, setItem(k, v) { this._d[k] = v; } }, toasts: [], showToast(m) { ctx.toasts.push(m); },
      document: { getElementById: id => id === 'as-ble-ctl' ? (inserted[0] || null) : null, createElement: () => ({ set innerHTML(v) { this._h = v; }, get innerHTML() { return this._h; }, className: '' }), head: { appendChild() {} }, body: {}, addEventListener() {},
        querySelector: s => s.includes('startAttendanceSession') ? btn : null, querySelectorAll: () => o.els || [] },
      MutationObserver: function () { this.observe = () => {}; }, setTimeout: () => 1, setInterval: () => 1, Date,
      Capacitor: o.native ? { isNativePlatform: () => true } : undefined, U: { role: 'lecturer' },
      ASBle: { available: () => !!o.plugin, lecturerStop: () => calls.push('stop'), lecturerStart: id => { calls.push('start:' + id); return Promise.resolve(true); } },
      liveGet: () => o.live || null,
      V: { att: () => '<div class="space-y-5"><div id="as-alt-methods" class="card"><button class="btn w-full" onclick="go(\'qrs\')">Scan the lecturer’s QR</button></div></div>' }, asBleMark: () => calls.push('studentMark') };
    ctx.window = ctx; ctx.calls = calls; ctx.inserted = inserted; L.vm.createContext(ctx); L.vm.runInContext('var W=window;' + L.read('lecconsole.js'), ctx); return ctx;
  };
  let c = mk({ native: false }); c.__asLecConsoleTest.inject(); let h = c.inserted[0].innerHTML;
  T('website: the switch is shown, disabled, and explains', /disabled/.test(h) && /works in the Android app/.test(h));
  T('plain wording: "Nearby check-in", never "Bluetooth with the code"', /Nearby check-in/.test(h) && !/Bluetooth with the code/.test(h));
  T('the class-range picker is hidden by a style rule', /#att-rad-box\{display:none!important\}/.test(L.read('lecconsole.js')));
  let a = c.V.att(); T('website student: button visible, labelled "Check in nearby (Android app)"', /Check in nearby \(Android app\)/.test(a));
  c.asBleMark(); T('website student tap: explains, no native call', c.toasts.length === 1 && !c.calls.includes('studentMark'));
  c = mk({ native: true, plugin: false }); c.__asLecConsoleTest.inject(); T('app without the plugin: asks to update', /Update the Android app/.test(c.inserted[0].innerHTML));
  c = mk({ native: true, plugin: true, live: { id: 'S1', end: Date.now() + 60000 } }); c.__asLecConsoleTest.inject(); h = c.inserted[0].innerHTML;
  T('app + plugin: switch on and enabled by default', /aria-checked="true"/.test(h) && !/disabled/.test(h));
  c.ASBle.lecturerStart('S9'); T('code start also starts nearby check-in (side by side)', c.calls.includes('start:S9'));
  c.lbToggle(); T('switching off stops it and is remembered', c.calls.includes('stop') && c.localStorage.getItem('as_lec_ble') === '0');
  c.calls.length = 0; c.ASBle.lecturerStart('S10'); T('off: the next class starts without it', !c.calls.includes('start:S10'));
  c.lbToggle(); T('switching on mid-class starts it for the live class', c.calls.includes('start:S1'));
  a = c.V.att(); T('app student: "Check in nearby (stand near your lecturer)"', /Check in nearby \(stand near your lecturer\)/.test(a));
  c.asBleMark(); T('app student tap: runs the real flow', c.calls.includes('studentMark'));
  /* field guard: course codes must not sit in boxes that are not course boxes */
  const mkEl = (id, ph, val, extra) => Object.assign({ id, tagName: 'INPUT', type: 'text', value: val, getAttribute(k) { return ({ placeholder: ph, 'data-usr': this._u })[k] || null; }, setAttribute(k, v) { if (k === 'data-usr') this._u = v; } }, extra || {});
  const els = [mkEl('lec-level', 'e.g. 200', 'PSS 203'), mkEl('lec-topic', 'Class Session', 'PSS 203'), mkEl('lr-m', 'Rep matric', 'PSS 203'), mkEl('lr-c', 'Course (POS 204)', 'PSS 203'), mkEl('lec-course', '', 'PSS 203'),
    mkEl('man-matric', 'Matric to add manually', '21/ABC/1234'), mkEl('typed', 'Topic', 'GST 101', { _u: '1' }), { tagName: 'SELECT', id: 'x', value: 'PSS 203', type: 'select-one', getAttribute: () => null }];
  c = mk({ native: false, els }); c.__asLecConsoleTest.sanitize();
  T('guard: Level, Topic and rep matric lose a stray course code', els[0].value === '' && els[1].value === '' && els[2].value === '');
  T('guard: course boxes, real matric and anything the lecturer typed are untouched', els[3].value === 'PSS 203' && els[4].value === 'PSS 203' && els[5].value === '21/ABC/1234' && els[6].value === 'GST 101' && els[7].value === 'PSS 203');
  let clears = 0; for (let i = 0; i < 12; i++) { els[0].value = 'PSS 203'; c.__asLecConsoleTest.sanitize(); if (els[0].value === '') clears++; } T('guard: gives up after a few clears if something keeps refilling', clears <= 5);
  c.U.role = 'student'; els[1].value = 'PSS 203'; c.__asLecConsoleTest.sanitize(); T('guard: does nothing for students', els[1].value === 'PSS 203');
};
