/* Academic Summit - study-core.js v1
   Pure study logic: no screens, no network, no storage. Plain data in, plain data out,
   so any screen can use it and it can be tested in Termux with: node study-core.test.js

   Decisions taken for the spec's open points:
   - A wrong answer reveals the correct answer and never blocks by itself. A section unlocks
     at 60% correct; below that the weak questions are asked again.
   - Day 1 has nothing to review, so the lock only starts after the first session.
   - A streak day = the day's session completed. Missing a non-rest day resets it. */
(function (root) {
'use strict';

var LEVELS = [
  { id: 1, name: 'Beginner',      total: 30,  per: 15 },
  { id: 2, name: 'Semi-beginner', total: 45,  per: 22.5 },
  { id: 3, name: 'Above-average', total: 90,  per: 45 },
  { id: 4, name: 'Elite',         total: 120, per: 60 }
];
var MIN_PER_COURSE = 15, MAX_COURSES = 4, WPM = 220, GAPS = [2, 4, 6];
var MONTHS = 'January|February|March|April|May|June|July|August|September|October|November|December';
var NOT_NAME = new RegExp('^(' + MONTHS + '|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$');
var STOP = { The:1, This:1, That:1, These:1, Those:1, There:1, Then:1, They:1, His:1, Her:1, Its:1, Our:1,
  But:1, And:1, For:1, From:1, With:1, However:1, Also:1, Thus:1, Because:1, Although:1, When:1, While:1,
  After:1, Before:1, During:1, Some:1, Many:1, Most:1, Each:1, Every:1, One:1, Two:1, Three:1 };

/* ---------- dates (ISO yyyy-mm-dd, UTC, no timezone surprises) ---------- */
function addDays(s, n) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function diffDays(a, b) { return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5); }
function weekday(s) { return new Date(s + 'T00:00:00Z').getUTCDay(); }

/* ---------- levels and the daily plan ---------- */
function levelFor(perCourseMin) {
  for (var i = LEVELS.length - 1; i >= 0; i--) if (perCourseMin >= LEVELS[i].per) return LEVELS[i];
  return LEVELS[0];
}
/* minutes: what the student chose; courses: [{code, weak?}]; last: {code: 'yyyy-mm-dd'}; want: how many (default 2) */
function planDay(minutes, courses, last, want) {
  last = last || {};
  var cap = Math.min(MAX_COURSES, courses.length, Math.floor(minutes / MIN_PER_COURSE));
  if (cap < 1) return { courses: [], perCourse: 0, level: LEVELS[0], note: 'Choose at least ' + MIN_PER_COURSE + ' minutes.' };
  var n = Math.min(want || 2, cap);
  var picked = courses.slice().sort(function (a, b) {
    var la = last[a.code] || '', lb = last[b.code] || '';
    if (la !== lb) return la < lb ? -1 : 1;
    return (b.weak || 0) - (a.weak || 0);
  }).slice(0, n);
  var per = minutes / picked.length;
  return { courses: picked, perCourse: per, level: levelFor(per) };
}

/* ---------- sections with a minimum-time lock ---------- */
function words(s) { return (String(s).trim().match(/\S+/g) || []).length; }
function lockSeconds(w) { return Math.max(15, Math.min(300, Math.round(w * 60 / (WPM * 2)))); }
function splitSections(text, target) {
  target = target || 350;
  var raw = String(text || '').replace(/\r/g, '').trim();
  if (!raw) return [];
  var parts = raw.split(/\n\s*\n/);
  if (parts.length < 2) parts = raw.split(/\n/);
  var units = [];
  parts.forEach(function (p) {
    p = p.trim(); if (!p) return;
    if (words(p) > target * 1.6) {
      var sn = p.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) || [p], cur = '';
      sn.forEach(function (s) { if (cur && words(cur + s) > target) { units.push(cur.trim()); cur = ''; } cur += s; });
      if (cur.trim()) units.push(cur.trim());
    } else units.push(p);
  });
  var out = [], cur2 = '';
  units.forEach(function (u) {
    if (cur2 && words(cur2 + ' ' + u) > target * 1.25) { out.push(cur2); cur2 = ''; }
    cur2 = cur2 ? cur2 + '\n\n' + u : u;
    if (words(cur2) >= target) { out.push(cur2); cur2 = ''; }
  });
  if (cur2) { if (out.length && words(cur2) < target * 0.4) out[out.length - 1] += '\n\n' + cur2; else out.push(cur2); }
  return out.map(function (t, i) { var w = words(t); return { i: i, text: t, words: w, lock: lockSeconds(w) }; });
}

