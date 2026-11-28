/* Academic Summit - study-core.js v2
   Pure study logic: no screens, no network, no storage. Plain data in, plain data out,
   so any screen can use it and it can be tested in Termux with: node study-core.test.js

   v2 changes (question generation rewrite):
   - Aggressive cleaning of headers, outlines, page markers, course-code lines.
   - Prefer real academic terms (definitions, comparisons, multi-word concepts)
     over bare months, years, and administrative fluff.
   - Quality gates so "November 2026", "Lecture Today", "COURSE OUTLINE" never become answers.
   - Frequency signal + definitional-pattern boost.
   - Slightly smarter answer checking for multi-word phrases.

   Decisions kept from v1:
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
var NOT_NAME = new RegExp('^(' + MONTHS + '|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)$', 'i');
var STOP = { The:1, This:1, That:1, These:1, Those:1, There:1, Then:1, They:1, His:1, Her:1, Its:1, Our:1,
  But:1, And:1, For:1, From:1, With:1, However:1, Also:1, Thus:1, Because:1, Although:1, When:1, While:1,
  After:1, Before:1, During:1, Some:1, Many:1, Most:1, Each:1, Every:1, One:1, Two:1, Three:1,
  Page:1, Section:1, Course:1, Lecture:1, Notes:1, Outline:1, Unit:1, Chapter:1, Topic:1 };

/* ---------- dates (ISO yyyy-mm-dd, UTC, no timezone surprises) ---------- */
function addDays(s, n) { var d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
function diffDays(a, b) { return Math.round((new Date(b + 'T00:00:00Z') - new Date(a + 'T00:00:00Z')) / 864e5); }
function weekday(s) { return new Date(s + 'T00:00:00Z').getUTCDay(); }

/* ---------- levels and the daily plan ---------- */
function levelFor(perCourseMin) {
  for (var i = LEVELS.length - 1; i >= 0; i--) if (perCourseMin >= LEVELS[i].per) return LEVELS[i];
  return LEVELS[0];
}
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
/* ---------- text cleaning (v2) ---------- */
function cleanMaterial(text) {
  var lines = String(text || '').replace(/\r/g, '').split('\n');
  var kept = [];
  for (var i = 0; i < lines.length; i++) {
    var L = lines[i].trim();
    if (!L) { kept.push(''); continue; }

    if (/^(COURSE\s+OUTLINE|LECTURE\s+NOTES?|PAGE\s+\d+|SECTION\s+\d+\s+of\s+\d+|UNIT\s+\d+|CHAPTER\s+\d+)\s*$/i.test(L)) continue;
    if (/^Question\s+\d+\s+of\s+\d+/i.test(L)) continue;
    if (/^\(?from class\)?\s*$/i.test(L)) continue;
    if (L.length < 35 && L === L.toUpperCase() && /[A-Z]{5,}/.test(L)) continue;

    L = L.replace(/\bextended with contemporary issues to\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b/gi, '');
    L = L.replace(/\bto\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s+COURSE\s+OUTLINE\b/gi, '');
    L = L.replace(/\bCOURSE\s+OUTLINE\s*\(from class\)\s*\d*\.?/gi, '');
    L = L.replace(/\bLECTURE\s+NOTES?\s*(\|?\s*Page\s+\d+)?/gi, '');
    L = L.replace(/\b\d+-unit\s+course\s+notes?\b/gi, '');
    L = L.replace(/\|\s*Africa and Nigeria focus\b/gi, '');
    L = L.replace(/\b\(lecturer'?s?\s+wording[^)]*\)/gi, '');
    L = L.replace(/\bedited for transcription errors\b/gi, '');
    L = L.replace(/\bSection\s+\d+\s+of\s+\d+\s*\|\s*course\s+\d+\s+of\s+\d+/gi, '');
    L = L.replace(/\s{2,}/g, ' ').trim();

    if (L.length < 8) continue;
    kept.push(L);
  }
  return kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

/* ---------- main points ---------- */
function sentences(t) {
  var raw = String(t).replace(/\s+/g, ' ').trim();
  if (!raw) return [];
  raw = raw.replace(/\s*\|\s*/g, '. ').replace(/\s*,\s*Chapter\s+\d+/gi, '. Chapter');
  var parts = raw.match(/[^.!?]+[.!?]+(?=\s|\( )|[^.!?]+ \)/g) || [raw];
  return parts.map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 15; });
}
function clean(w) { return w.replace(/^[("'\[]+|[)"'\],;:.!?]+\( /g, '').replace(/['\u2019]s \)/, ''); }
function isCap(w) { return /^[A-Z][a-z]{2,}$/.test(w) && !STOP[w]; }
function namesIn(s) {
  var toks = s.split(/\s+/), out = [], cur = [];
  function flush() { if (cur.length) out.push(cur.join(' ')); cur = []; }
  for (var i = 0; i < toks.length; i++) {
    var raw = toks[i], w = clean(raw);
    var ok = isCap(w);
    if (!ok && cur.length && /^(of|the|and|in|for|on|to|a|an)$/i.test(w) && i + 1 < toks.length && isCap(clean(toks[i + 1]))) {
      cur.push(w);
      continue;
    }
    if (ok && i === 0 && !isCap(clean(toks[1] || '')) && cur.length === 0) ok = false;
    if (ok) cur.push(w); else flush();
    if (ok && /[,;:.!?)]$/.test(raw)) flush();
  }
  flush();
  return out;
}

function extractTerms(sentence, wholeText) {
  var terms = [];
  var s = sentence;

  namesIn(s).forEach(function (n) {
    if (n.length >= 5 && !NOT_NAME.test(n) && !/^(The|This|That|These|Those|There)\b/i.test(n)) {
      terms.push({ term: n, score: 4 + Math.min(n.split(' ').length * 1.5, 5), kind: 'name' });
    }
  });

  var defPatterns = [
    { re: /\b(?:Foundations?|Scope|Nature|Meaning|Concept|Theory|Principle|Origin|Emergence)\s+of\s+([A-Z][a-zA-Z]*(?:\s+[A-Z]?[a-zA-Z]*){0,3})\b/i, score: 10 },
    { re: /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,3})\s+(?:is|are|refers? to|means|involves?|consists? of|emerged|developed|differs? from)\b/i, score: 9 },
    { re: /\b(?:the\s+)?(?:difference|distinction|relationship|connection)\s+between\s+([A-Z][a-zA-Z]*(?:\s+[A-Z]?[a-zA-Z]*){0,4})\b/i, score: 9 },
    { re: /\b([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,2})\s+(?:and|versus|vs\.?|vs)\s+([A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*){0,2})\b/, score: 8 }
  ];
  defPatterns.forEach(function (p) {
    var m = p.re.exec(s);
    if (m) {
      for (var g = 1; g < m.length; g++) {
        var cand = (m[g] || '').trim().replace(/\s+and\( /, '').replace(/\s+and\s* \)/, '');
        if (cand.length >= 5 && !NOT_NAME.test(cand) && !/^(the|a|an)\s/i.test(cand)) {
          terms.push({ term: cand, score: p.score, kind: 'concept' });
        }
      }
    }
  });

  var histDate = /\b(?:in|since|after|before|during|by|from)\s+(\d{4}|\d{1,2}(?:st|nd|rd|th)?\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})\b/i;
  var hm = histDate.exec(s);
  if (hm && hm[1]) {
    terms.push({ term: hm[1], score: 5, kind: 'date' });
  }

  terms.forEach(function (t) {
    try {
      var re = new RegExp('\\b' + t.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
      var count = (wholeText.match(re) || []).length;
      if (count >= 2) t.score += Math.min(count, 4);
    } catch (e) {}
  });

  var best = {};
  terms.forEach(function (t) {
    var k = t.term.toLowerCase();
    if (!best[k] || t.score > best[k].score) best[k] = t;
  });
  return Object.keys(best).map(function (k) { return best[k]; });
}

