/* Academic Summit - plan.js: Study plan, dynamic distribution, focus timer, time-aware tips.
   Load AFTER read.js. */
(function () {
'use strict';
var W = window;
var MIN = 60000;
var DAYS = [[1,'Mon'],[2,'Tue'],[3,'Wed'],[4,'Thu'],[5,'Fri'],[6,'Sat'],[0,'Sun']];

/* ---------- Tips ---------- */
var TIPS = {
  morning: [
    'Drink a glass of water before you start. Reading goes easier when you are hydrated.',
    'Get some daylight first. It helps you wake up properly.',
    'Take your hardest course first while your mind is fresh.'
  ],
  afternoon: [
    'An after-lunch dip is normal. Water or a short walk helps more than pushing through.',
    'Stuck on a course? Switch to another one for a bit and come back.',
    'Pair water with a light snack to keep your energy steady.'
  ],
  evening: [
    'Spend five minutes recalling what you read today. Recalling it helps it stick.',
    'Go easy on caffeine this late so it does not cost you sleep.',
    'Lower your screen brightness as it gets later.'
  ],
  night: [
    'Sleep helps you keep what you studied. Wrap up soon if you can.',
    'Keep water nearby and skip caffeine for the night.',
    'Write down tomorrow\'s first reading before you sleep so you can start easily.'
  ],
  rest: [
    'Drink some water.',
    'Stand up and stretch your neck and shoulders.',
    'Look at something far away for 20 seconds to rest your eyes.',
    'Take a few slow breaths. Keep your phone for the timer only.'
  ]
};
W.pickTip = function (phase) {
  var h = new Date().getHours();
  var slot = h < 5 ? 'night' : h < 12 ? 'morning' : h < 17 ? 'afternoon' : h < 21 ? 'evening' : 'night';
  var list = phase === 'rest' ? TIPS.rest : TIPS[slot];
  var seed = Math.floor(Date.now() / 1800000);
  return list[seed % list.length];
};

/* ---------- Schedule Builder ---------- */
W.buildSchedule = function (courses, plan) {
  if (!plan || !plan.days || !plan.days.length || !courses.length) return null;
  var cycle = plan.focusMin + plan.restMin;
  var sessionsPerDay = Math.floor(plan.minutesPerDay / Math.max(1, cycle));
  if (sessionsPerDay < 1) sessionsPerDay = 1;
  var totalUnits = courses.reduce(function(a, c) { return a + (+c.unit || 2); }, 0);
  var weights = courses.map(function(c) { return (+c.unit || 2) / totalUnits; });
  var weekSchedule = {};
  plan.days.forEach(function(d) { weekSchedule[d] = []; });
  var totalSessionsWeek = sessionsPerDay * plan.days.length;
  var assigned = {};
  courses.forEach(function(c) { assigned[c.code] = 0; });
  for (var i = 0; i < totalSessionsWeek; i++) {
    var dayIdx = i % plan.days.length;
    var day = plan.days[dayIdx];
    var best = null, bestScore = -1;
    courses.forEach(function(c, idx) {
      var target = Math.round(weights[idx] * totalSessionsWeek);
      var score = target - assigned[c.code];
      if (score > bestScore) { bestScore = score; best = c; }
    });
    if (best) { weekSchedule[day].push(best.code); assigned[best.code]++; }
  }
  var schedule = {};
  Object.keys(weekSchedule).forEach(function(d) {
    var counts = {};
    weekSchedule[d].forEach(function(code) { counts[code] = (counts[code] || 0) + 1; });
    schedule[d] = Object.keys(counts).map(function(code) { return { code: code, sessions: counts[code] }; });
  });
  return schedule;
};

/* ---------- Timer Logic ---------- */
var TIMER_KEY = 'as_timer';
function loadTimer() { try { var v = localStorage.getItem(TIMER_KEY); return v ? JSON.parse(v) : null; } catch(e) { return null; } }
function saveTimer(t) { try { if (t) localStorage.setItem(TIMER_KEY, JSON.stringify(t)); else localStorage.removeItem(TIMER_KEY); } catch(e) {} }

function alertUser(msg) {
  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    gain.gain.value = 0.1; osc.frequency.value = 880;
    osc.start(); osc.stop(ctx.currentTime + 0.25);
  } catch(e) {}
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('Academic Summit', { body: msg }); } catch(e) {}
  }
}

function advance(s, plan) {
  if (s.phase === 'focus') {
    if (s.session >= s.total) return { code: s.code, phase: 'done', session: s.session, total: s.total, endsAt: 0, phaseMs: 0, pausedLeft: null };
    var longRest = plan.longRestEvery && plan.longRestMin && s.session % plan.longRestEvery === 0;
    var ms = (longRest ? plan.longRestMin : plan.restMin) * MIN;
    return { code: s.code, phase: 'rest', session: s.session, total: s.total, endsAt: s.endsAt + ms, phaseMs: ms, pausedLeft: null };
  }
  if (s.phase === 'rest') {
    var ms = plan.focusMin * MIN;
    return { code: s.code, phase: 'focus', session: s.session + 1, total: s.total, endsAt: s.endsAt + ms, phaseMs: ms, pausedLeft: null };
  }
  return s;
}