/* ---------- main points: dates and proper nouns ---------- */
function sentences(t) {
  return (String(t).replace(/\s+/g, ' ').match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g) || []).map(function (s) { return s.trim(); }).filter(Boolean);
}
function clean(w) { return w.replace(/^[("'\[]+|[)"'\],;:.!?]+$/g, '').replace(/['\u2019]s$/, ''); }
function isCap(w) { return /^[A-Z][a-z]{2,}$/.test(w) && !STOP[w]; }
function namesIn(s) {
  var toks = s.split(/\s+/), out = [], cur = [];
  function flush() { if (cur.length) out.push(cur.join(' ')); cur = []; }
  for (var i = 0; i < toks.length; i++) {
    var w = clean(toks[i]), ok = isCap(w);
    if (ok && i === 0 && !isCap(clean(toks[1] || ''))) ok = false;
    if (ok) cur.push(w); else flush();
    if (ok && /[,;:.!?)]$/.test(toks[i])) flush();
  }
  flush();
  return out;
}
function mainPoints(text) {
  var dates = [], names = [], m;
  var re1 = new RegExp('\\b(?:\\d{1,2}(?:st|nd|rd|th)?\\s+)?(?:' + MONTHS + ')(?:\\s+\\d{1,2}(?:st|nd|rd|th)?,?)?\\s+\\d{4}\\b', 'g');
  while ((m = re1.exec(text))) dates.push(m[0]);
  var re2 = /\b(1[0-9]{3}|20[0-9]{2})\b/g;
  while ((m = re2.exec(text))) { var y = m[1]; if (!dates.some(function (d) { return d.indexOf(y) > -1; })) dates.push(y); }
  sentences(text).forEach(function (s) { namesIn(s).forEach(function (x) { if (names.indexOf(x) < 0 && !NOT_NAME.test(x)) names.push(x); }); });
  return { dates: dates, names: names };
}
/* fill-in-the-blank questions built from the dates and names in the text itself */
function questionsFor(text, n) {
  n = n || 5;
  var cands = [], seen = {};
  sentences(text).forEach(function (s) {
    var w = words(s); if (w < 6 || w > 45) return;
    var mp = mainPoints(s);
    var term = mp.dates[0] || mp.names.slice().sort(function (a, b) { return b.length - a.length; })[0];
    if (!term || seen[term]) return;
    var cloze = s.replace(term, '_____'); if (cloze === s) return;
    seen[term] = 1;
    cands.push({ q: cloze, a: term, kind: mp.dates[0] ? 'date' : 'name', src: s });
  });
  if (cands.length <= n) return cands;
  var out = [], step = cands.length / n;
  for (var i = 0; i < n; i++) out.push(cands[Math.floor(i * step)]);
  return out;
}

