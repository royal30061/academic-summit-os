/* Student Profile page (profilehub.js): routing from the avatar, grouping, every old action still reachable, extras kept under "More". */
const L = require('./lib');
const FIXTURE = '<div class="space-y-5 max-w-2xl mx-auto"><div class="grad">MM</div>' +
  '<div class="card p-5 space-y-2"><div class="lbl">Account</div><button onclick="openInfoSheet()">Personal Information</button><button onclick="openEditSheet()">Update Profile</button><button onclick="openNotifSheet()">Notifications</button><button onclick="exportData()">Download Backup</button></div>' +
  '<div class="card p-5 space-y-2"><div class="lbl">Appearance</div><select onchange="setThemeMode(this.value)"><option>light</option></select></div>' +
  '<div class="card p-5 space-y-2" data-hhpref="1"><div class="lbl">Dashboard style</div><div class="flex"><span>Home dashboard</span><select id="hh-mode" onchange="hhSet(this.value)"><option>new</option></select></div></div>' +
  '<div class="card p-5 space-y-2"><div class="lbl">Other</div><button onclick="openSupport()">Support</button><button onclick="openPolicy()">Privacy Policy</button><button onclick="openFaq()">FAQ</button></div>' +
  '<div class="card p-5 space-y-2"><div class="lbl">App</div><button class="btn w-full" onclick="installApp()">Download Academic Summit App</button></div>' +
  '<button onclick="logout()">Logout</button></div>' +
  '<div class="card p-5"><div class="font-extrabold">Study engine</div><button class="btn w-full" onclick="asStudy()">Open the Study engine</button><div>Your data</div><button onclick="asExport()">Download my data</button></div>';