function catchUp(s, plan, now) {
  var cur = s, changed = false;
  while (cur.phase !== 'done' && cur.pausedLeft === null && now >= cur.endsAt) {
    cur = advance(cur, plan); changed = true;
  }
  return { state: cur, changed: changed };
}

W.timerStart = function (code, sessions) {
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();
  var plan = U.studyPlan, ms = plan.focusMin * MIN;
  saveTimer({ code: code, phase: 'focus', session: 1, total: sessions, endsAt: Date.now() + ms, phaseMs: ms, pausedLeft: null });
  go('timer');
};
W.timerPause = function () {
  var t = loadTimer();
  if (t && t.pausedLeft === null && t.phase !== 'done') { t.pausedLeft = Math.max(0, t.endsAt - Date.now()); saveTimer(t); go('timer'); }
};
W.timerResume = function () {
  var t = loadTimer();
  if (t && t.pausedLeft !== null) { t.endsAt = Date.now() + t.pausedLeft; t.pausedLeft = null; saveTimer(t); go('timer'); }
};
W.timerSkip = function () {
  var t = loadTimer(), plan = U.studyPlan;
  if (t && t.phase === 'rest') {
    var ms = plan.focusMin * MIN;
    t.phase = 'focus'; t.session++; t.phaseMs = ms; t.endsAt = Date.now() + ms; t.pausedLeft = null;
    saveTimer(t); go('timer');
  }
};
W.timerEnd = function () { saveTimer(null); go('home'); };
W.timerMarkDone = function (code) { W.readDone(code); saveTimer(null); go('home'); };

var tickInterval = null;
function timerTick() {
  var t = loadTimer(); if (!t) return;
  var res = catchUp(t, U.studyPlan, Date.now());
  if (res.changed) {
    saveTimer(res.state);
    var msg = res.state.phase === 'rest' ? 'Focus done. Take a break.' : res.state.phase === 'focus' ? 'Back to ' + res.state.code + '.' : res.state.code + ' sessions complete.';
    alertUser(msg);
    if (view === 'timer') go('timer');
  }
}

/* ---------- UI: Setup ---------- */
W.planSetupOpen = function () {
  var p = U.studyPlan || { days: [1,2,3,4,5], minutesPerDay: 120, focusMin: 25, restMin: 5, longRestMin: 15, longRestEvery: 4 };
  var daysHtml = DAYS.map(function(d) {
    var on = p.days.indexOf(d[0]) > -1;
    return '<button type="button" class="px-3 py-2 rounded-xl text-xs font-bold ' + (on ? 'btn' : 'btn2') + '" onclick="planToggleDay(' + d[0] + ')">' + d[1] + '</button>';
  }).join('');
  fullScreen('Study plan setup',
    '<div class="card p-5 space-y-4">' +
    '<div class="lbl">Reading days</div><div class="flex flex-wrap gap-2" id="plan-days">' + daysHtml + '</div>' +
    '<div class="grid grid-cols-2 gap-3"><div><label class="lbl block mb-1">Hours</label><input id="plan-h" type="number" min="0" max="12" class="inp" value="' + Math.floor(p.minutesPerDay / 60) + '"></div>' +
    '<div><label class="lbl block mb-1">Minutes</label><input id="plan-m" type="number" min="0" max="59" class="inp" value="' + (p.minutesPerDay % 60) + '"></div></div>' +
    '<div class="lbl">Focus and rest</div>' +
    '<div class="grid grid-cols-2 gap-3"><div><label class="lbl block mb-1">Focus (min)</label><input id="plan-f" type="number" min="5" max="90" class="inp" value="' + p.focusMin + '"></div>' +
    '<div><label class="lbl block mb-1">Rest (min)</label><input id="plan-r" type="number" min="1" max="30" class="inp" value="' + p.restMin + '"></div></div>' +
    '<div class="grid grid-cols-2 gap-3"><div><label class="lbl block mb-1">Long rest (min)</label><input id="plan-lr" type="number" min="0" max="60" class="inp" value="' + (p.longRestMin || 0) + '"></div>' +
    '<div><label class="lbl block mb-1">Every N sessions</label><input id="plan-le" type="number" min="2" max="10" class="inp" value="' + (p.longRestEvery || 4) + '"></div></div>' +
    '<p class="text-xs text-slate-500" id="plan-info"></p>' +
    '<button class="btn w-full" onclick="planSave()">Save plan</button></div>'
  );
  planUpdateInfo();
};
W.planToggleDay = function (d) {
  var p = U.studyPlan || { days: [1,2,3,4,5], minutesPerDay: 120, focusMin: 25, restMin: 5 };
  var i = p.days.indexOf(d); if (i > -1) p.days.splice(i, 1); else p.days.push(d);
  U.studyPlan = p; save(); planSetupOpen();
};
W.planUpdateInfo = function () {
  var h = +(($('plan-h')||{}).value||0), m = +(($('plan-m')||{}).value||0);
  var f = +(($('plan-f')||{}).value||25), r = +(($('plan-r')||{}).value||5);
  var info = $('plan-info'); if (info) info.textContent = Math.floor((h*60+m) / Math.max(1, f+r)) + ' focus sessions fit in a reading day.';
};
document.addEventListener('input', function(e) { if (e.target && e.target.id && e.target.id.indexOf('plan-') === 0) planUpdateInfo(); });
W.planSave = function () {
  var days = (U.studyPlan || {}).days || [];
  var h = +(($('plan-h')||{}).value||0), m = +(($('plan-m')||{}).value||0);
  var f = +(($('plan-f')||{}).value||0), r = +(($('plan-r')||{}).value||0);
  var lr = +(($('plan-lr')||{}).value||0), le = +(($('plan-le')||{}).value||4);
  if (!days.length) return showToast('Pick at least one reading day', 'error');
  if (f < 5 || f > 90) return showToast('Focus time should be 5 to 90 minutes', 'error');
  if (r < 1 || r > 30) return showToast('Rest time should be 1 to 30 minutes', 'error');
  if ((h*60+m) < f+r) return showToast('Daily time is shorter than one cycle', 'error');
  U.studyPlan = { days: days, minutesPerDay: h*60+m, focusMin: f, restMin: r, longRestMin: lr>0?lr:undefined, longRestEvery: lr>0?le:undefined, createdOn: new Date().toISOString().slice(0,10) };
  save(); closeSheet(); go('home'); showToast('Study plan saved');
};

