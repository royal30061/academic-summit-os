/* Install buttons: on the website they download the APK; inside the app they are hidden. */
(function () {
  if (window.__asInstallFix) return; window.__asInstallFix = '2';
  var NAT = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var STANDALONE = false;
  try { STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) {}
  var INSIDE = NAT || STANDALONE;
  var APK = '/academic-summit.apk';
  var INSTALL = /^(Install Academic Summit|Install the app|Download Academic Summit App)$/i;
  function txt(n) { return (n.textContent || '').replace(/\s+/g, ' ').trim(); }

  /* website: every install button downloads the APK instead of "Add to Home screen" */
  document.addEventListener('click', function (e) {
    if (INSIDE) return;
    var b = e.target.closest && e.target.closest('button,a,[role=button]');
    if (!b || !INSTALL.test(txt(b))) return;
    e.preventDefault(); e.stopImmediatePropagation();
    var a = document.createElement('a'); a.href = APK; a.download = 'academic-summit.apk';
    document.body.appendChild(a); a.click(); a.remove();
  }, true);

  /* hide only what is safe: the install card inside the app, and the developer status line everywhere */
  function sweep() {
    if (document.hidden) return;
    var tc = document.body.textContent || '';
    if (tc.indexOf('System check:') < 0 && !(INSIDE && (tc.indexOf('Install the app') > -1 || tc.indexOf('Install Academic Summit') > -1 || tc.indexOf('Download Academic Summit App') > -1))) return;
    try {
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
      while ((n = w.nextNode())) {
        var p = n.parentElement; if (!p || /^(SCRIPT|STYLE)$/.test(p.tagName)) continue;
        var t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (!t || t.length > 60) continue;
        if (/^System check:/i.test(t)) { p.style.display = 'none'; continue; }
        if (INSIDE && INSTALL.test(t)) {
          var c = p, hops = 0;
          while (hops < 3 && c.parentElement) {
            var par = c.parentElement;
            if (par.id === 'auth' || par.id === 'app' || /^(BODY|HTML|MAIN)$/.test(par.tagName)) break;
            if (txt(par).length > 160) break;
            if (par.querySelectorAll('button,a,input,select,textarea').length > 1) break;
            c = par; hops++;
          }
          c.style.display = 'none';
        }
      }
    } catch (e) {}
  }
  var tm = null;
  new MutationObserver(function () { if (tm) return; tm = setTimeout(function () { tm = null; sweep(); }, 800); })
    .observe(document.body, { childList: true, subtree: true });
  setInterval(sweep, 5000);
  if (document.readyState !== 'loading') sweep(); else document.addEventListener('DOMContentLoaded', sweep);
})();