/* ---------- answers and section grading ---------- */
function norm(s) { return String(s).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
function lev(a, b) {
  var m = a.length, n = b.length, d = [], i, j;
  for (i = 0; i <= m; i++) d[i] = [i];
  for (j = 1; j <= n; j++) d[0][j] = j;
  for (i = 1; i <= m; i++) for (j = 1; j <= n; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[m][n];
}
function checkAnswer(user, ans) {
  var u = norm(user), a = norm(ans);
  if (!u) return false;
  if (u === a) return true;
  if (/\d/.test(a)) return false;                       /* dates must be exact */
  var parts = a.split(' ');
  if (parts.length > 1 && parts.some(function (t) { return t.length >= 4 && t === u; })) return true;
  if (a.length >= 5 && lev(u, a) <= 1) return true;
  return a.length >= 9 && lev(u, a) <= 2;
}
function gradeSection(results, passMark) {
  passMark = passMark || 0.6;
  var n = results.length || 1, ok = results.filter(function (r) { return r.ok; }).length;
  var times = results.map(function (r) { return r.ms || 0; }).sort(function (a, b) { return a - b; });
  var med = times[Math.floor(times.length / 2)] || 0, weak = [];
  results.forEach(function (r, i) { if (!r.ok || (med && r.ms > med * 1.5 && r.ms > 8000)) weak.push(i); });
  return { score: ok / n, pass: ok / n >= passMark, weak: weak, medianMs: med };
}

/* ---------- spaced repetition: the 2-4-6 system ---------- */
function newItem(o, created) {
  return { id: o.id || (created + '-' + Math.random().toString(36).slice(2, 8)), course: o.course, section: o.section || 0,
    q: o.q, a: o.a, kind: o.kind || 'name', created: created, due: addDays(created, GAPS[0]), phase: 0, weak: o.weak || 0, done: false };
}
function advance(it, ok, ms, today, slowMs) {
  var x = {}; for (var k in it) x[k] = it[k];
  if (ms > (slowMs || 20000)) x.weak = (x.weak || 0) + 1;      /* slow answers count as weak spots */
  if (ok) {
    if (x.phase >= GAPS.length - 1) { x.done = true; x.due = null; }
    else { x.phase++; x.due = addDays(x.created, GAPS[x.phase]); if (x.due <= today) x.due = addDays(today, 1); }
  } else { x.weak = (x.weak || 0) + 2; x.due = addDays(today, 1); }
  return x;
}
function dueNow(items, today) {
  return items.filter(function (x) { return !x.done && x.due && x.due <= today; })
    .sort(function (a, b) { return (b.weak || 0) - (a.weak || 0) || (a.due < b.due ? -1 : 1); });
}
function isLocked(items, today) { return dueNow(items, today).length > 0; }
function previousSessionQuiz(items, today, n) {
  var prev = items.filter(function (x) { return x.created < today; }).map(function (x) { return x.created; }).sort().pop();
  if (!prev) return [];
  return items.filter(function (x) { return x.created === prev; }).sort(function (a, b) { return (b.weak || 0) - (a.weak || 0); }).slice(0, n || 3);
}
function recapDue(lastRecap, today) { return !lastRecap || diffDays(lastRecap, today) >= 30; }
function monthlyRecap(items, today, cap) {
  cap = cap || 40;
  var pool = items.filter(function (x) { var d = diffDays(x.created, today); return d >= 0 && d <= 30; })
    .sort(function (a, b) { return (b.weak || 0) - (a.weak || 0); });
  var days = []; for (var i = 0; i < pool.length; i += cap) days.push(pool.slice(i, i + cap));
  return { total: pool.length, days: days.slice(0, 2), marathon: pool.length > cap, overflow: Math.max(0, pool.length - cap * 2) };
}

/* ---------- streak (rest days are weekday numbers 0-6, Sunday = 0) ---------- */
function missed(last, today, rest) {
  rest = rest || []; var c = 0;
  for (var d = addDays(last, 1); d < today; d = addDays(d, 1)) if (rest.indexOf(weekday(d)) < 0) c++;
  return c;
}
function updateStreak(st, today, rest) {
  st = st || { count: 0, last: null, best: 0 };
  if (st.last === today) return st;
  var count = st.last && missed(st.last, today, rest) === 0 ? st.count + 1 : 1;
  return { count: count, last: today, best: Math.max(st.best || 0, count) };
}
function streakStatus(st, today, rest) {
  if (!st || !st.last) return { count: 0, doneToday: false, atRisk: false, broken: false };
  if (st.last === today) return { count: st.count, doneToday: true, atRisk: false, broken: false };
  var m = missed(st.last, today, rest);
  return { count: m > 0 ? 0 : st.count, doneToday: false, atRisk: m === 0, broken: m > 0 };
}

/* ---------- which CGPA to show ----------
   While results are still being released, the portal's CGPA is the official number.
   The figure worked out from the released results is shown as a projection beside it. */
function pickCgpa(o) {
  var portal = o.portal, computed = o.computed, pending = o.pendingUnits || 0;
  if (portal != null && (pending > 0 || computed == null)) return { value: portal, label: 'Portal CGPA', projected: computed != null ? computed : null };
  if (computed != null) return { value: computed, label: 'Calculated CGPA', projected: null };
  return { value: null, label: 'No results yet', projected: null };
}

var API = { LEVELS: LEVELS, MIN_PER_COURSE: MIN_PER_COURSE, MAX_COURSES: MAX_COURSES, GAPS: GAPS,
  addDays: addDays, diffDays: diffDays, levelFor: levelFor, planDay: planDay, words: words, lockSeconds: lockSeconds,
  splitSections: splitSections, sentences: sentences, mainPoints: mainPoints, questionsFor: questionsFor,
  checkAnswer: checkAnswer, gradeSection: gradeSection, newItem: newItem, advance: advance, dueNow: dueNow,
  isLocked: isLocked, previousSessionQuiz: previousSessionQuiz, recapDue: recapDue, monthlyRecap: monthlyRecap,
  updateStreak: updateStreak, streakStatus: streakStatus, pickCgpa: pickCgpa };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.StudyCore = API;
})(typeof window !== 'undefined' ? window : this);