/* ---------- UI: Timer ---------- */
V.timer = function () {
  var t = loadTimer(); if (!t) { go('home'); return ''; }
  var rem = t.pausedLeft !== null ? t.pausedLeft : Math.max(0, t.endsAt - Date.now());
  var s = Math.ceil(rem / 1000), fmt = String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  var progress = t.phaseMs ? 1 - (rem / t.phaseMs) : 1, R = 54, C = 2 * Math.PI * R, paused = t.pausedLeft !== null;
  if (t.phase === 'done') {
    return '<div class="space-y-5"><div class="flex items-center gap-3"><button class="btn2 px-3" onclick="timerEnd()">' + ic('l') + '</button><div class="font-extrabold text-lg">' + esc(t.code) + ' complete</div></div>' +
      '<div class="card p-6 space-y-4 text-center"><div class="text-5xl font-extrabold" style="color:#10b981">\u2713</div><p class="text-sm text-slate-500">All focus sessions for this course are done.</p>' +
      '<button class="btn w-full" onclick="timerMarkDone(\'' + esc(t.code) + '\')">Mark as read & close</button><button class="btn2 w-full" onclick="timerEnd()">Just close</button></div></div>';
  }
  var tip = t.phase === 'rest' ? '<p class="text-xs text-slate-500 mt-4" style="font-style:italic">' + W.pickTip('rest') + '</p>' : '';
  return '<div class="space-y-5"><div class="flex items-center gap-3"><button class="btn2 px-3" onclick="timerEnd()">' + ic('l') + '</button><div class="font-extrabold text-lg">' + esc(t.code) + '</div></div>' +
    '<div class="card p-6 space-y-4 text-center"><div class="text-xs font-bold uppercase tracking-wider" style="color:' + (t.phase === 'focus' ? '#059669' : '#d97706') + '">' + (t.phase === 'focus' ? 'Focus' : 'Rest') + ' \u2022 session ' + t.session + ' of ' + t.total + '</div>' +
    '<div class="flex justify-center"><svg viewBox="0 0 120 120" width="220" height="220"><circle cx="60" cy="60" r="' + R + '" fill="none" stroke="var(--bd)" stroke-width="8"/>' +
    '<circle cx="60" cy="60" r="' + R + '" fill="none" stroke="' + (t.phase === 'focus' ? '#10b981' : '#f59e0b') + '" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - progress)).toFixed(1) + '" transform="rotate(-90 60 60)"/>' +
    '<text x="60" y="68" text-anchor="middle" font-size="28" font-weight="800" fill="currentColor">' + fmt + '</text></svg></div>' +
    '<div class="flex gap-2"><button class="btn flex-1" onclick="' + (paused ? 'timerResume()' : 'timerPause()') + '">' + (paused ? 'Resume' : 'Pause') + '</button>' +
    (t.phase === 'rest' ? '<button class="btn2 flex-1" onclick="timerSkip()">Skip rest</button>' : '') +
    '<button class="btn2 flex-1" onclick="timerEnd()">End</button></div>' + tip + '</div></div>';
};

var startBase = W.start;
W.start = function () { var r = startBase.apply(this, arguments); if (!tickInterval) tickInterval = setInterval(timerTick, 1000); return r; };
})();
