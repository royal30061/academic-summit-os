(function () {
  if (window.__asNativeBrand) return; window.__asNativeBrand = '2';
  var NAT = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var APK = (location.protocol === 'https:' ? location.origin + '/academic-summit.apk'
    : 'https://github.com/royal30061/academic-summit-os/releases/latest/download/academic-summit.apk');
  var RELEASES = 'https://github.com/royal30061/academic-summit-os/releases/latest';
  try { document.title = 'Academic Summit'; } catch (e) {}
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); window.__asPwaPrompt = e; });

  var css = '.asb-card{position:relative;margin:14px 0;padding:18px 16px 16px;border-radius:18px;color:#E9FBF3;background:linear-gradient(150deg,#0B3A2D,#062B22 55%,#07332B);border:1px solid rgba(45,212,191,.28);box-shadow:0 10px 30px rgba(2,20,15,.45);animation:asbIn .45s cubic-bezier(.2,.9,.25,1) both;overflow:hidden}' +
    '.asb-card:before{content:"";position:absolute;inset:-40% -20% auto auto;width:220px;height:220px;border-radius:50%;background:radial-gradient(circle,rgba(16,185,129,.22),transparent 65%);pointer-events:none}' +
    '@keyframes asbIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}' +
    '.asb-head{display:flex;align-items:center;gap:12px;margin-bottom:10px}' +
    '.asb-mark{flex:0 0 auto;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;background:linear-gradient(160deg,#0A3A2E,#062B22);border:1px solid rgba(52,211,153,.35)}' +
    '.asb-title{font-size:17px;font-weight:800;line-height:1.2}.asb-sub{font-size:12.5px;color:#9ED9C0;margin-top:2px}' +
    '.asb-list{margin:10px 0 14px;padding:0;list-style:none;display:grid;gap:6px}' +
    '.asb-list li{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#CFEFE2}.asb-list svg{flex:0 0 auto;margin-top:2px}' +
    '.asb-btn{display:flex;width:100%;align-items:center;justify-content:center;gap:8px;padding:13px 14px;border-radius:13px;border:0;cursor:pointer;font-size:15px;font-weight:800;color:#04241B;text-decoration:none;background:linear-gradient(95deg,#10B981,#2DD4BF);box-shadow:0 6px 18px rgba(16,185,129,.35);transition:transform .12s ease}' +
    '.asb-btn:active{transform:scale(.97)}.asb-btn:focus-visible,.asb-ghost:focus-visible{outline:2px solid #2DD4BF;outline-offset:2px}' +
    '.asb-btn[aria-busy="true"]{animation:asbPulse 1.1s ease-in-out infinite}' +
    '@keyframes asbPulse{0%,100%{box-shadow:0 6px 18px rgba(16,185,129,.35)}50%{box-shadow:0 6px 26px rgba(45,212,191,.6)}}' +
    '.asb-ghost{display:block;width:100%;margin-top:8px;padding:10px;border-radius:12px;background:rgba(236,253,245,.06);border:1px solid rgba(236,253,245,.14);color:#BFE8D8;font-size:13.5px;font-weight:600;cursor:pointer}' +
    '.asb-link{display:inline-block;margin-top:10px;font-size:12.5px;color:#7FD4B4;text-decoration:underline;text-underline-offset:3px}' +
    '.asb-status{margin-top:10px;font-size:12.5px;color:#FCD34D;min-height:16px}' +
    '.asb-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:700;background:rgba(16,185,129,.16);border:1px solid rgba(16,185,129,.4);color:#6EE7B7}' +
    '@media (prefers-reduced-motion:reduce){.asb-card,.asb-btn{animation:none;transition:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var MARK = '<svg width="26" height="26" viewBox="0 0 108 108" aria-hidden="true"><path fill="#34D399" d="M38 48 L56 82 L22 82 Z"/><path fill="#10B981" d="M54 28 L84 82 L24 82 Z"/><path fill="#ECFDF5" d="M54 28 L62 42 L58 40 L54 44 L50 40 L46 42 Z"/></svg>';
  var TICK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="#2DD4BF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var DL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16" stroke="#04241B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function el(h) { var d = document.createElement('div'); d.innerHTML = h; return d.firstElementChild; }
  function download(card) {
    var a = document.createElement('a'); a.href = APK; a.download = 'academic-summit.apk';
    document.body.appendChild(a); a.click(); a.remove();
    var s = card && card.querySelector('.asb-status');
    if (s) s.textContent = 'Downloading the native app (~9 MB). When it finishes, tap the file and allow installs.';
  }
  document.addEventListener('click', function (e) {
    var t = e.target && e.target.closest ? e.target.closest('button, a') : null;
    if (!t) return;
    var txt = (t.textContent || '').trim();
    if (/^Install Academic Summit$/i.test(txt) || /^Install the app$/i.test(txt)) {
      e.preventDefault(); e.stopPropagation();
      download(t.closest('.asb-card') || t.parentElement);
    }
  }, true);
  function buildCard() {
    if (NAT) return el('<section class="asb-card"><div class="asb-head"><span class="asb-mark">' + MARK + '</span><div><div class="asb-title">Academic Summit</div><div class="asb-sub">Native Android app · installed on this phone</div></div></div><span class="asb-badge">' + TICK + ' Native camera &amp; location active</span><ul class="asb-list"><li>' + TICK + ' Range guard uses Android fused location</li><li>' + TICK + ' Opens styled with no network</li></ul><a class="asb-btn" href="' + RELEASES + '" target="_blank" rel="noopener">' + DL + ' Check for a newer build</a><div class="asb-status" role="status" aria-live="polite"></div></section>');
    var standalone = false;
    try { standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) {}
    var card = el('<section class="asb-card"><div class="asb-head"><span class="asb-mark">' + MARK + '</span><div><div class="asb-title">' + (standalone ? 'Go native' : 'Get the native app') + '</div><div class="asb-sub">Android · ~9 MB · one tap, no Play Store</div></div></div><ul class="asb-list"><li>' + TICK + ' Native camera for QR and fused location for the range guard</li><li>' + TICK + ' Fully styled offline at launch</li><li>' + TICK + ' Same account and records as the browser</li></ul><button class="asb-btn" type="button" id="asb-dl">' + DL + ' Download for Android</button><button class="asb-ghost" type="button" id="asb-ghost">Keep using the browser version</button><a class="asb-link" href="' + RELEASES + '" target="_blank" rel="noopener">What\u2019s new</a><div class="asb-status" role="status" aria-live="polite"></div></section>');
    card.querySelector('#asb-dl').addEventListener('click', function () { this.setAttribute('aria-busy', 'true'); download(card); var b = this; setTimeout(function () { b.removeAttribute('aria-busy'); }, 4000); });
    card.querySelector('#asb-ghost').addEventListener('click', function () { try { localStorage.setItem('asb_dismiss', '1'); } catch (e) {} card.style.display = 'none'; });
    return card;
  }
  var dismissed = false; try { dismissed = localStorage.getItem('asb_dismiss') === '1'; } catch (e) {}
  function surgery() {
    if (dismissed && !NAT) return;
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
})();
