/* Nearby check-in (ble.js): the database client lookup that broke the lecturer broadcast, token handling, plain-language messages. */
const L = require('./lib');
const mk = (sbCode, plugin) => {
  const st = { calls: [], toasts: [] };
  const ctx = { navigator: { onLine: true }, localStorage: { getItem: () => null, setItem() {} }, showToast(m) { st.toasts.push(m); },
    document: { getElementById: () => null, createElement: () => ({ style: {}, remove() {} }), body: { appendChild() {} } }, setInterval: () => 1, clearInterval() {}, crypto: require('crypto').webcrypto, Date,
    Capacitor: { isNativePlatform: () => true, isPluginAvailable: () => true, registerPlugin: () => plugin || { stopAdvertising: async () => { st.calls.push('stop'); }, startAdvertising: async () => { st.calls.push('adv'); } } } };
  ctx.window = L.vm.createContext(ctx) && ctx; L.vm.runInContext(sbCode, ctx); L.vm.runInContext(L.read('ble.js'), ctx); return { ctx, st };
};
const tick = async () => { for (let i = 0; i < 4; i++) await new Promise(r => setImmediate(r)); };
module.exports = async function () {
  const T = (l, v) => L.check(l, !!v);
  let w = mk("const sb={rpc:async(n)=>{(globalThis.__r=globalThis.__r||[]).push(n);return{data:null}}};");   // `const sb` is NOT on window, exactly like index.html
  T('database client is found even though it is a plain const', !('sb' in w.ctx));
  await w.ctx.ASBle.lecturerStart('S1'); await tick();
  T('lecturer: broadcast starts and the code is saved through the client, no error shown', w.st.calls.includes('adv') && (w.ctx.__r || []).includes('ble_rotate_token') && !w.st.toasts.length);
  w = mk("const sb={rpc:async()=>({error:{message:'Not your class'}})};"); await w.ctx.ASBle.lecturerStart('S1'); await tick();
  T('lecturer: if saving fails the broadcast stops and ONE plain message is shown', w.st.calls.filter(x => x === 'stop').length >= 2 && w.st.toasts.length === 1 && /Nearby check-in could not start/.test(w.st.toasts[0]));
  T('lecturer: the technical reason is kept for support, not shown', /Not your class/.test((w.ctx.__asBleLast || {}).reason || '') && !/Not your class/.test(w.st.toasts[0]));
  w = mk("const sb={rpc:async(n,a)=>{globalThis.__m={n,a};return{data:'PSS203'}}};", { scan: async () => ({ results: [{ token: 'ABC234', rssi: -85 }, { token: 'XYZ789', rssi: -60 }] }) });
  const r = await w.ctx.ASBle.studentMark(null, {});
  T('student: strongest signal wins and the mark is saved through ble_mark', w.ctx.__m && w.ctx.__m.n === 'ble_mark' && w.ctx.__m.a.p_token === 'XYZ789' && r.course === 'PSS203');
  w = mk("const sb={rpc:async()=>({data:null})};", { scan: async () => ({ results: [{ token: 'ABC234', rssi: -92 }] }) });
  let weak = null; try { await w.ctx.ASBle.studentMark(null, {}); } catch (e) { weak = e; } T('student: a weak signal is refused with a plain message', weak && /too weak/.test(weak.message));
  w = mk("const sb={rpc:async()=>({data:null})};", { scan: async () => ({ results: [] }) });
  let none = null; try { await w.ctx.ASBle.studentMark(null, {}); } catch (e) { none = e; } T('student: nobody heard -> "Lecturer not detected"', none && /not detected/.test(none.message));
  T('no developer wording in user messages', !/Bluetooth attendance|Not ready yet/.test(L.read('ble.js').replace(/\/\*[\s\S]*?\*\//g, '')));
};
