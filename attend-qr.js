/* Academic Summit - attend-qr.js v2: projector QR attendance + distance receipt.
   Isolated module: own tables (qa_*), own views (qrl = lecturer, qrs = student).
   Distance is computed on the server from one reading; the reading is never stored. */
(function () {
'use strict';
var W = window, ROTATE = 20000;
var QR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/qrcode-generator/1.4.4/qrcode.min.js';
var JSQR_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/jsQR/1.4.0/jsQR.min.js';
var L = { sid: null, course: '', timers: [], token: '', roster: [], radius: 150, refAcc: null };
var S = { stream: null, raf: 0, busy: false, vid: null, read: null, fixP: null, fixAt: 0 };
var bypass = false;
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function lsg(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
function lss(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
function loadLib(src, test) {
  return new Promise(function (ok, bad) {
    if (test()) return ok();
    var s = document.createElement('script'); s.src = src;
    s.onload = function () { test() ? ok() : bad(); }; s.onerror = bad; document.head.appendChild(s);
  });
}
function me() { var p = (U && (U.profile || U.user)) || {}; return { name: U.name || U.fullName || p.name || p.full_name || '', matric: U.matric || U.regNo || U.matricNo || p.matric || '' }; }
function grp(t) { return String(t || '').replace(/(.{4})(?=.)/g, '$1 '); }
function say(t) { var m = $('qa-msg'); if (m) m.textContent = t; }
var st = document.createElement('style');
st.textContent = '#qa-stage:fullscreen{display:flex;flex-direction:column;align-items:center;justify-content:center;border-radius:0}#qa-stage:fullscreen #qa-qr{width:min(80vh,80vw)!important}';
document.head.appendChild(st);

/* one position reading: keeps the most accurate fix until it is good enough or time runs out */
function bestFix(maxMs, goodAcc) {
  return new Promise(function (done) {
    if (!navigator.geolocation) return done(null);
    var best = null, fin = false, id = null, tm = null;
    function end() {
      if (fin) return; fin = true; clearTimeout(tm);
      if (id != null) { try { navigator.geolocation.clearWatch(id); } catch (e) {} }
      done(best);
    }
    try {
      id = navigator.geolocation.watchPosition(function (p) {
        var c = p.coords;
        if (!best || c.accuracy < best.acc) best = { lat: c.latitude, lng: c.longitude, acc: Math.round(c.accuracy) };
        if (best.acc <= goodAcc) end();
      }, function () { end(); }, { enableHighAccuracy: true, maximumAge: 0, timeout: maxMs });
      tm = setTimeout(end, maxMs);
    } catch (e) { end(); }
  });
}

/* ---------- lecturer ---------- */
var ORDER = { out: 0, edge: 1, none: 2, in: 3 };
function statusOf(m) {
  if (m.distance_m == null) return { k: 'none', t: 'Not checked', c: '#64748b' };
  var margin = (m.accuracy_m || 0) + (m.ref_acc || 0);
  if (m.distance_m - margin > L.radius) return { k: 'out', t: 'Outside', c: '#dc2626' };
  if (m.distance_m > L.radius) return { k: 'edge', t: 'Borderline', c: '#d97706' };
  return { k: 'in', t: 'Inside', c: '#059669' };
}
V.qrl = function () {
  if (L.sid) {
    return '<div class="space-y-3"><div class="flex justify-between items-center"><div class="font-extrabold text-xl">' + esc(L.course) + '</div><div id="qa-count" class="text-sm font-bold">0 present</div></div>' +
      '<div id="qa-stage" style="background:#fff;color:#111;padding:14px;border-radius:20px;text-align:center"><div id="qa-qr" style="width:min(86vw,420px);margin:0 auto"></div>' +
      '<div id="qa-code" style="font-weight:800;font-size:28px;letter-spacing:.12em;margin-top:8px"></div></div>' +
      '<div class="flex gap-2"><button class="btn2 flex-1" onclick="qaFull()">Full screen</button><button class="btn flex-1" onclick="qaEnd()">End session</button></div>' +
      '<div class="card p-3 space-y-2"><div class="flex justify-between items-center gap-2"><span id="qa-ref" class="text-xs"></span>' +
      '<button class="btn2" style="padding:6px 10px;font-size:12px" onclick="qaRefix()">Re-fix</button></div>' +
      '<div id="qa-rad" class="flex gap-2 flex-wrap"></div><div id="qa-sum" class="text-xs" style="color:var(--mut)"></div></div>' +
      '<div id="qa-list" class="space-y-1"></div></div>';
  }
  return '<div class="space-y-4"><div class="font-extrabold text-2xl">QR attendance</div>' +
    '<p class="text-xs" style="color:var(--mut)">Project this screen. The code changes every 20 seconds, so a photo of it is useless a minute later.</p>' +
    '<p class="text-xs" style="color:var(--mut)">Starting also takes one position reading from your phone, the reference point students are measured against. It’s kept only until you end the session, then wiped. Students’ positions are never stored, only their distance from you.</p>' +
    '<input id="qa-course" class="inp" placeholder="Course code, e.g. POS 204">' +
    '<button id="qa-go" class="btn w-full" onclick="qaStart()">Start session</button></div>';
};
W.qaStart = function () {
  var course = ((($('qa-course') || {}).value) || '').trim();
  if (!course) return showToast('Enter the course code', 'error');
  var b = $('qa-go'); if (b) { b.disabled = true; b.textContent = 'Taking your reference position...'; }
  function reset() { var x = $('qa-go'); if (x) { x.disabled = false; x.textContent = 'Start session'; } }
  bestFix(8000, 25).then(function (fx) {
    return sb.rpc('qa_open', { p_course: course, p_lat: fx ? fx.lat : null, p_lng: fx ? fx.lng : null, p_acc: fx ? fx.acc : null })
      .then(function (r) {
        if (r.error || !r.data) { reset(); return showToast('Could not start: ' + ((r.error && r.error.message) || 'no session'), 'error'); }
        L.sid = r.data; L.course = course; L.refAcc = fx ? fx.acc : null; L.radius = 150;
        W.go('qrl');
        if (!fx) showToast('No position reading, so distance is off for this session');
      });
  }).catch(function () { reset(); showToast('Network problem, try again', 'error'); });
};
function killTimers() { L.timers.forEach(clearInterval); L.timers = []; }
function refLabel() {
  var el = $('qa-ref'); if (!el) return;
  if (L.refAcc == null) el.textContent = 'No reference position. Distance is off.';
  else el.textContent = 'Reference ±' + L.refAcc + ' m' + (L.refAcc > 60 ? ' (rough. Step near a window, then Re-fix)' : '');
}
function drawRad() {
  var box = $('qa-rad'); if (!box) return;
  box.innerHTML = '<span class="text-xs" style="align-self:center">Radius</span>' + [100, 150, 300, 500].map(function (r) {
    return '<button class="' + (L.radius === r ? 'btn' : 'btn2') + '" style="padding:6px 10px;font-size:12px" onclick="qaRadius(' + r + ')">' + r + ' m</button>';
  }).join('');
}
W.qaRadius = function (r) { L.radius = r; drawRad(); renderList(); };
W.qaRefix = function () {
  if (!L.sid) return;
  var el = $('qa-ref'); if (el) el.textContent = 'Taking a new reading...';
  bestFix(8000, 25).then(function (fx) {
    if (!fx) { refLabel(); return showToast('No reading. Check location permission', 'error'); }
    return sb.rpc('qa_ref', { p_session: L.sid, p_lat: fx.lat, p_lng: fx.lng, p_acc: fx.acc }).then(function (r) {
      if (!r.error) L.refAcc = fx.acc; refLabel(); renderList();
    });
  }).catch(function () { refLabel(); });
};
function liveInit() {
  if (!L.sid) return;
  killTimers(); refLabel(); drawRad(); renderList(); rotate(); poll();
  L.timers.push(setInterval(rotate, ROTATE)); L.timers.push(setInterval(poll, 4000));
}
function rotate() {
  sb.rpc('qa_token', { p_session: L.sid }).then(function (r) {
    if (r.error || !r.data) return; L.token = r.data; draw();
  });
}
function draw() {
  var box = $('qa-qr'); if (!box || !L.token) return;
  var code = $('qa-code'); if (code) code.textContent = grp(L.token);
  loadLib(QR_LIB, function () { return W.qrcode; }).then(function () {
    var q = W.qrcode(0, 'M'); q.addData('ASQ:' + L.token); q.make();
    box.innerHTML = q.createSvgTag(6, 2).replace(/^<svg[^>]*>/, function (t) { return t.replace(/\s(width|height)="[^"]*"/g, ''); });
    if (box.firstChild && box.firstChild.style) { box.firstChild.style.width = '100%'; box.firstChild.style.height = 'auto'; }
  }).catch(function () { showToast('QR library did not load. Students can type the code', 'error'); });
}
function renderList() {
  var l = $('qa-list'), sum = $('qa-sum'); if (!l) return;
  var rows = L.roster.map(function (m) { return { m: m, s: statusOf(m) }; });
  var cnt = { out: 0, edge: 0, none: 0, in: 0 };
  rows.forEach(function (x) { cnt[x.s.k]++; });
  if (sum) sum.textContent = cnt.out + ' outside · ' + cnt.edge + ' borderline · ' + cnt.none + ' not checked · ' + cnt.in + ' inside';
  rows.sort(function (a, b) { return ORDER[a.s.k] - ORDER[b.s.k]; });
  l.innerHTML = rows.slice(0, 60).map(function (x) {
    var m = x.m, d = m.distance_m == null ? '' : m.distance_m + ' m' + (m.accuracy_m ? ' ±' + m.accuracy_m : '');
    return '<div class="card p-2 flex justify-between items-center text-xs"><span>' + esc(m.name || m.matric || 'Student') + (m.matric && m.name ? ' · ' + esc(m.matric) : '') + '</span>' +
      '<span style="text-align:right"><b>' + d + '</b> <span style="color:' + x.s.c + ';font-weight:700">' + x.s.t + '</span></span></div>';
  }).join('');
}
function poll() {
  sb.rpc('qa_roster', { p_session: L.sid }).then(function (r) {
    if (r.error) return; L.roster = r.data || [];
    var n = $('qa-count'); if (n) n.textContent = L.roster.length + ' present';
    renderList();
  });
}
W.qaFull = function () { var el = $('qa-stage'); if (el && el.requestFullscreen) el.requestFullscreen().catch(function () {}); };
W.qaEnd = function () {
  if (!confirm('End this session? The code stops working.')) return;
  killTimers();
  var course = L.course, sid = L.sid;
  sb.rpc('qa_close', { p_session: sid }).then(function () { return sb.rpc('qa_roster', { p_session: sid }); }).then(function (r) {
    var rows = (r && r.data) || L.roster; L.sid = null;
    W._qaFinal = { course: course, rows: rows };
    var out = rows.filter(function (m) { return statusOf(m).k === 'out'; }).length;
    var m = $('main');
    if (m) m.innerHTML = '<div class="space-y-4"><div class="font-extrabold text-2xl">' + esc(course) + ' · closed</div>' +
      '<div class="card p-4 text-center"><b class="text-2xl">' + rows.length + '</b><div class="lbl">present</div>' +
      '<div class="text-xs mt-2" style="color:var(--mut)">' + out + ' outside the ' + L.radius + ' m radius</div></div>' +
      '<button class="btn w-full" onclick="qaCsv()">Download CSV</button><button class="btn2 w-full" onclick="go(\'home\')">Done</button></div>';
  }).catch(function () { showToast('Could not close, try again', 'error'); });
};
W.qaCsv = function () {
  var f = W._qaFinal; if (!f) return;
  function q(x) { return '"' + String(x == null ? '' : x).replace(/"/g, '""') + '"'; }
  var csv = 'Name,Matric,Time,Distance (m),Accuracy (m),Status at ' + L.radius + ' m\n' + f.rows.map(function (m) {
    return [m.name, m.matric, new Date(m.marked_at).toLocaleString(), m.distance_m, m.accuracy_m, statusOf(m).t].map(q).join(',');
  }).join('\n');
  var a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = f.course.replace(/\s+/g, '') + '-attendance.csv';
  document.body.appendChild(a); a.click(); a.remove();
};

/* ---------- student ---------- */
function noticeView() {
  return '<div class="space-y-4"><div class="font-extrabold text-2xl">Before you scan</div>' +
    '<div class="card p-4 space-y-3 text-sm">' +
    '<p><b>A code that travels by WhatsApp stops proving you were in the room.</b> A distance is much harder to forward.</p>' +
    '<p>When you scan, your phone takes one position reading. The server turns it into a single number, how far you are from your lecturer’s phone, and drops the reading. Only that number is kept, with the time.</p>' +
    '<p>Indoor GPS drifts by tens of metres, so your lecturer sees the distance together with its margin of error. A borderline reading proves nothing on its own.</p>' +
    '<p>Decline and you’re still marked present. Your lecturer just sees “distance not checked”.</p>' +
    '<p class="text-xs" style="color:var(--mut)">Your phone will show its own permission pop-up next. That’s this.</p></div>' +
    '<button class="btn w-full py-3" onclick="qaLoc(\'yes\')">Allow one reading per scan</button>' +
    '<button class="btn2 w-full" onclick="qaLoc(\'no\')">Mark me without distance</button>' +
    '<button class="btn2 w-full" onclick="go(\'home\')">Cancel</button></div>';
}
V.qrs = function () {
  var ch = lsg('as_qa_loc');
  if (!ch) return noticeView();
  return '<div class="space-y-3"><div class="font-extrabold text-2xl">Scan to mark attendance</div>' +
    '<div class="card p-2"><video id="qa-vid" playsinline muted style="width:100%;border-radius:14px;background:#000;min-height:240px"></video></div>' +
    '<p id="qa-msg" class="text-xs text-center" style="color:var(--mut)">Point the camera at the QR on the projector.</p>' +
    '<div class="text-center" style="font-size:11px;color:var(--mut)">Distance check: ' + (ch === 'yes' ? 'on' : 'off') + ' · <a onclick="qaLocReset()" style="text-decoration:underline">Change</a></div>' +
    '<div class="card p-3 space-y-2"><div class="lbl">Camera not working? Type the code</div>' +
    '<input id="qa-typed" class="inp" placeholder="e.g. A3F9 1C7E" autocapitalize="characters">' +
    '<button class="btn w-full" onclick="qaTyped()">Mark me present</button></div>' +
    '<button class="btn2 w-full" onclick="go(\'home\')">Cancel</button></div>';
};
function rerenderScan() { var m = $('main'); if (m) m.innerHTML = V.qrs(); scanInit(); }
W.qaLoc = function (v) { lss('as_qa_loc', v); rerenderScan(); };
W.qaLocReset = function () { try { localStorage.removeItem('as_qa_loc'); } catch (e) {} stopCam(); rerenderScan(); };
function warmFix() {
  S.fixAt = 0;
  S.fixP = bestFix(12000, 25).then(function (f) { S.fixAt = Date.now(); return f; });
}
function getFix() {
  if (S.fixP && (!S.fixAt || Date.now() - S.fixAt < 90000)) return S.fixP;
  return bestFix(6000, 30);
}
function stopCam() {
  clearTimeout(S.raf);
  if (S.stream) S.stream.getTracks().forEach(function (t) { t.stop(); });
  S.stream = null; S.busy = false;
}
function detector() {
  if ('BarcodeDetector' in W) {
    var d = new W.BarcodeDetector({ formats: ['qr_code'] });
    return Promise.resolve(function (vid) { return d.detect(vid).then(function (r) { return r[0] ? r[0].rawValue : null; }); });
  }
  return loadLib(JSQR_LIB, function () { return W.jsQR; }).then(function () {
    var cv = document.createElement('canvas'), cx = cv.getContext('2d', { willReadFrequently: true });
    return function (vid) {
      var vw = vid.videoWidth || 480, vh = vid.videoHeight || 360, w = Math.min(480, vw), h = Math.round(w * vh / vw);
      cv.width = w; cv.height = h; cx.drawImage(vid, 0, 0, w, h);
      var q = W.jsQR(cx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
      return Promise.resolve(q ? q.data : null);
    };
  });
}
function loop() {
  if (!S.stream) return;
  S.raf = setTimeout(function () {
    if (!S.stream || S.busy) return loop();
    S.read(S.vid).then(function (v) {
      if (v && v.indexOf('ASQ:') === 0) { S.busy = true; mark(v.slice(4)); } else loop();
    }).catch(function () { loop(); });
  }, 250);
}
function scanInit() {
  stopCam();
  var ch = lsg('as_qa_loc'), vid = $('qa-vid');
  if (!ch || !vid) return;
  if (ch === 'yes') warmFix();
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) return say('Camera unavailable. Type the code below');
  navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
    .then(function (s) { S.stream = s; vid.srcObject = s; return vid.play(); })
    .then(detector)
    .then(function (read) { S.vid = vid; S.read = read; loop(); })
    .catch(function () { say('Scanner unavailable. Allow the camera or type the code below'); });
}
var WHY = { expired: 'That code just changed. Scan the screen again', invalid: 'Not a valid attendance code', closed: 'This session has ended', signin: 'Please sign in again' };
function mark(tok) {
  say('Checking...');
  var m = me(), useLoc = lsg('as_qa_loc') === 'yes';
  (useLoc ? getFix() : Promise.resolve(null)).then(function (fx) {
    return sb.rpc('qa_mark', { p_token: tok, p_name: m.name, p_matric: m.matric, p_lat: fx ? fx.lat : null, p_lng: fx ? fx.lng : null, p_acc: fx ? fx.acc : null });
  }).then(function (r) {
    var d = r.data || {};
    if (r.error) { say('Network problem. Try again'); S.busy = false; return loop(); }
    if (d.ok) return success(d);
    say(WHY[d.reason] || 'Could not mark attendance');
    if (d.reason === 'closed') { stopCam(); return; }
    S.busy = false; loop();
  }).catch(function () { say('Network problem. Try again'); S.busy = false; loop(); });
}
function receiptLine(d) {
  if (d.distance != null) return d.distance + ' m from your lecturer' + (d.accuracy ? ' (±' + d.accuracy + ' m)' : '');
  if (d.ref_acc == null) return 'Distance not checked: your lecturer’s position wasn’t set for this session.';
  if (lsg('as_qa_loc') !== 'yes') return 'Distance not checked: you chose to skip it.';
  return 'Distance not checked: your phone gave no position reading.';
}
function success(d) {
  stopCam(); if (navigator.vibrate) navigator.vibrate(80);
  var t = new Date(d.at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  var m = $('main');
  if (m) m.innerHTML = '<div class="card p-6 text-center space-y-3">' + (W.zumaImg ? W.zumaImg('cheer', 90) : '') +
    '<div class="font-extrabold text-xl">' + (d.already ? 'Already marked' : 'You’re marked present') + '</div>' +
    '<div class="text-sm" style="color:var(--mut)">' + esc(d.course) + '</div>' +
    '<div class="card p-3 text-xs text-left space-y-1"><div class="lbl">Receipt</div><div>' + esc(receiptLine(d)) + '</div>' +
    '<div style="color:var(--mut)">' + (d.already ? 'Marked earlier' : 'Marked ' + t) + ' · position reading not saved</div></div>' +
    '<button class="btn w-full" onclick="go(\'home\')">Done</button></div>';
}
W.qaTyped = function () {
  var t = ((($('qa-typed') || {}).value) || '').replace(/\s+/g, '').toUpperCase();
  if (t.length < 6) return showToast('Type the full code', 'error');
  S.busy = true; mark(t);
};

/* ---------- entry points ---------- */
function chooser(card) {
  var sh = $('sheet'); if (!sh) return W.go('qrs');
  W._qaCard = card;
  sh.innerHTML = '<div class="fixed inset-0" style="background:rgba(2,6,23,.45);z-index:9989" onclick="closeSheet()"></div>' +
    '<div class="fixed inset-x-0 bottom-0" style="z-index:9990;background:var(--card);border-top:1px solid var(--bd);border-radius:28px 28px 0 0">' +
    '<div class="p-6 space-y-3" style="padding-bottom:calc(env(safe-area-inset-bottom,0px) + 18px)">' +
    '<div class="font-extrabold text-xl">Mark attendance</div>' +
    '<button class="btn w-full py-3" onclick="closeSheet();go(\'qrs\')">Scan the lecturer’s QR</button>' +
    '<button class="btn2 w-full" onclick="qaOld()">Enter a code instead</button></div></div>';
}
W.qaOld = function () { closeSheet(); var c = W._qaCard; if (c) { bypass = true; try { c.click(); } finally { bypass = false; } } };
document.addEventListener('click', function (e) {
  try {
    if (bypass || (typeof view !== 'undefined' && view !== 'home') || (U && U.role === 'lecturer')) return;
    var m = $('main'); if (!m || !m.contains(e.target)) return;
    var card = null;
    for (var n = e.target, i = 0; n && n !== m && i < 5; n = n.parentNode, i++) {
      var s = (n.textContent || '').replace(/\s+/g, ' ').trim();
      if (/^Mark attendance\b/.test(s) && s.length < 30) { card = n; break; }
    }
    if (!card) return;
    e.preventDefault(); e.stopPropagation(); chooser(card);
  } catch (err) { console.error('qr entry', err); }
}, true);
function chip() {
  var b = $('qa-chip');
  if (!b) {
    b = document.createElement('button'); b.id = 'qa-chip'; b.className = 'btn'; b.textContent = 'QR attendance';
    b.style.cssText = 'position:fixed;left:14px;bottom:92px;z-index:9000;padding:10px 14px;border-radius:999px;display:none';
    b.onclick = function () { W.go('qrl'); }; document.body.appendChild(b);
  }
  b.style.display = (U && U.role === 'lecturer' && !(typeof view !== 'undefined' && view === 'qrl')) ? 'block' : 'none';
}
var goB = W.go;
W.go = function (v) {
  if (v !== 'qrl') killTimers();
  if (v !== 'qrs') stopCam();
  var r = goB.apply(this, arguments);
  setTimeout(function () {
    try { if (v === 'qrl') liveInit(); if (v === 'qrs') scanInit(); chip(); } catch (e) { console.error('qr init', e); }
  }, 150);
  return r;
};
setTimeout(function () { try { chip(); } catch (e) {} }, 1500);
})();
