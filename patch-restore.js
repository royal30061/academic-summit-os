const fs = require('fs');
var log = [];
function patch(file, tag, oldS, newS) {
  var s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(newS) !== -1) { log.push('SKIP  ' + tag + ' (already applied)'); return; }
  if (s.indexOf(oldS) === -1) { log.push('FAIL  ' + tag + ' (anchor not found in ' + file + ')'); return; }
  fs.writeFileSync(file, s.split(oldS).join(newS));
  log.push('OK    ' + tag);
}
/* P1: student recovery becomes code-based, matching your {{ .Token }} template */
patch('auth.js', 'P1a wording',
  `authCard('Reset Password', 'Enter your account email and we will send you a reset link.',`,
  `authCard('Reset Password', 'Enter your account email and we will send you a reset code.',`);
patch('auth.js', 'P1b button label',
  `onclick="doForgot()">Send Reset Link</button>' +`,
  `onclick="doForgot()">Send Reset Code</button>' +`);
patch('auth.js', 'P1c drop redirectTo',
  `var resetMail = function (em) { return sb.auth.resetPasswordForEmail(em, { redirectTo: location.origin + location.pathname }); };`,
  `var resetMail = function (em) { return sb.auth.resetPasswordForEmail(em); };`);
patch('auth.js', 'P1d advance to code screen',
  `  forgotUI('If that email has an account, a reset link is on its way. Check your inbox and spam folder.', false);`,
  `  forgotCodeUI('Code sent. Check your inbox and spam folder.', false);`);
patch('auth.js', 'P1e code entry + verifyOtp(recovery) + updateUser',
  `W.resendForgot = function () {`,
  `W.forgotCodeUI = function (msg, bad) {
  authCard('Enter your code', 'We sent a 6-digit code to ' + esc(last.forgot) + '.',
    '<div class="space-y-3"><input id="f-code" inputmode="numeric" maxlength="10" class="inp font-mono" placeholder="Code">' +
    '<input id="f-p1" type="password" class="inp" placeholder="New password (8+ characters)">' +
    '<input id="f-p2" type="password" class="inp" placeholder="Repeat new password">' +
    '<button class="btn w-full py-3" onclick="forgotCodeGo(this)">Reset password</button>' +
    '<button class="btn2 w-full" onclick="resendForgot()">Resend code</button>' +
    link('Back to login', "authUI('login')") + '</div>', msg, bad);
};
W.forgotCodeGo = async function (b) {
  var c = val('f-code'), p1 = ($('f-p1') || {}).value || '', p2 = ($('f-p2') || {}).value || '';
  if (!c) return forgotCodeUI('Enter the code from your email.', true);
  if (p1.length < 8) return forgotCodeUI('Use at least 8 characters.', true);
  if (p1 !== p2) return forgotCodeUI('Passwords do not match.', true);
  busy(b, true);
  var v = await sb.auth.verifyOtp({ email: last.forgot, token: c, type: 'recovery' });
  if (v.error) { busy(b, false); return forgotCodeUI('Wrong or expired code. Tap Resend code if needed.', true); }
  var u = await sb.auth.updateUser({ password: p1 });
  if (u.error) { busy(b, false); return forgotCodeUI(u.error.message, true); }
  showToast('Password changed.');
  after();
};
W.resendForgot = function () {`);
/* P2: card padding heal. :where() = zero specificity, so it can NEVER override a real
   padding utility; it only fills the void where padding is missing (your disjointed text). */
var css = fs.readFileSync('as-theme.css', 'utf8');
if (css.indexOf('as-pad-fix') === -1) {
  fs.appendFileSync('as-theme.css',
    '\n/* as-pad-fix: keep card breathing room even when padding utilities are absent */\n' +
    ':where(.card){padding:14px 16px}\n' +
    ':where(.card) .flex.justify-between{flex-wrap:wrap;column-gap:10px}\n');
  log.push('OK    P2 card padding heal');
} else log.push('SKIP  P2 card padding heal (already applied)');
/* P3: bump cache versions so the PWA service worker refetches changed assets */
var idx = fs.readFileSync('index.html', 'utf8');
var bumped = idx.replace(/(auth\.js\?v=)(\d+)/g, function (m, a, b) { return a + (Number(b) + 1); })
                .replace(/(as-theme\.css\?v=)(\d+)/g, function (m, a, b) { return a + (Number(b) + 1); });
if (bumped !== idx) { fs.writeFileSync('index.html', bumped); log.push('OK    P3 cache-bump'); }
else log.push('FAIL  P3 cache-bump (tags not found)');
console.log(log.join('\n'));