function isJunkAnswer(term) {
  if (!term || term.length < 4) return true;
  var t = term.trim();
  if (NOT_NAME.test(t)) return true;
  if (/^(1[0-9]{3}|20[0-9]{2})$/.test(t)) return true;
  if (/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i.test(t)) return true;
  if (/^(Lecture|Notes?|Outline|Page|Section|Course|Unit|Chapter|Today|Tomorrow|Yesterday|Scope|Focus|Notes)$/i.test(t)) return true;
  if (/COURSE\s+OUTLINE/i.test(t)) return true;
  if (/Lecture\s+(Notes?|Today)/i.test(t)) return true;
  if (/\b(and|of|the|to|in|for|on|at|by|with)$/i.test(t)) return true;
  if (t.split(/\s+/).length === 1 && t.length < 6) return true;
  return false;
}

function questionsFor(text, n) {
  n = n || 5;
  var cleaned = cleanMaterial(text);
  if (!cleaned || words(cleaned) < 12) return [];

  var cands = [], seen = {};
  var allSents = sentences(cleaned);

  if (allSents.length < 2 && words(cleaned) >= 15) {
    allSents = [cleaned].concat(allSents);
  }

  allSents.forEach(function (s) {
    var w = words(s);
    if (w < 6 || w > 70) return;
    if (/^(POS|GST|GNS|CSC|MTH)\s*\d{3}/i.test(s) && w < 15) return;

    var terms = extractTerms(s, cleaned);
    terms.sort(function (a, b) { return b.score - a.score; });

    for (var i = 0; i < terms.length; i++) {
      var t = terms[i];
      if (isJunkAnswer(t.term)) continue;
      if (seen[t.term.toLowerCase()]) continue;

      var cloze = s.replace(t.term, '_____');
      if (cloze === s) continue;
      if (cloze.indexOf('_____') === 0 && w < 12) continue;

      seen[t.term.toLowerCase()] = 1;
      cands.push({
        q: cloze,
        a: t.term,
        kind: t.kind,
        src: s,
        score: t.score
      });
      break;
    }
  });

  cands.sort(function (a, b) { return b.score - a.score; });

  if (cands.length <= n) return cands.map(function (c) { return { q: c.q, a: c.a, kind: c.kind, src: c.src }; });

  var out = [], used = {};
  for (var i = 0; i < cands.length && out.length < n; i++) {
    var c = cands[i];
    var key = c.a.toLowerCase();
    if (used[key]) continue;
    used[key] = 1;
    out.push({ q: c.q, a: c.a, kind: c.kind, src: c.src });
  }
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

  if (/\d/.test(a) && /\d/.test(u) === false) return false;
  if (/\d/.test(a)) {
    if (u.indexOf(a) !== -1 || a.indexOf(u) !== -1) return true;
    return false;
  }

  var parts = a.split(' ').filter(function (t) { return t.length >= 4; });
  if (parts.length > 1) {
    var hit = parts.filter(function (t) { return u.indexOf(t) !== -1; }).length;
    if (hit >= Math.ceil(parts.length * 0.6)) return true;
  }

  if (parts.length >= 1 && parts.some(function (t) { return t === u; })) return true;

  if (a.length >= 5 && lev(u, a) <= 1) return true;
  if (a.length >= 9 && lev(u, a) <= 2) return true;
  if (a.length >= 14 && lev(u, a) <= 3) return true;

  return false;
}
function gradeSection(results, passMark) {
  passMark = passMark || 0.6;
  var n = results.length || 1, ok = results.filter(function (r) { return r.ok; }).length;
  var times = results.map(function (r) { return r.ms || 0; }).sort(function (a, b) { return a - b; });
  var med = times[Math.floor(times.length / 2)] || 0, weak = [];
  results.forEach(function (r, i) { if (!r.ok || (med && r.ms > med * 1.5 && r.ms > 8000)) weak.push(i); });
  return { score: ok / n, pass: ok / n >= passMark, weak: weak, medianMs: med };
}
/* ---------- spaced repetition ---------- */
function newItem(o, created) {
  return { id: o.id || (created + '-' + Math.random().toString(36).slice(2, 8)), course: o.course, section: o.section || 0,
    q: o.q, a: o.a, kind: o.kind || 'name', created: created, due: addDays(created, GAPS[0]), phase: 0, weak: o.weak || 0, done: false };
}
function advance(it, ok, ms, today, slowMs) {
  var x = {}; for (var k in it) x[k] = it[k];
  if (ms > (slowMs || 20000)) x.weak = (x.weak || 0) + 1;
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

/* ---------- streak ---------- */
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
function streakFromDays(days, today, rest, repaired) {
  var seen = {}, all = [];
  (days || []).concat(repaired || []).forEach(function (d) { if (d && d <= today && !seen[d]) { seen[d] = 1; all.push(d); } });
  all.sort();
  if (!all.length) return { count: 0, last: null, best: 0 };
  var run = 1, best = 1;
  for (var i = 1; i < all.length; i++) {
    run = missed(all[i - 1], all[i], rest) === 0 ? run + 1 : 1;
    if (run > best) best = run;
  }
  var last = all[all.length - 1];
  var alive = last === today || missed(last, today, rest) === 0;
  return { count: alive ? run : 0, last: last, best: best };
}
function streakStatus(st, today, rest) {
  if (!st || !st.last) return { count: 0, doneToday: false, atRisk: false, broken: false };
  if (st.last === today) return { count: st.count, doneToday: true, atRisk: false, broken: false };
  var m = missed(st.last, today, rest);
  return { count: m > 0 ? 0 : st.count, doneToday: false, atRisk: m === 0, broken: m > 0 };
}

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
  updateStreak: updateStreak, streakStatus: streakStatus, streakFromDays: streakFromDays, pickCgpa: pickCgpa,
  cleanMaterial: cleanMaterial };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.StudyCore = API;
})(typeof window !== 'undefined' ? window : this);
