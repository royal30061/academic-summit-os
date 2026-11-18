(function () {
  if (window.__asNativeBrand) return; window.__asNativeBrand = '2';
  var NAT = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var APK = '/downloads/academic-summit.apk';
  var KEY = 'asb_dismiss';
  try { document.title = 'Academic Summit'; } catch (e) {}

  var css = '' +
    '.asb-card{position:relative;margin:12px;padding:16px;border-radius:18px;color:#E9FBF3;' +
    'background:linear-gradient(150deg,#0B3A2D 0%,#062B22 55%,#07332B 100%);' +
    'border:1px solid rgba(45,212,191,.28);box-shadow:0 10px 30px rgba(2,20,15,.45);' +
    'animation:asbIn .4s cubic-bezier(.2,.9,.25,1) both;overflow:hidden}' +
    '@keyframes asbIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}' +
    '.asb-head{display:flex;align-items:center;gap:12px;margin-bottom:10px}' +
    '.asb-mark{flex:0 0 auto;width:42px;height:42px;border-radius:12px;display:grid;place-items:center;' +
    'background:linear-gradient(160deg,#0A3A2E,#062B22);border:1px solid rgba(52,211,153,.35)}' +
    '.asb-title{font-size:16px;font-weight:800;line-height:1.2}' +
    '.asb-sub{font-size:12.5px;color:#9ED9C0;margin-top:2px}' +
    '.asb-list{margin:8px 0 12px;padding:0;list-style:none;display:grid;gap:6px}' +
    '.asb-list li{display:flex;gap:8px;align-items:flex-start;font-size:13px;color:#CFEFE2}' +
    '.asb-list svg{flex:0 0 auto;margin-top:2px}' +
    '.asb-btn{display:flex;width:100%;align-items:center;justify-content:center;gap:8px;padding:13px 14px;border-radius:13px;' +
    'border:0;cursor:pointer;font-size:15px;font-weight:800;color:#04241B;text-decoration:none;' +
    'background:linear-gradient(95deg,#10B981,#2DD4BF);box-shadow:0 6px 18px rgba(16,185,129,.35)}' +
    '.asb-btn:active{transform:scale(.97)}' +
    '.asb-ghost{display:block;width:100%;margin-top:8px;padding:10px;border-radius:12px;background:rgba(236,253,245,.06);' +
    'border:1px solid rgba(236,253,245,.14);color:#BFE8D8;font-size:13.5px;font-weight:600;cursor:pointer}' +
    '.asb-status{margin-top:8px;font-size:12.5px;color:#FCD34D;min-height:14px}' +
    '.asb-scroll::-webkit-scrollbar{width:8px}.asb-scroll::-webkit-scrollbar-track{background:#062B22}' +
    '.asb-scroll::-webkit-scrollbar-thumb{background:#10B981;border-radius:8px}' +
    '@media (prefers-reduced-motion:reduce){.asb-card{animation:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var MARK = '<svg width="26" height="26" viewBox="0 0 108 108" aria-hidden="true">' +
    '<path fill="#34D399" d="M38 48 L56 82 L22 82 Z"/><path fill="#10B981" d="M54 28 L84 82 L24 82 Z"/>' +
    '<path fill="#ECFDF5" d="M54 28 L62 42 L58 40 L54 44 L50 40 L46 42 Z"/></svg>';
  var TICK = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M20 6L9 17l-5-5" stroke="#2DD4BF" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var DL = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v12m0 0l-5-5m5 5l5-5M4 21h16" stroke="#04241B" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  function el(html) { var d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  function dismissed() {
    try { var t = +localStorage.getItem(KEY) || 0; return t > 1e12 && Date.now() - t < 7 * 864e5; } catch (e) { return false; }
  }

  function buildCard() {
    var lect = /[?&]lecturer=1/.test(location.search);
    var card = el('<section class="asb-card" aria-label="Install Academic Summit">' +
      '<div class="asb-head"><span class="asb-mark">' + MARK + '</span><div>' +
      '<div class="asb-title">Get the Academic Summit app</div>' +
      '<div class="asb-sub">Android \u00b7 ' + (lect ? 'for lecturers and students' : 'faster and more accurate') + '</div></div></div>' +
      '<ul class="asb-list">' +
      '<li>' + TICK + ' Native camera for QR attendance</li>' +
      '<li>' + TICK + ' Precise location for the attendance range check</li>' +
      '<li>' + TICK + ' Same account and records as the website</li></ul>' +
      '<a class="asb-btn" id="asb-dl" href="' + APK + '" download="academic-summit.apk">' + DL + ' Download for Android</a>' +
      '<button class="asb-ghost" type="button" id="asb-ghost">Not now</button>' +
      '<div class="asb-status" role="status" aria-live="polite"></div></section>');
    card.querySelector('#asb-dl').addEventListener('click', function () {
      card.querySelector('.asb-status').textContent = 'Downloading. When it finishes, open the file and allow the install.';
    });
    card.querySelector('#asb-ghost').addEventListener('click', function () {
      try { localStorage.setItem(KEY, String(Date.now())); } catch (e) {}
      card.style.display = 'none';
    });
    return card;
  }

  function hideOld() {
    var found = [], nodes = document.querySelectorAll('button, a');
    for (var i = 0; i < nodes.length; i++) {
      var t = (nodes[i].textContent || '').trim();
      if (nodes[i].closest('.asb-card')) continue;
      if (/^Install Academic Summit$/i.test(t) || /^Install the app$/i.test(t)) {
        var c = nodes[i].closest('section') || nodes[i].parentElement.parentElement;
        if (c && c.parentNode) { c.style.display = 'none'; c.setAttribute('data-asb-hidden', '1'); found.push(c); }
      }
    }
    return found;
  }

  function ensure() {
    var olds = hideOld();
    if (NAT || dismissed() || document.querySelector('.asb-card')) return;
    var card = buildCard();
    if (olds.length) { olds[0].parentNode.insertBefore(card, olds[0]); return; }
    var host = document.querySelector('#app, #root, main');
    if (host && host.parentNode) host.parentNode.insertBefore(card, host);
    else document.body.insertBefore(card, document.body.firstChild);
  }

  var timer = null;
  new MutationObserver(function () {
    if (timer) return;
    timer = setTimeout(function () { timer = null; ensure(); }, 200);
  }).observe(document.body, { childList: true, subtree: true });

  if (document.readyState !== 'loading') ensure();
  else document.addEventListener('DOMContentLoaded', ensure);
})();
