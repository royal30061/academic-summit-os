/* Academic Summit - ble.js v3 (Bluetooth proximity attendance, runs ALONGSIDE the code and QR methods)
   Uses ONE native plugin written for this app (android/.../BleProximityPlugin.java, name "BleProximity"): no npm package.
   Lecturer phone broadcasts a short rotating token; a student phone that hears it can mark. The server (sql/18) accepts the
   current and previous token for 90 s and writes the mark into the normal attendance table (method 'ble').
   Inert on the website and in an APK without the plugin: no buttons, no toasts. NOT TESTED ON REAL HARDWARE. */
(function () {
  if (window.__asBle) return; window.__asBle = '3';

  var SVC = '0000fe61-0000-1000-8000-00805f9b34fb';
  var ROTATE_MS = 45000, MAX_LECTURE_MS = 4 * 3600 * 1000;
  var CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  var DEFAULT_THRESHOLD = -72;           // dBm; phones differ, so this is a starting value to tune in a real hall

  function client() { return window.sb || window.supabase || (window.AS && window.AS.sb) || null; }
  function rpc(name, args) {
    var c = client();
    if (!c || !c.rpc) return Promise.reject(new Error('Not ready yet. Try again.'));
    return Promise.resolve(c.rpc(name, args)).then(function (r) {
      if (r.error) throw new Error(r.error.message || String(r.error));
      return r.data;
    });
  }
  function plug() {
    try {
      var C = window.Capacitor; if (!C) return null;
      if (C.isNativePlatform && !C.isNativePlatform()) return null;
      if (C.isPluginAvailable && !C.isPluginAvailable('BleProximity')) return null;
      return C.registerPlugin ? C.registerPlugin('BleProximity') : (C.Plugins && C.Plugins.BleProximity) || null;
    } catch (e) { return null; }
  }
  function token6() {
    var buf = new Uint8Array(6), s = '';
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(buf);
    else for (var j = 0; j < 6; j++) buf[j] = Math.floor(Math.random() * 256);
    for (var i = 0; i < 6; i++) s += CHARS[buf[i] % CHARS.length];
    return s;
  }
  function offlineErr(e) { return !navigator.onLine || (e && /fetch|network|failed to/i.test(e.message || '')); }
  function toast(m, t) { try { if (typeof showToast === 'function') return showToast(m, t); } catch (e) {} }

  function pill(txt, onTap) {
    var el = document.getElementById('asBlePill');
    if (!txt) { if (el) el.remove(); return; }
    if (!el) {
      el = document.createElement('div'); el.id = 'asBlePill';
      el.style.cssText = 'position:fixed;top:calc(env(safe-area-inset-top,0px) + 10px);left:50%;transform:translateX(-50%);z-index:99998;' +
        'background:#064E3B;color:#D1FAE5;border:1px solid #34D399;border-radius:999px;padding:7px 14px;font:700 12px/1 system-ui;box-shadow:0 4px 14px rgba(0,0,0,.35)';
      document.body.appendChild(el);
    }
    el.textContent = txt; el.onclick = onTap || null; el.style.cursor = onTap ? 'pointer' : 'default';
  }

  /* ---------- lecturer ---------- */
  var L = { id: null, timer: null, stopAt: 0 };
  function advertise() {
    var p = plug(); if (!p || !L.id) return;
    if (Date.now() > L.stopAt) return window.ASBleLecturerStop();
    var t = token6();
    Promise.resolve(p.stopAdvertising()).catch(function () {})
      .then(function () { return p.startAdvertising({ service: SVC, data: t }); })
      .then(function () { return rpc('ble_rotate_token', { p_session: L.id, p_token: t }); })
      .then(function () { pill('Bluetooth attendance ON - tap to stop', window.ASBleLecturerStop); })
      .catch(function (e) { pill(null); toast('Bluetooth attendance could not start: ' + (e.message || e), 'error'); });
  }
  window.ASBleLecturerStart = function (sessionId) {
    if (!sessionId || !plug()) return Promise.resolve(false);            // silent on web / old APK
    window.ASBleLecturerStop();
    L.id = sessionId; L.stopAt = Date.now() + MAX_LECTURE_MS;
    advertise(); L.timer = setInterval(advertise, ROTATE_MS);
    return Promise.resolve(true);
  };
  window.ASBleLecturerStop = function () {
    if (L.timer) clearInterval(L.timer); L.timer = null; L.id = null;
    var p = plug(); if (p) Promise.resolve(p.stopAdvertising()).catch(function () {});
    pill(null);
  };

  /* ---------- student ---------- */
  window.ASBleAvailable = function () { return !!plug(); };

  window.ASBleStudentMark = function (session, opts) {
    opts = opts || {};
    var P = plug();
    if (!P) return Promise.reject(new Error('Bluetooth is not available in this version of the app.'));
    var threshold = (session && session.ble_rssi_threshold != null) ? session.ble_rssi_threshold : DEFAULT_THRESHOLD;
    pill('Looking for your lecturer...');
    return Promise.resolve(P.scan({ service: SVC, durationMs: opts.scanMs || 8000 }))
      .then(function (res) { pill(null); return (res && res.results) || []; },
            function (e) { pill(null); throw new Error((e && e.message) || 'Bluetooth could not start. Turn Bluetooth on and allow it for this app.'); })
      .then(function (list) {
        var best = null;
        list.forEach(function (x) { if (x && x.token && (!best || x.rssi > best.rssi)) best = x; });
        if (!best) throw new Error('Lecturer not detected. Move closer and try again.');
        if (best.rssi < threshold && !opts.acceptWeak) {
          var e = new Error('Signal too weak. Stand closer to the lecturer.'); e.weak = true; e.rssi = best.rssi; throw e;
        }
        var mark = { p_token: best.token, p_rssi: best.rssi, p_device: (window.AS && AS.deviceHash) || localStorage.getItem('as_device') || null };
        if (session && session.id) mark.p_session = session.id;
        return rpc('ble_mark', mark).then(function (course) {
          return { token: best.token, rssi: best.rssi, weak: best.rssi < threshold, course: course };
        }).catch(function (err) {
          if (offlineErr(err)) { queue(mark); throw new Error('No connection. Saved - it will sync if the code is still valid.'); }
          throw err;
        });
      });
  };

  function queue(m) {
    try { var q = JSON.parse(localStorage.getItem('as_ble_queue') || '[]'); q.push({ m: m, at: Date.now() }); localStorage.setItem('as_ble_queue', JSON.stringify(q.slice(-5))); } catch (e) {}
  }
  setInterval(function () {
    if (!navigator.onLine) return;
    var q; try { q = JSON.parse(localStorage.getItem('as_ble_queue') || '[]'); } catch (e) { return; }
    q = q.filter(function (x) { return Date.now() - x.at < 85000; });          // server window is 90 s: older ones can only fail
    try { localStorage.setItem('as_ble_queue', JSON.stringify(q)); } catch (e) {}
    if (!q.length) return;
    rpc('ble_mark', q[0].m).then(function () { q.shift(); localStorage.setItem('as_ble_queue', JSON.stringify(q)); }, function () {});
  }, 15000);

  window.ASBle = { SVC: SVC, available: window.ASBleAvailable, lecturerStart: window.ASBleLecturerStart, lecturerStop: window.ASBleLecturerStop, studentMark: window.ASBleStudentMark };
})();
