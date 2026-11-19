/* Academic Summit - user-facing polish: plain language, welcome gate, help sheet,
   one-account-per-phone guard, lecturer routing, no install prompts inside the app. */
(function () {
  if (window.__asUserFace) return; window.__asUserFace = '1';
  var MAX_PER_DEVICE = 1;            // accounts one phone may create per 24 hours
  var APK = '/academic-summit.apk';
  var NAT = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var STANDALONE = false;
  try { STANDALONE = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) {}
  var isLect = /[?&]lecturer=1/.test(location.search);

  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function txt(n) { return (n.textContent || '').replace(/\s+/g, ' ').trim(); }
  function visible(el) { return !!(el.offsetWidth || el.offsetHeight || (el.getClientRects && el.getClientRects().length)); }

  /* ---- lecturer routing: the one APK serves both roles ---- */
  if (isLect) put('as_role', 'lecturer');
  if (NAT && !isLect && get('as_role') === 'lecturer') {
    var did = false; try { did = sessionStorage.getItem('as_redir') === '1'; } catch (e) {}
    if (!did) { try { sessionStorage.setItem('as_redir', '1'); } catch (e) {} location.replace(location.pathname + '?lecturer=1'); return; }
  }

  /* ---- styles ---- */
  var css = '' +
    '#asw-gate{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;' +
    'background:radial-gradient(120% 80% at 50% 0%,#0B3A2D 0%,#031812 70%);color:#E9FBF3;font-family:inherit}' +
    '#asw-gate .w{width:100%;max-width:380px;text-align:center}' +
    '#asw-gate h1{font-size:28px;font-weight:800;margin:14px 0 6px}' +
    '#asw-gate p{font-size:15px;color:#9ED9C0;margin:0 0 28px;line-height:1.4}' +
    '#asw-gate button{display:block;width:100%;padding:15px;border-radius:14px;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit;margin-top:12px}' +
    '#asw-gate .p{border:0;color:#04241B;background:linear-gradient(95deg,#10B981,#2DD4BF);box-shadow:0 8px 22px rgba(16,185,129,.35)}' +
    '#asw-gate .s{background:transparent;color:#E9FBF3;border:1.5px solid rgba(45,212,191,.55)}' +
    '#asw-gate .l{display:inline-block;margin-top:26px;font-size:13.5px;color:#7FD4B4;text-decoration:underline;cursor:pointer}' +
    '#asw-help{position:fixed;right:18px;bottom:calc(22px + env(safe-area-inset-bottom,0px));z-index:2147483001;width:54px;height:54px;border-radius:50%;' +
    'border:0;font-size:26px;font-weight:800;color:#04241B;cursor:pointer;background:linear-gradient(135deg,#10B981,#2DD4BF);' +
    'animation:aswPulse 1.8s ease-in-out infinite}' +
    '@keyframes aswPulse{0%,100%{box-shadow:0 0 0 0 rgba(45,212,191,.55),0 6px 18px rgba(16,185,129,.4)}50%{box-shadow:0 0 0 14px rgba(45,212,191,0),0 6px 22px rgba(45,212,191,.6)}}' +
    '#asw-sheet{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483002;background:rgba(2,12,9,.6);display:flex;align-items:flex-end}' +
    '#asw-sheet .c{width:100%;max-height:82vh;overflow:auto;padding:22px 20px calc(22px + env(safe-area-inset-bottom,0px));border-radius:22px 22px 0 0;' +
    'background:#06281F;color:#E9FBF3;font:15px/1.5 system-ui,sans-serif;border-top:1px solid rgba(45,212,191,.35)}' +
    '#asw-sheet h2{font-size:19px;margin:0 0 12px}#asw-sheet ol{padding-left:20px;margin:0 0 16px}#asw-sheet li{margin:0 0 10px}' +
    '#asw-sheet b{color:#6EE7B7}#asw-sheet button{width:100%;padding:13px;border:0;border-radius:13px;font-weight:800;font-size:15px;' +
    'color:#04241B;background:linear-gradient(95deg,#10B981,#2DD4BF);cursor:pointer}' +
    '#asw-toast{position:fixed;left:14px;right:14px;bottom:calc(90px + env(safe-area-inset-bottom,0px));z-index:2147483003;padding:14px;border-radius:14px;' +
    'background:#111827;color:#E5E7EB;font:14px/1.4 system-ui,sans-serif;border:1px solid #374151;box-shadow:0 10px 30px rgba(0,0,0,.5)}' +
    '#asw-toast a{color:#6EE7B7;font-weight:800;text-decoration:underline;margin-left:6px;cursor:pointer}' +
    '@media (prefers-reduced-motion:reduce){#asw-help{animation:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var MARK = '<svg width="56" height="56" viewBox="0 0 108 108" aria-hidden="true"><path fill="#34D399" d="M38 48 L56 82 L22 82 Z"/>' +
    '<path fill="#10B981" d="M54 28 L84 82 L24 82 Z"/><path fill="#ECFDF5" d="M54 28 L62 42 L58 40 L54 44 L50 40 L46 42 Z"/></svg>';

  /* ---- plain-language clean-up (hide only / reword; nothing is removed from the page) ---- */
  function hideBlock(n, limit) {
    var c = n, hops = 0;
    while (hops < 4 && c.parentElement && !/^(BODY|HTML|MAIN)$/.test(c.parentElement.tagName) && txt(c.parentElement).length <= limit && !/^(auth|app)$/.test(c.parentElement.id) && !c.parentElement.querySelector('input:not([type=checkbox]):not([type=radio]),textarea,select')) { c = c.parentElement; hops++; }
    if (!c.hasAttribute('data-asu-hide')) { c.setAttribute('data-asu-hide', '1'); c.style.display = 'none'; }
  }
  function cleanup() {
    try {
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
      while ((n = w.nextNode())) {
        var p = n.parentElement; if (!p || /^(SCRIPT|STYLE)$/.test(p.tagName) || p.closest('#asw-gate,#asw-sheet,#asw-toast')) continue;
        var t = n.nodeValue.replace(/\s+/g, ' ').trim(); if (!t || t.length > 60) continue;
        if (/^Student Operating System$/i.test(t)) n.nodeValue = 'Your student companion';
        else if (/^What you will need$/i.test(t)) hideBlock(p, 500);
        else if (/^Dashboard style$/i.test(t)) hideBlock(p, 260);
        else if (/^System check:/i.test(t)) hideBlock(p, 60);
        else if (/^(Install the app|Install Academic Summit)$/i.test(t) && (NAT || STANDALONE)) hideBlock(p, 160);
        else if (/^Download Academic Summit App$/i.test(t) && (NAT || STANDALONE)) hideBlock(p, 200);
      }
    } catch (e) {}
  }

  /* ---- finding the app's own sign-in controls ---- */
  function btnByText(re) {
    var els = document.querySelectorAll('button,a,[role=button],input[type=submit]');
    for (var i = 0; i < els.length; i++) {
      var e = els[i]; if (e.closest('#asw-gate,#asw-sheet,#asw-toast')) continue;
      if (re.test(txt(e) || e.value || '') && visible(e)) return e;
    }
    return null;
  }
  function signupMode() { return !!btnByText(/^create account$/i); }
  function setMode(want) {
    try {
      var isSignup = signupMode();
      if (want === 'login' && isSignup) { var a = btnByText(/have an account\??\s*log ?in/i); if (a) a.click(); }
      else if (want === 'signup' && !isSignup) { var b = btnByText(/^(new here|need an account|no account|don.?t have an account|create (an )?account|sign ?up|register)/i); if (b) b.click(); }
    } catch (e) {}
  }
  function authVisible() {
    var pw = document.querySelector('input[type="password"]');
    if (!pw || !visible(pw)) return false;
    var t = document.body.innerText || '';
    return !(/\bFinance\b/.test(t) && /\bAttend\b/.test(t));
  }

  /* ---- welcome gate: two buttons ---- */
  var gateDone = false;
  function showGate() {
    if (document.getElementById('asw-gate')) return;
    var g = document.createElement('div'); g.id = 'asw-gate';
    g.innerHTML = '<div class="w">' + MARK + '<h1>Academic Summit</h1>' +
      '<p>' + (isLect ? 'Lecturer sign in' : 'Your attendance, results and study space in one place.') + '</p>' +
      '<button class="p" data-a="login">Log in</button><button class="s" data-a="signup">Create account</button>' +
      '<a class="l" data-a="role">' + (isLect ? 'Student? Go to student sign in' : 'Lecturer? Sign in here') + '</a></div>';
    g.addEventListener('click', function (e) {
      var a = e.target.closest('[data-a]'); if (!a) return; var k = a.getAttribute('data-a');
      if (k === 'role') {
        if (isLect) { put('as_role', 'student'); location.href = location.pathname; }
        else { put('as_role', 'lecturer'); location.href = location.pathname + '?lecturer=1'; }
        return;
      }
      gateDone = true; g.remove(); setTimeout(function () { setMode(k); }, 60);
    });
    document.body.appendChild(g);
  }

  /* ---- glowing ? with the sign-up guide in everyday language ---- */
  function showHelp() {
    if (document.getElementById('asw-help')) return;
    var b = document.createElement('button'); b.id = 'asw-help'; b.type = 'button'; b.setAttribute('aria-label', 'How to sign up'); b.textContent = '?';
    b.addEventListener('click', openSheet); document.body.appendChild(b);
  }
  function openSheet() {
    if (document.getElementById('asw-sheet')) return;
    var s = document.createElement('div'); s.id = 'asw-sheet';
    s.innerHTML = '<div class="c"><h2>How to create your account</h2><ol>' +
      '<li>Tap <b>Create account</b>, then enter your full name, your email and a password of at least 6 characters.</li>' +
      '<li>Enter your <b>matric number</b>. In 100 level and don\u2019t have one yet? Use your JAMB number for now.</li>' +
      '<li>After you sign up, add your <b>course registration</b> (a screenshot or a list works). This keeps your attendance and class notices matched to your courses.</li>' +
      '<li>If you are asked to confirm your email, open the message we send you, tap the link, then log in.</li>' +
      '<li>Sign up <b>once</b> on your phone. Next time, just tap <b>Log in</b>.</li></ol>' +
      '<p style="margin:0 0 16px;color:#9ED9C0">Once your account is ready, I\u2019ll be right here in the <b>?</b> button. Tap it any time and I\u2019ll show you around. \u2014 Zuma</p>' +
      '<button type="button">Got it</button></div>';
    s.addEventListener('click', function (e) { if (e.target === s || e.target.tagName === 'BUTTON') s.remove(); });
    document.body.appendChild(s);
  }

  /* ---- one account per phone (protects the daily email allowance) ---- */
  function recent() {
    var a = []; try { a = JSON.parse(get('asw_signups') || '[]'); } catch (e) {}
    var now = Date.now(); return a.filter(function (t) { return now - t < 864e5; });
  }
  function toast(html) {
    var o = document.getElementById('asw-toast'); if (o) o.remove();
    var t = document.createElement('div'); t.id = 'asw-toast'; t.innerHTML = html; document.body.appendChild(t);
    setTimeout(function () { if (t.parentNode) t.remove(); }, 9000);
    var l = t.querySelector('a'); if (l) l.addEventListener('click', function () { t.remove(); setMode('login'); });
  }
  var watching = false;
  function guardSignup(e) {
    var pw = document.querySelector('input[type="password"]'), mail = false;
    var ins = document.querySelectorAll('input');
    for (var i = 0; i < ins.length; i++) if (/@/.test(ins[i].value || '')) mail = true;
    if (!pw || (pw.value || '').length < 6 || !mail) return;      // let the app show its own validation
    if (recent().length >= MAX_PER_DEVICE) {
      e.preventDefault(); e.stopImmediatePropagation();
      toast('An account was already created on this phone today. Please log in instead.<a>Log in</a>');
      return;
    }
    if (watching) return; watching = true;
    var started = Date.now(), iv = setInterval(function () {
      var gone = !btnByText(/^create account$/i);
      var conf = /check your (e-?mail|inbox)|confirm(ation)? (link|email)|verify your email/i.test(document.body.innerText || '');
      if (gone || conf) { clearInterval(iv); watching = false; var a = recent(); a.push(Date.now()); put('asw_signups', JSON.stringify(a)); }
      else if (Date.now() - started > 25000) { clearInterval(iv); watching = false; }
    }, 800);
  }
  function startDownload() {
    var a = document.createElement('a'); a.href = APK; a.download = 'academic-summit.apk'; document.body.appendChild(a); a.click(); a.remove();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button,[role=button],input[type=submit]');
    if (!b || b.closest('#asw-gate,#asw-sheet,#asw-toast')) return;
    var t = txt(b) || b.value || '';
    if (/^(Download Academic Summit App|Install Academic Summit|Install the app)$/i.test(t) && !NAT && !STANDALONE) { e.preventDefault(); e.stopImmediatePropagation(); startDownload(); return; }
    if (/^create account$/i.test(t)) guardSignup(e);
  }, true);
  document.addEventListener('submit', function (e) { if (signupMode()) guardSignup(e); }, true);

  /* ---- before sign-in, only the sign-up guide may appear; Zuma returns after login ---- */
  function hideAuth(el) { if (el.hasAttribute('data-asw-ah')) return; el.setAttribute('data-asw-ah', el.style.display || '-'); el.style.display = 'none'; }
  function restoreAuth() {
    var l = document.querySelectorAll('[data-asw-ah]');
    for (var i = 0; i < l.length; i++) { var v = l[i].getAttribute('data-asw-ah'); l[i].style.display = (v === '-') ? '' : v; l[i].removeAttribute('data-asw-ah'); }
  }
  function authClean() {
    try {
      var els = document.querySelectorAll('button,[role=button],a,div,span');
      for (var i = 0; i < els.length; i++) {
        var e = els[i]; if (e.closest('#asw-gate,#asw-help,#asw-sheet,#asw-toast')) continue;
        if (txt(e) === '?') { hideAuth(e); continue; }
        var al = e.getAttribute('aria-label') || e.title || '';
        if (/^(help|guide|zuma|ask zuma|open help|tour guide)/i.test(al) && (e.tagName === 'BUTTON' || e.getAttribute('role') === 'button')) hideAuth(e);
      }
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
      while ((n = w.nextNode())) {
        if (!/tour guide/i.test(n.nodeValue) || !n.parentElement || n.parentElement.closest('#asw-gate,#asw-help,#asw-sheet,#asw-toast')) continue;
        var c = n.parentElement, hops = 0;
        while (hops < 5 && c.parentElement && !/^(BODY|HTML|MAIN)$/.test(c.parentElement.tagName) && txt(c.parentElement).length <= 900 && !/^(auth|app)$/.test(c.parentElement.id) && !c.parentElement.querySelector('input:not([type=checkbox]):not([type=radio]),textarea,select')) { c = c.parentElement; hops++; }
        hideAuth(c);
      }
    } catch (e) {}
  }

  /* ---- keep everything in step as screens change ---- */
  function tick() {
    cleanup();
    var g = document.getElementById('asw-gate'), h = document.getElementById('asw-help');
    if (authVisible()) { if (!gateDone && !g) showGate(); showHelp(); authClean(); }
    else { gateDone = false; if (g) g.remove(); if (h) h.remove(); restoreAuth(); }
  }
  var tm = null;
  new MutationObserver(function () { if (tm) return; tm = setTimeout(function () { tm = null; tick(); }, 400); })
    .observe(document.body, { childList: true, subtree: true });
  if (document.readyState !== 'loading') tick(); else document.addEventListener('DOMContentLoaded', tick);
  setInterval(tick, 2500);
})();
