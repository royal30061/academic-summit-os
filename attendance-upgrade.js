(function(){if(window.__asUpgrade)return;window.__asUpgrade='4';try{console.log('Academic Summit attendance upgrade v4 loaded')}catch(e){}
/* Academic Summit - session-min.js v1
   Ghost-session fix. A class that never reached the minimum head-count is hidden from the lecturer's
   records, and the admin sets that minimum / cleans up from the Admin Panel. The SERVER decides
   (sql/03_min_session_size.sql); this file only shows it. Load AFTER attend-guard.js. */
(function () {
'use strict';
var W = window, MIN = null;
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function toast(m, t) { try { showToast(m, t); } catch (e) {} }
function minSize() {
  return Promise.resolve(sb.rpc('att_min_size')).then(function (r) { if (r && !r.error && typeof r.data === 'number') MIN = r.data; return MIN; }, function () { return MIN; });
}

/* ---------- lecturer: records list shows only classes that reached the minimum ---------- */
W.loadRecs = async function () {
  var list = document.getElementById('rec-list'); if (!list) return;
  list.textContent = 'Loading sessions...';
  try {
    var r = await sb.rpc('my_kept_sessions', { p_limit: 20 });
    if (r.error) throw r.error;
    var m = await minSize();
    if (!r.data || !r.data.length) {
      list.textContent = 'No saved attendance yet. A class is saved once at least ' + Math.max(m || 1, 1) + ' student(s) have marked.';
      return;
    }
    list.innerHTML = r.data.map(function (s) {
      return '<div class="flex justify-between py-2" style="border-top:1px solid var(--bd)"><span><b>' + esc(s.course) + '</b> ' + esc(s.topic || '') +
        '</span><span>' + esc(new Date(s.created_at).toLocaleDateString()) + ' &middot; ' + (+s.present) + ' present</span></div>';
    }).join('');
  } catch (e) { console.error('Records loading failed:', e); list.textContent = 'Could not load records: ' + e.message; }
};

/* ---------- admin: minimum class size + clean-up ---------- */
function paintAdmin() {
  var main = document.getElementById('main'); if (!main) return;
  if (typeof isAdmin === 'function' && !isAdmin()) return;
  var box = document.getElementById('att-min-box');
  if (!box) {
    box = document.createElement('div'); box.id = 'att-min-box';
    var anchor = document.getElementById('att-prot-box');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling);
    else if (main.firstElementChild) main.firstElementChild.appendChild(box); else return;
  }
  box.className = 'card p-6 space-y-3';
  box.innerHTML = '<div class="font-extrabold">Minimum class size</div>' +
    '<p class="text-xs" style="color:var(--mut)">A class with fewer students than this is not saved to the lecturer\'s records. Set 0 to keep everything.</p>' +
    '<div class="flex gap-2 items-center"><input id="att-min-n" type="number" min="0" max="200" class="inp" style="max-width:90px" value="' + (MIN == null ? '' : MIN) + '">' +
    '<button class="btn" onclick="attMinSave()">Save</button><button class="btn2" onclick="attMinClean()">Clean up</button></div>' +
    '<p class="text-[11px]" style="color:var(--mut)">Clean up shows you how many finished classes are below the minimum before anything is deleted.</p>';
}
W.attMinSave = function () {
  var n = parseInt((document.getElementById('att-min-n') || {}).value, 10);
  if (isNaN(n) || n < 0 || n > 200) return toast('Enter a number from 0 to 200', 'error');
  sb.rpc('admin_set_min_session', { p_n: n }).then(function (r) {
    if (r.error) return toast(r.error.message, 'error');
    MIN = r.data; toast('Minimum class size is now ' + MIN); paintAdmin();
  });
};
W.attMinClean = function () {
  sb.rpc('admin_purge_thin_sessions', { p_dry_run: true }).then(function (r) {
    if (r.error) return toast(r.error.message, 'error');
    var d = r.data || {}, total = (d.code_sessions || 0) + (d.qr_sessions || 0);
    if (!total) return toast('Nothing to clean up');
    if (!confirm('Permanently delete ' + total + ' finished class(es) with fewer than ' + d.min + ' students (' + d.code_sessions + ' code, ' + d.qr_sessions + ' QR), including their attendance marks?')) return;
    sb.rpc('admin_purge_thin_sessions', { p_dry_run: false }).then(function (x) {
      toast(x.error ? x.error.message : 'Cleaned up ' + total + ' class(es)', x.error ? 'error' : undefined);
    });
  });
};
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  if (v === 'admin') setTimeout(function () { minSize().then(paintAdmin); paintAdmin(); }, 450);
  return r;
};
})();
/* Academic Summit - export-docs.js v1
   Lecturer exports as a real PDF or a Word file (plus the old CSV, kept as the third choice).
   No libraries, no network. Nothing existing is edited: this file wraps exportRosterCSV, exportRecordsCSV
   and qaCsv, and calls the original for the CSV choice. Load AFTER lecturer.js and attend-qr.js. */
