/* Academic Summit - attend-guard.js v1
   Client half of the attendance protections. The SERVER decides: the two switches live in the
   app_settings table and are enforced inside mark_attendance / qa_mark / start_session / qa_open.
   This file only: reads the switches, takes one position reading, sends a device id, shows the
   lecturer's class-range picker, and adds the two admin toggles. Load AFTER attend-qr.js.
   It replaces the old "attend-loc" block that used to sit at the bottom of attend-qr.js. */
(function () {
'use strict';
var W = window;
var RADII = [50, 100, 200, 500, 700], DEF_R = 100;
function lsg(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lss(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function copy(o) { var r = {}; for (var k in o) r[k] = o[k]; return r; }
function toast(m, t) { try { if (typeof showToast === 'function') showToast(m, t); } catch (e) {} }

/* ---------- the two switches (cached 30 s; a failed read means "off", i.e. today's behaviour) ---------- */
var ST = { geofence_enforced: false, device_lock_enforced: false, at: 0, p: null };
function settings(force) {
  if (!force && ST.p && Date.now() - ST.at < 30000) return ST.p;
  ST.at = Date.now();
  var q;
  try {
    q = Promise.resolve(sb.from('app_settings').select('key,value')).then(function (r) {
      if (r && r.data) r.data.forEach(function (x) { ST[x.key] = x.value === true; });
      return ST;
    });
  } catch (e) { q = Promise.resolve(ST); }
  ST.p = Promise.race([q.catch(function () { return ST; }), new Promise(function (ok) { setTimeout(function () { ok(ST); }, 2500); })]);
  return ST.p;
}

/* ---------- lecturer's chosen class range ---------- */
function radius() { var r = +lsg('as_lec_radius'); return RADII.indexOf(r) > -1 ? r : DEF_R; }

/* ---------- device id: random, made once, kept in localStorage AND a cookie. The server stores only a hash. ---------- */
function rnd() {
  var a = new Uint8Array(16), c = W.crypto || W.msCrypto;
  if (c && c.getRandomValues) c.getRandomValues(a); else for (var i = 0; i < 16; i++) a[i] = Math.floor(Math.random() * 256);
  return Array.prototype.map.call(a, function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
}
function getCookie(n) { var m = document.cookie.match(new RegExp('(?:^|; )' + n + '=([^;]*)')); return m ? m[1] : null; }
function setCookie(n, v) { try { document.cookie = n + '=' + v + ';path=/;max-age=31536000;SameSite=Lax' + (location.protocol === 'https:' ? ';Secure' : ''); } catch (e) {} }
function devId() {
  var v = lsg('as_dev_id'), c = getCookie('as_dev');
  if (!/^[0-9a-f]{32}$/.test(v || '')) v = /^[0-9a-f]{32}$/.test(c || '') ? c : rnd();
  lss('as_dev_id', v); setCookie('as_dev', v);
  return v;
}

/* ---------- one bounded position reading ---------- */
function oneFix(ms, good) {
  return new Promise(function (done) {
    if (!navigator.geolocation) return done(null);
    var best = null, fin = false, id = null, tm = null;
    function end() { if (fin) return; fin = true; clearTimeout(tm); if (id != null) { try { navigator.geolocation.clearWatch(id); } catch (e) {} } done(best); }
    try {
      id = navigator.geolocation.watchPosition(function (p) {
        var c = p.coords;
        if (!best || c.accuracy < best.acc) best = { lat: c.latitude, lng: c.longitude, acc: Math.round(c.accuracy) };
        if (best.acc <= good) end();
      }, function () { end(); }, { enableHighAccuracy: true, maximumAge: 0, timeout: ms });
      tm = setTimeout(end, ms);
    } catch (e) { end(); }
  });
}
function consent() { return lsg('as_qa_loc'); }
function withLoc(a, fx) { if (fx) { a.p_lat = fx.lat; a.p_lng = fx.lng; a.p_acc = fx.acc; } return a; }
/* if the new SQL isn't deployed yet, fall back to the old call so nothing breaks in between */
function safe(orig, name, args, a2) {
  return orig(name, a2).then(function (r) {
    if (r && r.error && /Could not find the function|does not exist|schema cache|best candidate/i.test(r.error.message || '')) return orig(name, args);
    return r;
  });
}

/* ---------- rpc wrapper: adds the reading, the device id and the range ---------- */
function studentMark(orig, name, args) {
  return settings().then(function (st) {
    var want = args.p_lat == null && (st.geofence_enforced || consent() !== 'no');
    if (want && st.geofence_enforced && name === 'mark_attendance') toast('Checking your location...');
    return (want ? oneFix(7000, 30) : Promise.resolve(null)).then(function (fx) {
      var a2 = withLoc(copy(args), fx); a2.p_device = devId();
      return safe(orig, name, args, a2);
    });
  });
}
function lecturerStart(orig, name, args) {
  var a2 = copy(args); if (a2.p_radius == null) a2.p_radius = radius();
  if (name === 'start_session' && a2.p_lat == null) {
    return oneFix(6000, 30).then(function (fx) { return safe(orig, name, args, withLoc(a2, fx)); });
  }
  return safe(orig, name, args, a2);
}
function wrap() {
  if (typeof sb === 'undefined' || !sb || !sb.rpc || sb.__guardWrapped) return;
  sb.__guardWrapped = true;
  var orig = sb.rpc.bind(sb);
  sb.rpc = function (name, args) {
    try {
      if (name === 'mark_attendance' || name === 'qa_mark') return studentMark(orig, name, args || {});
      if (name === 'start_session' || name === 'qa_open') return lecturerStart(orig, name, args || {});
    } catch (e) { console.error('attend-guard', e); }
    return orig(name, args);
  };
}

/* ---------- lecturer: class-range picker (on the code screen and the QR start screen) ---------- */
function paintRad() {
  var boxes = document.querySelectorAll('#att-rad-box'); if (!boxes.length) return;
  settings().then(function (st) {
    var r = radius();
    var chips = RADII.map(function (x) {
      return '<button type="button" class="' + (x === r ? 'btn' : 'btn2') + '" style="padding:6px 12px;font-size:12px" onclick="attSetRadius(' + x + ')">' + x + ' m</button>';
    }).join('');
    var note = st.geofence_enforced
      ? 'Students must be within this range of you when they mark. Their position is checked once and never stored.'
      : 'Range check is OFF right now (admin setting), so students can mark from anywhere.';
    var html = '<div class="space-y-2"><div class="lbl">Class range</div><div class="flex gap-2 flex-wrap">' + chips + '</div><p class="text-xs" style="color:var(--mut)">' + note + '</p></div>';
    Array.prototype.forEach.call(boxes, function (b) { if (b.getAttribute('data-h') !== html) { b.innerHTML = html; b.setAttribute('data-h', html); } });
  });
}
W.attSetRadius = function (r) { if (RADII.indexOf(r) < 0) return; lss('as_lec_radius', String(r)); paintRad(); };

/* ---------- admin: the two switches ---------- */
var LABEL = {
  geofence_enforced: ['Class range check', 'Students must be inside the range the lecturer picked, measured when they mark. Nothing about where they are is stored.'],
  device_lock_enforced: ['One phone, one student', 'A phone that has marked for a class cannot mark for another account in that same class.']
};
function paintAdmin() {
  var box = document.getElementById('att-prot-box'); if (!box) return;
  var rows = Object.keys(LABEL).map(function (k) {
    var on = ST[k] === true;
    return '<div class="flex items-start justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40">' +
      '<div class="text-xs"><b>' + esc(LABEL[k][0]) + '</b><div style="color:var(--mut)">' + esc(LABEL[k][1]) + '</div></div>' +
      '<button type="button" class="' + (on ? 'btn' : 'btn2') + ' shrink-0" style="min-width:64px" onclick="attToggle(\'' + k + '\')">' + (on ? 'ON' : 'OFF') + '</button></div>';
  }).join('');
  box.className = 'card p-6 space-y-3';
  box.innerHTML = '<div class="font-extrabold">Attendance protections</div>' +
    '<p class="text-xs" style="color:var(--mut)">Enforced by the server, not by this screen. OFF means attendance behaves exactly as it did before.</p>' + rows;
}
W.attToggle = function (k) {
  if (!LABEL[k]) return;
  var next = !(ST[k] === true);
  if (next && !confirm('Turn ON "' + LABEL[k][0] + '"? It applies to every new mark straight away.')) return;
  sb.rpc('admin_set_setting', { p_key: k, p_value: next }).then(function (r) {
    if (r && r.error) return toast(r.error.message, 'error');
    toast(LABEL[k][0] + (next ? ' is ON' : ' is OFF'));
    settings(true).then(paintAdmin);
  });
};

/* ---------- wiring ---------- */
function wireViews() {
  /* lecturer 5-digit screen: range picker above the Generate button */
  try {
    if (typeof LECTURER_VIEWS !== 'undefined' && LECTURER_VIEWS.home && !LECTURER_VIEWS.home.__guard) {
      var hb = LECTURER_VIEWS.home;
      LECTURER_VIEWS.home = function () {
        var h = hb.apply(this, arguments), key = '<button class="btn w-full py-3 text-base" onclick="startAttendanceSession()">';
        return typeof h === 'string' && h.indexOf(key) > -1 && h.indexOf('att-rad-box') < 0 ? h.replace(key, '<div id="att-rad-box"></div>' + key) : h;
      };
      LECTURER_VIEWS.home.__guard = true;
    }
  } catch (e) { console.error('guard home', e); }
  /* role isolation in the UI: the lecturer's QR console is not for students (the server enforces it too) */
  try {
    if (typeof V !== 'undefined' && V.qrl && !V.qrl.__guard) {
      var qb = V.qrl;
      V.qrl = function () { return (typeof U !== 'undefined' && U && U.role === 'lecturer') ? qb.apply(this, arguments) : V.home(); };
      V.qrl.__guard = true;
    }
  } catch (e) { console.error('guard qrl', e); }
  /* admin panel: placeholder for the toggles card */
  try {
    if (typeof V !== 'undefined' && V.admin && !V.admin.__guard) {
      var ab = V.admin;
      V.admin = function () {
        var h = ab.apply(this, arguments);
        return typeof h === 'string' && h.indexOf('Admin Panel') > -1 && h.indexOf('att-prot-box') < 0 ? h.replace(/<\/div>\s*$/, '<div id="att-prot-box"></div></div>') : h;
      };
      V.admin.__guard = true;
    }
  } catch (e) { console.error('guard admin', e); }
}
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  setTimeout(function () {
    try {
      if (v === 'home' || v === 'qrl' || v === 'qrs' || v === 'admin') settings(true).then(function () { paintRad(); if (v === 'admin') paintAdmin(); });
      paintRad(); if (v === 'admin') paintAdmin();
    } catch (e) {}
  }, 200);
  return r;
};

W.__attGuard = {
  geo: function () { return ST.geofence_enforced === true; },
  dev: function () { return ST.device_lock_enforced === true; },
  radius: radius, settings: settings, devId: devId
};
wireViews();
if (typeof sb !== 'undefined' && sb && sb.rpc) wrap(); else setTimeout(wrap, 900);
setTimeout(function () { try { settings(true); } catch (e) {} }, 1200);
})();
