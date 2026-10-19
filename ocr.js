/* Academic Summit - ocr.js (consolidation stage 2)
   Replaces: the v67 block of patch.js AND upload-fix.js.
   Load order: academics.js -> ocr.js -> patch.js (v68 reps only)            */
(function () {
  'use strict';
var MODULE_NAME = 'OCR';
try {

  var W = window;

  /* ---------- onboarding: hide "Grad Units" (doOnboard still reads it, empty = 120) ---------- */
  var onbBase = W.authOnboard;
  W.authOnboard = function () {
    onbBase.apply(this, arguments);
    try {
      var u = $('o-units');
      if (u && u.parentNode) {
        u.parentNode.style.display = 'none';
        if (u.parentNode.parentNode) u.parentNode.parentNode.className = 'grid grid-cols-1 gap-2';
      }
    } catch (e) { console.error(e); }
  };
  var editBase = W.openEditSheet;
  W.openEditSheet = function () {
    editBase.apply(this, arguments);
    var e = $('e-t'); if (e) e.placeholder = 'Units needed to graduate (optional)';
  };

  /* ---------- text clean-up (pure functions) ---------- */
  function lev(a, b) {
    var m = [], i, j;
    for (i = 0; i <= a.length; i++) m[i] = [i];
    for (j = 1; j <= b.length; j++) m[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++)
      m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return m[a.length][b.length];
  }
  var TO_NUM = { O: '0', I: '1', L: '1', S: '5', B: '8', Z: '2' };
  var TO_LET = { '0': 'O', '1': 'I', '5': 'S', '8': 'B' };

  function normCode(tok, known) {
    var raw = tok.replace(/[^A-Za-z0-9-]/g, '');
    if (raw.length < 5 || raw.length > 11 || !/\d/.test(raw)) return null;
    var ua = /^UA-?/i.test(raw), t = raw.replace(/^UA-?/i, '').toUpperCase();
    if (t.length < 5 || t.length > 8) return null;
    var num = t.slice(-3).split('').map(function (c) { return /\d/.test(c) ? c : (TO_NUM[c] || '?'); }).join('');
    var pre = t.slice(0, -3);
    if (!/^\d{3}$/.test(num) || !/^[A-Z0-9]{2,5}$/.test(pre)) return null;
    var out = pre;
    if (/\d/.test(pre)) {                        // digits among the letters: O read as 0, or a stray digit
      var asLetters = pre.replace(/\d/g, function (d) { return TO_LET[d] || d; }), dropped = pre.replace(/\d/g, '');
      var best = null, bd = 9;
      [dropped, asLetters].forEach(function (c) {
        if (c.length < 2 || c.length > 4 || /\d/.test(c)) return;
        Object.keys(known).forEach(function (k) { var d = lev(c, k); if (d < bd) { bd = d; best = c; } });
      });
      out = best && bd <= 1 ? best : (/\d/.test(asLetters) ? dropped : asLetters);
      if (out.length < 2 || out.length > 4) return null;
    } else if (!known[pre]) {                    // unknown letters: fix one extra or missing letter only
      Object.keys(known).forEach(function (k) { if (Math.abs(k.length - pre.length) === 1 && lev(pre, k) === 1) out = k; });
    }
    return (ua ? 'UA-' : '') + out + num;
  }
  function fixOcrText(raw) {
    var text = String(raw || '').replace(/\r/g, '').replace(/[~=#_\u2022\u2014]+/g, ' '), known = { GST: 1, GNS: 1 };
    if (typeof PREFIX_DEPT !== 'undefined') Object.keys(PREFIX_DEPT).forEach(function (k) { known[k] = 1; });
    text.replace(/\b(?:UA-)?([A-Z]{2,4})\d{3}\b/g, function (m, p) { known[p] = 1; return m; });
    text = text.replace(/\b(\d{2}\/\d{2,3})([A-Z0-9]{2,6})(\/\d{3,5})\b/g, function (m, a, b, c) {
      return a + b.replace(/0/g, 'O').replace(/1/g, 'I') + c;     // matric 25/209P0S/2056 -> 25/209POS/2056
    });
    return text.split('\n').map(function (line) {
      var t = line.split(' '), isRow = false, i, seen;
      for (i = 0, seen = 0; i < t.length && seen < 4; i++) {
        if (!t[i]) continue;
        seen++;
        var c = normCode(t[i], known);
        if (c) { t[i] = c; isRow = true; }
      }
      return (isRow ? t.map(function (x) { return /^[Cc]c$/.test(x) ? 'C' : /^[a-f]$/.test(x) ? x.toUpperCase() : x; }) : t).join(' ');
    }).join('\n');
  }

  /* ---------- row reading + self-check against the portal's own totals ---------- */
  function ocrRows(text) {
    var rows = [];
    String(text).split('\n').forEach(function (line) {
      var t = line.replace(/[|~=#_\u2022\u2014]+/g, ' ').trim().split(/\s+/);
      for (var i = 0; i < t.length && i < 4; i++) {
        if (!/^(?:UA-)?[A-Z]{2,4}\d{3}$/.test(t[i])) continue;
        var rest = t.slice(i + 1), k = -1, j;
        for (j = 0; j < rest.length - 1; j++) if (/^[1-6]$/.test(rest[j]) && /^[CcEe]{1,2}$/.test(rest[j + 1])) { k = j; break; }
        if (k < 0) return;
        var after = rest.slice(k + 2), row = { code: t[i], unit: +rest[k], score: null, grade: null, gp: null, wgp: null };
        if (after.length && /^\d{1,3}$/.test(after[0])) {
          row.score = +after[0];
          if (after[1] && /^[A-Fa-f][A-Za-z]?$/.test(after[1])) row.grade = after[1][0].toUpperCase();
          var n = after.slice(2).filter(function (x) { return /^\d{1,2}$/.test(x); });
          if (n.length >= 2) { row.gp = +n[0]; row.wgp = +n[1]; } else if (n.length === 1) row.wgp = +n[0];
        }
        rows.push(row);
        return;
      }
    });
    return rows;
  }
  /* A misread digit makes a row disagree with its own grade, GP or the semester total. */
  function verifyOcr(text) {
    var issues = [], groups = typeof semGroupsFromRaw === 'function' ? semGroupsFromRaw(text) : null;
    (groups || [{ section: text }]).forEach(function (g) {
      var rows = ocrRows(g.section), pts = 0, any = false;
      rows.forEach(function (r) {
        if (r.score == null) return;
        var gg = gr(r.score); any = true; pts += r.unit * gg[1];
        if (r.grade && r.grade !== gg[0]) issues.push(r.code + ': score ' + r.score + ' does not match grade ' + r.grade);
        else if (r.gp != null && r.gp !== gg[1]) issues.push(r.code + ': score ' + r.score + ' does not match GP ' + r.gp);
      });
      var m = g.section.match(/^\s*Total\s+(\d{1,3})\s+(\d{1,4})\s*$/m);
      if (m) {
        var units = rows.reduce(function (a, r) { return a + r.unit; }, 0);
        if (+m[1] !== units) issues.push('Semester total: portal says ' + m[1] + ' units, only ' + units + ' were read, so some courses are missing');
        if (any && +m[2] !== pts) issues.push('Semester total: portal says ' + m[2] + ' points, the scores add up to ' + pts);
      }
    });
    var n = ocrRows(text).length;
    if (n < 3) issues.push('Only ' + n + ' course(s) could be read');
    return issues;
  }
  W._ocrTools = { fixOcrText: fixOcrText, verifyOcr: verifyOcr, ocrRows: ocrRows };   // for console testing

  /* ---------- reader (Tesseract, loaded on first use) ---------- */
  var MAX_BYTES = 15 * 1024 * 1024;
  function loadTess() {
    return new Promise(function (res, rej) {
      if (W.Tesseract) return res();
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';
      s.onload = res;
      s.onerror = function () { rej(new Error('Could not load the screenshot reader. Check your connection and try again.')); };
      document.head.appendChild(s);
    });
  }
  /* upscale, greyscale, stretch contrast, flip dark-mode screenshots to dark-on-light */
  function prepImage(file) {
    return new Promise(function (res, rej) {
      var url = URL.createObjectURL(file), img = new Image();
      img.onload = function () {
        var sc = Math.min(4, Math.max(1, 2000 / img.width)), c = document.createElement('canvas');
        c.width = Math.round(img.width * sc); c.height = Math.round(img.height * sc);
        var x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(img, 0, 0, c.width, c.height);
        var d = x.getImageData(0, 0, c.width, c.height), p = d.data, h = new Array(256).fill(0), i, g, sum = 0;
        for (i = 0; i < p.length; i += 4) { g = Math.round(0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]); p[i] = p[i + 1] = p[i + 2] = g; h[g]++; sum += g; }
        var tot = c.width * c.height, inv = sum / tot < 110, lo = 0, hi = 255, a = 0;
        for (i = 0; i < 256; i++) { a += h[i]; if (a > tot * 0.02) { lo = i; break; } }
        for (i = 255, a = 0; i >= 0; i--) { a += h[i]; if (a > tot * 0.02) { hi = i; break; } }
        var rng = Math.max(1, hi - lo);
        for (i = 0; i < p.length; i += 4) { g = Math.max(0, Math.min(255, (p[i] - lo) * 255 / rng)); p[i] = p[i + 1] = p[i + 2] = inv ? 255 - g : g; }
        x.putImageData(d, 0, 0); URL.revokeObjectURL(url); res(c);
      };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('Could not open that image.')); };
      img.src = url;
    });
  }
  function say(msg, bad) { var e = $('ocr-status'); if (e) { e.textContent = msg; e.style.color = bad ? '#e11d48' : ''; } }

  W.ocrPick = async function (input) {
    var files = Array.prototype.slice.call(input.files || []);
    if (!files.length) return;
    try {
      if (files.some(function (f) { return f.size > MAX_BYTES; })) throw new Error('One of those images is over 15 MB. Take a normal screenshot instead.');
      say('Loading the reader (first time only, a few MB)...');
      await loadTess();
      var texts = [], conf = [];
      for (var i = 0; i < files.length; i++) {
        say('Reading screenshot ' + (i + 1) + ' of ' + files.length + '...');
        var r = await W.Tesseract.recognize(await prepImage(files[i]), 'eng', {
          logger: function (m) { if (m.status === 'recognizing text') say('Reading screenshot ' + (i + 1) + ' of ' + files.length + ': ' + Math.round(m.progress * 100) + '%'); }
        });
        texts.push(r.data.text); conf.push(r.data.confidence || 0);
      }
      var text = fixOcrText(texts.join('\n')), avg = conf.reduce(function (a, b) { return a + b; }, 0) / conf.length;
      var ta = $('paste-a'); if (ta) ta.value = text;
      var n = ocrRows(text).length, issues = verifyOcr(text);
      if (!n) return say('No courses found. Zoom in on the results table so the text fills the screen, take a screenshot, and try again.', true);
      if (avg < 65) issues.unshift('The image is blurry or too small');
      if (issues.length) {
        $('paste').classList.remove('hidden');       // let them fix the text in the box
        say('Read ' + n + ' courses, but check these before saving: ' + issues.slice(0, 5).join('; ') + (issues.length > 5 ? '; and ' + (issues.length - 5) + ' more' : '') + '. Fix the text in the box, then tap Parse. A sharper screenshot works better.', true);
      } else {
        say('Read ' + n + ' courses and the totals match the portal.');
        parsePasteTrojan();
      }
    } catch (e) { console.error(e); say(e.message || 'Could not read that image.', true); }
    input.value = '';
  };

  /* ---------- UI: an always-visible card, not buried in the collapsed paste box ---------- */
  function mount() {
    var anchor = document.querySelector('#sub button[onclick*="paste"]');
    if (!anchor || $('ocr-card')) return;
    var card = document.createElement('div');
    card.id = 'ocr-card'; card.className = 'rounded-2xl p-4 space-y-2';
    card.style.cssText = 'background:var(--sub);border:1px solid var(--bd)';
    card.innerHTML = '<div class="font-extrabold text-sm">Import from a screenshot</div>' +
      '<p class="text-[11px] text-slate-500">Zoom in on your portal results table until the text fills the screen, then take a screenshot. Pick two or three together if the table is long.</p>' +
      '<label class="btn w-full" style="cursor:pointer;position:relative">Choose screenshot(s)<input id="ocr-file" type="file" accept="image/*" multiple style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer" onchange="ocrPick(this)"></label>' +
      '<p id="ocr-status" class="text-[11px] font-bold" aria-live="polite"></p>';
    anchor.parentNode.insertBefore(card, anchor);
    anchor.textContent = 'Or paste portal text instead';
  }
  var calcBase = ACAD.calc;
  ACAD.calc = function () {
    calcBase.apply(this, arguments);
    try { mount(); } catch (e) { console.error('ocr mount', e); }
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
