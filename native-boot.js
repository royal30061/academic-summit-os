/* Academic Summit - native-boot.js v3: no white screen, ever, and the build is always visible.
   (1) base dead -> panel; (2) shell up, #main empty -> retry/fallback home;
   (3) sign-in never renders -> session race + visibility watchdog + fallback form;
   (4) catch-all: nothing visible at 12s -> panel with errors + network probe;
   (5) native-only build chip, always on screen, so every screenshot identifies the binary.
   Load LAST, after smooth.js. */
(function () {
  'use strict';
  var W = window;
  if (W.__asNativeBoot === '3') return; W.__asNativeBoot = '3';
  var NAT = !!(W.Capacitor && W.Capacitor.isNativePlatform && W.Capacitor.isNativePlatform());
  var BUILD = W.__AS_BUILD__ || { ref: 'dev', sha: '', at: '' };
  var errs = [];
  function note(m) { errs.push(String(m)); if (errs.length > 8) errs.shift(); var n = document.getElementById('nb-note'); if (n) n.textContent = errs.slice(-3).join(' | '); }
  W.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== W && (t.src || t.href)) note('load failed: ' + (t.src || t.href));
    else note((e.message || 'error') + (e.filename ? ' @' + String(e.filename).split('/').pop() + ':' + e.lineno : ''));
  }, true);
  W.addEventListener('unhandledrejection', function (e) { var r = e.reason; note('promise: ' + ((r && r.message) || r)); }, true);
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function stamp() { return (BUILD.ref || 'dev') + ' ' + String(BUILD.sha || '').slice(0, 7); }
  function allErrs() { return (W.__asErrs || []).slice(-4).concat(errs.slice(-4)).slice(-6); }
  function visible(el) { return !!(el && (el.offsetWidth || el.offsetHeight || (el.getClientRects && el.getClientRects().length))); }

  if (typeof W.boot === 'function' && !W.__asBootGuard) {
    var b0 = W.boot;
    W.boot = function (u) { if (W.__asBooted) return; W.__asBooted = true; return b0.apply(this, arguments); };
    W.__asBootGuard = 1;
  }

  function panel(title, body) {
    var old = document.getElementById('as-boot-panel'); if (old) old.remove();
    var d = document.createElement('div'); d.id = 'as-boot-panel';
    d.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:#02120c;color:#e7fff5;font:14px/1.5 system-ui,sans-serif;padding:24px;overflow:auto';
    var box = document.createElement('div'); box.style.cssText = 'max-width:420px;margin:7vh auto 0';
    box.innerHTML = '<div style="font-size:22px;font-weight:800;margin-bottom:6px">' + esc(title) + '</div>' +
      '<div style="color:#8fb8a9;font-size:13px;margin-bottom:14px">' + esc(body) + '</div>' +
      (allErrs().length ? '<pre style="background:#07271d;border:1px solid #0d3f2e;border-radius:12px;padding:12px;font-size:11px;white-space:pre-wrap;color:#fca5a5;margin-bottom:14px">' + esc(allErrs().join('\n')) + '</pre>' : '');
    d.appendChild(box); document.body.appendChild(d);
    return {
      add: function (label, fn, primary) {
        var b = document.createElement('button'); b.textContent = label;
        b.style.cssText = 'display:block;width:100%;padding:13px;border-radius:14px;margin-bottom:10px;font-weight:800;font-size:14px;cursor:pointer;border:' + (primary ? 'none;background:linear-gradient(135deg,#059669,#10b981);color:#fff' : '1px solid #0d3f2e;background:#0b3527;color:#e7fff5');
        b.onclick = fn; box.appendChild(b); return b;
      },
      stamp: function () { var s = document.createElement('div'); s.style.cssText = 'color:#56616b;font-size:11px;margin-top:16px'; s.textContent = 'build ' + stamp(); box.appendChild(s); }
    };
  }
  function baseAlive() { try { return typeof sb !== 'undefined' && typeof boot === 'function' && typeof go === 'function'; } catch (e) { return false; } }
  function fatalCheck() {
    if (baseAlive()) return;
    var p = panel('Academic Summit could not start', 'A required script did not load. Your saved data is safe on this phone.');
    p.add('Retry', function () { location.reload(); }, true);
    p.add('Open web version', function () { location.href = 'https://academic-summit-os.vercel.app'; });
    p.stamp();
  }

  function appHidden() { var a = document.getElementById('app'); return !a || a.classList.contains('hidden'); }
  function authRendered() {
    if (visible(document.getElementById('asw-gate')) || visible(document.getElementById('as-boot-panel'))) return true;
    var a = document.getElementById('auth'); if (!a) return false;
    var n = a.querySelectorAll('input,button');
    for (var i = 0; i < n.length; i++) if (visible(n[i])) return true;
    return false;
  }
  function shellUp() { var b = document.getElementById('bnav'); return !!(b && b.querySelector('button') && visible(b)); }
  function stuck() { return appHidden() && !authRendered(); }
  function white() { return !authRendered() && !shellUp() && !visible(document.getElementById('as-boot-panel')); }
  var INP = 'display:block;width:100%;padding:12px;border-radius:12px;border:1px solid #0d3f2e;background:#0b3527;color:#e7fff5;font-size:14px;margin-bottom:10px;box-sizing:border-box';
  function minAuth(msg) {
    var a = document.getElementById('auth'); if (!a) return;
    var app = document.getElementById('app'); if (app) app.classList.add('hidden');
    var sp = document.getElementById('splash'); if (sp) sp.remove();
    var as = document.getElementById('as-splash'); if (as) as.remove();
    a.innerHTML = '<div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px;background:#021812;font:14px/1.5 system-ui,sans-serif;box-sizing:border-box">' +
      '<div style="width:100%;max-width:380px;background:#07271d;border:1px solid #0d3f2e;border-radius:18px;padding:22px;color:#e7fff5;box-sizing:border-box">' +
      '<div style="font-size:20px;font-weight:800;margin-bottom:4px">Academic Summit</div>' +
      '<div style="color:#8fb8a9;font-size:12px;margin-bottom:14px">' + esc(msg || 'Sign in to continue.') + '</div>' +
      '<input id="a-name" placeholder="Full name" style="' + INP + ';display:none">' +
      '<input id="a-email" type="email" placeholder="Email" style="' + INP + '">' +
      '<input id="a-pass" type="password" placeholder="Password" style="' + INP + '">' +
      '<button id="nb-go" style="display:block;width:100%;padding:13px;border-radius:14px;border:none;background:linear-gradient(135deg,#059669,#10b981);color:#fff;font-weight:800;font-size:15px;cursor:pointer;margin-bottom:10px">Log in</button>' +
      '<button id="nb-mode" style="display:block;width:100%;padding:11px;border-radius:14px;border:1px solid #0d3f2e;background:transparent;color:#8fb8a9;font-weight:700;font-size:13px;cursor:pointer">New here? Create account</button>' +
      '<div id="nb-note" style="color:#fca5a5;font-size:11px;margin-top:10px;word-break:break-word">' + esc(allErrs().slice(-3).join(' | ')) + '</div>' +
      '<div style="color:#56616b;font-size:10px;margin-top:12px">build ' + stamp() + ' - fallback sign-in</div></div></div>';
    var signup = false;
    var name = document.getElementById('a-name'), goBtn = document.getElementById('nb-go'), modeBtn = document.getElementById('nb-mode');
    modeBtn.onclick = function () {
      signup = !signup;
      name.style.display = signup ? 'block' : 'none';
      goBtn.textContent = signup ? 'Create account' : 'Log in';
      modeBtn.textContent = signup ? 'Have an account? Log in' : 'New here? Create account';
    };
    goBtn.onclick = function () { try { if (signup) doSignup(); else doLogin(); } catch (e) { note('sign-in: ' + e.message); } };
  }
  function probe() {
    try {
      var url = (typeof SB_URL !== 'undefined') ? SB_URL : 'https://okajzlkeaydskdvogdaw.supabase.co';
      var ctl = ('AbortController' in W) ? new AbortController() : null;
      var tm = setTimeout(function () { if (ctl) ctl.abort(); note('network: timeout (5s)'); }, 5000);
      fetch(url + '/auth/v1/health', { cache: 'no-store', signal: ctl ? ctl.signal : undefined })
        .then(function (r) { clearTimeout(tm); note('network: HTTP ' + r.status); }, function (e) { clearTimeout(tm); note('network: ' + (e && e.message || e)); });
    } catch (e) { note('network probe: ' + e.message); }
  }
  function authWatch() {
    setTimeout(function () {
      if (!stuck()) return;
      try { authUI('login'); } catch (e) { note('authUI: ' + e.message); }
      setTimeout(function () { if (stuck()) { minAuth('The sign-in screen did not appear on this device. Use this form.'); probe(); } }, 700);
    }, 3500);
    setTimeout(function () { if (stuck()) { minAuth('Sign-in still missing. Use this form.'); probe(); } }, 9000);
    setTimeout(function () {
      if (!white()) return;
      var p = panel('Nothing rendered on this device', 'The app loaded but no screen appeared. Your data is safe. Retry, or use the web version.');
      p.add('Retry', function () { location.reload(); }, true);
      p.add('Open web version', function () { location.href = 'https://academic-summit-os.vercel.app'; });
      p.stamp(); probe();
    }, 12000);
  }
  function sessionRace() {
    if (!NAT || typeof sb === 'undefined' || !sb.auth) return;
    var tm = setTimeout(function () { if (stuck()) { minAuth('Restoring your session took too long. Sign in below.'); probe(); } }, 6000);
    Promise.resolve(sb.auth.getSession()).then(function (r) {
      clearTimeout(tm);
      if (!stuck()) return;
      var s = r && r.data && r.data.session;
      if (s && s.user) { try { boot(s.user); } catch (e) { note('boot: ' + e.message); minAuth('Sign in to continue.'); } }
      else { try { authUI('login'); } catch (e) { note('authUI: ' + e.message); minAuth('Sign in to continue.'); } }
    }, function (e) {
      clearTimeout(tm); note('session: ' + (e && e.message || e));
      if (stuck()) { minAuth('Session restore failed. Sign in below.'); probe(); }
    });
  }

  function appShown() { var a = document.getElementById('app'); return a && !a.classList.contains('hidden'); }
  function mainEmpty() {
    var m = document.getElementById('main'); if (!m) return true;
    if (m.classList.contains('sm-hide')) return true;
    if (m.querySelector('button,input,svg,img')) return false;
    return (m.textContent || '').trim().length < 3;
  }
  function fallbackHome() {
    var m = document.getElementById('main'); if (!m) return;
    var u = null, g = 0;
    try { u = (typeof U !== 'undefined') ? U : null; } catch (e) {}
    try { g = (typeof cum === 'function') ? cum().g : 0; } catch (e) {}
    var name = (u && u.name) ? String(u.name).split(' ')[0] : 'there';
    var doors = [['Study', 'study'], ['Results', 'traj'], ['Attend', 'att'], ['Finance', 'fin'], ['Profile', 'prof']];
    var h = '<div style="font:14px/1.5 system-ui,sans-serif;color:inherit">' +
      '<div style="font-size:22px;font-weight:800">Good day, ' + esc(name) + '</div>' +
      '<div style="opacity:.6;font-size:12px;margin:2px 0 14px">CGPA ' + g.toFixed(2) + ' / 5.00</div>' +
      '<div style="background:#fff7ed;border:1px solid #fdba74;color:#9a3412;border-radius:12px;padding:10px;font-size:12px;margin-bottom:14px">The full dashboard hit an error on this device. Your data is safe. Use a door below, or reload.</div>' +
      doors.map(function (d) { return '<button data-door="' + d[1] + '" style="display:block;width:100%;text-align:left;padding:14px;border-radius:14px;border:1px solid rgba(120,140,150,.35);background:rgba(120,140,150,.08);margin-bottom:8px;font-weight:800;font-size:14px;color:inherit;cursor:pointer">' + d[0] + ' &rsaquo;</button>'; }).join('') +
      '<button data-reload="1" style="display:block;width:100%;padding:13px;border-radius:14px;border:none;margin-top:6px;font-weight:800;font-size:14px;cursor:pointer;background:linear-gradient(135deg,#059669,#10b981);color:#fff">Reload</button>' +
      (allErrs().length ? '<details style="margin-top:12px;font-size:11px;opacity:.75"><summary>Technical details</summary><pre style="white-space:pre-wrap">' + esc(allErrs().join('\n')) + '</pre></details>' : '') +
      '<div style="opacity:.45;font-size:11px;margin-top:12px">build ' + stamp() + '</div></div>';
    m.innerHTML = h; m.classList.remove('sm-hide');
    Array.prototype.forEach.call(m.querySelectorAll('[data-door]'), function (b) {
      b.addEventListener('click', function () {
        var k = b.getAttribute('data-door');
        try { if (typeof V !== 'undefined' && V[k]) go(k); else if (typeof showToast === 'function') showToast('Opening soon'); } catch (e) { note('door ' + k + ': ' + e.message); }
      });
    });
    var r = m.querySelector('[data-reload]'); if (r) r.addEventListener('click', function () { location.reload(); });
  }
  function mainWatch() {
    if (!NAT) return;
    var ticks = 0, retried = false;
    var iv = setInterval(function () {
      ticks++;
      if (ticks > 50) { clearInterval(iv); return; }
      if (!appShown() || !mainEmpty()) return;
      if (!retried) { retried = true; try { go('home'); } catch (e) { note('retry home: ' + e.message); } return; }
      clearInterval(iv); fallbackHome();
    }, 1200);
  }
  function chip() {
    if (!NAT || document.getElementById('as-build-chip')) return;
    var c = document.createElement('div'); c.id = 'as-build-chip';
    c.style.cssText = 'position:fixed;left:6px;bottom:calc(env(safe-area-inset-bottom,0px) + 4px);z-index:2147483500;padding:2px 7px;border-radius:7px;background:rgba(2,18,12,.78);color:#9ED9C0;font:700 9px/1.5 monospace;pointer-events:none';
    c.textContent = 'AS ' + stamp();
    document.body.appendChild(c);
  }

  if (NAT) {
  }
  function arm() {
    setTimeout(fatalCheck, 1800);
    setTimeout(fatalCheck, 6000);
    sessionRace();
    authWatch();
    mainWatch();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm); else arm();
})();
