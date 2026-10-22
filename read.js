/* Academic Summit - read.js v3: header with the mountain, adaptive flame,
   compact Today's-reading card, Reading page with edit mode, sidebar door,
   timetable-seeded days. Load LAST (after pulse.js). */
(function () {
'use strict';
var W = window;
var DOW = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
var iso = function (d) {
  var z = new Date(d.getTime() - d.getTimezoneOffset() * 6e4);
  return z.toISOString().slice(0, 10);
};
var dowIdx = function (d) { return (d.getDay() + 6) % 7; };
var clean = function (s) { return String(s || '').trim().toUpperCase().split(' ').join(''); };
var FLAME = '<span class="flame" style="display:inline-flex;width:12px;height:12px">' +
  '<svg viewBox="0 0 24 24" fill="currentColor" style="width:12px;height:12px">' +
  '<path d="M13.3 2.1c.4 2.9-.9 4.6-2.3 6.2-1.6 1.9-3.5 3.9-3.5 7.2A6.5 6.5 0 0 0 14 21.9a6.5 6.5 0 0 0 6.5-6.4c0-2.6-1-4.6-2.2-6.3-.3 1.1-.9 2-1.8 2.6.3-3.6-1-7.6-3.2-9.7z"/>' +
  '<path d="M12 20.5a3 3 0 0 1-3-3c0-1.3.8-2.2 1.9-3.4.4-.4.8-.9 1.1-1.4.3.5.7 1 1.1 1.4 1.1 1.2 1.9 2.1 1.9 3.4a3 3 0 0 1-3 3z"/>' +
  '</svg></span>';
var st = document.createElement('style');
st.textContent =
  '.streak-btn{transition:transform .12s ease,opacity .12s ease;cursor:pointer}' +
  '.streak-btn:active{transform:scale(.95);opacity:.8}' +
  '.flame{color:#059669}' +                       /* emerald fire on white */
  '.dark .flame{color:#34d399}' +                  /* bright emerald on charcoal */
  '.grad .flame,.dark .rl-morn .flame,.dark .rl-noon .flame,.dark .rl-night .flame{color:#e11d48}' +  /* red fire on green */
  '.dark .streak-btn{color:#34d399 !important}';
document.head.appendChild(st);
/* ---------- plan model, days seeded from the timetable ---------- */
function seedDays(code) {
  var k = clean(code), want = {};
  (U.timetable || []).forEach(function (x) {
    if (clean(x.code) !== k) return;
    var d = +x.day;
    want[d] = 1;
    want[(d + 6) % 7] = 1;                          /* class day + the day before */
  });
  var s = Object.keys(want).sort().join('');
  return s || '0123456';
}
function plan() {
  U.readPlan = U.readPlan || { order: [], days: {} };
  var p = U.readPlan;
  if (!p.order.length) {
    var cs = ((U.dec && U.dec[0]) || []).concat((U.dec && U.dec[1]) || []);
    cs.forEach(function (c) { if (p.order.indexOf(c.code) < 0) p.order.push(c.code); });
  }
  p.order.forEach(function (c) { if (!p.days[c]) p.days[c] = seedDays(c); });
  return p;
}
function unitOf(code) {
  var u = 2;
  ((U.dec && U.dec[0]) || []).concat((U.dec && U.dec[1]) || []).forEach(function (c) { if (c.code === code) u = +c.unit || 2; });
  (U.semesters || []).forEach(function (s) {
    (s.courses || []).forEach(function (c) { if (c.code === code) u = +c.unit || 2; });
  });
  return u;
}
function todayItems() {
  var p = plan(), t = dowIdx(new Date());
  return p.order.filter(function (c) {
    var ds = p.days[c];
    return !ds || ds.indexOf(String(t)) > -1;
  }).map(function (c) { return { code: c, unit: unitOf(c) }; });
}
function logToday() {
  var t = iso(new Date());
  U.readLog = U.readLog || {};
  U.readLog[t] = U.readLog[t] || [];
  return U.readLog[t];
}
function isDone(c) { return logToday().indexOf(c) > -1; }
W.readSet = function (code, on) {
  var L = logToday(), i = L.indexOf(code);
  if (on && i < 0) { L.push(code); U.reads = U.reads || {}; U.reads[code] = iso(new Date()); }
  if (!on && i > -1) L.splice(i, 1);
  var keys = Object.keys(U.readLog).sort();
  while (keys.length > 60) delete U.readLog[keys.shift()];
  save();
  go(view === 'read' ? 'read' : 'home');
};
function ring(done, total) {
  if (!total) return '';
  var r = 9, c = 2 * Math.PI * r;
  var off = (c * (1 - done / total)).toFixed(1);
  return '<span class="d-ring inline-flex items-center gap-1 text-[10px] font-bold text-slate-500">' +
    '<svg width="22" height="22" viewBox="0 0 22 22">' +
    '<circle cx="11" cy="11" r="' + r + '" stroke="var(--bd)" stroke-width="3" fill="none"/>' +
    '<circle class="fg" cx="11" cy="11" r="' + r + '" stroke="#10b981" stroke-width="3" fill="none"' +
    ' stroke-dasharray="' + c.toFixed(1) + '" stroke-dashoffset="' + off + '" stroke-linecap="round" transform="rotate(-90 11 11)"/>' +
    '</svg>' + done + ' of ' + total + ' today</span>';
}
function streakBtn() {
  var si = W.streakInfo ? W.streakInfo() : { n: 0, state: 'broken' };
  var look = {
    safe: ['rgba(16,185,129,.15)', '#047857', si.n + '-day streak'],
    atrisk: ['rgba(217,119,6,.15)', '#d97706', si.n + '-day streak \u00b7 at risk'],
    freezable: ['rgba(56,189,248,.15)', '#0284c7', si.n + '-day \u00b7 freeze ready'],
    broken: ['rgba(148,163,184,.15)', '#94a3b8', 'start a streak']
  }[si.state] || ['rgba(16,185,129,.15)', '#047857', si.n + '-day streak'];
  return '<button type="button" class="streak-btn px-2.5 py-1 rounded-full text-[10px] font-extrabold"' +
    ' style="background:' + look[0] + ';color:' + look[1] + '" onclick="streakCal()"' +
    ' aria-label="Open your reading calendar">' + FLAME + ' ' + look[2] + '</button>';
}
function nextExam() {
  var ex = (U.exams || []).filter(function (e) {
    return Math.round((new Date(e.date) - new Date()) / 864e5) >= 0;
  }).sort(function (a, b) { return a.date < b.date ? -1 : 1; })[0];
  if (!ex) return null;
  return { code: ex.code, d: Math.round((new Date(ex.date) - new Date()) / 864e5) };
}
/* ---------- compact home card ---------- */
function compactCard() {
  var items = todayItems();
  var done = items.filter(function (i) { return isDone(i.code); }).length;
  var next = items.filter(function (i) { return !isDone(i.code); })[0];
  var ex = nextExam();
  var out = '<div class="flex justify-between items-start">' +
    '<div class="font-extrabold text-lg">Today\'s reading</div>' + streakBtn() + '</div>' +
    '<div class="pt-1">' + ring(done, items.length) + '</div>';
  if (ex) out += '<div class="text-xs font-bold" style="color:#d97706">' + esc(ex.code) +
    ' exam ' + (ex.d === 0 ? 'is today' : 'in ' + ex.d + ' day' + (ex.d === 1 ? '' : 's')) + '</div>';
  if (next) {
    out += '<div class="flex items-center justify-between gap-3 p-3 rounded-xl" style="background:var(--sub)">' +
      '<div><b class="font-mono">' + esc(next.code) + '</b>' +
      '<div class="text-[11px] text-slate-500">next up \u2022 ' + next.unit + 'u</div></div>' +
      '<button class="btn2 shrink-0" onclick="readDone(\'' + esc(next.code) + '\')">Done reading</button></div>';
  } else {
    out += '<div class="p-3 rounded-xl text-xs font-bold" style="background:rgba(16,185,129,.12);color:#047857">' +
      'All done today. Come back tomorrow.</div>';
  }
  out += '<button type="button" class="btn2 w-full justify-between" onclick="go(\'read\')">View all' + ic('r', 'w-4 h-4') + '</button>';
  return out;
}
function compactReading() {
  var cards = document.querySelectorAll('#main .card');
  var card = Array.from(cards).find(function (c) {
    var t = c.querySelector('.font-extrabold.text-lg');
    return t && /Today's reading/.test(t.textContent || '');
  });
  if (card) card.innerHTML = '<div class="space-y-3">' + compactCard() + '</div>';
}
function dateUnderGreeting() {
  var h1 = document.querySelector('#main h1');
  if (!h1 || h1.parentNode.querySelector('.d-date')) return;
  var p = document.createElement('p');
  p.className = 'text-xs text-slate-500 d-date';
  p.textContent = new Date().toDateString();
  h1.insertAdjacentElement('afterend', p);
}
/* ---------- header: mountain + flame chip left, theme + avatar right ---------- */
function paintTop() {
  var t = $('top');
  if (!t || !U) return;
  var chip = U.role === 'student' ? streakBtn() : '';
  var parts = U.name.split(' ');
  var ini = parts.map(function (w) { return w[0]; }).slice(0, 2).join('').toUpperCase();
  t.innerHTML = '<div class="flex items-center gap-2.5">' + MTN('w-8 h-8') + chip + '</div>' +
    '<div class="flex items-center gap-3">' +
    '<button onclick="toggleTheme()" class="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm" aria-label="Toggle theme">' + ic(isDark ? 'sun' : 'moon') + '</button>' +
    '<button onclick="go(\'prof\')" class="flex items-center gap-2.5 pl-2 border-l border-slate-200 dark:border-slate-800" aria-label="Profile">' +
    '<span class="grad w-9 h-9 rounded-full grid place-items-center text-xs font-bold">' + esc(ini) + '</span></button></div>';
}
/* ---------- sidebar door for Reading (flag 5) ---------- */
function sideEntry() {
  var side = $('side');
  if (!side || side.querySelector('[data-n="read"]')) return;
  var navBox = side.querySelector('.space-y-1');
  if (!navBox) return;
  var b = document.createElement('button');
  b.setAttribute('data-n', 'read');
  b.setAttribute('onclick', "go('read')");
  b.className = 'nv w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold text-slate-300 hover:bg-violet-900/40 flex items-center gap-3';
  b.innerHTML = ic('c') + ' <span>Reading</span>';
  var home = navBox.querySelector('[data-n="home"]');
  if (home && home.nextSibling) navBox.insertBefore(b, home.nextSibling);
  else navBox.appendChild(b);
}
/* ---------- Reading page ---------- */
var TIP = '<p class="text-xs text-slate-500" style="font-style:italic">Courses you read the day before class stick roughly twice as well.</p>';
function candidates() {
  var p = plan(), out = [];
  ((U.dec && U.dec[0]) || []).concat((U.dec && U.dec[1]) || []).forEach(function (c) {
    if (p.order.indexOf(c.code) < 0 && out.indexOf(c.code) < 0) out.push(c.code);
  });
  return out;
}
function readPage() {
  var p = plan(), items = todayItems(), editing = !!W._readEdit;
  var head = '<div class="flex items-center gap-3">' +
    '<button type="button" class="btn2 px-3" onclick="go(\'home\')">' + ic('l') + '</button>' +
    '<div class="font-extrabold text-lg">Reading</div>' +
    '<button class="btn2 ml-auto" onclick="readEditToggle()">' + (editing ? 'Done' : 'Edit') + '</button></div>';
  if (!editing) {
    var done = items.filter(function (i) { return isDone(i.code); }).length;
    var rows = items.map(function (it) {
      var d = isDone(it.code);
      var btn = d
        ? '<button class="btn2 shrink-0" onclick="readSet(\'' + esc(it.code) + '\',false)">Unmark</button>'
        : '<button class="btn2 shrink-0" onclick="readSet(\'' + esc(it.code) + '\',true)">Done reading</button>';
      var tag = d ? ' <span class="text-xs font-extrabold" style="color:#10b981">Read \u2713</span>' : '';
      return '<div class="flex items-center justify-between gap-3 p-3 rounded-xl" style="background:var(--sub);' + (d ? 'opacity:.6' : '') + '">' +
        '<div><b class="font-mono">' + esc(it.code) + '</b> <span class="text-xs text-slate-500">' + it.unit + 'u</span>' + tag + '</div>' + btn + '</div>';
    }).join('') || '<p class="text-xs text-slate-500">Nothing scheduled today. Use Edit to add courses or change their days.</p>';
    return '<div class="space-y-5">' + head + TIP + '<div>' + ring(done, items.length) + '</div><div class="space-y-2">' + rows + '</div></div>';
  }
  var rows2 = p.order.map(function (c, i) {
    var ds = p.days[c] || '0123456';
    var chips = DOW.map(function (dn, k) {
      var on = ds.indexOf(String(k)) > -1;
      var sty = on ? 'background:rgba(16,185,129,.18);color:#047857' : 'background:var(--bd);color:var(--mut)';
      return '<button class="px-2 py-1 rounded-lg text-[10px] font-bold" style="' + sty + '" onclick="readDay(\'' + esc(c) + '\',' + k + ')">' + dn + '</button>';
    }).join('');
    return '<div class="p-3 rounded-xl space-y-2" style="background:var(--sub)">' +
      '<div class="flex items-center justify-between gap-2"><b class="font-mono">' + esc(c) + '</b><span class="flex gap-2">' +
      '<button class="btn2 px-2" onclick="readMove(' + i + ',-1)" aria-label="Move up">\u2191</button>' +
      '<button class="btn2 px-2" onclick="readMove(' + i + ',1)" aria-label="Move down">\u2193</button>' +
      '<button class="text-rose-500 font-bold px-1" onclick="readRm(\'' + esc(c) + '\')">x</button></span></div>' +
      '<div class="flex gap-1 flex-wrap">' + chips + '</div></div>';
  }).join('') || '<p class="text-xs text-slate-500">Plan is empty - add a course below.</p>';
  var opts = candidates();
  var sel = opts.length
    ? '<select id="rd-add" class="inp">' + opts.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + '</option>'; }).join('') + '</select>'
    : '';
  var add = '<div class="card p-4 space-y-2"><div class="lbl">Add a course</div>' + sel +
    '<input id="rd-add-custom" class="inp font-mono uppercase" placeholder="Or type a code, e.g. POS 214">' +
    '<button class="btn w-full" onclick="readAdd()">Add to plan</button></div>';
  return '<div class="space-y-5">' + head + TIP + '<div class="space-y-2">' + rows2 + '</div>' + add + '</div>';
}
V.read = function () { return readPage(); };
W.readEditToggle = function () { W._readEdit = !W._readEdit; go('read'); };
W.readMove = function (i, d) {
  var p = plan(), j = i + d;
  if (j < 0 || j >= p.order.length) return;
  var t = p.order[i]; p.order[i] = p.order[j]; p.order[j] = t;
  save(); go('read');
};
W.readRm = function (code) {
  if (!confirm('Remove ' + code + ' from your reading plan?')) return;
  var p = plan();
  p.order = p.order.filter(function (c) { return c !== code; });
  delete p.days[code];
  save(); go('read');
};
W.readDay = function (code, k) {
  var p = plan();
  var ds = (p.days[code] || '0123456').split('');
  var i = ds.indexOf(String(k));
  if (i > -1) ds.splice(i, 1); else ds.push(String(k));
  p.days[code] = ds.sort().join('');
  save(); go('read');
};
W.readAdd = function () {
  var ce = $('rd-add-custom'), se = $('rd-add');
  var raw = (ce && ce.value) ? ce.value : ((se && se.value) ? se.value : '');
  var c = clean(raw);
  if (!c) return showToast('Pick or type a course code', 'error');
  var p = plan();
  if (p.order.indexOf(c) > -1) return showToast(c + ' is already in the plan', 'error');
  p.order.push(c);
  if (!p.days[c]) p.days[c] = seedDays(c);
  save(); go('read');
  showToast(c + ' added to your reading plan');
};
/* ---------- wiring ---------- */
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  setTimeout(function () {
    paintTop(); sideEntry();
    if (v === 'home') { dateUnderGreeting(); compactReading(); }
  }, 70);
  return r;
};
var stB = W.start;
W.start = function () {
  var r = stB.apply(this, arguments);
  setTimeout(function () { paintTop(); sideEntry(); }, 50);
  return r;
};
if (typeof W.toggleTheme === 'function') {
  var tgB = W.toggleTheme;
  W.toggleTheme = function () {
    var r = tgB.apply(this, arguments);
    setTimeout(paintTop, 30);
    return r;
  };
}
})();
