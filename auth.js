/* Academic Summit - auth.js (consolidation stage 4)
   Replaces the authUI / doLogin / doSignup / doForgot / forgotUI wrapper chain
   and the whole lecturer sign-in flow. Loaded LAST, so it also works as an
   on/off switch: remove the <script> tag and the old inline code still runs.
   Load order: academics.js -> ocr.js -> reps.js -> auth.js                    */
(function () {
  'use strict';
var MODULE_NAME = 'AUTH';
try {

  var W = window;
  var last = { login: '', signup: '', forgot: '' };      // remembered for the "resend" buttons
  var LA = { e: '', n: '' };                             // lecturer registration state

  var val = function (id) { return (($(id) || {}).value || '').trim(); };
  var errP = function (m) { return m ? '<p class="text-xs text-rose-500 text-center font-semibold bg-rose-500/10 py-2 rounded-lg">' + esc(m) + '</p>' : ''; };
  var shell = function (inner, narrow) {
    return '<div class="min-h-screen grid place-items-center p-5" style="background:#021812"><div class="card p-8 w-full ' + (narrow || 'max-w-md') + ' space-y-4 dark:bg-slate-900 shadow-2xl">' + inner + '</div></div>';
  };
  var link = function (label, fn) { return '<button class="text-xs text-slate-500 w-full hover:underline pt-2" onclick="' + fn + '">' + label + '</button>'; };

  /* ---------- student: login / signup / welcome ---------- */
  W.authUI = function (mode, msg) {
    hideSplash();
    if (LEC_LINK) return lecAuthOpen();
    msg = msg || '';
    if (mode === 'login' && !localStorage.getItem('as_welcomed')) mode = 'welcome';
    $('app').classList.add('hidden'); $('sheet').innerHTML = '';
    if (mode === 'welcome') {
      $('auth').innerHTML = '<div class="min-h-screen flex flex-col px-6 pt-10" style="background:#021812;padding-bottom:max(1.5rem,env(safe-area-inset-bottom))"><div class="flex-1 flex flex-col justify-center max-w-md w-full mx-auto space-y-4">' + MTN('w-20 h-20') +
        '<h1 class="text-4xl font-extrabold text-white leading-tight">Welcome to Academic Summit</h1><p class="text-base" style="color:#a7f3d0">Your one companion for your academic journey.</p></div>' +
        '<div class="max-w-md w-full mx-auto flex justify-end"><button class="btn px-8 py-3" onclick="localStorage.setItem(\'as_welcomed\',\'1\');authUI(\'login\')">Continue</button></div></div>';
      return;
    }
    var forms = {
      login: '<div class="space-y-3"><div><label class="lbl mb-1 block">Email</label><input id="a-email" type="email" class="inp" placeholder="user@uni.edu.ng" value="' + esc(last.login) + '"></div>' +
        '<div><label class="lbl mb-1 block">Password</label><input id="a-pass" type="password" class="inp" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"></div>' +
        '<button class="btn w-full py-3 mt-2" onclick="doLogin()">Enter Campus Portal</button>' + link('Forgot password?', 'forgotUI()') + link('New here? Create account', "authUI('signup')") + '</div>',
      signup: '<div class="space-y-3"><div><label class="lbl mb-1 block">Full Name</label><input id="a-name" class="inp" placeholder="Your full name"></div>' +
        '<div><label class="lbl mb-1 block">Email</label><input id="a-email" type="email" class="inp"></div>' +
        '<div><label class="lbl mb-1 block">Password</label><input id="a-pass" type="password" class="inp" placeholder="6+ characters"></div>' +
        '<button class="btn w-full py-3 mt-2" onclick="doSignup()">Create Account</button>' + link('Have an account? Log in', "authUI('login')") + '</div>'
    };
    var resend = mode === 'login' && /not confirmed/i.test(msg) ? '<button class="btn2 w-full" onclick="resendConfirmTo()">Resend confirmation email</button>' : '';
    $('auth').innerHTML = shell('<div class="text-center space-y-2"><div class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase tracking-wider">Academic Summit</div><h1 class="text-2xl font-extrabold">Student Operating System</h1></div>' +
      (forms[mode] || forms.login) + errP(msg) + resend);
  };
  function confirmScreen(em) {
    $('app').classList.add('hidden');
    $('auth').innerHTML = shell('<div class="text-center space-y-3">' + MTN('w-12 h-12 mx-auto') + '<div class="font-extrabold text-lg">Confirm your email</div>' +
      '<p class="text-xs text-slate-500">We sent a confirmation link to<br><b style="color:#34d399">' + esc(em) + '</b><br>Tap it, then come back and log in.</p></div>' +
      '<button class="btn w-full" onclick="resendConfirmTo()">Resend confirmation email</button><button class="btn2 w-full" onclick="authUI(\'login\')">I have confirmed - take me to login</button>' +
      '<p class="text-[11px] text-slate-500">Students normally enter without email verification. If you keep seeing this screen, write to support@academic-summit.com.ng.</p>');
  }
  W.resendConfirmTo = function (em) {
    em = (em || last.signup || last.login || val('a-email')).toLowerCase();
    if (!em) return showToast('Enter your email first', 'error');
    sb.auth.resend({ type: 'signup', email: em }).then(function (r) { r.error ? showToast(r.error.message, 'error') : showToast('Confirmation sent to ' + em); });
  };
  W.doLogin = async function () {
    var em = val('a-email').toLowerCase(), pw = ($('a-pass') || {}).value || '';
    last.login = em;
    if (!em || !pw) return authUI('login', 'Enter email and password.');
    var r = await sb.auth.signInWithPassword({ email: em, password: pw });
    if (r.error) return authUI('login', r.error.message);
    sb.from('profiles').update({ last_seen: new Date().toISOString() }).eq('id', r.data.user.id).then(function () {});
    boot(r.data.user);
  };
  W.doSignup = async function () {
    var name = val('a-name'), em = val('a-email').toLowerCase(), pw = ($('a-pass') || {}).value || '';
    last.signup = em;
    if (!name || !em || pw.length < 6) return authUI('signup', 'Complete all fields (password 6+ characters).');
    var r = await sb.auth.signUp({ email: em, password: pw, options: { data: { name: name }, emailRedirectTo: location.origin + location.pathname } });
    if (r.error) return authUI('signup', r.error.message);
    if (!r.data.session) return confirmScreen(em);
    boot(r.data.user);
  };

  /* ---------- student: forgot password ---------- */
  W.forgotUI = function (msg, bad) {
    var sent = msg && !bad;
    authCard('Reset Password', 'Enter your account email and we will send you a reset link.',
      '<div class="space-y-3"><input id="f-email" type="email" class="inp" placeholder="Email address" value="' + esc(last.forgot) + '"><button class="btn w-full py-3" onclick="doForgot()">Send Reset Link</button>' +
      (sent ? '<button class="btn2 w-full" onclick="resendForgot()">Resend reset link</button>' : '') + link('Back to login', "authUI('login')") + '</div>', msg, bad);
  };
  var resetMail = function (em) { return sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname }); };
  W.doForgot = async function () {
    var em = val('f-email').toLowerCase(); last.forgot = em;
    if (!em) return forgotUI('Enter your email.', true);
    var r = await resetMail(em);
    if (r.error) return forgotUI(r.error.message, true);
    forgotUI('If that email has an account, a reset link is on its way. Check your inbox and spam folder.', false);
  };
  W.resendForgot = function () {
    if (!last.forgot) return showToast('Enter your email first', 'error');
    resetMail(last.forgot).then(function (r) { r.error ? showToast(r.error.message, 'error') : showToast('Reset link sent again to ' + last.forgot); });
  };

  /* ---------- lecturer: login, 4-step registration, forgot ---------- */
  function lecCard(title, body) {
    $('sheet').innerHTML = '';
    $('app').classList.add('hidden');
    $('auth').innerHTML = '<div class="min-h-screen grid place-items-center p-5" style="background:#021812"><div class="card p-6 w-full max-w-md space-y-3"><div class="text-xs font-extrabold uppercase tracking-widest text-emerald-500">Lecturer console</div><h2 class="text-xl font-extrabold">' + title + '</h2>' + body + '</div></div>';
  }
  var busy = function (b, on) { if (b) { b.disabled = on; b.style.opacity = on ? 0.6 : 1; } };
  var say = function (m) { showToast(m, 'error'); };
  var after = function () { location.reload(); };        // boot() then routes: lecturer -> console, anyone else -> PIN gate
  var back = function (fn) { return '<button class="btn2 w-full" onclick="' + fn + '">Back</button>'; };

  W.lecAuthOpen = function () {
    lecCard('Lecturer console',
      '<input id="la-e" type="email" class="inp" placeholder="Email" value="' + esc(LA.e) + '"><input id="la-p" type="password" class="inp" placeholder="Password">' +
      '<button class="btn w-full" onclick="lecLogin(this)">Log in</button><button class="text-xs font-bold text-emerald-600" onclick="lecForgot()">Forgot password?</button>' +
      '<p class="text-center text-xs text-slate-500 pt-2">New lecturer?</p><button class="btn2 w-full" onclick="lecReg1()">Create account</button>');
  };
  W.lecLogin = async function (b) {
    var e = val('la-e').toLowerCase(), p = ($('la-p') || {}).value || ''; LA.e = e;
    if (!e || !p) return say('Enter your email and password');
    busy(b, true); var r = await sb.auth.signInWithPassword({ email: e, password: p }); busy(b, false);
    if (r.error) return say('Wrong email or password');
    after();
  };
  W.lecReg1 = function () {
    lecCard('Create lecturer account', '<p class="text-xs text-slate-500">Step 1 of 4. We email you a code once to confirm your address.</p>' +
      '<input id="lr-n" class="inp" placeholder="Full name" value="' + esc(LA.n) + '"><input id="lr-e" type="email" class="inp" placeholder="Email" value="' + esc(LA.e) + '">' +
      '<button class="btn w-full" onclick="lecReg1Go(this)">Send code</button>' + back('lecAuthOpen()'));
  };
  W.lecReg1Go = async function (b) {
    var n = val('lr-n'), e = val('lr-e').toLowerCase();
    if (!n || !e) return say('Enter your name and email');
    LA.e = e; LA.n = n; busy(b, true);
    var r = await sb.auth.signInWithOtp({ email: e, options: { shouldCreateUser: true, data: { name: n } } }); busy(b, false);
    if (r.error) return say(r.error.message);
    lecReg2();
  };
  W.lecReg2 = function () {
    lecCard('Enter your code', '<p class="text-xs text-slate-500">Step 2 of 4. Sent to ' + esc(LA.e) + '.</p><input id="lr-c" inputmode="numeric" maxlength="10" class="inp font-mono" placeholder="Code">' +
      '<button class="btn w-full" onclick="lecReg2Go(this)">Confirm</button>' + back('lecReg1()'));
  };
  W.lecReg2Go = async function (b) {
    var c = val('lr-c'); if (!c) return say('Enter the code');
    busy(b, true); var r = await sb.auth.verifyOtp({ email: LA.e, token: c, type: 'email' }); busy(b, false);
    if (r.error) return say('Wrong or expired code');
    lecPw();
  };
  W.lecPw = function () {
    lecCard('Create a password', '<p class="text-xs text-slate-500">Step 3 of 4. You will use this to log in from now on.</p>' +
      '<input id="lp-1" type="password" class="inp" placeholder="Password (8+ characters)"><input id="lp-2" type="password" class="inp" placeholder="Repeat password"><button class="btn w-full" onclick="lecPwGo(this)">Save password</button>');
  };
  W.lecPwGo = async function (b) {
    var a = ($('lp-1') || {}).value || '', c = ($('lp-2') || {}).value || '';
    if (a.length < 8) return say('Use at least 8 characters');
    if (a !== c) return say('Passwords do not match');
    busy(b, true); var r = await sb.auth.updateUser({ password: a }); busy(b, false);
    if (r.error) return say(r.error.message);
    after();                                            // step 4 (the PIN) is the existing pinGate()
  };
  W.lecForgot = function () {
    lecCard('Reset password', '<input id="lf-e" type="email" class="inp" placeholder="Email" value="' + esc(LA.e) + '"><button class="btn w-full" onclick="lecForgotGo(this)">Send code</button>' + back('lecAuthOpen()'));
  };
  W.lecForgotGo = async function (b) {
    var e = val('lf-e').toLowerCase(); if (!e) return say('Enter your email');
    LA.e = e; busy(b, true); var r = await sb.auth.resetPasswordForEmail(e); busy(b, false);
    if (r.error) return say(r.error.message);
    lecCard('New password', '<p class="text-xs text-slate-500">Enter the code we sent to ' + esc(e) + '.</p><input id="lf-c" inputmode="numeric" maxlength="10" class="inp font-mono" placeholder="Code">' +
      '<input id="lf-p" type="password" class="inp" placeholder="New password (8+ characters)"><button class="btn w-full" onclick="lecForgot2Go(this)">Reset password</button>');
  };
  W.lecForgot2Go = async function (b) {
    var c = val('lf-c'), p = ($('lf-p') || {}).value || '';
    if (!c || p.length < 8) return say('Enter the code and a password of 8+ characters');
    busy(b, true);
    var v = await sb.auth.verifyOtp({ email: LA.e, token: c, type: 'recovery' });
    if (v.error) { busy(b, false); return say('Wrong or expired code'); }
    var u = await sb.auth.updateUser({ password: p }); busy(b, false);
    if (u.error) return say(u.error.message);
    showToast('Password changed'); after();
  };
} catch (err) {
  console.error('[CIRCUIT BREAKER] ' + MODULE_NAME + ' failed to load:', err);
  try {
    (window._featureFailures = window._featureFailures || {})[MODULE_NAME] = { time: Date.now(), message: (err && err.message) || String(err) };
    if (window._cbNotify) window._cbNotify(MODULE_NAME);
  } catch (e) {}
  if (MODULE_NAME === 'CORE' || MODULE_NAME === 'AUTH') throw err;
}
})();
