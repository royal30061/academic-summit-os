/* Academic Summit - native-boot.js v1: the APK must never show a blank screen.
   1) Fatal check: base script died (a required script never loaded) -> recovery panel.
   2) Watchdog (native): shell up but #main empty -> retry home once, then a
      dependency-free fallback home built from local data, with the error shown.
   3) Native ships the classic dashboard; the web keeps Profile > Appearance.
   Load LAST, after smooth.js. */
(function () {
  'use strict';
  var W = window;
  if (W.__asNativeBoot) return; W.__asNativeBoot = '1';
  var NAT = !!(W.Capacitor && W.Capacitor.isNativePlatform && W.Capacitor.isNativePlatform());
  var BUILD = W.__AS_BUILD__ || { ref: 'dev', sha: '', at: '' };
  var errs = [];
  function note(m) { errs.push(m); if (errs.length > 6) errs.shift(); }
  W.addEventListener('error', function (e) {
    var t = e.target;
    if (t && t !== W && (t.src || t.href)) note('load failed: ' + (t.src || t.href));
    else note((e.message || 'error') + (e.filename ? ' @' + String(e.filename).split('/').pop() + ':' + e.lineno : ''));
  }, true);
  W.addEventListener('unhandledrejection', function (e) {
    var r = e.reason; note('promise: ' + ((r && r.message) || r));
  }, true);
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function stamp() { return (BUILD.ref || 'dev') + ' ' + String(BUILD.sha || '').slice(0, 7) + ' ' + (BUILD.at || ''); }
  function allErrs() { var a = (W.__asErrs || []).slice(-4).concat(errs.slice(-4)); return a.slice(-6); }

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
  function baseAlive() {
    try { return typeof sb !== 'undefined' && typeof boot === 'function' && typeof go === 'function'; } catch (e) { return false; }
  }
  function fatalCheck() {
    if (baseAlive()) return;
    var p = panel('Academic Summit could not start', 'A required script did not load. Your saved data is safe on this phone.');
    p.add('Retry', function () { location.reload(); }, true);
    p.add('Open web version', function () { location.href = 'https://academic-summit-os.vercel.app'; });
    p.stamp();
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

  if (NAT) {
    try { localStorage.setItem('as_home_mode', 'classic'); localStorage.setItem('as_hh_off', '1'); sessionStorage.removeItem('as_hh_classic'); } catch (e) {}
  }
  function arm() {
    setTimeout(fatalCheck, 1800);
    setTimeout(fatalCheck, 6000);
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
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arm); else arm();
})();
