const fs = require('fs');
function sub(file, from, to, label) {
  const s = fs.readFileSync(file, 'utf8');
  if (s.indexOf(to) > -1) { console.log(file + ': ' + label + ' already applied'); return; }
  if (s.indexOf(from) === -1) { console.log(file + ': ANCHOR MISSING -> ' + label); process.exitCode = 1; return; }
  fs.writeFileSync(file, s.split(from).join(to));
  console.log(file + ': ' + label + ' applied');
}
/* coach: first three days only, once per day */
sub('coach.js', "function shouldShow() { try { return Date.now() - (+localStorage.getItem(K_LAST) || 0) > 12 * 3600e3; } catch (e) { return false; } }",
  "function shouldShow() { try { var d0 = +localStorage.getItem('as_first_seen') || Date.now(); if (Date.now() - d0 > 3 * 864e5) return false; return localStorage.getItem(K_LAST + 'day') !== new Date().toDateString(); } catch (e) { return false; } }",
  'coach 3-day window');
sub('coach.js', "try { localStorage.setItem(K_LAST, String(Date.now())); } catch (e) {}",
  "try { localStorage.setItem(K_LAST, String(Date.now())); localStorage.setItem(K_LAST + 'day', new Date().toDateString()); } catch (e) {}",
  'coach day stamp');
/* morning nudge: where do we start today */
sub('pulse.js', "if (sessionCount() < 2) return '';",
  "if (sessionCount() < 2) { var hh = new Date().getHours(); if (hh < 12 && W.h2courses) { var cs = W.h2courses(); var t0 = iso(new Date()); var dn0 = (U.readLog || {})[t0] || []; var nx = cs.filter(function (c) { return dn0.indexOf(c.code) < 0; })[0]; if (nx) return 'Good morning - we start today with ' + nx.code + '.'; } return ''; }",
  'morning nudge');
/* splash: the orb becomes the mountain */
sub('splash.js', "border-radius:50%;background:radial-gradient(circle at 35% 30%,#6ee7b7,#10b981 55%,rgba(16,185,129,0) 74%);box-shadow:0 0 70px rgba(16,185,129,.35);",
  "background:none;display:grid;place-items:center;filter:drop-shadow(0 0 34px rgba(16,185,129,.45));",
  'mountain not orb (css)');
sub('splash.js', "'<span class=\"as-orb\"></span>'",
  "'<span class=\"as-orb\"><svg viewBox=\"0 0 48 32\" width=\"150\" height=\"100\" aria-hidden=\"true\"><defs><linearGradient id=\"asMtn\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#6ee7b7\"/><stop offset=\"1\" stop-color=\"#0f766e\"/></linearGradient></defs><path d=\"M2 30 L18 6 L28 20 L34 12 L46 30 Z\" fill=\"url(#asMtn)\"/></svg></span>'",
  'mountain not orb (svg)');
