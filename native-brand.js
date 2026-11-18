(function () {
  if (window.__asNativeBrand) return; window.__asNativeBrand = '3';
  var NAT = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var APK = (location.protocol === 'https:' ? location.origin + '/academic-summit.apk'
    : 'https://github.com/royal30061/academic-summit-os/releases/latest/download/academic-summit.apk');
  try { document.title = 'Academic Summit'; } catch (e) {}
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); window.__asPwaPrompt = e; });
  var css = '.asb-card{position:relative;margin:14px 0;padding:16px;border-radius:18px;color:#E9FBF3;background:linear-gradient(150deg,#0B3A2D,#062B22 55%,#07332B);border:1px solid rgba(45,212,191,.28);box-shadow:0 10px 30px rgba(2,20,15,.45);animation:asbIn .4s cubic-bezier(.2,.9,.25,1) both;overflow:hidden}' +
    '@keyframes asbIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
    '.asb-head{display:flex;align-items:center;gap:12px;margin-bottom:12px}' +
    '.asb-mark{flex:0 0 auto;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(160deg,#0A3A2E,#062B22);border:1px solid rgba(52,211,153,.35)}' +
    '.asb-title{font-size:17px;font-weight:800;line-height:1.2}.asb-sub{font-size:12.5px;color:#9ED9C0;margin-top:2px}' +
    '.asb-btn{display:flex;width:100%;align-items:center;justify-content:center;gap:8px;padding:13px 14px;border-radius:13px;border:0;cursor:pointer;font-size:15px;font-weight:800;color:#04241B;text-decoration:none;background:linear-gradient(95deg,#10B981,#2DD4BF);box-shadow:0 6px 18px rgba(16,185,129,.35);transition:transform .12s ease}' +
    '.asb-btn:active{transform:scale(.97)}.asb-btn:focus-visible{outline:2px solid #2DD4BF;outline-offset:2px}' +
    '.asb-btn[aria-busy="true"]{animation:asbPulse 1.1s ease-in-out infinite}' +
    '@keyframes asbPulse{0%,100%{box-shadow:0 6px 18px rgba(16,185,129,.35)}50%{box-shadow:0 6px 26px rgba(45,212,191,.6)}}' +
    '.asb-status{margin-top:10px;font-size:12.5px;color:#FCD34D;min-height:16px}' +
    '@media (prefers-reduced-motion:reduce){.asb-card,.asb-btn{animation:none;transition:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var MARK = '<svg width="24" height="24" viewBox="0 0 108 108" aria-hidden="true"><path fill="#34D399" d="M38 48 L56 82 L22 82 Z"/><path fill="#10B981" d="M54 28 L84 82 L24 82 Z"/><path fill="#ECFDF5" d="M54 28 L62 42 L58 40 L54 44 L50 40 L46 42 Z"/></svg>';
  var DL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16" stroke="#04241B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function el(h) { var d = document.createElement('div'); d.innerHTML = h; return d.firstElementChild; }
  function download(card) {
    var a = document.createElement('a'); a.href = APK; a.download = 'academic-summit.apk';
    document.body.appendChild(a); a.click(); a.remove();
    var s = card && card.querySelector('.asb-status');
    if (s) s.textContent = 'Downloading\u2026 tap the file when it finishes to install.';
  }
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('button, a') : null;
    if (!t) return;
    var txt = (t.textContent || '').trim();
    if (/^Install Academic Summit$/i.test(txt) || /^Install the app$/i.test(txt) || /^Download for Android$/i.test(txt)) {
      if (t.classList.contains('asb-btn') && t.id === 'asb-dl') return;
      e.preventDefault(); e.stopPropagation();
      download(t.closest('.asb-card') || t.parentElement);
    }
  }, true);
  function buildCard() {
    if (NAT) return el('<section class="asb-card"><div class="asb-head"><span class="asb-mark">' + MARK + '</span><div><div class="asb-title">Academic Summit</div><div class="asb-sub">Native app installed on this phone</div></div></div></section>');
    var card = el('<section class="asb-card"><div class="asb-head"><span class="asb-mark">' + MARK + '</span><div><div class="asb-title">Academic Summit</div><div class="asb-sub">Android \u00b7 ~9 MB</div></div></div><button class="asb-btn" type="button" id="asb-dl">' + DL + ' Download for Android</button><div class="asb-status" role="status" aria-live="polite"></div></section>');
    card.querySelector('#asb-dl').addEventListener('click', function () { this.setAttribute('aria-busy', 'true'); download(card); var b = this; setTimeout(function () { b.removeAttribute('aria-busy'); }, 4000); });
    return card;
  }
  function surgery() {
    var nodes = document.querySelectorAll('button, a');
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || '').trim();
      if (!/^Install Academic Summit$/i.test(t) && !/^Install the app$/i.test(t)) continue;
      var card = nodes[i].closest('section') || nodes[i].parentElement.parentElement;
      if (!card || card.hasAttribute('data-asb-hidden')) continue;
      if (card.previousElementSibling && card.previousElementSibling.classList.contains('asb-card')) continue;
      card.setAttribute('data-asb-hidden', '1'); card.style.display = 'none';
      card.parentNode.insertBefore(buildCard(), card);
    }
  }
  var timer = null;
  new MutationObserver(function () { if (timer) return; timer = setTimeout(function () { timer = null; surgery(); }, 150); }).observe(document.body, { childList: true, subtree: true });
  if (document.readyState !== 'loading') surgery(); else document.addEventListener('DOMContentLoaded', surgery);
  fetch('https://api.github.com/repos/royal30061/academic-summit-os/releases/latest', { headers: { Accept: 'application/vnd.github+json' } })
    .then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      if (!j) return;
      var a = (j.assets || []).filter(function (x) { return /\.apk$/i.test(x.name); })[0];
      if (a) APK = a.browser_download_url;
    }).catch(function () {});
})();