(function () {
'use strict';
var W = window;
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function toast(m, t) { try { showToast(m, t); } catch (e) {} }
function slug(s) { return String(s || 'attendance').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'attendance'; }
function stamp(d) { try { return (d || new Date()).toLocaleString([], { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
function day(d) { var x = d || new Date(); return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); }
function save(blob, name) {
  if (typeof document === 'undefined') return;
  var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(function () { try { URL.revokeObjectURL(a.href); } catch (e) {} }, 4000);
}

/* ---------------- Word (.doc, opens in Word / Google Docs / Pages) ---------------- */
function toWord(m) {
  var th = m.cols.map(function (c) { return '<th style="border:1px solid #999;background:#0f5132;color:#fff;padding:5px;text-align:left;font-size:10pt">' + esc(c) + '</th>'; }).join('');
  var tr = m.rows.map(function (r) {
    return '<tr>' + r.map(function (c) { return '<td style="border:1px solid #bbb;padding:4px;font-size:10pt">' + esc(c) + '</td>'; }).join('') + '</tr>';
  }).join('');
  return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">' +
    '<head><meta charset="utf-8"><title>' + esc(m.title) + '</title></head><body style="font-family:Calibri,Arial,sans-serif">' +
    '<h2 style="color:#0f5132;margin-bottom:2px">' + esc(m.title) + '</h2><p style="color:#555;font-size:10pt;margin-top:0">' + esc(m.sub) + '</p>' +
    '<table style="border-collapse:collapse;width:100%"><tr>' + th + '</tr>' + tr + '</table>' +
    '<p style="color:#777;font-size:9pt">Generated by Academic Summit &middot; ' + esc(stamp()) + '</p></body></html>';
}

/* ---------------- PDF (hand-written, text + table, A4, Helvetica) ---------------- */
function latin(s) { return String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7e\u00a0-\u00ff]/g, '?'); }
function pdfStr(s) { return '(' + latin(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ')'; }
function fit(s, w, size) {                                   // Helvetica averages about 0.5 em per character
  s = latin(s); var n = Math.max(1, Math.floor(w / (size * 0.5)));
  return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '.' : s;
}
function toPDF(m) {
  var PW = 595, PH = 842, MX = 40, TOP = 56, BOT = 50, LH = 16, SZ = 9.5;
  var total = m.cols.length, wsum = (m.w || m.cols.map(function () { return 1; })).reduce(function (a, b) { return a + b; }, 0);
  var usable = PW - 2 * MX, xs = [], ws = [], x = MX;
  (m.w || m.cols.map(function () { return 1; })).forEach(function (w) { var cw = usable * w / wsum; xs.push(x); ws.push(cw); x += cw; });
  var perPage = Math.floor((PH - TOP - BOT - 70) / LH), first = perPage, rest = Math.floor((PH - TOP - BOT - 20) / LH);
  var pages = [], i = 0, take = first;
  do { pages.push(m.rows.slice(i, i + take)); i += take; take = rest; } while (i < m.rows.length);
  var N = pages.length;
  function text(sz, bold, px, py, s) { return 'BT /' + (bold ? 'F2' : 'F1') + ' ' + sz + ' Tf ' + px.toFixed(1) + ' ' + py.toFixed(1) + ' Td ' + pdfStr(s) + ' Tj ET\n'; }
  function headRow(y) {
    var o = '0.06 0.32 0.20 rg ' + MX + ' ' + (y - 4) + ' ' + usable + ' ' + LH + ' re f 1 1 1 rg\n';
    m.cols.forEach(function (c, k) { o += text(SZ, true, xs[k] + 3, y, fit(c, ws[k] - 6, SZ)); });
    return o + '0 0 0 rg\n';
  }
  var contents = pages.map(function (rows, p) {
    var o = '', y = PH - TOP;
    if (p === 0) {
      o += '0.06 0.32 0.20 rg\n' + text(18, true, MX, y, m.title) + '0.35 0.35 0.35 rg\n' + text(10, false, MX, y - 18, m.sub) + '0 0 0 rg\n';
      y -= 50;
    }
    o += headRow(y); y -= LH;
    rows.forEach(function (r, k) {
      if (k % 2 === 1) o += '0.94 0.97 0.95 rg ' + MX + ' ' + (y - 4) + ' ' + usable + ' ' + LH + ' re f 0 0 0 rg\n';
      r.forEach(function (c, j) { o += text(SZ, false, xs[j] + 3, y, fit(c, ws[j] - 6, SZ)); });
      y -= LH;
    });
    if (!rows.length) o += text(SZ, false, MX + 3, y, 'No records.');
    o += '0.45 0.45 0.45 rg\n' + text(8, false, MX, 28, 'Academic Summit  -  ' + latin(stamp())) + text(8, false, PW - MX - 46, 28, 'Page ' + (p + 1) + ' of ' + N) + '0 0 0 rg\n';
    return o;
  });
  // objects: 1 catalog, 2 pages, 3 font, 4 bold font, then (page, content) pairs
  var objs = [];
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  var kids = [];
  contents.forEach(function (c, p) {
    var pid = 5 + p * 2, cid = pid + 1; kids.push(pid + ' 0 R');
    objs[pid] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + cid + ' 0 R >>';
    objs[cid] = '<< /Length ' + c.length + ' >>\nstream\n' + c + 'endstream';
  });
  objs[2] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + N + ' >>';
  var out = '%PDF-1.4\n', offs = [];
  for (var n = 1; n < objs.length; n++) { offs[n] = out.length; out += n + ' 0 obj\n' + objs[n] + '\nendobj\n'; }
  var xr = out.length;
  out += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
  for (n = 1; n < objs.length; n++) out += ('0000000000' + offs[n]).slice(-10) + ' 00000 n \n';
  out += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF';
  var bytes = new Uint8Array(out.length);
  for (var q = 0; q < out.length; q++) bytes[q] = out.charCodeAt(q) & 255;
  return bytes;
}

/* ---------------- choice sheet ---------------- */
function choose(m, csv, base) {
  if (typeof document === 'undefined') return;
  var old = document.getElementById('xd-ov'); if (old) old.remove();
  var ov = document.createElement('div'); ov.id = 'xd-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:12px';
  ov.innerHTML = '<div class="card p-5 space-y-3" style="width:100%;max-width:420px"><div class="font-extrabold">Export attendance</div>' +
    '<p class="text-xs" style="color:var(--mut)">' + esc(m.title) + ' &middot; ' + m.rows.length + ' row(s)</p>' +
    '<button class="btn w-full" data-k="pdf">PDF document</button><button class="btn w-full" data-k="doc">Word document</button>' +
    (csv ? '<button class="btn2 w-full" data-k="csv">Spreadsheet (CSV)</button>' : '') + '<button class="btn2 w-full" data-k="x">Cancel</button></div>';
  ov.addEventListener('click', function (e) {
    var k = e.target && e.target.getAttribute && e.target.getAttribute('data-k');
    if (e.target === ov) k = 'x';
    if (!k) return;
    ov.remove();
    try {
      if (k === 'pdf') { save(new Blob([toPDF(m)], { type: 'application/pdf' }), base + '.pdf'); toast('PDF saved'); }
      else if (k === 'doc') { save(new Blob(['\ufeff' + toWord(m)], { type: 'application/msword' }), base + '.doc'); toast('Word file saved'); }
      else if (k === 'csv' && csv) csv();
    } catch (err) { console.error('export', err); toast('Could not create the file: ' + err.message, 'error'); }
  });
  document.body.appendChild(ov);
}

W.__asDocs = { toPDF: toPDF, toWord: toWord, choose: choose, slug: slug, day: day, stamp: stamp };
if (typeof document === 'undefined') return;

/* ---------------- wiring (each wrapper keeps the original for CSV) ---------------- */
var csvRoster = W.exportRosterCSV, csvRecs = W.exportRecordsCSV, csvQr = W.qaCsv;

W.exportRosterCSV = function () {
  var rows = (typeof rosterRows !== 'undefined' && rosterRows) || [];
  if (!rows.length) return toast('No attendance to export yet', 'error');
  var course = (rows[0].course || (rows[0].sessions && rows[0].sessions.course) || '');
  var m = {
    title: 'Attendance roster' + (course ? ' - ' + course : ''), sub: rows.length + ' present  |  exported ' + stamp(),
    cols: ['No', 'Name', 'Matric', 'Time', 'Method'], w: [0.6, 3, 2.4, 2.4, 1],
    rows: rows.map(function (r, i) {
      var p = r.profiles || {};
      return [i + 1, p.name || '', p.matric || '', r.marked_at ? new Date(r.marked_at).toLocaleString() : '', r.method === 'manual' ? 'Manual' : 'Code'];
    })
  };
  choose(m, csvRoster, slug(course) + '-roster-' + day());
};

W.exportRecordsCSV = async function () {
  var r = await sb.rpc('my_kept_sessions', { p_limit: 200 });
  if (r.error || !r.data || !r.data.length) return toast('No saved attendance to export yet', 'error');
  var m = {
    title: 'Attendance records', sub: r.data.length + ' class(es)  |  exported ' + stamp(),
    cols: ['Course', 'Topic', 'Date', 'Present'], w: [1.6, 3, 2.2, 1],
    rows: r.data.map(function (s) { return [s.course || '', s.topic || '', new Date(s.created_at).toLocaleString(), +s.present]; })
  };
  choose(m, csvRecs, 'attendance-records-' + day());
};

W.qaCsv = function () {
  var f = W._qaFinal; if (!f || !f.rows) return;
  var m = {
    title: 'QR attendance - ' + f.course, sub: f.rows.length + ' present  |  exported ' + stamp(),
    cols: ['No', 'Name', 'Matric', 'Time', 'Distance (m)'], w: [0.6, 3, 2.4, 2.4, 1.4],
    rows: f.rows.map(function (x, i) { return [i + 1, x.name || '', x.matric || '', x.marked_at ? new Date(x.marked_at).toLocaleString() : '', x.distance_m == null ? '' : x.distance_m]; })
  };
  choose(m, csvQr, slug(f.course) + '-qr-' + day());
};

/* the buttons still say "CSV": relabel them (text only, onclick untouched) */
var pend = null;
function relabel() {
  pend = null;
  var bs = document.querySelectorAll('button[onclick*="exportRosterCSV"],button[onclick*="exportRecordsCSV"],button[onclick*="qaCsv"]');
  Array.prototype.forEach.call(bs, function (b) { if (/CSV/i.test(b.textContent)) b.textContent = b.textContent.replace(/(Download|Export)?\s*CSV/i, 'Export PDF / Word'); });
}
try { new MutationObserver(function () { if (!pend) pend = setTimeout(relabel, 300); }).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
})();
/* Academic Summit - student-attend.js v1
   The student's own attendance record: per-course percentage against the pass mark, how many more classes
   are needed, and every mark with its time, tap-to-review. Replaces the old "My attendance" list only;
   if the server call fails, the old list is shown exactly as before. Load AFTER attend-guard.js. */
(function () {
'use strict';
var W = window;
function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function norm(c) { return String(c || '').toUpperCase().replace(/\s+/g, ''); }

/* pure: report from the server -> one row per course */
function compute(rep, mine) {
  var pass = +rep.pct || 70, per = {};
  (rep.held || []).forEach(function (h) { var c = norm(h.course); (per[c] = per[c] || { c: c, held: 0, att: 0 }).held++; });
  (rep.marks || []).forEach(function (m) { var c = norm(m.course); (per[c] = per[c] || { c: c, held: 0, att: 0 }).att++; });
  var want = {}; (mine || []).forEach(function (c) { want[norm(c)] = 1; });
  return Object.keys(per).map(function (k) {
    var p = per[k]; p.held = Math.max(p.held, p.att);              // never show more attended than held
    p.pct = p.held ? Math.round(100 * p.att / p.held) : 0;
    p.ok = p.held > 0 && 100 * p.att >= pass * p.held;
    var need = 0; if (!p.ok && pass < 100) need = Math.max(0, Math.ceil((pass / 100 * p.held - p.att) / (1 - pass / 100) - 1e-9));
    p.need = need; p.pass = pass; p.reg = !!want[k]; return p;
  }).filter(function (p) { return p.held > 0; }).sort(function (a, b) { return a.pct - b.pct; });
}
function when(x) { try { return new Date(x).toLocaleString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
function where(m) {
  if (m.method === 'manual') return 'Added by your lecturer (no location)';
  if (m.in_range === true) return 'Inside the class range when you marked (confirmed by the system)' + (m.distance_m != null ? ', about ' + m.distance_m + ' m from the lecturer' : '');
  if (m.in_range === false) return 'Outside the class range when you marked' + (m.distance_m != null ? ' (about ' + m.distance_m + ' m from the lecturer)' : '');
  if (m.distance_m != null) return 'About ' + m.distance_m + ' m from the lecturer' + (m.accuracy_m ? ' (GPS \u00b1' + m.accuracy_m + ' m)' : '');
  return 'No location was recorded for this mark';
}
function paint(box, rep, mine) {
  var rows = compute(rep, mine), pass = +rep.pct || 70;
  var h = '<div class="text-[11px]" style="color:var(--mut)">You need at least <b>' + pass + '%</b> attendance in each course to sit the exam.</div>';
  if (!rows.length) h += '<div>No classes recorded for your courses yet. Your marks will appear here.</div>';
  h += rows.map(function (p) {
    var col = p.ok ? '#16a34a' : (p.pct >= pass - 10 ? '#d97706' : '#dc2626');
    var msg = p.ok ? 'On track' : (p.need ? 'Attend the next ' + p.need + ' class' + (p.need > 1 ? 'es' : '') + ' to reach ' + pass + '%' : 'Below ' + pass + '%');
    return '<div class="card p-3 space-y-1.5"><div class="flex justify-between items-baseline"><b class="text-sm">' + E(p.c) + '</b><b class="text-sm" style="color:' + col + '">' + p.pct + '%</b></div>' +
      '<div style="height:8px;border-radius:6px;background:var(--sub);overflow:hidden;position:relative"><div style="width:' + Math.min(100, p.pct) + '%;height:100%;background:' + col + '"></div>' +
      '<div style="position:absolute;left:' + pass + '%;top:0;bottom:0;width:2px;background:var(--mut)"></div></div>' +
      '<div class="flex justify-between text-[11px]" style="color:var(--mut)"><span>' + p.att + ' of ' + p.held + ' classes</span><span style="color:' + col + '">' + E(msg) + '</span></div></div>';
  }).join('');
  var ms = rep.marks || [];
  if (ms.length) {
    h += '<div class="font-bold pt-2">My marks</div>' + ms.slice(0, 60).map(function (m) {
      return '<details class="py-1.5" style="border-top:1px solid var(--bd)"><summary class="flex justify-between cursor-pointer"><span><b>' + E(norm(m.course)) + '</b> <span style="color:var(--mut)">' + E(m.topic || '') +
        '</span></span><span style="color:var(--mut)">' + E(when(m.at)) + '</span></summary><div class="text-[11px] pt-1" style="color:var(--mut)">Marked: ' + E(when(m.at)) +
        '<br>Method: ' + (m.kind === 'qr' ? 'QR scan' : (m.method === 'manual' ? 'Added manually' : '5-digit code')) + '<br>Where: ' + E(where(m)) + '</div></details>';
    }).join('');
  }
  box.className = 'space-y-2 text-xs'; box.innerHTML = h;
}
function mineCourses() {
  var out = [], ss = (typeof U !== 'undefined' && U && U.semesters) || [], s = ss[ss.length - 1];
  if (s && s.courses) s.courses.forEach(function (c) { if (c && c.code) out.push(String(c.code)); });
  return out;
}
W.__asAtt = { compute: compute };
if (typeof document === 'undefined') return;

var orig = W.attHistory, key = function () { return 'as_attrep_' + (typeof uid !== 'undefined' ? uid : ''); };
W.attHistory = function () {
  var box = document.getElementById('att-hist'); if (!box) return;
  var mine = mineCourses();
  function fallback() { if (typeof orig === 'function') orig(); }
  try {
    Promise.resolve(sb.rpc('my_attendance_report', { p_courses: mine })).then(function (r) {
      if (r && !r.error && r.data && Array.isArray(r.data.marks)) {
        try { localStorage.setItem(key(), JSON.stringify(r.data)); } catch (e) {}
        var b = document.getElementById('att-hist'); if (b) paint(b, r.data, mine);
      } else {
        var c = null; try { c = JSON.parse(localStorage.getItem(key())); } catch (e) {}
        var b2 = document.getElementById('att-hist');
        if (c && b2) { paint(b2, c, mine); b2.insertAdjacentHTML('afterbegin', '<div class="text-[11px]" style="color:var(--mut)">Offline - showing your last saved record.</div>'); } else fallback();
      }
    }, fallback);
  } catch (e) { fallback(); }
};
})();
/* Academic Summit - records-ui.js v1
   Lecturer Records redesign: one card per class that actually happened, each with its own "View list" button
   that opens that class's attendance list (name, matric, time, in-range tick) with PDF / Word / CSV export.
   Also slims the Roster table to fit a phone. Falls back to direct table reads if the SQL upgrade is not run yet. */
(function () {
'use strict';
var W = window, SESS = [], OPEN = null;
function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function toast(m, t) { try { showToast(m, t); } catch (e) {} }
function T(d) { try { return new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
function DT(d) { try { return new Date(d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) + ' \u00b7 ' + T(d); } catch (e) { return ''; } }
function mk(m) { var s = String(m || '').toUpperCase(); return { g: (s.match(/\/([A-Z]{2,6})\//) || [])[1] || (s.match(/[A-Z]{2,6}/) || [])[0] || 'ZZZ', n: (s.match(/\d+/g) || ['0']).map(Number) }; }
function sortM(rows) {
  return rows.slice().sort(function (a, b) {
    var A = mk(a.profiles && a.profiles.matric), B = mk(b.profiles && b.profiles.matric);
    if (A.g !== B.g) return A.g < B.g ? -1 : 1;
    for (var i = 0, L = Math.max(A.n.length, B.n.length); i < L; i++) { var x = A.n[i] || 0, y = B.n[i] || 0; if (x !== y) return x - y; }
    return 0;
  });
}
function csvCell(v) { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }

LECTURER_VIEWS.records = function () {
  return '<div class="space-y-4"><div class="flex justify-between items-center"><div class="font-extrabold text-xl">Attendance Records</div>' +
    '<button class="btn2" onclick="exportRecordsCSV()">Export all</button></div>' +
    '<div id="rec-list" class="space-y-2 text-xs" style="color:var(--mut)">Loading...</div></div>';
};

async function fetchSessions() {
  var r = await sb.rpc('my_kept_sessions', { p_limit: 60 });
  if (!r.error && r.data) return r.data.map(function (s) { return { id: s.id, course: s.course, topic: s.topic, created_at: s.created_at, present: +s.present }; });
  // fallback (SQL 03 not run yet): read directly and hide classes nobody marked
  var q = await sb.from('sessions').select('id, course, topic, created_at').eq('lecturer_id', uid).order('created_at', { ascending: false }).limit(60);
  if (q.error) throw q.error;
  var out = await Promise.all((q.data || []).map(function (s) {
    return sb.from('attendance').select('session_id', { count: 'exact', head: true }).eq('session_id', s.id).then(function (c) {
      s.present = c && c.count != null ? c.count : 0; return s;
    });
  }));
  return out.filter(function (s) { return s.present >= 1; });
}

W.loadRecs = async function () {
  var list = document.getElementById('rec-list'); if (!list) return;
  OPEN = null; list.style.color = 'var(--mut)'; list.textContent = 'Loading classes...';
  try {
    SESS = await fetchSessions();
    if (!SESS.length) { list.textContent = 'No saved attendance yet. A class appears here once students have marked.'; return; }
    list.style.color = '';
    list.innerHTML = SESS.map(function (s) {
      return '<div class="card p-3 flex items-center justify-between gap-3"><div style="min-width:0"><div class="font-bold text-sm">' + E(s.course) + '</div>' +
        '<div class="text-[11px]" style="color:var(--mut)">' + (s.topic ? E(s.topic) + ' \u00b7 ' : '') + E(DT(s.created_at)) + '</div></div>' +
        '<div class="text-right shrink-0"><div class="text-xs font-bold" style="color:#16a34a">' + s.present + ' present</div>' +
        '<button class="btn2 mt-1" onclick="recOpen(\'' + E(s.id) + '\')">View list</button></div></div>';
    }).join('');
  } catch (e) { console.error('Records loading failed:', e); list.textContent = 'Could not load records: ' + e.message; }
};

W.recOpen = async function (id) {
  var list = document.getElementById('rec-list'); if (!list) return;
  var s = SESS.filter(function (x) { return x.id === id; })[0] || { id: id, course: '', created_at: '' };
  list.style.color = 'var(--mut)'; list.textContent = 'Loading list...';
  try {
    var r = await sb.from('attendance').select('*, profiles(matric,name)').eq('session_id', id).order('marked_at', { ascending: true });
    if (r.error) throw r.error;
    var rows = sortM(r.data || []);
    OPEN = { s: s, rows: rows };
    list.style.color = '';
    list.innerHTML = '<button class="btn2" onclick="loadRecs()">\u2190 All classes</button>' +
      '<div class="card p-4 space-y-3"><div class="flex justify-between items-start gap-2"><div><div class="font-extrabold">' + E(s.course) + '</div>' +
      '<div class="text-[11px]" style="color:var(--mut)">' + (s.topic ? E(s.topic) + ' \u00b7 ' : '') + E(DT(s.created_at)) + '</div></div>' +
      '<div class="text-xs font-bold" style="color:#16a34a">' + rows.length + ' present</div></div>' +
      '<button class="btn w-full" onclick="recExport()">Export (PDF / Word / CSV)</button>' +
      '<table class="w-full text-left text-xs"><thead><tr style="color:var(--mut)"><th class="py-2 pr-2">#</th><th class="pr-2">Name</th><th class="pr-2">Matric</th><th>Time</th></tr></thead><tbody>' +
      (rows.map(function (x, i) {
        var p = x.profiles || {};
        return '<tr style="border-top:1px solid var(--bd)"><td class="py-2 pr-2">' + (i + 1) + '</td><td class="pr-2">' + E(p.name || '\u2014') + '</td><td class="pr-2 font-mono">' + E(p.matric || '\u2014') +
          '</td><td>' + E(T(x.marked_at)) + (x.in_range === true ? ' <span style="color:#16a34a" title="Inside class range">\u2713</span>' : '') + (x.method === 'manual' ? ' <span style="color:var(--mut)">(M)</span>' : '') + '</td></tr>';
      }).join('') || '<tr><td colspan="4" class="py-3">Nobody has marked this class.</td></tr>') + '</tbody></table>' +
      (rows.some(function (x) { return x.in_range === true; }) ? '<div class="text-[11px]" style="color:var(--mut)">\u2713 = confirmed inside the class range.</div>' : '') + '</div>';
  } catch (e) { console.error('recOpen', e); list.textContent = 'Could not load this list: ' + e.message; }
};

W.recExport = function () {
  var D = W.__asDocs; if (!OPEN || !D || !D.choose) return toast('Nothing to export', 'error');
  var s = OPEN.s, rows = OPEN.rows;
  var m = {
    title: 'Attendance - ' + (s.course || ''), sub: (s.topic ? s.topic + '  |  ' : '') + DT(s.created_at) + '  |  ' + rows.length + ' present',
    cols: ['No', 'Name', 'Matric', 'Time', 'In range'], w: [0.6, 3, 2.4, 1.4, 1.2],
    rows: rows.map(function (x, i) { var p = x.profiles || {}; return [i + 1, p.name || '', p.matric || '', T(x.marked_at), x.in_range === true ? 'Yes' : (x.in_range === false ? 'No' : '')]; })
  };
  var csv = function () {
    var lines = ['No,Name,Matric,Time,In range'].concat(m.rows.map(function (r) { return r.map(csvCell).join(','); }));
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' }));
    a.download = D.slug(s.course) + '-' + D.day(new Date(s.created_at)) + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  };
  D.choose(m, csv, D.slug(s.course) + '-' + D.day(new Date(s.created_at)));
};

/* Roster tab: Name, Matric, Time (fits a phone, no sideways scroll) */
var paintBase = W.paintRoster;
W.paintRoster = function () {
  var body = document.getElementById('roster-body');
  try {
    if (!body || typeof rosterRows === 'undefined') throw 0;
    var th = body.parentNode && body.parentNode.querySelector('thead tr');
    if (th) th.innerHTML = '<th class="p-3">#</th><th class="p-3">Name</th><th class="p-3">Matric</th><th class="p-3">Time</th>';
    body.innerHTML = rosterRows.map(function (r, i) {
      var p = r.profiles || {};
      return '<tr><td class="p-3">' + (i + 1) + '</td><td class="p-3 text-xs">' + E(p.name || '\u2014') + '</td><td class="p-3 font-mono text-xs">' + E(p.matric || '\u2014') +
        '</td><td class="p-3 text-xs">' + E(T(r.marked_at || r.created_at)) + (r.in_range === true ? ' <span style="color:#16a34a">\u2713</span>' : '') + (r.method === 'manual' ? ' (M)' : '') + '</td></tr>';
    }).join('') || '<tr><td class="p-3" colspan="4" style="color:var(--mut)">No attendance recorded yet.</td></tr>';
  } catch (e) { if (typeof paintBase === 'function') paintBase.apply(this, arguments); }
};
})();
/* Academic Summit - lec-planner.js v1
   1) Lecturer Planner is back (bottom-nav tab + screen): weekly slots, dated classes / no-class days.
   2) Class notices: a lecturer sends a notice for a course they registered, to chosen levels (and optionally
      departments). Students only see it if the course is in their uploaded registration and the level matches.
   3) Admin Panel switch to turn class notices on/off.
   The server decides who receives what (sql/06_class_notices.sql); this file only asks and displays. */
(function () {
'use strict';
var W = window, ON = null, SYNCED = '', DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], LV = [100, 200, 300, 400, 500];
function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function toast(m, t) { try { showToast(m, t); } catch (e) {} }
function norm(c) { return String(c || '').toUpperCase().replace(/\s+/g, ''); }
function isLec() { return typeof U !== 'undefined' && U && U.role === 'lecturer'; }
function L() { U.lec = U.lec || {}; U.lec.plan2 = U.lec.plan2 || []; U.lec.sched = U.lec.sched || []; return U.lec; }
function courses() { return ((U.lec && U.lec.courses) || []).filter(function (c) { return c && c.code; }); }
function whenTxt(iso) { try { var d = new Date(iso); return d.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }) + ' \u00b7 ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
function noticesOn() {
  return Promise.resolve(sb.rpc('class_notices_on')).then(function (r) { if (r && !r.error && typeof r.data === 'boolean') ON = r.data; return ON; }, function () { return ON; });
}
function syncCourses() {
  var cs = courses(), key = JSON.stringify(cs.map(function (c) { return [c.code, c.level, c.dept]; }));
  if (!cs.length || key === SYNCED) return Promise.resolve(true);
  return Promise.resolve(sb.rpc('sync_my_courses', { p_courses: cs })).then(function (r) { if (r && !r.error) { SYNCED = key; return true; } return false; }, function () { return false; });
}

/* ================= lecturer: planner ================= */
var draft = { kind: 'class', levels: [] };
LECTURER_VIEWS.plan = function () { return '<div id="lp-root" class="space-y-4"></div>'; };

function paintPlan() {
  var root = document.getElementById('lp-root'); if (!root) return;
  var cs = courses(), l = L(), h = '<div class="font-extrabold text-xl">Class planner</div>';
  if (!cs.length) {
    root.innerHTML = h + '<div class="card p-5 space-y-2"><div class="font-bold text-sm">Register the courses you teach first</div>' +
      '<p class="text-xs" style="color:var(--mut)">Notices can only go out for courses in your teaching profile, so students in other departments never see a class that is not theirs.</p>' +
      '<button class="btn w-full" onclick="ls2Open()">Open teaching profile</button></div>';
    return;
  }
  var today = (new Date().getDay() + 6) % 7;
  /* weekly timetable */
  h += '<div class="card p-4 space-y-2"><div class="font-bold">Weekly timetable</div>' + (l.sched.length ? l.sched.slice().sort(function (a, b) { return a.day - b.day || (a.start > b.start ? 1 : -1); }).map(function (s, i) {
    return '<div class="flex justify-between items-center text-xs py-1" style="border-top:1px solid var(--bd)"><span><b>' + DAYS[s.day] + '</b> ' + E(s.start) + '-' + E(s.end) + ' \u00b7 ' + E(s.code) +
      (s.day === today ? ' <span style="color:#16a34a;font-weight:700">today</span>' : '') + '</span><button class="text-rose-500 font-bold" onclick="lpSlotDel(' + l.sched.indexOf(s) + ')">Remove</button></div>';
  }).join('') : '<div class="text-xs" style="color:var(--mut)">No weekly slots yet.</div>') +
    '<div class="grid grid-cols-4 gap-2 pt-2"><select id="lp-sd" class="inp">' + DAYS.map(function (d, i) { return '<option value="' + i + '">' + d + '</option>'; }).join('') + '</select>' +
    '<input id="lp-ss" type="time" class="inp" value="08:00"><input id="lp-se" type="time" class="inp" value="10:00">' +
    '<select id="lp-sc" class="inp">' + cs.map(function (c) { return '<option>' + E(c.code) + '</option>'; }).join('') + '</select></div>' +
    '<button class="btn2 w-full" onclick="lpSlotAdd()">Add weekly slot</button></div>';
  /* new dated entry */
  var cur = draft.course || cs[0].code, cobj = cs.filter(function (c) { return c.code === cur; })[0] || cs[0];
  if (!draft.levels.length && parseInt(cobj.level, 10)) draft.levels = [parseInt(cobj.level, 10)];
  h += '<div class="card p-4 space-y-3"><div class="font-bold">Plan a class or a no-class day</div>' +
    '<div class="grid grid-cols-2 gap-2"><button class="' + (draft.kind === 'class' ? 'btn' : 'btn2') + '" onclick="lpKind(\'class\')">Class holds</button><button class="' + (draft.kind === 'noclass' ? 'btn' : 'btn2') + '" onclick="lpKind(\'noclass\')">No class</button></div>' +
    '<select id="lp-c" class="inp uppercase font-mono font-bold" onchange="lpCourse(this.value)">' + cs.map(function (c) { return '<option' + (c.code === cur ? ' selected' : '') + '>' + E(c.code) + '</option>'; }).join('') + '</select>' +
    '<div class="grid grid-cols-2 gap-2"><input id="lp-d" type="date" class="inp" value="' + E(draft.date || '') + '"><input id="lp-t" type="time" class="inp" value="' + E(draft.time || '10:00') + '"></div>' +
    '<input id="lp-v" class="inp" placeholder="Venue (e.g. LT2)" value="' + E(draft.venue || '') + '">' +
    '<div><div class="lbl mb-1">Levels this affects</div><div class="flex flex-wrap gap-2">' + LV.map(function (v) {
      var on = draft.levels.indexOf(v) > -1; return '<button type="button" class="' + (on ? 'btn' : 'btn2') + '" style="padding:6px 12px" onclick="lpLevel(' + v + ')">' + v + '</button>'; }).join('') + '</div></div>' +
    '<div><div class="lbl mb-1">Departments (optional)</div><input id="lp-dp" class="inp" placeholder="e.g. Economics, Sociology, Political Science" value="' + E(draft.depts || '') + '">' +
    '<p class="text-[11px] pt-1" style="color:var(--mut)">Leave blank for a shared course (like GST): every student who registered it at the chosen levels is told.</p></div>' +
    '<input id="lp-n" class="inp" placeholder="Note (optional)" value="' + E(draft.note || '') + '">' +
    '<button class="btn w-full" onclick="lpAdd()">Save to planner</button></div>';
  /* upcoming list */
  var up = l.plan2.slice().sort(function (a, b) { return a.at > b.at ? 1 : -1; });
  h += '<div class="card p-4 space-y-2"><div class="font-bold">Upcoming</div>' + (up.length ? up.map(function (e) {
    var idx = l.plan2.indexOf(e), no = e.kind === 'noclass';
    return '<div class="py-2 space-y-1" style="border-top:1px solid var(--bd)"><div class="flex justify-between"><b class="text-sm">' + E(e.course) + '</b><span class="text-xs font-bold" style="color:' + (no ? '#dc2626' : '#16a34a') + '">' + (no ? 'No class' : 'Class') + '</span></div>' +
      '<div class="text-[11px]" style="color:var(--mut)">' + E(whenTxt(e.at)) + (e.venue ? ' \u00b7 ' + E(e.venue) : '') + ' \u00b7 ' + e.levels.join('/') + 'L' + (e.depts ? ' \u00b7 ' + E(e.depts) : '') + (e.note ? '<br>' + E(e.note) : '') + '</div>' +
      '<div class="flex gap-2">' + (ON === false ? '<span class="text-[11px]" style="color:var(--mut)">Notices are switched off</span>' :
        '<button class="btn2" onclick="lpSend(' + idx + ')">' + (e.noticeId ? 'Resend notice' : 'Send notice to students') + '</button>') +
      '<button class="btn2" style="color:#e11d48" onclick="lpDel(' + idx + ')">Delete</button></div>' + (e.noticeId ? '<div class="text-[11px]" style="color:#16a34a">Notice sent</div>' : '') + '</div>';
  }).join('') : '<div class="text-xs" style="color:var(--mut)">Nothing planned yet.</div>') + '</div>';
  root.innerHTML = h;
}
function keep() {            // keep what was typed when the form repaints
  var g = function (id) { var x = document.getElementById(id); return x ? x.value : ''; };
  if (!document.getElementById('lp-d')) return;
  draft.date = g('lp-d'); draft.time = g('lp-t'); draft.venue = g('lp-v'); draft.depts = g('lp-dp'); draft.note = g('lp-n');
}
W.lpKind = function (k) { keep(); draft.kind = k; paintPlan(); };
W.lpCourse = function (c) { keep(); draft.course = c; draft.levels = []; paintPlan(); };
W.lpLevel = function (v) { keep(); var i = draft.levels.indexOf(v); if (i > -1) draft.levels.splice(i, 1); else draft.levels.push(v); paintPlan(); };
W.lpSlotAdd = function () {
  var g = function (id) { return document.getElementById(id).value; };
  if (g('lp-ss') >= g('lp-se')) return toast('End time must be after start time', 'error');
  L().sched.push({ day: +g('lp-sd'), start: g('lp-ss'), end: g('lp-se'), code: g('lp-sc') }); save(); paintPlan();
};
W.lpSlotDel = function (i) { L().sched.splice(i, 1); save(); paintPlan(); };
W.lpAdd = function () {
  keep(); var course = (document.getElementById('lp-c') || {}).value;
  if (!draft.date) return toast('Choose the date', 'error');
  if (!draft.levels.length) return toast('Choose at least one level', 'error');
  var at = new Date(draft.date + 'T' + (draft.time || '10:00'));
  if (isNaN(at)) return toast('Check the date and time', 'error');
  L().plan2.push({ id: Date.now().toString(36), kind: draft.kind, course: course, at: at.toISOString(), venue: draft.venue.trim(), levels: draft.levels.slice().sort(), depts: draft.depts.trim(), note: draft.note.trim() });
  draft = { kind: draft.kind, course: course, levels: draft.levels.slice() }; save(); paintPlan(); toast('Saved to your planner');
};
W.lpDel = function (i) {
  var e = L().plan2[i]; if (!e) return;
  if (!confirm('Delete this entry' + (e.noticeId ? ' and withdraw its notice from students' : '') + '?')) return;
  if (e.noticeId) sb.rpc('delete_class_notice', { p_id: e.noticeId });
  L().plan2.splice(i, 1); save(); paintPlan();
};
W.lpSend = async function (i) {
  var e = L().plan2[i]; if (!e) return;
  if (!(await syncCourses())) return toast('Could not check your registered courses. Check your connection and try again.', 'error');
  var r = await sb.rpc('send_class_notice', {
    p_course: e.course, p_levels: e.levels, p_depts: e.depts ? e.depts.split(',').map(function (x) { return x.trim(); }).filter(Boolean) : [],
    p_starts: e.at, p_venue: e.venue || null, p_note: e.note || null, p_kind: e.kind });
  if (r.error) return toast(r.error.message, 'error');
  if (e.noticeId) sb.rpc('delete_class_notice', { p_id: e.noticeId });   // a resend replaces the old notice
  e.noticeId = r.data; save(); paintPlan(); toast('Notice sent to ' + e.levels.join('/') + 'L students registered for ' + e.course);
};

/* lecturer bottom bar: Attendance | Roster | Records | Planner | Profile */
var S0 = '<svg viewBox="0 0 24 24" style="width:20px;height:20px" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
var GL = {
  home: S0 + '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M9 16l2 2 4-4"/></svg>',
  roster: S0 + '<path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2"/><circle cx="10" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  records: S0 + '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/></svg>',
  plan: S0 + '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M8 14h3"/></svg>',
  prof: S0 + '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
};
var OR = ['home', 'roster', 'records', 'plan', 'prof'], LB = { home: 'Attendance', roster: 'Roster', records: 'Records', plan: 'Planner', prof: 'Profile' };
function paintNav() {
  if (!isLec()) return;
  var probe = document.querySelector('[data-n="home"].bn'); if (!probe) return;
  probe.parentNode.innerHTML = OR.map(function (v) {
    return '<button type="button" data-n="' + v + '" onclick="go(\'' + v + '\')" class="bn flex-1 flex flex-col items-center gap-1 py-2 ' +
      (v === view ? 'text-violet-600 dark:text-violet-400' : 'text-slate-500') + '" style="background:none;border:none;cursor:pointer">' + GL[v] + '<span class="text-[10px] font-bold">' + LB[v] + '</span></button>';
  }).join('');
}

/* ================= student: notices card ================= */
var cache = { at: 0, key: '', rows: [] };
function myCourses() {
  try { var h = U.curHalf || 0, d = (U.dec && U.dec[h]) || []; return d.map(function (c) { return c.code; }).filter(Boolean); } catch (e) { return []; }
}
function paintNotices() {
  if (isLec() || (view !== 'home' && view !== 'att')) return;
  var main = document.getElementById('main'); if (!main) return;
  var mine = myCourses(); if (!mine.length) return;
  var key = mine.join(','), fresh = cache.key === key && Date.now() - cache.at < 60000;
  var put = function (rows) {
    var old = document.getElementById('as-notices'); if (old) old.remove();
    if (!rows.length || view === 'prof') return;
    var box = document.createElement('div'); box.id = 'as-notices'; box.className = 'space-y-2 mb-4';
    box.innerHTML = rows.slice(0, 4).map(function (n) {
      var no = n.kind === 'noclass';
      return '<div class="card p-3" style="border-left:4px solid ' + (no ? '#dc2626' : '#16a34a') + '"><div class="flex justify-between items-baseline"><b class="text-sm">' + E(n.label || n.course) + '</b>' +
        '<span class="text-[11px] font-bold" style="color:' + (no ? '#dc2626' : '#16a34a') + '">' + (no ? 'No class' : 'Class notice') + '</span></div>' +
        '<div class="text-xs">' + E(whenTxt(n.starts_at)) + (n.venue ? ' \u00b7 ' + E(n.venue) : '') + '</div>' +
        (n.note ? '<div class="text-xs" style="color:var(--mut)">' + E(n.note) + '</div>' : '') +
        '<div class="text-[11px]" style="color:var(--mut)">From ' + E(n.lecturer || 'your lecturer') + '</div></div>';
    }).join('');
    main.insertBefore(box, main.firstChild);
  };
  if (fresh) return put(cache.rows);
  Promise.resolve(sb.rpc('my_class_notices', { p_courses: mine })).then(function (r) {
    if (!r || r.error) return;
    cache = { at: Date.now(), key: key, rows: r.data || [] }; if (document.getElementById('main') === main) put(cache.rows);
  }, function () {});
}

/* ================= admin: on/off ================= */
function paintAdmin() {
  var main = document.getElementById('main'); if (!main) return;
  if (typeof isAdmin === 'function' && !isAdmin()) return;
  var box = document.getElementById('as-notice-box');
  if (!box) {
    box = document.createElement('div'); box.id = 'as-notice-box';
    var anchor = document.getElementById('att-min-box') || document.getElementById('att-prot-box');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling); else if (main.firstElementChild) main.firstElementChild.appendChild(box); else return;
  }
  box.className = 'card p-6 space-y-3';
  box.innerHTML = '<div class="font-extrabold">Class notices</div><p class="text-xs" style="color:var(--mut)">Lets lecturers tell students when a class holds or is cancelled. Students only see notices for courses in their registration and their level.</p>' +
    '<div class="flex items-center justify-between"><b class="text-sm" style="color:' + (ON ? '#16a34a' : '#dc2626') + '">' + (ON == null ? 'Checking...' : (ON ? 'ON' : 'OFF')) + '</b>' +
    '<button class="btn2" onclick="asNoticeToggle()"' + (ON == null ? ' disabled' : '') + '>' + (ON ? 'Turn off' : 'Turn on') + '</button></div>';
}
W.asNoticeToggle = function () {
  sb.rpc('admin_set_class_notices', { p_on: !ON }).then(function (r) {
    if (r.error) return toast(r.error.message, 'error');
    ON = r.data; cache.at = 0; toast('Class notices are now ' + (ON ? 'ON' : 'OFF')); paintAdmin();
  });
};

var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  if (isLec() && v === 'plan') paintPlan();
  setTimeout(function () { if (!isLec() && !document.getElementById('as-notices')) paintNotices(); }, 1600);
  setTimeout(function () {
    paintNav();
    if (isLec() && v === 'plan') { paintPlan(); noticesOn().then(function () { paintPlan(); }); syncCourses(); }
    if (!isLec()) paintNotices();
  }, 300);
  if (v === 'admin') setTimeout(function () { noticesOn().then(paintAdmin); paintAdmin(); }, 600);
  return r;
};
})();
/* Academic Summit - guards.js v1
   1) The student "Target ... not a figure, a habit" sheet never opens for lecturers.
   2) A slim offline banner (inline styles only, so it still looks right when the stylesheet is missing). */
(function () {
'use strict';
var W = window;
var zr = W.zumaRemind;
W.zumaRemind = function () {
  try { if (typeof U !== 'undefined' && U && U.role === 'lecturer') return; } catch (e) {}
  if (typeof zr === 'function') return zr.apply(this, arguments);
};
if (typeof document === 'undefined') return;
function bar() {
  var b = document.getElementById('as-offline');
  if (!b) {
    b = document.createElement('div'); b.id = 'as-offline';
    b.style.cssText = 'position:fixed;left:0;right:0;top:0;z-index:100000;padding:6px 12px;font:600 12px system-ui,sans-serif;text-align:center;background:#b45309;color:#fff;display:none';
    b.textContent = 'You are offline. Saved data is shown; marking attendance and syncing need internet.';
    document.body.appendChild(b);
  }
  return b;
}
function sync() { try { bar().style.display = navigator.onLine === false ? 'block' : 'none'; } catch (e) {} }
W.addEventListener('online', sync); W.addEventListener('offline', sync);
if (document.body) sync(); else document.addEventListener('DOMContentLoaded', sync);
})();
})();
