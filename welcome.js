/* Academic Summit - welcome screen + Help sheet (small and self-contained).
   Never hides a parent that contains form fields. Touches nothing after sign-in. */
(function () {
  if (window.__asWelcome) return; window.__asWelcome = '2';
  var NAT = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
  var isLect = /[?&]lecturer=1/.test(location.search);
  function get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function put(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function txt(n) { return (n.textContent || '').replace(/\s+/g, ' ').trim(); }
  function visible(el) { return !!(el.offsetWidth || el.offsetHeight || (el.getClientRects && el.getClientRects().length)); }
  var OURS = '#asw-gate,#asw-help,#asw-sheet';

  /* lecturer choice is remembered, so the installed app reopens on the lecturer side */
  if (isLect) put('as_role', 'lecturer');
  if (NAT && !isLect && get('as_role') === 'lecturer') {
    var did = false; try { did = sessionStorage.getItem('as_redir') === '1'; } catch (e) {}
    if (!did) { try { sessionStorage.setItem('as_redir', '1'); } catch (e) {} location.replace(location.pathname + '?lecturer=1'); return; }
  }

  var css =
    '#asw-gate{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;padding:24px;' +
    'background:radial-gradient(120% 80% at 50% 0%,#0B3A2D 0%,#031812 70%);color:#E9FBF3;font-family:inherit}' +
    '#asw-gate .w{width:100%;max-width:380px;text-align:center}' +
    '#asw-gate h1{font-size:28px;font-weight:800;margin:14px 0 6px}' +
    '#asw-gate p{font-size:15px;color:#9ED9C0;margin:0 0 28px;line-height:1.4}' +
    '#asw-gate button{display:block;width:100%;padding:15px;border-radius:14px;font-size:16px;font-weight:800;cursor:pointer;font-family:inherit;margin-top:12px}' +
    '#asw-gate .p{border:0;color:#04241B;background:linear-gradient(95deg,#10B981,#2DD4BF);box-shadow:0 8px 22px rgba(16,185,129,.35)}' +
    '#asw-gate .s{background:transparent;color:#E9FBF3;border:1.5px solid rgba(45,212,191,.55)}' +
    '#asw-gate .l{display:inline-block;margin-top:26px;font-size:13.5px;color:#7FD4B4;text-decoration:underline;cursor:pointer}' +
    '#asw-help{position:fixed;right:16px;bottom:calc(24px + env(safe-area-inset-bottom,0px));z-index:2147483001;padding:13px 20px;border-radius:999px;' +
    'border:0;font:800 15px/1 system-ui,sans-serif;color:#04241B;cursor:pointer;background:linear-gradient(135deg,#10B981,#2DD4BF);animation:aswPulse 1.8s ease-in-out infinite}' +
    '@keyframes aswPulse{0%,100%{box-shadow:0 0 0 0 rgba(45,212,191,.55),0 6px 18px rgba(16,185,129,.4)}50%{box-shadow:0 0 0 12px rgba(45,212,191,0),0 6px 22px rgba(45,212,191,.6)}}' +
    '#asw-sheet{position:fixed;top:0;left:0;right:0;bottom:0;z-index:2147483002;background:rgba(2,12,9,.6);display:flex;align-items:flex-end}' +
    '#asw-sheet .c{width:100%;max-height:84vh;overflow:auto;padding:22px 20px calc(22px + env(safe-area-inset-bottom,0px));border-radius:22px 22px 0 0;' +
    'background:#06281F;color:#E9FBF3;font:15px/1.5 system-ui,sans-serif;border-top:1px solid rgba(45,212,191,.35)}' +
    '#asw-sheet h2{font-size:19px;margin:0 0 8px}#asw-sheet .n{margin:0 0 12px;color:#9ED9C0}' +
    '#asw-sheet ol{padding-left:20px;margin:0 0 14px}#asw-sheet li{margin:0 0 10px}#asw-sheet b{color:#6EE7B7}' +
    '#asw-sheet button{width:100%;padding:13px;border:0;border-radius:13px;font-weight:800;font-size:15px;color:#04241B;background:linear-gradient(95deg,#10B981,#2DD4BF);cursor:pointer}' +
    '@media (prefers-reduced-motion:reduce){#asw-help{animation:none}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var MARK = '<svg width="56" height="56" viewBox="0 0 108 108" aria-hidden="true"><path fill="#34D399" d="M38 48 L56 82 L22 82 Z"/>' +
    '<path fill="#10B981" d="M54 28 L84 82 L24 82 Z"/><path fill="#ECFDF5" d="M54 28 L62 42 L58 40 L54 44 L50 40 L46 42 Z"/></svg>';

  /* ---- the app's own sign-in controls ---- */
  function btnByText(re) {
    var els = document.querySelectorAll('button,a,[role=button]');
    for (var i = 0; i < els.length; i++) {
      var e = els[i]; if (e.closest(OURS)) continue;
      if (re.test(txt(e)) && visible(e)) return e;
    }
    return null;
  }
  function signupMode() { return !!btnByText(/^create account$/i); }
  function setMode(want) {
    try {
      var isSignup = signupMode();
      if (want === 'login' && isSignup) { var a = btnByText(/have an account\??\s*log ?in/i); if (a) a.click(); }
      else if (want === 'signup' && !isSignup) { var b = btnByText(/^(new here|need an account|create (an )?account|sign ?up)/i); if (b) b.click(); }
    } catch (e) {}
  }
  var t0 = Date.now(), lastAuth = 0;
  function navLoggedIn() { var t = document.body.innerText || ''; return /\bFinance\b/.test(t) && /\bAttend\b/.test(t); }
  function tokenIn() {
    try { for (var i = 0; i < localStorage.length; i++) { var k = localStorage.key(i); if (/^sb-.*-auth-token$/.test(k) && localStorage.getItem(k)) return true; } } catch (e) {}
    return false;
  }
  function pwVisible() { var pw = document.querySelector('input[type="password"]'); return !!(pw && visible(pw) && !pw.closest(OURS)); }
  function emailVisible() {
    var ins = document.querySelectorAll('input');
    for (var i = 0; i < ins.length; i++) {
      var e = ins[i], h = ((e.type || '') + ' ' + (e.name || '') + ' ' + (e.id || '') + ' ' + (e.placeholder || '')).toLowerCase();
      if (/email/.test(h) && visible(e)) return true;
    }
    return false;
  }
  function authVisible() {
    if (!pwVisible() || navLoggedIn()) return false;
    lastAuth = Date.now(); return true;
  }
  /* the password-reset screen has no password box, so keep the Help button for a short while after sign-in screens */
  function authContext() {
    if (authVisible()) return true;
    if (!lastAuth || Date.now() - lastAuth > 60000 || navLoggedIn() || tokenIn()) return false;
    return emailVisible();
  }
  /* wait for the app's own splash to finish before showing the welcome screen */
  function splashShowing() {
    if (Date.now() - t0 > 9000) return false;
    try {
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
      while ((n = w.nextNode())) {
        if (!/HIGHER GOALS, BIGGER FUTURE/i.test(n.nodeValue)) continue;
        var el = n.parentElement;
        for (var i = 0; el && i < 8; i++, el = el.parentElement) {
          var cs = getComputedStyle(el);
          if (cs.display === 'none' || cs.visibility === 'hidden' || parseFloat(cs.opacity) < 0.05) return false;
        }
        return true;
      }
    } catch (e) {}
    return false;
  }

  /* ---- hide ONLY the "What you will need" box; never climb into anything holding fields ---- */
  function hideNeedBox() {
    try {
      var w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
      while ((n = w.nextNode())) {
        if (!/^\s*What you will need\s*$/i.test(n.nodeValue)) continue;
        var c = n.parentElement, hops = 0;
        if (!c || c.closest(OURS)) continue;
        while (hops < 2 && c.parentElement) {
          var par = c.parentElement;
          if (par.querySelector('input,button,textarea,select,a')) break;
          if (par.id === 'auth' || par.id === 'app' || /^(BODY|HTML|MAIN)$/.test(par.tagName)) break;
          c = par; hops++;
        }
        if (!c.querySelector('input,button,textarea,select')) { c.setAttribute('data-asw-box', '1'); c.style.display = 'none'; }
      }
    } catch (e) {}
  }

  /* ---- the app's own round "?" (Zuma) stays out of the sign-in screens ---- */
  function hideZuma() {
    try {
      var els = document.querySelectorAll('button,[role=button],a,div');
      for (var i = 0; i < els.length; i++) {
        var e = els[i];
        if (e.closest(OURS) || e.hasAttribute('data-asw-ah')) continue;
        if (txt(e) === '?') { e.setAttribute('data-asw-ah', e.style.display || '-'); e.style.display = 'none'; }
      }
    } catch (e) {}
  }
  function restoreZuma() {
    var l = document.querySelectorAll('[data-asw-ah]');
    for (var i = 0; i < l.length; i++) { var v = l[i].getAttribute('data-asw-ah'); l[i].style.display = (v === '-') ? '' : v; l[i].removeAttribute('data-asw-ah'); }
  }

  /* ---- welcome gate ---- */
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

  /* ---- Help button and sheet ---- */
  function showHelp() {
    if (document.getElementById('asw-help')) return;
    var b = document.createElement('button'); b.id = 'asw-help'; b.type = 'button'; b.textContent = 'Help';
    b.addEventListener('click', openSheet); document.body.appendChild(b);
  }
  function helpMode() {
    if (document.getElementById('asw-gate')) return 'welcome';
    if (!pwVisible()) return 'reset';
    return signupMode() ? 'signup' : 'login';
  }
  var HELP = {
    welcome: '<h2>Welcome</h2><ol>' +
      '<li><b>Log in</b> if you already have an account.</li>' +
      '<li><b>Create account</b> if you are new. It takes about a minute.</li>' +
      '<li><b>Lecturer?</b> Tap \u201cLecturer? Sign in here\u201d. You will need the access PIN you were given.</li></ol>',
    login: '<h2>Logging in</h2><ol>' +
      '<li>Enter the email and password you used when you signed up.</li>' +
      '<li><b>Forgot your password?</b> Tap \u201cForgot password?\u201d under the button. We will email you a link to choose a new one.</li>' +
      '<li><b>No account yet?</b> Tap \u201cNew here? Create account\u201d.</li>' +
      '<li>Still stuck? Check your internet connection, and make sure there are no extra spaces in your email.</li></ol>',
    reset: '<h2>Resetting your password</h2><ol>' +
      '<li>Type the email you signed up with and tap the button.</li>' +
      '<li>Open your inbox (check spam too) and tap the link we send.</li>' +
      '<li>Choose a new password, then come back and <b>log in</b>.</li></ol>',
    signup: '<h2>Creating your account</h2>' +
      '<p class="n">This is a brand-new account. You do <b>not</b> need your school portal login. Just choose a new password.</p><ol>' +
      '<li>Enter your full name, your email and a new password of at least 6 characters.</li>' +
      '<li>Enter your <b>matric number</b>. In 100 level and don\u2019t have one yet? Use your JAMB number for now.</li>' +
      '<li>After you sign up, add your <b>course registration</b> (a screenshot or a list works). This keeps your attendance and class notices matched to your courses.</li>' +
      '<li>If you are asked to confirm your email, open the message we send you, tap the link, then log in.</li>' +
      '<li>Sign up <b>once</b> on your phone. Next time, just tap <b>Log in</b>.</li></ol>' +
      '<p class="n">Once you are in, I\u2019ll be in the <b>?</b> button. Tap it any time and I\u2019ll show you around. \u2014 Zuma</p>'
  };
  function openSheet() {
    if (document.getElementById('asw-sheet')) return;
    var s = document.createElement('div'); s.id = 'asw-sheet';
    s.innerHTML = '<div class="c">' + HELP[helpMode()] + '<button type="button">Got it</button></div>';
    s.addEventListener('click', function (e) { if (e.target === s || e.target.tagName === 'BUTTON') s.remove(); });
    document.body.appendChild(s);
  }

  /* ---- keep in step as screens change ---- */
  function tick() {
    var g = document.getElementById('asw-gate'), h = document.getElementById('asw-help');
    if (navLoggedIn() || tokenIn()) gateDone = false;
    var av = authVisible(), ctx = av || authContext();
    if (ctx) { hideNeedBox(); hideZuma(); showHelp(); }
    else { if (g) g.remove(); if (h) h.remove(); restoreZuma(); }
    if (av && !gateDone && !g && !tokenIn() && !splashShowing()) showGate();
    if (!av && g) g.remove();
  }
  var tm = null;
  new MutationObserver(function () { if (tm) return; tm = setTimeout(function () { tm = null; tick(); }, 120); })
    .observe(document.body, { childList: true, subtree: true });
  var fast = setInterval(tick, 120); setTimeout(function () { clearInterval(fast); }, 10000);
  setInterval(tick, 1500);
  if (document.readyState !== 'loading') tick(); else document.addEventListener('DOMContentLoaded', tick);
})();
