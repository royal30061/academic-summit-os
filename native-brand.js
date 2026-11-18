(function () {
  if (window.__asNativeBrand) return; window.__asNativeBrand = '1';
  var NAT = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var REPO = 'royal30061/academic-summit-os';
  var APK_FALLBACK = 'https://github.com/' + REPO + '/releases/latest/download/academic-summit.apk';
  var RELEASES = 'https://github.com/' + REPO + '/releases/latest';
  var state = { url: APK_FALLBACK, mb: '~9', tag: '' };
  try { document.title = 'Academic Summit'; } catch (e) {}

  var css = '' +
    '.asb-card{position:relative;margin:14px 0;padding:18px 16px 16px;border-radius:18px;color:#E9FBF3;' +
    'background:linear-gradient(150deg,#0B3A2D 0%,#062B22 55%,#07332B 100%);' +
    'border:1px solid rgba(45,212,191,.28);box-shadow:0 10px 30px rgba(2,20,15,.45),inset 0 1px 0 rgba(236,253,245,.08);' +
    'animation:asbIn .45s cubic-bezier(.2,.9,.25,1) both;overflow:hidden}' +
    '.asb-card:before{content:"";position:absolute;inset:-40% -20% auto auto;width:220px;height:220px;border-radius:50%;' +
    'background:radial-gradient(circle,rgba(16,185,129,.22),transparent 65%);pointer-events:none}' +
    '@keyframes asbIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}' +
    '.asb-head{display:flex;align-items:center;gap:12px;margin-bottom:10px}' +
    '.asb-mark{flex:0 0 auto;width:44px;height:44px;border-radius:12px;display:grid;place-items:center;' +
    'background:linear-gradient(160deg,#0A3A2E,#062B22);border:1px solid rgba(52,211,153,.35)}' +
    '.asb-title{font-size:17px;font-weight:800;letter-spacing:.2px;line-height:1.2}' +
    '.asb-sub{font-size:12.5px;color:#9ED9C0;margin-top:2px}' +
    '.asb-list{margin:10px 0 14px;padding:0;list-style:none;display:grid;gap:6px}' +
    '.asb-list li{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#CFEFE2}' +
    '.asb-list svg{flex:0 0 auto;margin-top:2px}' +
    '.asb-btn{display:flex;width:100%;align-items:center;justify-content:center;gap:8px;padding:13px 14px;border-radius:13px;' +
    'border:0;cursor:pointer;font-size:15px;font-weight:800;color:#04241B;text-decoration:none;' +
    'background:linear-gradient(95deg,#10B981,#2DD4BF);box-shadow:0 6px 18px rgba(16,185,129,.35);' +
    'transition:transform .12s ease,filter .12s ease}' +
    '.asb-btn:active{transform:scale(.97);filter:brightness(1.08)}' +
    '.asb-btn:focus-visible,.asb-ghost:focus-visible,.asb-link:focus-visible{outline:2px solid #2DD4BF;outline-offset:2px}' +
    '.asb-btn[aria-busy="true"]{filter:saturate(.7);animation:asbPulse 1.1s ease-in-out infinite}' +
    '@keyframes asbPulse{0%,100%{box-shadow:0 6px 18px rgba(16,185,129,.35)}50%{box-shadow:0 6px 26px rgba(45,212,191,.6)}}' +
    '.asb-ghost{display:block;width:100%;margin-top:8px;padding:10px;border-radius:12px;background:rgba(236,253,245,.06);' +
    'border:1px solid rgba(236,253,245,.14);color:#BFE8D8;font-size:13.5px;font-weight:600;cursor:pointer}' +
    '.asb-ghost:active{transform:scale(.98)}' +
    '.asb-link{display:inline-block;margin-top:10px;font-size:12.5px;color:#7FD4B4;text-decoration:underline;text-underline-offset:3px}' +
    '.asb-status{margin-top:10px;font-size:12.5px;color:#FCD34D;min-height:16px}' +
    '.asb-badge{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;font-size:11.5px;font-weight:700;' +
    'background:rgba(16,185,129,.16);border:1px solid rgba(16,185,129,.4);color:#6EE7B7}' +
    '.asb-scroll::-webkit-scrollbar{width:8px}.asb-scroll::-webkit-scrollbar-track{background:#062B22}' +
    '.asb-scroll::-webkit-scrollbar-thumb{background:#10B981;border-radius:8px}.asb-scroll::-webkit-scrollbar-thumb:hover{background:#2DD4BF}' +
    '@media (prefers-reduced-motion:reduce){.asb-card,.asb-btn{animation:none;transition:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var MARK = '<svg width="26" height="26" viewBox="0 0 108 108" aria-hidden="true">' +
    '<path fill="#34D399" d="M38 48 L56 82 L22 82 Z"/><path fill="#10B981" d="M54 28 L84 82 L24 82 Z"/>' +
    '<path fill="#ECFDF5" d="M54 28 L62 42 L58 40 L54 44 L50 40 L46 42 Z"/></svg>';
  var TICK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="#2DD4BF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var DL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16" stroke="#04241B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function status(node, msg) { var s = node.querySelector('.asb-status'); if (s) s.textContent = msg || ''; }

  function buildCard() {
    var standalone = false;
    try { standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true; } catch (e) {}
    if (NAT) {
      return el('<section class="asb-card" aria-label="Native app">' +
        '<div class="asb-head"><span class="asb-mark">' + MARK + '</span><div>' +
        '<div class="asb-title">Academic Summit</div>' +
        '<div class="asb-sub">Native Android app · installed on this phone</div></div></div>' +
        '<span class="asb-badge">' + TICK + ' Camera &amp; location run natively</span>' +
        '<ul class="asb-list"><li>' + TICK + ' Attendance marking works with the screen off-lock avoided</li>' +
        '<li>' + TICK + ' Assets bundled — opens styled even with no network</li></ul>' +
        '<a class="asb-btn" href="' + RELEASES + '" target="_blank" rel="noopener">' + DL + ' Check for a newer build</a>' +
        '<div class="asb-status" role="status" aria-live="polite"></div></section>');
    }
    var head = standalone ? 'Browser app installed' : 'Get the native app';
    var sub = standalone ? 'Go native for camera QR and true location' : 'Android · ' + state.mb + ' MB · one tap, no Play Store needed';
    var card = el('<section class="asb-card" aria-label="Install Academic Summit">' +
      '<div class="asb-head"><span class="asb-mark">' + MARK + '</span><div>' +
      '<div class="asb-title">' + head + '</div><div class="asb-sub">' + sub + '</div></div></div>' +
      '<ul class="asb-list">' +
      '<li>' + TICK + ' Native camera for QR attendance and fused location for the range guard</li>' +
      '<li>' + TICK + ' Opens fully styled offline — no CDN dependency at launch</li>' +
      '<li>' + TICK + ' Same account, same records as the browser version</li></ul>' +
      '<a class="asb-btn" id="asb-dl" href="' + state.url + '" download="academic-summit.apk">' + DL + ' Download for Android</a>' +
      '<button class="asb-ghost" type="button" id="asb-ghost">Keep using the browser version</button>' +
      '<a class="asb-link" href="' + RELEASES + '" target="_blank" rel="noopener">What\u2019s new in this build</a>' +
      '<div class="asb-status" role="status" aria-live="polite"></div></section>');
    card.querySelector('#asb-dl').addEventListener('click', function () {
      var b = this; b.setAttribute('aria-busy', 'true');
      status(card, 'Download started \u2014 when it finishes, tap the file and allow installs from your browser.');
      setTimeout(function () { b.removeAttribute('aria-busy'); }, 4000);
    });
    card.querySelector('#asb-ghost').addEventListener('click', function () {
      try { localStorage.setItem('asb_dismiss', '1'); } catch (e) {}
      card.style.display = 'none';
    });
    return card;
  }

  var dismissed = false;
  try { dismissed = localStorage.getItem('asb_dismiss') === '1'; } catch (e) {}

  function surgery() {
    if (dismissed && !NAT) return;
    var targets = [];
    var nodes = document.querySelectorAll('button, a');
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || '').trim();
      if (/^Install Academic Summit$/i.test(t) || /^Install the app$/i.test(t)) targets.push(nodes[i]);
    }
    for (var j = 0; j < targets.length; j++) {
      var btn = targets[j];
      var card = btn.closest('section') || btn.parentElement.parentElement;
      if (!card || card.hasAttribute('data-asb-hidden')) continue;
      if (card.previousElementSibling && card.previousElementSibling.classList.contains('asb-card')) continue;
      card.setAttribute('data-asb-hidden', '1');
      card.style.display = 'none';
      card.parentNode.insertBefore(buildCard(), card);
    }
  }

  var timer = null;
  var mo = new MutationObserver(function () {
    if (timer) return;
    timer = setTimeout(function () { timer = null; surgery(); }, 150);
  });
  mo.observe(document.body, { childList: true, subtree: true });

  function ready(fn) { if (document.readyState !== 'loading') fn(); else document.addEventListener('DOMContentLoaded', fn); }
  ready(function () {
    surgery();
    var ctl = window.AbortController ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, 6000);
    fetch('https://api.github.com/repos/' + REPO + '/releases/latest', {
      headers: { Accept: 'application/vnd.github+json' }, signal: ctl ? ctl.signal : undefined
    }).then(function (r) { return r.ok ? r.json() : null; }).then(function (j) {
      clearTimeout(to);
      if (!j) return;
      state.tag = j.tag_name || '';
      var a = (j.assets || []).filter(function (x) { return /\.apk$/i.test(x.name); })[0];
      if (a) { state.url = a.browser_download_url; state.mb = String(Math.max(1, Math.round(a.size / 1048576))); }
      var live = document.querySelectorAll('.asb-card');
      for (var i = 0; i < live.length; i++) {
        var dl = live[i].querySelector('#asb-dl');
        if (dl) { dl.href = state.url; }
        var sub = live[i].querySelector('.asb-sub');
        if (sub && !NAT && sub.textContent.indexOf('MB') > -1) sub.textContent = 'Android · ' + state.mb + ' MB · one tap, no Play Store needed';
        var st2 = live[i].querySelector('.asb-status');
        if (st2 && NAT && state.tag) st2.textContent = 'Latest published build: ' + state.tag;
      }
    }).catch(function () { clearTimeout(to); });
  });
})();