module.exports = async function () {
  const T = (l, v) => L.check(l, !!v);
  const mk = o => {
    o = o || {};
    const ctx = { U: { name: 'Miracle MOSES', role: o.role || 'student', profile: { uni: 'University of Abuja', level: '200' } }, email: 'm@x.com', themeMode: 'dark', calls: [], toasts: [], view: 'home',
      showToast(m) { ctx.toasts.push(m); }, setTimeout: f => f(), document: { getElementById: () => null, createElement: () => ({}), head: { appendChild() {} } }, location: { host: 'academic-summit.com.ng' },
      Capacitor: o.native ? { isNativePlatform: () => true } : undefined,
      V: { prof: () => o.legacy === undefined ? FIXTURE : o.legacy, aprof: () => 'OLD ACADEMIC PROFILE (CGPA)' }, main: '',
      go: v => { ctx.calls.push('go:' + v); ctx.view = v; ctx.main = ctx.V[v] ? ctx.V[v]() : 'HOME'; } };
    ['openInfoSheet', 'openEditSheet', 'openNotifSheet', 'exportData', 'openSupport', 'openPolicy', 'openFaq', 'installApp', 'logout', 'asExport', 'adminLoadLecturers', 'setThemeMode'].forEach(n => { ctx[n] = (a) => ctx.calls.push(n + (a !== undefined ? ':' + a : '')); });
    if (o.admin) ctx.isAdmin = () => true;
    ctx.window = ctx; L.vm.createContext(ctx); L.vm.runInContext('var W=window;' + L.read('profilehub.js'), ctx); return ctx;
  };
  let c = mk(); c.go('aprof');
  T('student: tapping the avatar (go aprof) opens the new Profile page', c.view === 'phub' && /Student profile/.test(c.main));
  T('header card shows name, role, university and level', /Miracle MOSES/.test(c.main) && /University of Abuja \/ 200 level/.test(c.main));
  T('three groups in the right order', c.main.indexOf('>Profile<') < c.main.indexOf('>Preferences<') && c.main.indexOf('>Preferences<') < c.main.indexOf('Privacy &amp; support'));
  ['Personal information', 'Academic information', 'Academic record', 'Appearance', 'Notifications', 'Privacy &amp; security', 'Help &amp; support', 'About Academic Summit', 'Sign out'].forEach(t => T('row present: ' + t.replace('&amp;', '&'), c.main.includes('>' + t + '<')));
  T('admin row hidden for ordinary students, "More" hidden when nothing unknown exists', !/Admin panel/.test(c.main) && !/More settings/.test(c.main));
  c.calls.length = 0; c.phDo('personal'); c.phDo('academic'); c.phDo('notifications');
  T('Personal / Academic / Notifications rows open the same sheets the old buttons did', c.calls.join() === 'openInfoSheet,openEditSheet,openNotifSheet');
  c.calls.length = 0; c.phDo('record'); T('Academic record opens the old CGPA page (not redirected back to the hub)', c.view === 'aprof' && /OLD ACADEMIC PROFILE/.test(c.main));
  c.go('aprof'); T('...and tapping the avatar again returns to the hub', c.view === 'phub');
  c.go('prof'); T('the old "Edit profile" route (go prof) also lands on the hub for students', c.view === 'phub');
  c.phDo('appearance'); T('Appearance page: theme control and the old Dashboard style card are kept', /Appearance/.test(c.main) && /phTheme/.test(c.main) && /Home dashboard/.test(c.main) && /hh-mode/.test(c.main));
  c.calls.length = 0; c.phTheme('light'); T('theme change calls the existing setThemeMode', c.calls.includes('setThemeMode:light'));
  c.phBack(); T('back returns to the Profile page', /Student profile/.test(c.main));
  c.phDo('privacy'); T('Privacy page lists policy, data download and backup', /Privacy policy/.test(c.main) && /Download my data/.test(c.main) && /Download backup/.test(c.main));
  c.calls.length = 0; c.phDo('data'); c.phDo('backup'); c.phDo('policy'); T('...and each one calls the existing function', c.calls.join() === 'asExport,exportData,openPolicy');
  c.phBack(); c.phDo('help'); c.calls.length = 0; c.phDo('support'); c.phDo('faq'); T('Help page: support and FAQ open the existing sheets', c.calls.join() === 'openSupport,openFaq');
  c.phBack(); c.phDo('about'); T('About page: platform line, policy, and Install on the web', /Web app/.test(c.main) && /Privacy policy/.test(c.main) && /Install the app/.test(c.main));
  const n = mk({ native: true }); n.go('aprof'); n.phDo('about'); T('in the Android app there is no "Install the app" row', /Android app/.test(n.main) && !/Install the app/.test(n.main));
  c.phBack(); c.calls.length = 0; c.phDo('signout'); T('Sign out calls the existing logout', c.calls.includes('logout'));
  T('"Study engine" and "Open Admin Panel" buttons from the old page are not duplicated as rows', !/Study engine/.test(c.main));
  const a = mk({ admin: true }); a.go('aprof'); a.calls.length = 0; T('admin sees an Admin panel row that opens the existing panel', /Admin panel/.test(a.main) && (a.phDo('admin'), a.calls.includes('adminLoadLecturers')));
  const withExtra = mk({ legacy: FIXTURE + '<div class="card"><button onclick="backupToDrive()">Back up to Drive</button><button onclick="openFaq()">FAQ</button></div>' }); withExtra.go('aprof');
  T('an unknown old button is kept: a "More settings" row appears', /More settings/.test(withExtra.main) && /1 more option/.test(withExtra.main));
  withExtra.phDo('more'); T('...the More page lists it', /Back up to Drive/.test(withExtra.main));
  withExtra.backupToDrive = () => withExtra.calls.push('backupToDrive'); withExtra.calls.length = 0; withExtra.phDo('x0'); T('...and tapping it runs the original action', withExtra.calls.includes('backupToDrive'));
  const lec = mk({ role: 'lecturer' }); lec.go('prof'); T('lecturers are not redirected: their settings screen is unchanged', lec.view === 'prof');
  const broken = mk({ legacy: undefined }); broken.V.prof = () => { throw new Error('boom'); }; broken.go('aprof'); T('if the old page cannot be read the hub still opens', /Student profile/.test(broken.main));
  T('the card extractor takes the whole Dashboard style card and nothing else', (() => { const x = c.__asProfileHubTest.cardWith(FIXTURE, 'data-hhpref'); return x.startsWith('<div class="card p-5 space-y-2" data-hhpref="1">') && x.endsWith('</div>') && !/Support/.test(x) && /hh-mode/.test(x); })());
  T('no emoji in profilehub.js', !/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(L.read('profilehub.js')));
};
