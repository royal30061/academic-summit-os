(function () {
  if (window.__asNativeBrand) return; window.__asNativeBrand = '5';
  try { document.title = 'Academic Summit'; } catch (e) {}
  var NAT = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  // Hide the app's own in-page "Install the app" card. Only display:none is applied; nothing is moved or removed.
  function hideOld() {
    try {
      var nodes = document.querySelectorAll('button, a');
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i], t = (n.textContent || '').trim();
        if (!/^Install Academic Summit$/i.test(t) && !/^Install the app$/i.test(t)) continue;
        if (n.closest('#asb-sheet')) continue;
        var c = n, hops = 0;
        while (hops < 3 && c.parentElement && c.parentElement !== document.body &&
               !/^(MAIN|BODY|HTML)$/.test(c.parentElement.tagName) &&
               (c.parentElement.textContent || '').trim().length <= 160) { c = c.parentElement; hops++; }
        if (c !== n && !c.hasAttribute('data-asb-hidden')) { c.setAttribute('data-asb-hidden', '1'); c.style.display = 'none'; }
      }
    } catch (e) {}
  }
  var ht = null;
  function watch() {
    hideOld();
    new MutationObserver(function () {
      if (ht) return;
      ht = setTimeout(function () { ht = null; hideOld(); }, 300);
    }).observe(document.body, { childList: true, subtree: true });
  }
  if (document.readyState !== 'loading') watch(); else document.addEventListener('DOMContentLoaded', watch);

  if (NAT) return; // inside the installed app: no banner
  var APK = '/academic-summit.apk', KEY = 'asb_dismiss';

  function dismissed() {
    try { var t = +localStorage.getItem(KEY) || 0; return t > 1e12 && Date.now() - t < 7 * 864e5; } catch (e) { return false; }
  }
  function dismiss() { try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {} }

  function show() {
    try {
      if (dismissed() || document.getElementById('asb-sheet')) return;
      var st = document.createElement('style');
      st.textContent =
        '#asb-sheet{position:fixed;left:12px;right:12px;bottom:calc(88px + env(safe-area-inset-bottom,0px));z-index:2147483000;' +
        'padding:14px;border-radius:16px;color:#E9FBF3;font:600 14px/1.3 system-ui,sans-serif;' +
        'background:linear-gradient(150deg,#0B3A2D,#062B22);border:1px solid rgba(45,212,191,.3);' +
        'box-shadow:0 10px 30px rgba(2,20,15,.55);animation:asbIn .35s ease both}' +
        '@keyframes asbIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}' +
        '#asb-sheet .r{display:flex;align-items:center;gap:10px}' +
        '#asb-sheet .t{flex:1}#asb-sheet small{display:block;font-weight:500;color:#9ED9C0;margin-top:2px;font-size:12px}' +
        '#asb-sheet a{padding:10px 14px;border-radius:12px;background:linear-gradient(95deg,#10B981,#2DD4BF);color:#04241B;text-decoration:none;font-weight:800}' +
        '#asb-sheet button{background:none;border:0;color:#9ED9C0;font-size:20px;padding:4px 8px;cursor:pointer}' +
        '@media (prefers-reduced-motion:reduce){#asb-sheet{animation:none}}';
      document.head.appendChild(st);
      var s = document.createElement('div');
      s.id = 'asb-sheet'; s.setAttribute('role', 'dialog'); s.setAttribute('aria-label', 'Get the app');
      s.innerHTML = '<div class="r"><div class="t">Get the Academic Summit app<small>Native camera and precise location for attendance</small></div>' +
        '<a href="' + APK + '" download="academic-summit.apk">Download</a>' +
        '<button type="button" aria-label="Not now">\u00d7</button></div>';
      s.querySelector('a').addEventListener('click', function () { dismiss(); setTimeout(function () { s.remove(); }, 400); });
      s.querySelector('button').addEventListener('click', function () { dismiss(); s.remove(); });
      document.body.appendChild(s); // outside the app's own DOM tree
    } catch (e) {}
  }

  function go() { setTimeout(show, 2500); }
  if (document.readyState === 'complete') go(); else window.addEventListener('load', go);
})();
