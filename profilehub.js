/* Academic Summit - profilehub.js v1  (student Profile page)
   Tapping the avatar (top right) opens ONE tidy Profile page instead of the long stacked settings screen:
     header card -> PROFILE (personal info, academic info, academic record) -> PREFERENCES (appearance, notifications)
     -> PRIVACY & SUPPORT (privacy and security, help and support, about) -> Sign out.
   Every existing action keeps working: each row opens the same sheet or screen the old buttons did. The old page is read once so that
   any extra button it contains (that this file does not know) is listed under "More" instead of being lost.
   Students only: lecturers keep their own settings screen. The old CGPA page (aprof) stays reachable from "Academic record". */
(function () {
'use strict';
var W = window;
if (W.__asProfileHub) return; W.__asProfileHub = '1';

var S = { page: null }, keep = false, legacy = (typeof V !== 'undefined' && V) ? V.prof : null, goB = W.go;
function E(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function toast(m, t) { try { showToast(m, t); } catch (e) {} }
function role() { try { return U && U.role; } catch (e) { return ''; } }
function admin() { try { return typeof isAdmin === 'function' && !!isAdmin(); } catch (e) { return false; } }
function native() { try { return !!(W.Capacitor && W.Capacitor.isNativePlatform && W.Capacitor.isNativePlatform()); } catch (e) { return false; } }
function G(v) { keep = true; try { return W.go.call(W, v); } finally { keep = false; } }
function repaint() { G('phub'); }
function call(fn, name) { if (typeof fn !== 'function') return toast('That is not available in this version of the app.', 'error'); try { return fn(); } catch (e) { toast('Could not open it: ' + (e && e.message || e), 'error'); } }

/* ---------- icons (inline SVG) ---------- */
var IC = {
  user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.8-3.6 3.6-5.4 7-5.4s6.2 1.8 7 5.4"/>',
  cap: '<path d="M2.5 9.5L12 5l9.5 4.5L12 14 2.5 9.5zM6.5 11.7V16c1.4 1.4 3.4 2.2 5.5 2.2s4.1-.8 5.5-2.2v-4.3M21.5 9.5V15"/>',
  record: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  palette: '<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.3 0 2-.8 2-1.7 0-1.3-1.2-1.6-1.2-2.8 0-1 .8-1.8 1.9-1.8H17a3.5 3.5 0 0 0 3.5-3.5C20.5 6.5 16.8 3.5 12 3.5z"/><circle cx="7.8" cy="11" r="1"/><circle cx="10.5" cy="7.6" r="1"/><circle cx="15" cy="8" r="1"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2zM10 20.5a2 2 0 0 0 4 0"/>',
  shield: '<path d="M12 3l7.5 2.8v5.6c0 4.6-3 8-7.5 9.6-4.5-1.6-7.5-5-7.5-9.6V5.8L12 3z"/><path d="M8.8 12.2l2.2 2.2 4.2-4.4"/>',
  help: '<path d="M4.5 13.5v-1.8a7.5 7.5 0 0 1 15 0v1.8"/><rect x="3.5" y="13" width="4" height="6" rx="1.6"/><rect x="16.5" y="13" width="4" height="6" rx="1.6"/><path d="M18.5 19c0 1.2-1.5 2-4 2"/>',
  info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 8v.01"/>',
  out: '<path d="M10 4.5H6.5A2 2 0 0 0 4.5 6.5v11a2 2 0 0 0 2 2H10M15 8l4 4-4 4M19 12H9.5"/>',
  admin: '<path d="M12 3l7.5 2.8v5.6c0 4.6-3 8-7.5 9.6-4.5-1.6-7.5-5-7.5-9.6V5.8L12 3z"/><circle cx="12" cy="11" r="2"/><path d="M12 13v3"/>',
  more: '<circle cx="6" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="18" cy="12" r="1.3"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  doc: '<path d="M7 3.5h7l4 4V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1zM14 3.5V8h4M9 12.5h6M9 16h6"/>',
  down: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2.5"/><path d="M4 7.5l8 6 8-6"/>',
  faq: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.6a2.5 2.5 0 1 1 3.4 2.3c-.7.3-1 .8-1 1.5M12 16.6v.01"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.6"/><path d="M11 18.5h2"/>',
  sun: '<circle cx="12" cy="12" r="3.6"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>'
};
function svg(n, c) { return '<svg class="' + (c || 'ph-i') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[n] || '') + '</svg>'; }

/* ---------- styles (own prefix; follows the app's colour variables in light and dark) ---------- */
(function () {
  if (document.getElementById('ph-css')) return;
  var st = document.createElement('style'); st.id = 'ph-css';
  st.textContent = [
    '.ph{font-family:"Plus Jakarta Sans",system-ui,sans-serif}',
    '.ph-i{width:22px;height:22px;flex:none}.ph-s{width:16px;height:16px;flex:none}',
    '.ph-card{border-radius:1.4rem;border:1px solid var(--bd);background:var(--card);box-shadow:var(--sh);overflow:hidden}',
    ':root:not(.dark) .ph-card{background:linear-gradient(180deg,#fff,#f0f3f6)}',
    'html.dark .ph-card{border-color:rgba(16,185,129,.2)}',
    '.ph-head{display:flex;align-items:center;gap:14px;padding:18px;width:100%;text-align:left}',
    '.ph-av{width:58px;height:58px;border-radius:50%;flex:none;display:grid;place-items:center;font-weight:800;font-size:1.15rem;letter-spacing:.02em;color:#059669;background:linear-gradient(135deg,rgba(16,185,129,.18),rgba(6,182,212,.14));border:1px solid rgba(16,185,129,.35)}',
    'html.dark .ph-av{color:#34d399}',
    '.ph-name{font-weight:800;font-size:1.12rem;letter-spacing:-.01em;color:var(--tx);line-height:1.2}',
    '.ph-sub{font-size:.8rem;color:var(--mut);margin-top:2px}',
    '.ph-link{font-size:.8rem;font-weight:700;color:#059669;margin-top:6px;display:inline-flex;align-items:center;gap:4px}',
    'html.dark .ph-link{color:#34d399}',
    '.ph-grp{font-family:"JetBrains Mono",ui-monospace,monospace;font-size:10px;letter-spacing:.16em;text-transform:uppercase;color:var(--mut);padding:16px 18px 6px}',
    '.ph-row{display:flex;align-items:center;gap:14px;width:100%;padding:13px 18px;text-align:left;border-top:1px solid var(--bd);-webkit-tap-highlight-color:transparent}',
    '.ph-row.first{border-top:0}',
    '.ph-row:active{background:rgba(16,185,129,.08)}',
    '.ph-ic{color:var(--mut);display:flex}',
    '.ph-t{font-weight:700;font-size:.96rem;color:var(--tx);line-height:1.25}',
    '.ph-d{font-size:.78rem;color:var(--mut);line-height:1.4;margin-top:1px}',
    '.ph-ch{color:var(--mut);margin-left:auto;display:flex}',
    '.ph-out .ph-t,.ph-out .ph-ic{color:#e11d48}',
    '.ph-back{display:inline-flex;align-items:center;gap:6px;color:var(--mut);font-weight:700;font-size:.8rem;padding:6px 10px 6px 4px}',
    '.ph-h1{font-weight:800;font-size:clamp(1.5rem,6vw,1.8rem);letter-spacing:-.02em;color:var(--tx);line-height:1.1}',
    '.ph-pad{padding:14px 18px}'
  ].join('\n');
  document.head.appendChild(st);
})();

/* ---------- reading the old settings page once, to find anything this file does not know about ---------- */
var KNOWN_H = /openInfoSheet|openEditSheet|openNotifSheet|exportData|openSupport|openPolicy|openFaq|installApp|logout\(|asExport|asStudy|adminLoadLecturers|setThemeMode|toggleTheme|go\(\\?['"](prof|aprof)\\?['"]\)/;
var KNOWN_L = /study engine|log ?out|sign out|download my data|open admin panel/i;
function legacyHtml() { try { return typeof legacy === 'function' ? String(legacy() || '') : ''; } catch (e) { return ''; } }
function plain(s) { return String(s).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim(); }
function extras(html) {
  var out = [], re = /<button[^>]*?onclick="([^"]*)"[^>]*>([\s\S]*?)<\/button>/gi, m;
  while ((m = re.exec(html))) {
    var h = m[1].replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&'), l = plain(m[2]);
    if (!l || l.length > 60 || KNOWN_H.test(h) || KNOWN_L.test(l)) continue;
    if (out.some(function (x) { return x.h === h; })) continue;
    out.push({ h: h, l: l });
  }
  return out;
}
/* pull one card out of the old page by a marker it contains (balanced <div>s) */
function cardWith(html, marker) {
  var i = html.indexOf(marker); if (i < 0) return '';
  var s = html.lastIndexOf('<div', i); if (s < 0) return '';
  var depth = 0, re = /<\/?div\b[^>]*>/gi, m; re.lastIndex = s;
  while ((m = re.exec(html))) { depth += m[0][1] === '/' ? -1 : 1; if (depth === 0) return html.slice(s, m.index + m[0].length); }
  return '';
}

/* ---------- screens ---------- */
function row(id, icon, title, desc, first, cls) {
  return '<button class="ph-row' + (first ? ' first' : '') + (cls ? ' ' + cls : '') + '" onclick="phDo(\'' + id + '\')"><span class="ph-ic">' + svg(icon) + '</span><span style="flex:1;min-width:0"><span class="ph-t block">' + title + '</span>' + (desc ? '<span class="ph-d block">' + desc + '</span>' : '') + '</span><span class="ph-ch">' + svg('chev', 'ph-s') + '</span></button>';
}
function initials() { try { return String(U.name || '').split(' ').filter(Boolean).map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase() || 'ME'; } catch (e) { return 'ME'; } }
function hub() {
  var p = {}, nm = ''; try { p = U.profile || {}; nm = U.name || ''; } catch (e) {}
  var line = [p.uni, p.level ? p.level + ' level' : ''].filter(Boolean).join(' / ');
  var ex = extras(legacyHtml());
  return '<div class="ph max-w-md mx-auto space-y-4 pb-28">' +
    '<div class="ph-card"><button class="ph-head" onclick="phDo(\'record\')"><span class="ph-av">' + E(initials()) + '</span><span style="flex:1;min-width:0"><span class="ph-name block">' + E(nm || 'Your profile') + '</span><span class="ph-sub block">Student profile' + (line ? ' / ' + E(line) : '') + '</span><span class="ph-link">View academic profile ' + svg('chev', 'ph-s') + '</span></span></button></div>' +
    '<div class="ph-card">' +
      '<div class="ph-grp" style="padding-top:14px">Profile</div>' +
      row('personal', 'user', 'Personal information', 'Names, contact information and student details', true) +
      row('academic', 'cap', 'Academic information', 'University, programme, level and matriculation') +
      row('record', 'record', 'Academic record', 'CGPA, target and results') +
      '<div class="ph-grp">Preferences</div>' +
      row('appearance', 'palette', 'Appearance', 'Theme and display preferences', true) +
      row('notifications', 'bell', 'Notifications', 'Manage reminders and alerts') +
      '<div class="ph-grp">Privacy &amp; support</div>' +
      row('privacy', 'shield', 'Privacy &amp; security', 'Account security and data management', true) +
      row('help', 'help', 'Help &amp; support', 'FAQ, contact and report a problem') +
      row('about', 'info', 'About Academic Summit', 'Version, policies and information') +
      (admin() ? '<div class="ph-grp">Admin</div>' + row('admin', 'admin', 'Admin panel', 'Lecturers, requests and settings', true) : '') +
      (ex.length ? '<div class="ph-grp">Other</div>' + row('more', 'more', 'More settings', ex.length + ' more option' + (ex.length > 1 ? 's' : ''), true) : '') +
      '<div style="height:6px"></div>' +
      row('signout', 'out', 'Sign out', '', false, 'ph-out') +
    '</div></div>';
}
function sub(title, desc, body) {
  return '<div class="ph max-w-md mx-auto space-y-4 pb-28"><button class="ph-back" onclick="phBack()">' + svg('back', 'ph-s') + 'Profile</button>' +
    '<div><h1 class="ph-h1">' + title + '</h1>' + (desc ? '<div class="ph-sub" style="margin-top:6px">' + desc + '</div>' : '') + '</div>' + body + '</div>';
}
function page(id) {
  if (id === 'appearance') {
    var tm = 'light'; try { tm = themeMode || 'light'; } catch (e) {}
    var sel = '<select class="inp" style="width:auto" onchange="phTheme(this.value)">' + ['light', 'dark', 'system'].map(function (m) { return '<option value="' + m + '"' + (tm === m ? ' selected' : '') + '>' + m.charAt(0).toUpperCase() + m.slice(1) + '</option>'; }).join('') + '</select>';
    var dash = cardWith(legacyHtml(), 'data-hhpref');
    return sub('Appearance', 'Theme and display preferences',
      '<div class="ph-card"><div class="ph-row first" style="cursor:default"><span class="ph-ic">' + svg('sun') + '</span><span style="flex:1"><span class="ph-t block">Theme</span><span class="ph-d block">Light, dark or follow your phone</span></span>' + sel + '</div></div>' + (dash ? '<div class="ph-card ph-pad">' + dash + '</div>' : ''));
  }
  if (id === 'privacy') return sub('Privacy &amp; security', 'Account security and data management',
    '<div class="ph-card">' + row('policy', 'doc', 'Privacy policy', 'How your information is used', true) + row('data', 'down', 'Download my data', 'A readable report of what is stored for you') + row('backup', 'down', 'Download backup', 'A raw backup file of your records') + '</div>');
  if (id === 'help') return sub('Help &amp; support', 'FAQ, contact and report a problem',
    '<div class="ph-card">' + row('support', 'mail', 'Contact support', 'Email the team or join the community', true) + row('faq', 'faq', 'FAQ', 'Answers to common questions') + '</div>');
  if (id === 'about') return sub('About Academic Summit', 'Version, policies and information',
    '<div class="ph-card ph-pad"><div class="ph-t">Academic Summit</div><div class="ph-d">' + (native() ? 'Android app' : 'Web app') + (W.location && W.location.host ? ' / ' + E(W.location.host) : '') + '</div></div>' +
    '<div class="ph-card">' + row('policy', 'doc', 'Privacy policy', 'How your information is used', true) + (native() ? '' : row('install', 'phone', 'Install the app', 'Add Academic Summit to your phone')) + '</div>');
  if (id === 'more') {
    var ex = extras(legacyHtml());
    return sub('More settings', 'Other options from your account', '<div class="ph-card">' + ex.map(function (x, i) { return row('x' + i, 'more', E(x.l), '', i === 0); }).join('') + '</div>');
  }
  return hub();
}

/* ---------- actions ---------- */
var EXTRA = [];
W.phDo = function (id) {
  var m;
  if (id === 'personal') return call(W.openInfoSheet);
  if (id === 'academic') return call(W.openEditSheet);
  if (id === 'notifications') return call(W.openNotifSheet);
  if (id === 'record') { keep = true; try { return W.go.call(W, 'aprof'); } finally { keep = false; } }
  if (id === 'policy') return call(W.openPolicy);
  if (id === 'data') return call(W.asExport);
  if (id === 'backup') return call(W.exportData);
  if (id === 'support') return call(W.openSupport);
  if (id === 'faq') return call(W.openFaq);
  if (id === 'install') return call(W.installApp);
  if (id === 'admin') return call(W.adminLoadLecturers);
  if (id === 'signout') return call(W.logout);
  if ((m = /^x(\d+)$/.exec(id))) { var x = EXTRA[+m[1]]; if (x) { try { new Function(x.h).call(W); } catch (e) { toast('Could not open it', 'error'); } } return; }
  if (['appearance', 'privacy', 'help', 'about', 'more'].indexOf(id) > -1) { if (id === 'more') EXTRA = extras(legacyHtml()); S.page = id; repaint(); }
};
W.phBack = function () { S.page = null; repaint(); };
W.phTheme = function (v) { call(function () { W.setThemeMode(v); }); setTimeout(function () { if (view === 'phub') repaint(); }, 60); };

/* ---------- wiring: the avatar (and the old Edit profile button) lead here for students ---------- */
if (typeof V !== 'undefined') V.phub = function () { return page(S.page); };
if (typeof goB === 'function') W.go = function (v) {
  if (!keep && (v === 'aprof' || v === 'prof') && role() !== 'lecturer') { S.page = null; var a = Array.prototype.slice.call(arguments); a[0] = 'phub'; return goB.apply(this, a); }
  return goB.apply(this, arguments);
};
W.__asProfileHubTest = { extras: extras, cardWith: cardWith, page: page };
})();
