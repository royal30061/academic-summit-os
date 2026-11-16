(function(){if(window.__asUpgrade)return;window.__asUpgrade='19';try{console.log('Academic Summit attendance upgrade v19 loaded')}catch(e){}
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
          '</td><td>' + E(T(x.marked_at)) + (x.in_range === true ? ' <span style="color:#16a34a" title="Inside class range">\u2713</span>' : (x.in_range === false ? ' <span style="color:#d97706" title="Outside class range">!</span>' : '')) + (x.method === 'manual' ? ' <span style="color:var(--mut)">(M)</span>' : '') + '</td></tr>';
      }).join('') || '<tr><td colspan="4" class="py-3">Nobody has marked this class.</td></tr>') + '</tbody></table>' +
      (rows.some(function (x) { return x.in_range === true || x.in_range === false; }) ? '<div class="text-[11px]" style="color:var(--mut)">\u2713 = inside the class range. ! = outside it (worth a look).</div>' : '') + '</div>';
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
        '</td><td class="p-3 text-xs">' + E(T(r.marked_at || r.created_at)) + (r.in_range === true ? ' <span style="color:#16a34a">\u2713</span>' : (r.in_range === false ? ' <span style="color:#d97706">!</span>' : '')) + (r.method === 'manual' ? ' (M)' : '') + '</td></tr>';
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
/* Academic Summit - student-reg.js v2
   Registration-first student flow, for every department.
   - Identity before marking: a matric number (200L and above) or a JAMB registration number (100L before a matric exists).
   - The course typed is checked against the student's registration; if they have none, or it lacks the course,
     the student's classmates (same school, department, level) are used to infer it ("did you mean ...?").
   - Uploading a registration also reads the matric number and shares the course codes (codes only) with the server.
   Guidance only: the server still decides whether the code is live. */
(function () {
'use strict';
var W = window;
function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function norm(c) { return String(c || '').toUpperCase().replace(/\s+/g, ''); }
function pretty(c) { return String(c || '').replace(/^([A-Z]{2,4})(\d)/, '$1 $2'); }
function lev(a, b) {            // edit distance; swapping two neighbouring characters counts as one edit
  var m = [], i, j;
  for (i = 0; i <= a.length; i++) m[i] = [i];
  for (j = 1; j <= b.length; j++) m[0][j] = j;
  for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) {
    m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) m[i][j] = Math.min(m[i][j], m[i - 2][j - 2] + 1);
  }
  return m[a.length][b.length];
}
/* pure: typed course against a reference list (own registration and/or classmates' courses) */
function judge(typed, ref) {
  var t = norm(typed), list = ref.map(norm);
  if (!t) return { kind: 'empty' };
  if (!list.length) return { kind: 'noref' };
  if (list.indexOf(t) > -1) return { kind: 'ok', code: t };
  var near = list.filter(function (r) { return lev(t, r) <= 1; });          // one slip only: never guess wildly
  return near.length ? { kind: 'suggest', codes: near.slice(0, 3), typed: t } : { kind: 'unknown', typed: t };
}
/* pure: is this a usable identification number? (formats differ by department and year, so the check is lenient) */
var JAMB = /^\d{7,12}[A-Z]{2}$/;
function idCheck(raw, level) {
  var v = String(raw || '').trim().toUpperCase().replace(/\s+/g, '');
  var lvl = parseInt(level, 10) || 0;
  if (!/^[A-Z0-9\/-]+$/.test(v) || v.length < 6 || v.length > 24 || (v.match(/\d/g) || []).length < 4)
    return { ok: false, msg: 'That does not look right. Type the number exactly as it is on your school ID or registration slip.' };
  if (JAMB.test(v)) {
    if (lvl >= 200) return { ok: false, msg: 'At 200 level and above, use your matric number, not your JAMB registration number.' };
    return { ok: true, kind: 'jamb', value: v };
  }
  var slashes = (v.match(/\//g) || []).length;
  if (slashes >= 1 || /^[A-Z]{0,4}\d{6,12}$/.test(v)) return { ok: true, kind: 'matric', value: v };
  return { ok: false, msg: 'That does not look like a matric number. Example: 25/209POS/2056' };
}
function needsId(profile) {
  var m = profile && profile.matric, lvl = parseInt(profile && profile.level, 10) || 0;
  return !m || (JAMB.test(String(m).toUpperCase()) && lvl >= 200);        // a JAMB number is only fine until the matric arrives
}
var MAT = /\b(\d{2}\/[A-Z0-9]{2,8}\/[A-Z0-9]{2,8})\b/i;
function findMatric(text) {
  var t = String(text || '').replace(/\b(\d{2}\/\d{2,3})([A-Z0-9]{2,6})(\/\d{3,5})\b/gi, function (m, a, b, c) { return a + b.replace(/0/g, 'O').replace(/1/g, 'I') + c; });
  var m = t.match(MAT); return m ? m[1].toUpperCase() : null;
}
W.__asReg = { judge: judge, idCheck: idCheck, needsId: needsId, findMatric: findMatric };
if (typeof document === 'undefined') return;

function regCourses() {
  try { var d = (U.dec && U.dec[U.curHalf || 0]) || []; return d.map(function (c) { return c.code; }).filter(Boolean); } catch (e) { return []; }
}
function toast(m, t) { try { showToast(m, t); } catch (e) {} }
function modal(html) {
  var old = document.getElementById('sr-ov'); if (old) old.remove();
  var ov = document.createElement('div'); ov.id = 'sr-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:12px';
  ov.innerHTML = '<div class="card p-5 space-y-3" style="width:100%;max-width:420px">' + html + '</div>';
  ov.addEventListener('click', function (e) { if (e.target === ov) ov.remove(); });
  document.body.appendChild(ov); return ov;
}
function close() { var o = document.getElementById('sr-ov'); if (o) o.remove(); }
function on(id, fn) { var b = document.getElementById(id); if (b) b.onclick = fn; }

/* ---- server: share course codes, read classmates' courses (counts only) ---- */
var synced = '', coh = { at: 0, key: '', rows: [] };
function syncReg() {
  var cs = regCourses().map(norm).sort(), key = cs.join(',');
  if (!cs.length || key === synced) return;
  Promise.resolve(sb.rpc('sync_my_registration', { p_courses: cs })).then(function (r) { if (r && !r.error) synced = key; }, function () {});
}
function cohort() {
  var p = U.profile || {}, key = [p.uni, p.program, p.level].join('|');
  if (coh.key === key && Date.now() - coh.at < 300000) return Promise.resolve(coh.rows);
  return Promise.resolve(sb.rpc('cohort_courses', { p_min: 3 })).then(function (r) {
    coh = { at: Date.now(), key: key, rows: (r && !r.error && r.data) ? r.data.map(function (x) { return x.code; }) : [] }; return coh.rows;
  }, function () { return []; });
}

/* ---- identification ---- */
W.srMatricAsk = function (then) {
  var lvl = parseInt((U.profile || {}).level, 10) || 0, first = lvl <= 100;
  modal('<div class="font-extrabold">Add your ' + (first ? 'matric or JAMB number' : 'matric number') + '</div><p class="text-xs" style="color:var(--mut)">Your lecturer\'s list shows you by this number. ' +
    (first ? 'If you have not received a matric number yet, use your JAMB registration number. You can replace it later.' : 'Type it exactly as it is on your school ID or registration slip.') + ' Example: 25/209POS/2056</p>' +
    '<input id="sr-m" class="inp font-mono uppercase" placeholder="' + (first ? 'Matric / JAMB number' : '25/209POS/2056') + '"><button class="btn w-full" id="sr-m-ok">Save and continue</button><button class="btn2 w-full" id="sr-m-x">Cancel</button>');
  on('sr-m-x', close);
  on('sr-m-ok', function () {
    var c = idCheck((document.getElementById('sr-m') || {}).value, (U.profile || {}).level);
    if (!c.ok) return toast(c.msg, 'error');
    U.profile = U.profile || {}; U.profile.matric = c.value; save();
    sb.from('profiles').update({ matric: c.value }).eq('id', uid).then(function () {}, function () {});
    close(); toast((c.kind === 'jamb' ? 'JAMB number linked: ' : 'Matric number linked: ') + c.value); if (then) then();
  });
};

/* ---- before marking ---- */
async function guard(course, proceed) {
  if (needsId(U.profile)) return W.srMatricAsk(function () { guard(course, proceed); });
  var typed = norm(course); if (!typed) return proceed();
  var own = regCourses();
  if (own.map(norm).indexOf(typed) > -1) return proceed();
  syncReg();
  var co = await cohort();
  if (co.map(norm).indexOf(typed) > -1) return proceed();          // classmates at this level and department offer it: inferred
  var ref = own.concat(co), j = judge(course, ref), noOwn = !own.length;
  if (j.kind === 'noref') {
    modal('<div class="font-extrabold">Upload your course registration</div><p class="text-xs" style="color:var(--mut)">It tells the app which classes are yours, so a mark can never land on the wrong course.</p>' +
      '<button class="btn w-full" id="sr-up">Upload registration</button><button class="btn2 w-full" id="sr-go">Mark anyway this time</button>');
    on('sr-up', function () { close(); if (typeof W.regOpen === 'function') W.regOpen(); });
    on('sr-go', function () { close(); proceed(); });
    return;
  }
  if (j.kind === 'suggest') {
    var one = j.codes.length === 1;
    modal('<div class="font-extrabold">' + (one ? 'Did you mean ' + E(pretty(j.codes[0])) + '?' : 'Which course did you mean?') + '</div><p class="text-xs" style="color:var(--mut)">' + E(pretty(j.typed)) +
      ' is not ' + (noOwn ? 'one of your level\'s courses' : 'on your registration') + '. ' + (one ? E(pretty(j.codes[0])) + ' is.' : 'These are close:') + '</p>' +
      j.codes.map(function (c) { return '<button class="btn w-full" data-c="' + E(c) + '">Use ' + E(pretty(c)) + '</button>'; }).join('') +
      '<button class="btn2 w-full" id="sr-n">No, keep ' + E(pretty(j.typed)) + '</button>');
    Array.prototype.forEach.call(document.querySelectorAll('#sr-ov [data-c]'), function (b) {
      b.onclick = function () { var c = b.getAttribute('data-c'); close(); var f = document.getElementById('ha-course'); if (f) f.value = pretty(c); proceed(); };
    });
    on('sr-n', function () { close(); proceed(); });
    return;
  }
  if (j.kind === 'unknown') {
    modal('<div class="font-extrabold">' + E(pretty(j.typed)) + ' is not on your list</div><p class="text-xs" style="color:var(--mut)">' +
      (noOwn ? 'You have not uploaded a registration, and it is not one of the courses students in your level and department offer.' : 'You are registered for: ' + E(own.map(pretty).join(', ')) + '.') +
      ' Check the code, or mark anyway if this class is correct.</p><button class="btn w-full" id="sr-b">Check the code</button>' +
      (noOwn ? '<button class="btn2 w-full" id="sr-up">Upload registration</button>' : '') + '<button class="btn2 w-full" id="sr-go">Mark anyway</button>');
    on('sr-b', close); on('sr-up', function () { close(); if (typeof W.regOpen === 'function') W.regOpen(); }); on('sr-go', function () { close(); proceed(); });
    return;
  }
  proceed();
}
var mfh = W.markFromHome;
W.markFromHome = function () {
  var f = document.getElementById('ha-course');
  guard(f ? f.value : '', function () { if (typeof mfh === 'function') mfh(); });
};

/* the Attend screen shows the student's own courses as tap-to-fill chips */
function chips() {
  var f = document.getElementById('ha-course'); if (!f || document.getElementById('sr-chips')) return;
  var cs = regCourses(); if (!cs.length) return;
  var box = document.createElement('div'); box.id = 'sr-chips'; box.className = 'flex flex-wrap gap-2';
  box.innerHTML = cs.map(function (c) { return '<button type="button" class="btn2" style="padding:5px 10px;font-size:12px" data-c="' + E(pretty(c)) + '">' + E(pretty(c)) + '</button>'; }).join('');
  box.addEventListener('click', function (e) { var c = e.target && e.target.getAttribute && e.target.getAttribute('data-c'); if (c) { f.value = c; var p = document.getElementById('ha-pin'); if (p) p.focus(); } });
  f.parentNode.insertBefore(box, f.nextSibling);
}
var goB = W.go;
W.go = function (v) { var r = goB.apply(this, arguments); if (v === 'att') setTimeout(chips, 150); if (v === 'home' || v === 'att') setTimeout(syncReg, 2500); return r; };

/* registration upload also reads the matric number, and shares the course codes */
var rs = W.regSave;
W.regSave = function () {
  var ta = document.getElementById('rg-paste'), m = ta ? findMatric(ta.value) : null;
  var r = typeof rs === 'function' ? rs.apply(this, arguments) : undefined;
  setTimeout(syncReg, 1200);
  try { if (m && (!U.profile || U.profile.matric !== m) && typeof askMatric === 'function') setTimeout(function () { askMatric(m); }, 700); } catch (e) {}
  return r;
};
})();
/* Academic Summit - att-rules.js v1
   1) Weak-GPS warning: before a code mark, a student whose location error is over the admin's warning level (default 50 m) is asked to step closer and retry
      (not locked out). Only while the admin's range check is ON. Fresh, high-accuracy readings only (no cached positions).
   2) Wrong-code lock-out countdown on the Mark button (the real limit is enforced by the database).
   3) Admin Panel card: range radius, worst GPS error, attempts per minute, pass mark.
   The server decides every pass/fail (sql/09_hardening.sql); this file only guides the student and lets admins set the rules. */
(function () {
'use strict';
var W = window, GOOD = 50, OKACC = 150, cache = null, fixImpl = null, askImpl = null, skipUntil = 0;
function toast(m, t) { try { showToast(m, t); } catch (e) {} }
function debugOn() { try { return localStorage.getItem('as_debug') === '1'; } catch (e) { return false; } }
function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

function settings() {
  if (cache && Date.now() - cache.at < 60000) return Promise.resolve(cache);
  return Promise.resolve(sb.from('app_settings').select('key,value,num_value')).then(function (r) {
    var m = {}; ((r && r.data) || []).forEach(function (x) { m[x.key] = x; });
    cache = { at: Date.now(), geo: !!(m.geofence_enforced && m.geofence_enforced.value), accmax: (m.geo_max_accuracy_m && m.geo_max_accuracy_m.num_value) || 150, warn: (m.geo_warn_accuracy_m && m.geo_warn_accuracy_m.num_value) || 50 };
    return cache;
  }, function () { return { geo: false, accmax: 150, warn: 50 }; });
}

/* one fresh, high-accuracy reading; stops early once it is good enough */
/* ---- location pre-warm: start finding the position when the screen opens, so Mark never waits for GPS ---- */
var LASTFIX = null, WATCH = null, WATCH_END = 0, DENIED = false;
function usable() {
  if (!LASTFIX) return null;
  var age = Date.now() - LASTFIX.at;
  return (WATCH != null ? age < 600000 : age < 60000) ? { lat: LASTFIX.lat, lng: LASTFIX.lng, acc: LASTFIX.acc } : null;
}
function stopWatch() { if (WATCH != null) { try { navigator.geolocation.clearWatch(WATCH); } catch (e) {} WATCH = null; } }
function prewarm() {
  if (typeof navigator === 'undefined' || !navigator.geolocation || DENIED) return;
  try { if (localStorage.getItem('as_qa_loc') === 'no') return; } catch (e) {}
  WATCH_END = Date.now() + 180000;
  if (WATCH != null) return;
  try {
    WATCH = navigator.geolocation.watchPosition(function (p) {
      var c = p.coords, f = { lat: c.latitude, lng: c.longitude, acc: Math.round(c.accuracy), at: Date.now() };
      if (!LASTFIX || f.acc <= LASTFIX.acc * 1.3 || Date.now() - LASTFIX.at > 20000) LASTFIX = f;
      if (Date.now() > WATCH_END) stopWatch();
    }, function (e) { if (e && e.code === 1) { DENIED = true; stopWatch(); } }, { enableHighAccuracy: true, maximumAge: 0, timeout: 30000 });
  } catch (e) {}
}
function quickFix(maxWait) {
  var q = usable(); if (q) return Promise.resolve(q);
  prewarm();
  return new Promise(function (res) { var t0 = Date.now(); (function poll() { var u = usable(); if (u) return res(u); if (DENIED || Date.now() - t0 >= maxWait) return res(null); setTimeout(poll, 100); })(); });
}
var DIAG = { perm: '?', err: '', n: 0, best: null, offset: null };
function diagText() {
  return 'Details: permission ' + DIAG.perm + '; readings ' + DIAG.n + '; best ' + (DIAG.best == null ? 'none' : '+/-' + DIAG.best + ' m') +
    (DIAG.err ? '; ' + DIAG.err : '') + (DIAG.offset != null && Math.abs(DIAG.offset) > 20000 ? '; phone clock differs by about ' + Math.round(DIAG.offset / 1000) + ' s' : '');
}
function fix(ms) {
  if (fixImpl) return fixImpl(ms);
  DIAG = { perm: '?', err: '', n: 0, best: null, offset: null };
  try { if (navigator.permissions && navigator.permissions.query) navigator.permissions.query({ name: 'geolocation' }).then(function (r) { DIAG.perm = r.state; }, function () {}); } catch (e) {}
  return new Promise(function (done) {
    if (!navigator.geolocation) { DIAG.err = 'no geolocation support'; return done(null); }
    var best = null, fin = false, id = null, tm = null, t0 = Date.now(), soft = null;
    function end() { if (fin) return; clearTimeout(soft); fin = true; clearTimeout(tm); if (id != null) { try { navigator.geolocation.clearWatch(id); } catch (e) {} } try { localStorage.setItem('as_geo_diag', diagText()); } catch (e) {} done(best); }
    try {
      id = navigator.geolocation.watchPosition(function (p) {
        var c = p.coords; DIAG.n++; DIAG.offset = Date.now() - p.timestamp;      // recorded for diagnosis only: a wrong phone clock must never block a student
        if (!best || c.accuracy < best.acc) { best = { lat: c.latitude, lng: c.longitude, acc: Math.round(c.accuracy) }; DIAG.best = best.acc; }
        if (best.acc <= GOOD || (Date.now() - t0 >= 4000 && best.acc <= OKACC)) end();
      }, function (e) { DIAG.err = 'error ' + (e && e.code) + (e && e.code === 1 ? ' (blocked for this site)' : e && e.code === 2 ? ' (position unavailable)' : e && e.code === 3 ? ' (timed out)' : ''); end(); }, { enableHighAccuracy: true, maximumAge: 0, timeout: ms });
      tm = setTimeout(end, ms); soft = setTimeout(function () { if (best && best.acc <= OKACC) end(); }, 4000);
    } catch (e) { DIAG.err = 'exception'; end(); }
  });
}
function ask(opts) {            // opts: {title, body, retry, cont, cancel} -> resolves 'retry' | 'continue' | 'cancel'
  if (askImpl) return askImpl(opts);
  return new Promise(function (res) {
    var old = document.getElementById('ar-ov'); if (old) old.remove();
    var ov = document.createElement('div'); ov.id = 'ar-ov';
    ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:12px';
    ov.innerHTML = '<div class="card p-5 space-y-3" style="width:100%;max-width:420px"><div class="font-extrabold">' + E(opts.title) + '</div><p class="text-xs" style="color:var(--mut)">' + E(opts.body) + '</p>' + (opts.detail && debugOn() ? '<p class="text-[10px]" style="color:var(--mut)">' + E(opts.detail) + '</p>' : '') +
      '<button class="btn w-full" data-k="retry">Retry location</button>' + (opts.cont ? '<button class="btn2 w-full" data-k="continue">Continue anyway</button>' : '') + '<button class="btn2 w-full" data-k="cancel">Cancel</button></div>';
    ov.addEventListener('click', function (e) { var k = e.target && e.target.getAttribute && e.target.getAttribute('data-k'); if (e.target === ov) k = 'cancel'; if (!k) return; ov.remove(); res(k); });
    document.body.appendChild(ov);
  });
}
/* pure-ish: get a usable fix, warning the student when the signal is weak */
async function locate(args, st) {
  GOOD = Math.min(st.warn || GOOD, 50); OKACC = st.accmax || 150;
  var fx = args.p_lat != null ? { lat: args.p_lat, lng: args.p_lng, acc: Math.round(args.p_acc == null ? 9999 : args.p_acc) } : (usable() || await fix(10000));
  for (var tries = 0; tries < 3; tries++) {
    if (fx && fx.acc <= OKACC) return fx;                              // usable evidence: send it, no questions asked
    if (Date.now() < skipUntil) return fx || { none: true };           // they already chose to continue a moment ago
    var k = await ask(fx ? { title: 'Weak GPS signal', body: 'Your location is only accurate to about ' + fx.acc + ' m. Step closer to the centre of the room or near a window and retry, or continue: your mark still counts.', cont: true, detail: diagText() }
                         : { title: 'No location received', body: 'Turn on location and allow this site to use it (browser menu, Settings, Site settings, Location). Then retry, or continue: your mark still counts.', cont: true, detail: diagText() });
    if (k === 'cancel') return null;
    if (k === 'continue') { skipUntil = Date.now() + 30 * 60000; return fx || { none: true }; }
    var again = await fix(10000);
    if (again && (!fx || again.acc < fx.acc)) fx = again;
  }
  return fx || { none: true };            // after three tries we stop asking: nobody is stuck
}

/* wrong-code lock-out countdown (cosmetic: the database enforces it) */
var locked = false;
function lockUI(sec) {
  if (locked) return; var btn = document.querySelector('button[onclick*="markFromHome"]'), pin = document.getElementById('ha-pin');
  if (!btn) return; locked = true; var txt = btn.textContent; btn.disabled = true; if (pin) pin.disabled = true;
  (function tick(n) {
    if (n <= 0) { btn.disabled = false; btn.textContent = txt; if (pin) pin.disabled = false; locked = false; return; }
    btn.textContent = 'Wait ' + n + 's'; setTimeout(function () { tick(n - 1); }, 1000);
  })(Math.min(sec, 120));
}
W.__asQuickFix = function () { return quickFix(1500).then(function (f) { return f ? { lat: f.lat, lng: f.lng, acc: f.acc } : null; }); };
W.__asGeo = { locate: locate, prewarm: prewarm, diagText: diagText, _fix: function (f) { fixImpl = f; }, _ask: function (f) { askImpl = f; } };
if (typeof document === 'undefined') return;

if (typeof sb === 'undefined' || !sb || !sb.rpc) return;
var prev = sb.rpc;
/* lecturer starting a class with the range check ON: wait up to 20 s for a real fix and explain what to do if there is none */
async function lecLocate(args) {
  W.showToast && toast('Getting your location. This can take up to 20 seconds...');
  OKACC = 100; GOOD = 50;
  var fx = await fix(20000);
  for (var i = 0; i < 4; i++) {
    if (fx && fx.acc <= 100) return fx;                                 // the server needs the lecturer's own reading within 100 m
    var k = await ask(fx ? { title: 'GPS is too weak to set the class range', body: 'Your location is only accurate to about ' + fx.acc + ' m. Step near a window or outside the door, then retry.', cont: false }
                         : { title: 'No location received', body: 'Turn on location, and allow this site to use it: Browser menu, Settings, Site settings, Location, then allow academic-summit.com.ng. Then retry.', cont: false, detail: diagText() });
    if (k === 'cancel') return null;
    var again = await fix(20000); if (again && (!fx || again.acc < fx.acc)) fx = again;
  }
  return fx && fx.acc <= 100 ? fx : null;
}
sb.rpc = function (name, args) {
  if (name === 'start_session' || name === 'qa_open') {
    if (args && args.p_lat != null) return prev.apply(sb, arguments);
    return settings().then(function (st) {
      if (!st.geo) return prev.call(sb, name, args);
      return lecLocate(args || {}).then(function (fx) {
        if (!fx) return { data: null, error: { message: 'Cancelled. A class needs a location while the range check is on.' } };
        return prev.call(sb, name, Object.assign({}, args, { p_lat: fx.lat, p_lng: fx.lng, p_acc: fx.acc }));
      });
    });
  }
  if (name !== 'mark_attendance') return prev.apply(sb, arguments);
  return settings().then(function (st) {
    var T0 = Date.now();
    var go = function (a) {
      return Promise.resolve(prev.call(sb, name, a)).then(function (r) {
        try { var ms = Date.now() - T0; localStorage.setItem('as_mark_ms', String(ms)); if (debugOn()) toast('Mark took ' + (ms / 1000).toFixed(1) + ' s'); } catch (e) {}
        var m = r && r.error && String(r.error.message || ''), w = m && (m.match(/try again in (\d+) seconds/i) || (/wait a minute/i.test(m) ? [0, 60] : null));
        if (w) lockUI(+w[1]);
        return r;
      });
    };
    if (!st.geo) {
      if (args && args.p_lat == null) { var q = usable(); if (q) args = Object.assign({}, args, { p_lat: q.lat, p_lng: q.lng, p_acc: q.acc }); }
      return go(args);
    }
    return locate(args || {}, st).then(function (fx) {
      if (!fx) return { data: null, error: { message: 'Cancelled.' } };
      if (fx.none) return go(args);                                    // nothing to send: the server will say what it needs
      return go(Object.assign({}, args, { p_lat: fx.lat, p_lng: fx.lng, p_acc: fx.acc }));
    });
  });
};

/* admin card */
var RULES = [['geo_radius_m', 'Widest class range a lecturer can pick (m)', 50, 300], ['geo_max_accuracy_m', 'Worst GPS error accepted (m)', 20, 200], ['geo_warn_accuracy_m', 'Ask student to retry above (m)', 10, 150], ['att_max_attempts', 'Code attempts per minute', 1, 10], ['attendance_pass_pct', 'Pass mark (%)', 50, 100]];
function paintAdmin(vals) {
  var main = document.getElementById('main'); if (!main) return;
  if (typeof isAdmin === 'function' && !isAdmin()) return;
  var box = document.getElementById('as-rules-box');
  if (!box) {
    box = document.createElement('div'); box.id = 'as-rules-box';
    var anchor = document.getElementById('as-notice-box') || document.getElementById('att-min-box') || document.getElementById('att-prot-box');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling); else if (main.firstElementChild) main.firstElementChild.appendChild(box); else return;
  }
  vals = vals || W.__asRules || {};
  box.className = 'card p-6 space-y-3';
  box.innerHTML = '<div class="font-extrabold">Attendance rules</div><p class="text-xs" style="color:var(--mut)">Range and GPS limits apply while the range check is ON. Indoor GPS is often off by 20 to 60 m, so check what real phones report in your hall before tightening these.</p>' +
    RULES.filter(function (r) { return vals[r[0]] != null; }).map(function (r) {
      return '<div class="flex items-center justify-between gap-3 text-sm"><span>' + E(r[1]) + '</span><input id="ar-' + r[0] + '" type="number" class="inp" style="max-width:90px" min="' + r[2] + '" max="' + r[3] + '" value="' + E(vals[r[0]] == null ? '' : vals[r[0]]) + '"></div>';
    }).join('') + '<button class="btn w-full" onclick="asRulesSave()">Save rules</button>';
}
W.asRulesSave = function () {
  Promise.all(RULES.map(function (r) {
    var el = document.getElementById('ar-' + r[0]), n = el ? parseInt(el.value, 10) : NaN;
    return isNaN(n) ? null : sb.rpc('admin_set_att_rule', { p_key: r[0], p_n: n });
  }).filter(Boolean)).then(function (rs) {
    var bad = rs.filter(function (x) { return x && x.error; })[0];
    if (bad) return toast(bad.error.message, 'error');
    cache = null; toast('Attendance rules saved'); W.go('admin');
  });
};
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  if (v === 'home' || v === 'att') { try { if (typeof U !== 'undefined' && U && typeof uid !== 'undefined' && uid) { prewarm(); settings(); } } catch (e) {} }
  if (v === 'admin') setTimeout(function () {
    Promise.resolve(sb.rpc('att_rules')).then(function (x) { if (x && !x.error && x.data) { W.__asRules = x.data; paintAdmin(x.data); } }, function () {});
  }, 800);
  return r;
};
})();
/* Academic Summit - admin-team.js v1
   Co-founders get the Admin Panel; the owner manages who they are.
   The server decides who is an admin (sql/11_admin_team.sql). This file only (a) asks the server once per sign-in so the
   app's own screens show the panel, and (b) adds an "Admin team" card for the owner. */
(function () {
'use strict';
var W = window, checked = null;
function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function toast(m, t) { try { showToast(m, t); } catch (e) {} }
function check() {
  if (typeof sb === 'undefined' || typeof uid === 'undefined' || !uid || checked === uid) return;
  checked = uid;
  Promise.resolve(sb.rpc('is_app_admin')).then(function (r) { W.__asAdmin = !!(r && !r.error && r.data === true); }, function () { checked = null; });
}
function paint(t) {
  var main = document.getElementById('main'); if (!main || !t) return;
  var box = document.getElementById('as-team-box');
  if (!box) {
    box = document.createElement('div'); box.id = 'as-team-box';
    var anchor = document.getElementById('as-rules-box') || document.getElementById('as-notice-box') || document.getElementById('att-min-box');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling); else if (main.firstElementChild) main.firstElementChild.appendChild(box); else return;
  }
  box.className = 'card p-6 space-y-3';
  box.innerHTML = '<div class="font-extrabold">Admin team</div>' + (t.admins || []).map(function (a) {
    return '<div class="flex items-center justify-between text-sm"><span>' + E(a.email) + (a.owner ? ' <b style="color:#16a34a">(owner)</b>' : (a.note ? ' <span style="color:var(--mut)">' + E(a.note) + '</span>' : '')) + '</span>' +
      (t.me_owner && !a.owner ? '<button class="text-rose-500 font-bold text-xs" data-rm="' + E(a.email) + '">Remove</button>' : '') + '</div>';
  }).join('') + (t.me_owner ?
    '<input id="tm-e" class="inp" type="email" placeholder="Co-founder\'s account email"><input id="tm-n" class="inp" placeholder="Note (e.g. Co-founder, Finance)"><button class="btn w-full" id="tm-add">Add admin</button>' +
    '<p class="text-[11px]" style="color:var(--mut)">Create their account yourself first (Supabase, Authentication, Add user) so nobody can register that address before them. They then see the Admin Panel under Profile.</p>'
    : '<p class="text-[11px]" style="color:var(--mut)">Only the owner can add or remove admins.</p>');
  var add = document.getElementById('tm-add');
  if (add) add.onclick = function () {
    var e = (document.getElementById('tm-e').value || '').trim(), n = (document.getElementById('tm-n').value || '').trim();
    if (!e) return toast('Enter their email', 'error');
    sb.rpc('admin_add_admin', { p_email: e, p_note: n || null }).then(function (r) { if (r.error) return toast(r.error.message, 'error'); toast('Admin added: ' + e); load(); });
  };
  Array.prototype.forEach.call(box.querySelectorAll('[data-rm]'), function (b) {
    b.onclick = function () {
      var e = b.getAttribute('data-rm'); if (!confirm('Remove admin access for ' + e + '?')) return;
      sb.rpc('admin_remove_admin', { p_email: e }).then(function (r) { if (r.error) return toast(r.error.message, 'error'); toast('Removed ' + e); load(); });
    };
  });
}
function load() { Promise.resolve(sb.rpc('admin_team')).then(function (r) { if (r && !r.error) paint(r.data); }, function () {}); }
W.__asTeam = { paint: paint };
if (typeof document === 'undefined') return;
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  check();
  if (v === 'admin') setTimeout(load, 1000);
  return r;
};
setTimeout(check, 2000);
})();
/* Academic Summit - admin-onboard.js v1
   Lecturer onboarding with owner approval. The owner issues PINs instantly and sees a card with the approval switch and
   waiting requests. A co-founder's "Generate PIN" becomes a request that the owner approves; the PIN then shows up in
   the co-founder's own list. The server enforces all of it (sql/13_onboarding_approval.sql). */
(function () {
'use strict';
var W = window;
function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function toast(m, t) { try { showToast(m, t); } catch (e) {} }
function ago(iso) { try { var m = Math.max(0, Math.round((Date.now() - new Date(iso)) / 60000)); return m < 60 ? m + ' min ago' : (m < 1440 ? Math.round(m / 60) + ' h ago' : Math.round(m / 1440) + ' d ago'); } catch (e) { return ''; } }

/* the existing "Generate PIN" button now goes through the server rule */
W.adminGeneratePin = async function () {
  var r = await sb.rpc('request_lecturer_pin', { p_note: null });
  if (r.error) return toast(r.error.message, 'error');
  if (r.data && r.data.status === 'approved') {
    try { adminLastPin = r.data.pin; } catch (e) {}
    toast('PIN generated: ' + r.data.pin); W.go('admin');
  } else { toast('Sent to the owner for approval'); load(); }
};

function paint(st) {
  var main = document.getElementById('main'); if (!main) return;
  var box = document.getElementById('as-onboard-box');
  if (!box) {
    box = document.createElement('div'); box.id = 'as-onboard-box';
    if (main.firstElementChild) main.firstElementChild.appendChild(box); else return;
  }
  box.className = 'card p-6 space-y-3';
  var rows = st.rows || [], owner = st.owner;
  var h = '<div class="font-extrabold">' + (owner ? 'Owner controls: lecturer onboarding' : 'My PIN requests') + '</div>';
  if (owner) {
    var pend = rows.filter(function (r) { return r.status === 'pending'; });
    h += '<div class="flex items-center justify-between text-sm"><span>Co-founders need my approval</span><b style="color:' + (st.rule ? '#16a34a' : '#dc2626') + '">' + (st.rule ? 'ON' : 'OFF') + '</b></div>' +
      '<button class="btn2 w-full" id="ob-rule">' + (st.rule ? 'Turn off (co-founders issue PINs instantly)' : 'Turn on approval') + '</button>' +
      '<div class="font-bold text-sm pt-2">Waiting for you (' + pend.length + ')</div>' +
      (pend.length ? pend.map(function (r) {
        return '<div class="py-2 space-y-1" style="border-top:1px solid var(--bd)"><div class="text-xs"><b>' + E(r.requester) + '</b> <span style="color:var(--mut)">' + E(ago(r.created_at)) + (r.note ? ' - ' + E(r.note) : '') + '</span></div>' +
          '<div class="flex gap-2"><button class="btn" data-ok="' + E(r.id) + '">Approve</button><button class="btn2" data-no="' + E(r.id) + '">Reject</button></div></div>';
      }).join('') : '<div class="text-xs" style="color:var(--mut)">Nothing waiting.</div>');
  } else {
    h += '<p class="text-xs" style="color:var(--mut)">' + (st.rule ? 'New PINs need the owner\'s approval. Tap Generate PIN under Onboarding Kit to ask.' : 'Approval is switched off: Generate PIN issues a PIN at once.') + '</p>' +
      (rows.length ? rows.slice(0, 8).map(function (r) {
        return '<div class="flex items-center justify-between text-xs py-1" style="border-top:1px solid var(--bd)"><span>' + E(ago(r.created_at)) + ' - <b>' + E(r.status) + '</b></span>' +
          (r.pin ? '<span class="font-mono">' + E(r.pin) + ' <button class="btn2" style="padding:3px 8px" data-cp="' + E(r.pin) + '">Copy</button></span>' : '') + '</div>';
      }).join('') : '<div class="text-xs" style="color:var(--mut)">No requests yet.</div>');
  }
  box.innerHTML = h;
  var rule = document.getElementById('ob-rule');
  if (rule) rule.onclick = function () { sb.rpc('admin_set_onboard_rule', { p_on: !st.rule }).then(function (r) { if (r.error) return toast(r.error.message, 'error'); toast('Approval is now ' + (r.data ? 'ON' : 'OFF')); load(); }); };
  Array.prototype.forEach.call(box.querySelectorAll('[data-ok],[data-no]'), function (b) {
    b.onclick = function () {
      var ok = b.hasAttribute('data-ok'), id = b.getAttribute(ok ? 'data-ok' : 'data-no');
      sb.rpc('decide_pin_request', { p_id: id, p_ok: ok }).then(function (r) { if (r.error) return toast(r.error.message, 'error'); toast(ok ? 'Approved. The PIN is now with the co-founder.' : 'Rejected'); load(); });
    };
  });
  Array.prototype.forEach.call(box.querySelectorAll('[data-cp]'), function (b) { b.onclick = function () { try { navigator.clipboard.writeText(b.getAttribute('data-cp')).then(function () { toast('Copied'); }); } catch (e) {} }; });
}
function load() {
  Promise.all([Promise.resolve(sb.rpc('admin_team')), Promise.resolve(sb.rpc('my_pin_requests')), Promise.resolve(sb.rpc('onboard_rule'))]).then(function (x) {
    if (!x[0] || x[0].error || !x[0].data) return;
    paint({ owner: !!x[0].data.me_owner, rows: (x[1] && !x[1].error && x[1].data) || [], rule: x[2] && !x[2].error ? x[2].data !== false : true });
  }, function () {});
}
if (typeof document === 'undefined') return;
var goB = W.go;
W.go = function (v) { var r = goB.apply(this, arguments); if (v === 'admin') setTimeout(load, 1100); return r; };
})();
/* Academic Summit - admin-tidy.js v1
   Declutters the Admin Panel: related cards are folded into collapsible sections (Announcements, Lecturer onboarding,
   Attendance rules, Class notices, Admin team). Nothing is removed or rewritten: the original cards are moved, so every
   button keeps working. Which sections are open is remembered while the app stays open. */
(function () {
'use strict';
var W = window, OPEN = { onb: true };
function byId(id) { return document.getElementById(id); }
function cardByTitle(starts) {
  var cs = document.querySelectorAll('#main .card');
  for (var i = 0; i < cs.length; i++) { var f = cs[i].firstElementChild; if (f && (f.textContent || '').trim().indexOf(starts) === 0 && !cs[i].closest('details.as-acc')) return cs[i]; }
  return null;
}
var GROUPS = [
  ['ann', 'Announcements', function () { return [byId('ann-admin')]; }],
  ['onb', 'Lecturer onboarding', function () { return [cardByTitle('Onboarding Kit'), cardByTitle('Active Lecturers'), byId('as-onboard-box')]; }],
  ['rules', 'Attendance rules and switches', function () { return [byId('att-prot-box'), byId('att-min-box'), byId('as-rules-box')]; }],
  ['notice', 'Class notices', function () { return [byId('as-notice-box')]; }],
  ['team', 'Admin team and tools', function () { return [byId('as-team-box'), byId('as-wipe-box'), byId('as-instdiag-box')]; }]
];
function tidy() {
  var main = byId('main'); if (!main || !byId('as-acc-probe') && !(main.textContent || '').match(/Admin Panel/)) return;
  GROUPS.forEach(function (g) {
    var els = g[2]().filter(function (e) { return e && !e.closest('details.as-acc'); });
    var det = main.querySelector('details.as-acc[data-k="' + g[0] + '"]');
    if (!els.length) return;
    if (!det) {
      det = document.createElement('details'); det.className = 'as-acc card'; det.setAttribute('data-k', g[0]);
      det.style.cssText = 'padding:0;overflow:hidden'; if (OPEN[g[0]]) det.open = true;
      det.innerHTML = '<summary style="cursor:pointer;list-style:none;display:flex;justify-content:space-between;align-items:center;padding:16px 18px;font-weight:800;font-size:15px">' + g[1] + '<span style="color:var(--mut);font-size:12px">tap to open</span></summary><div class="as-acc-body" style="display:flex;flex-direction:column;gap:12px;padding:0 12px 14px"></div>';
      det.addEventListener('toggle', function () { OPEN[g[0]] = det.open; });
      els[0].parentNode.insertBefore(det, els[0]);
    }
    var body = det.querySelector('.as-acc-body');
    els.forEach(function (e) { body.appendChild(e); });
  });
}
if (typeof document === 'undefined') return;
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  if (v === 'admin') [1500, 2600, 4200].forEach(function (ms) { setTimeout(tidy, ms); });
  return r;
};
})();
/* Academic Summit - lec-signup.js v1
   One-code lecturer sign-up. The old flow emailed a code, then asked for the admin PIN: two codes. Now the lecturer
   enters name, email and password once, and the only code is the PIN from the administrator (the existing PIN screen).
   The PIN is what makes someone a lecturer, so the emailed code is no longer needed for that.
   Trade-off: the email address is not confirmed by a code, so the lecturer must type it correctly (password reset uses it).
   If the project ever switches email confirmation ON, this falls back to the old emailed-code flow. */
(function () {
'use strict';
var W = window;
if (typeof document === 'undefined') return;
var LA = { n: '', e: '' };
function say(m) { try { showToast(m, 'error'); } catch (e) {} }
function val(id) { return ((document.getElementById(id) || {}).value || '').trim(); }
function busy(b, on) { if (b) { b.disabled = on; b.style.opacity = on ? 0.6 : 1; } }
function card(title, body) {
  document.getElementById('sheet').innerHTML = '';
  document.getElementById('app').classList.add('hidden');
  document.getElementById('auth').innerHTML = '<div class="min-h-screen grid place-items-center p-5" style="background:#021812"><div class="card p-6 w-full max-w-md space-y-3"><div class="text-xs font-extrabold uppercase tracking-widest text-emerald-500">Lecturer console</div><h2 class="text-xl font-extrabold">' + title + '</h2>' + body + '</div></div>';
}
var oldReg1 = W.lecReg1, oldReg1Go = W.lecReg1Go;
W.lecReg1 = function () {
  card('Create lecturer account',
    '<p class="text-xs text-slate-500">One step here, then the access PIN from your administrator.</p>' +
    '<input id="ls-n" class="inp" placeholder="Full name" value="' + esc(LA.n) + '"><input id="ls-e" type="email" class="inp" placeholder="Email" value="' + esc(LA.e) + '">' +
    '<input id="ls-1" type="password" class="inp" placeholder="Password (8+ characters)"><input id="ls-2" type="password" class="inp" placeholder="Repeat password">' +
    '<button class="btn w-full" onclick="lecSignupGo(this)">Create account</button><button class="btn2 w-full" onclick="lecAuthOpen()">Back</button>');
};
W.lecSignupGo = async function (b) {
  var n = val('ls-n'), e = val('ls-e').toLowerCase(), p1 = (document.getElementById('ls-1') || {}).value || '', p2 = (document.getElementById('ls-2') || {}).value || '';
  LA.n = n; LA.e = e;
  if (!n || !e) return say('Enter your name and email');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return say('That email does not look right. Check it and try again');
  if (p1.length < 8) return say('Use at least 8 characters for the password');
  if (p1 !== p2) return say('Passwords do not match');
  busy(b, true);
  var r = await sb.auth.signUp({ email: e, password: p1, options: { data: { name: n } } });
  busy(b, false);
  if (r.error) {
    if (/already|registered/i.test(r.error.message || '')) return say('This email already has an account. Go back and log in.');
    return say(r.error.message);
  }
  if (r.data && r.data.session) return location.reload();           // boot() then shows the PIN screen
  if (r.data && r.data.user && r.data.user.identities && !r.data.user.identities.length) return say('This email already has an account. Go back and log in.');
  if (typeof oldReg1Go === 'function') { say('Email confirmation is on, so a code is needed'); return oldReg1(); }
  say('Could not finish sign-up. Try again');
};
})();
/* Academic Summit - install-prompt.js v1
   Shows a friendly "Install Academic Summit" bar (like other web apps) instead of relying on the browser's own banner,
   which the app switches off. Android Chrome: one tap installs. iPhone: shows the Add to Home Screen steps.
   Shown only to signed-in users, only if not already installed, and not again for 7 days after "Not now". */
(function () {
'use strict';
var W = window, ev = null, timer = null;
if (typeof document === 'undefined') return;
function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
function standalone() { try { return W.matchMedia('(display-mode: standalone)').matches || W.navigator.standalone === true; } catch (e) { return false; } }
function dismissed() { return Date.now() - (+ls('as_install_dismissed') || 0) < 7 * 864e5; }
function isIos() { return /iphone|ipad|ipod/i.test(navigator.userAgent) && !W.MSStream; }
function signedIn() { try { return typeof U !== 'undefined' && !!U && typeof uid !== 'undefined' && !!uid; } catch (e) { return false; } }
function hide() { var b = document.getElementById('as-install'); if (b) b.remove(); }
function show(ios) {
  if (document.getElementById('as-install') || standalone() || ls('as_installed') === '1' || dismissed()) return;
  var b = document.createElement('div'); b.id = 'as-install';
  b.style.cssText = 'position:fixed;left:12px;right:12px;bottom:84px;z-index:9000;background:#0b2a21;color:#e8fff6;border:1px solid #14532d;border-radius:16px;padding:14px;box-shadow:0 8px 30px rgba(0,0,0,.45);font-family:system-ui,sans-serif;display:flex;gap:12px;align-items:center';
  b.innerHTML = '<img src="icons/icon-192.png" alt="" width="44" height="44" style="border-radius:10px;flex:none">' +
    '<div style="flex:1;min-width:0"><div style="font-weight:800;font-size:14px">Install Academic Summit</div>' +
    '<div style="font-size:12px;opacity:.8">' + (ios ? 'Tap Share, then Add to Home Screen.' : 'Opens like an app and loads faster.') + '</div></div>' +
    (ios ? '' : '<button id="as-inst-go" style="background:linear-gradient(90deg,#10b981,#06b6d4);color:#00130d;font-weight:800;border:0;border-radius:10px;padding:9px 14px;font-size:13px">Install</button>') +
    '<button id="as-inst-x" aria-label="Not now" style="background:none;border:0;color:#9fbcae;font-size:20px;line-height:1;padding:4px 6px">&times;</button>';
  document.body.appendChild(b);
  document.getElementById('as-inst-x').onclick = function () { ls('as_install_dismissed', String(Date.now())); hide(); };
  var go = document.getElementById('as-inst-go');
  if (go) go.onclick = function () {
    hide();
    if (ev) { try { ev.prompt(); ev.userChoice.then(function (c) { if (c && c.outcome === 'accepted') ls('as_installed', '1'); else ls('as_install_dismissed', String(Date.now())); ev = null; }); } catch (e) { try { installApp(); } catch (e2) {} } }
    else { try { installApp(); } catch (e) {} }
  };
}
function later(ios, ms) {
  clearTimeout(timer);
  timer = setTimeout(function () { if (signedIn()) show(ios); else later(ios, 8000); }, ms);
}
W.__asInstall = { ready: function () { return !!ev; }, prompt: function () { if (!ev) return false; try { ev.prompt(); ev.userChoice.then(function (c) { if (c && c.outcome === 'accepted') ls('as_installed', '1'); ev = null; }); return true; } catch (e) { return false; } } };
W.addEventListener('beforeinstallprompt', function (e) { ev = e; if (!standalone() && !dismissed()) later(false, 7000); });   // index.html stores it too; we never cancel its handling
W.addEventListener('appinstalled', function () { ls('as_installed', '1'); hide(); });
if (isIos() && !standalone() && !dismissed()) later(true, 12000);
})();
/* Academic Summit - install-card.js v1
   A permanent "Install the app" card on the Profile screen (student and lecturer) with a self-check that says exactly
   why the browser is not offering the install (manifest, icons, service worker, already installed). */
(function () {
'use strict';
var W = window;
if (typeof document === 'undefined') return;
function standalone() { try { return W.matchMedia('(display-mode: standalone)').matches || W.navigator.standalone === true; } catch (e) { return false; } }
var OUT = 'as-inst-out';
function out(h) { var o = document.getElementById(OUT); if (o) o.innerHTML = h; }
function cardHtml() {
  return '<div class="card p-5 space-y-2 mt-5" id="as-inst-card"><div class="lbl">Install the app</div>' +
    '<button class="btn w-full" onclick="asInstallNow()">Install Academic Summit</button>' +
    '<div id="as-inst-out" class="text-[11px]" style="color:var(--mut)">' + (standalone() ? 'Installed on this phone.' : 'Opens like an app from your home screen and loads faster.') + '</div></div>';
}
function wrapView(obj, key) {
  if (!obj || typeof obj[key] !== 'function' || obj[key].__asInst) return;
  var base = obj[key];
  obj[key] = function () { var h = base.apply(this, arguments); return typeof h === 'string' && h.indexOf('as-inst-card') < 0 ? h + cardHtml() : h; };
  obj[key].__asInst = true;
}
try { wrapView(V, 'prof'); } catch (e) {}
try { wrapView(LECTURER_VIEWS, 'prof'); } catch (e) {}

W.asInstallNow = function () {
  OUT = 'as-inst-out';
  if (standalone()) return out('Already installed on this phone. \u2713');
  if (W.__asInstall && W.__asInstall.ready() && W.__asInstall.prompt()) return;
  var ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  OUT = 'as-inst-out';
  out(ios ? 'On iPhone: tap the Share button, then <b>Add to Home Screen</b>.'
          : 'In Chrome: tap the three dots at the top right, then <b>Install app</b> (or <b>Add to Home screen</b>).');
};
W.asInstallCheck = async function () {
  OUT = 'as-instdiag-out';
  var L = [], ok = function (b, t) { L.push((b ? '\u2713 ' : '\u2717 ') + t); };
  out('Checking...');
  try {
    ok(location.protocol === 'https:', 'Secure connection (https)');
    var link = document.querySelector('link[rel="manifest"]');
    ok(!!link, 'Manifest linked in the page');
    if (link) {
      var r = await fetch(link.href, { cache: 'no-store' }), m = null;
      try { m = await r.clone().json(); } catch (e) {}
      ok(r.ok && !!m, 'Manifest loads (' + r.status + ')');
      if (m) {
        ok(!!(m.name || m.short_name), 'App name present');
        ok(m.display === 'standalone' || m.display === 'fullscreen', 'Opens like an app (display: ' + m.display + ')');
        var icons = m.icons || [], good = 0;
        for (var i = 0; i < icons.length; i++) {
          var u = new URL(icons[i].src, link.href), x;
          try { x = await fetch(u, { cache: 'no-store' }); } catch (e) { x = { ok: false, status: 'blocked' }; }
          if (x.ok) good++; else ok(false, 'Icon missing: ' + icons[i].src + ' (' + x.status + ')');
        }
        ok(good > 0 && good === icons.length, 'Icons load (' + good + ' of ' + icons.length + ')');
      }
    }
    var reg = navigator.serviceWorker && (await navigator.serviceWorker.getRegistration());
    ok(!!reg, 'Service worker registered');
    ok(!standalone(), 'Running in the browser (not already installed)');
    ok(!!(W.__asInstall && W.__asInstall.ready()), 'Browser has offered the install prompt');
  } catch (e) { L.push('\u2717 Check failed: ' + e.message); }
  out(L.join('<br>'));
};
/* technical tools: Admin Panel only, never shown to students or lecturers */
function paintAdminBox() {
  var main = document.getElementById('main'); if (!main) return;
  if (typeof isAdmin === 'function' && !isAdmin()) return;
  var box = document.getElementById('as-instdiag-box');
  if (!box) {
    box = document.createElement('div'); box.id = 'as-instdiag-box';
    var anchor = document.getElementById('as-team-box') || document.getElementById('as-rules-box');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor.nextSibling); else if (main.firstElementChild) main.firstElementChild.appendChild(box); else return;
  }
  var dbg = false; try { dbg = localStorage.getItem('as_debug') === '1'; } catch (e) {}
  box.className = 'card p-6 space-y-3';
  box.innerHTML = '<div class="font-extrabold">Technical tools</div><p class="text-xs" style="color:var(--mut)">For testing only. Students and lecturers never see these.</p>' +
    '<button class="btn2 w-full" onclick="asInstallCheck()">Check install readiness</button><div id="as-instdiag-out" class="text-[11px]" style="color:var(--mut)"></div>' +
    '<button class="btn2 w-full" onclick="asDebugToggle()">Location details on this phone: ' + (dbg ? 'ON' : 'OFF') + '</button>';
}
W.asDebugToggle = function () { try { localStorage.setItem('as_debug', localStorage.getItem('as_debug') === '1' ? '0' : '1'); } catch (e) {} paintAdminBox(); };
var goB = W.go;
W.go = function (v) { var r = goB.apply(this, arguments); if (v === 'admin') [1700, 3000].forEach(function (ms) { setTimeout(paintAdminBox, ms); }); return r; };
})();
/* Academic Summit - data-report.js v1
   "Download my data" now offers a readable report (PDF or Word) organised into sections, plus the raw backup file
   (JSON) for restoring. The old button produced only the raw JSON. */
(function () {
'use strict';
var W = window;
function num(v) { var n = parseFloat(v); return isNaN(n) ? null : n; }
function g(s) { s = num(s); if (s == null) return ['-', 0]; return s >= 70 ? ['A', 5] : s >= 60 ? ['B', 4] : s >= 50 ? ['C', 3] : s >= 45 ? ['D', 2] : s >= 40 ? ['E', 1] : ['F', 0]; }
function d(x) { try { return new Date(x).toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' }); } catch (e) { return ''; } }
function f1(n) { return (Math.round(n * 100) / 100).toFixed(2); }

/* pure: turn the saved app state into titled tables */
function collect(U, email) {
  var p = (U && U.profile) || {}, blocks = [], totU = 0, totP = 0;
  blocks.push({ h: 'Profile', cols: ['Item', 'Value'], w: [1, 2.4], rows: [['Name', p.name || (U && U.name) || ''], ['Email', email || ''], ['Matric / ID number', p.matric || ''], ['Institution', p.uni || ''], ['Faculty', p.faculty || ''], ['Department', p.program || ''], ['Level', p.level || '']].filter(function (r) { return r[1] !== ''; }) });
  var sems = (U && U.semesters) || [], resultBlocks = [];
  sems.forEach(function (s) {
    var su = 0, sp = 0, rows = (s.courses || []).map(function (c) {
      var sc = num(c.score != null ? c.score : c.sc), u = num(c.unit) || 0, gp = g(sc);
      if (sc != null && u) { su += u; sp += gp[1] * u; }
      return [c.code || '', u || '', sc == null ? '' : sc, sc == null ? '' : gp[0]];
    });
    totU += su; totP += sp;
    if (rows.length) rows.push(['Semester GPA', su || '', '', su ? f1(sp / su) : '-']);
    resultBlocks.push({ h: 'Results: ' + (s.name || 'Semester'), cols: ['Course', 'Units', 'Score', 'Grade'], w: [2, 1, 1, 1], rows: rows.length ? rows : [['No courses recorded', '', '', '']] });
  });
  blocks.push({ h: 'Summary', cols: ['Item', 'Value'], w: [1.4, 2], rows: [['Cumulative GPA (5.0 scale)', totU ? f1(totP / totU) : '-'], ['Units with scores', totU], ['Semesters recorded', sems.length]].concat(U && U.study && num(U.study.streak) != null ? [['Study streak (days)', U.study.streak]] : []) });
  blocks = blocks.concat(resultBlocks);
  ((U && U.dec) || []).forEach(function (half, i) {
    if (half && half.length) blocks.push({ h: 'Course registration: semester ' + (i + 1), cols: ['Course', 'Type', 'Units'], w: [2, 1.4, 1], rows: half.map(function (c) { return [c.code || '', c.st === 'C' ? 'Core' : c.st === 'E' ? 'Elective' : (c.st || ''), c.unit || '']; }) });
  });
  var att = (U && U.attendance) || [];
  if (att.length) {
    var by = {}; att.forEach(function (a) { var k = String(a.code || '').toUpperCase(); by[k] = (by[k] || 0) + 1; });
    blocks.push({ h: 'Attendance marked on this phone', cols: ['Course', 'Classes marked'], w: [2, 1.4], rows: Object.keys(by).sort().map(function (k) { return [k, by[k]]; }) });
  }
  var tx = (U && U.tx) || [];
  if (tx.length) {
    var inc = 0, exp = 0; tx.forEach(function (t) { var a = num(t.amt) || 0; if (/in|credit/i.test(String(t.type || ''))) inc += a; else exp += a; });
    blocks.push({ h: 'Finance', cols: ['Date', 'Type', 'Category', 'Description', 'Amount'], w: [1.2, 1, 1.2, 2, 1.1],
      rows: tx.slice(-40).reverse().map(function (t) { return [d(t.date), t.type || '', t.cat || '', t.desc || '', t.amt || '']; }).concat([['Total in / out', '', '', '', Math.round(inc) + ' / ' + Math.round(exp)]]) });
  }
  return { title: 'My Academic Summit data', sub: (p.name || email || '') + '  |  generated ' + d(new Date()), blocks: blocks };
}

/* hand-written PDF with several titled tables */
function latin(s) { return String(s == null ? '' : s).replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7e\u00a0-\u00ff]/g, '?'); }
function pstr(s) { return '(' + latin(s).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)') + ')'; }
function fit(s, w, sz) { s = latin(s); var n = Math.max(1, Math.floor(w / (sz * 0.5))); return s.length > n ? s.slice(0, Math.max(1, n - 1)) + '.' : s; }
function toPDF(m) {
  var PW = 595, PH = 842, MX = 40, TOP = 56, BOT = 50, LH = 15, SZ = 9, usable = PW - 2 * MX, pages = [], cur = '', y = PH - TOP;
  function T(sz, bold, x, yy, s) { return 'BT /' + (bold ? 'F2' : 'F1') + ' ' + sz + ' Tf ' + x.toFixed(1) + ' ' + yy.toFixed(1) + ' Td ' + pstr(s) + ' Tj ET\n'; }
  function newPage() { pages.push(cur); cur = ''; y = PH - TOP; }
  function need(h) { if (y - h < BOT) newPage(); }
  cur += '0.06 0.32 0.20 rg\n' + T(18, true, MX, y, m.title) + '0.35 0.35 0.35 rg\n' + T(10, false, MX, y - 16, m.sub) + '0 0 0 rg\n'; y -= 42;
  m.blocks.forEach(function (b) {
    var ws = [], xs = [], tot = b.w.reduce(function (a, c) { return a + c; }, 0), x = MX;
    b.w.forEach(function (w) { var cw = usable * w / tot; xs.push(x); ws.push(cw); x += cw; });
    need(LH * 3); cur += '0.06 0.32 0.20 rg\n' + T(11.5, true, MX, y, b.h) + '0 0 0 rg\n'; y -= LH + 2;
    function head() { cur += '0.06 0.32 0.20 rg ' + MX + ' ' + (y - 4) + ' ' + usable + ' ' + LH + ' re f 1 1 1 rg\n'; b.cols.forEach(function (c, k) { cur += T(SZ, true, xs[k] + 3, y, fit(c, ws[k] - 6, SZ)); }); cur += '0 0 0 rg\n'; y -= LH; }
    head();
    b.rows.forEach(function (r, i) {
      if (y - LH < BOT) { newPage(); head(); }
      if (i % 2) cur += '0.94 0.97 0.95 rg ' + MX + ' ' + (y - 4) + ' ' + usable + ' ' + LH + ' re f 0 0 0 rg\n';
      var bold = /GPA|Total/.test(String(r[0]));
      r.forEach(function (c, k) { cur += T(SZ, bold, xs[k] + 3, y, fit(c, ws[k] - 6, SZ)); }); y -= LH;
    });
    y -= 10;
  });
  pages.push(cur);
  var N = pages.length, objs = [], kids = [];
  objs[1] = '<< /Type /Catalog /Pages 2 0 R >>'; objs[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'; objs[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  pages.forEach(function (c, p) {
    c += '0.45 0.45 0.45 rg\n' + T(8, false, MX, 28, 'Academic Summit  -  personal data report') + T(8, false, PW - MX - 46, 28, 'Page ' + (p + 1) + ' of ' + N);
    var pid = 5 + p * 2, cid = pid + 1; kids.push(pid + ' 0 R');
    objs[pid] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + PW + ' ' + PH + '] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ' + cid + ' 0 R >>';
    objs[cid] = '<< /Length ' + c.length + ' >>\nstream\n' + c + 'endstream';
  });
  objs[2] = '<< /Type /Pages /Kids [' + kids.join(' ') + '] /Count ' + N + ' >>';
  var o = '%PDF-1.4\n', offs = [];
  for (var n = 1; n < objs.length; n++) { offs[n] = o.length; o += n + ' 0 obj\n' + objs[n] + '\nendobj\n'; }
  var xr = o.length; o += 'xref\n0 ' + objs.length + '\n0000000000 65535 f \n';
  for (n = 1; n < objs.length; n++) o += ('0000000000' + offs[n]).slice(-10) + ' 00000 n \n';
  o += 'trailer\n<< /Size ' + objs.length + ' /Root 1 0 R >>\nstartxref\n' + xr + '\n%%EOF';
  var u8 = new Uint8Array(o.length); for (var q = 0; q < o.length; q++) u8[q] = o.charCodeAt(q) & 255; return u8;
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function toWord(m) {
  var h = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + esc(m.title) + '</title></head><body style="font-family:Calibri,Arial,sans-serif"><h2 style="color:#0f5132;margin-bottom:2px">' + esc(m.title) + '</h2><p style="color:#555;font-size:10pt;margin-top:0">' + esc(m.sub) + '</p>';
  m.blocks.forEach(function (b) {
    h += '<h3 style="color:#0f5132;margin-bottom:3px">' + esc(b.h) + '</h3><table style="border-collapse:collapse;width:100%"><tr>' + b.cols.map(function (c) { return '<th style="border:1px solid #999;background:#0f5132;color:#fff;padding:4px;text-align:left;font-size:10pt">' + esc(c) + '</th>'; }).join('') + '</tr>' +
      b.rows.map(function (r) { return '<tr>' + r.map(function (c) { return '<td style="border:1px solid #bbb;padding:3px;font-size:10pt">' + esc(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</table>';
  });
  return h + '</body></html>';
}
W.__asReport = { collect: collect, toPDF: toPDF, toWord: toWord };
if (typeof document === 'undefined') return;

function save(blob, name) { var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }
function day() { var x = new Date(); return x.getFullYear() + '-' + ('0' + (x.getMonth() + 1)).slice(-2) + '-' + ('0' + x.getDate()).slice(-2); }
var rawExport = W.asExport;
W.asExport = function () {
  var old = document.getElementById('dr-ov'); if (old) old.remove();
  var ov = document.createElement('div'); ov.id = 'dr-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:12px';
  ov.innerHTML = '<div class="card p-5 space-y-3" style="width:100%;max-width:420px"><div class="font-extrabold">Download my data</div>' +
    '<p class="text-xs" style="color:var(--mut)">The report is for reading. The backup file is only for restoring the app and is not meant to be read.</p>' +
    '<button class="btn w-full" data-k="pdf">Readable report (PDF)</button><button class="btn2 w-full" data-k="doc">Readable report (Word)</button>' +
    '<button class="btn2 w-full" data-k="raw">Backup file (for restore)</button><button class="btn2 w-full" data-k="x">Cancel</button></div>';
  ov.addEventListener('click', function (e) {
    var k = e.target && e.target.getAttribute && e.target.getAttribute('data-k'); if (e.target === ov) k = 'x'; if (!k) return; ov.remove();
    try {
      if (k === 'raw') return typeof rawExport === 'function' && rawExport();
      if (k === 'x') return;
      var m = collect(U, typeof email !== 'undefined' ? email : '');
      if (k === 'pdf') save(new Blob([toPDF(m)], { type: 'application/pdf' }), 'academic-summit-report-' + day() + '.pdf');
      else save(new Blob(['\ufeff' + toWord(m)], { type: 'application/msword' }), 'academic-summit-report-' + day() + '.doc');
      try { showToast('Report saved'); } catch (e2) {}
    } catch (err) { try { showToast('Could not create the report', 'error'); } catch (e3) {} }
  });
  document.body.appendChild(ov);
};
})();
/* Academic Summit - auth-first.js v1
   A new visitor lands on CREATE ACCOUNT (not login), with a short list of what they will need.
   Anyone who has signed in on this phone before still lands on login. "Have an account? Log in" always works. */
(function () {
'use strict';
var W = window;
if (typeof document === 'undefined' || typeof W.authUI !== 'function') return;
function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
var fromLink = false;
document.addEventListener('click', function (e) {
  var t = e.target && e.target.closest && e.target.closest('[onclick]'); if (!t) return;
  var o = t.getAttribute('onclick') || '';
  if (/authUI\('login'\)/.test(o) && !/as_welcomed/.test(o)) fromLink = true;      // the person chose "Log in" themselves
}, true);
var orig = W.authUI;
W.authUI = function (mode, msg) {
  var m = mode;
  if (mode === 'login' && !msg && ls('as_welcomed') && ls('as_has_account') !== '1' && !fromLink) m = 'signup';
  var r = orig.call(this, m, msg);
  fromLink = false;
  if (m === 'signup') setTimeout(addNeeds, 0);
  return r;
};
function addNeeds() {
  var name = document.getElementById('a-name'); if (!name || document.getElementById('as-needs')) return;
  var box = document.createElement('div'); box.id = 'as-needs';
  box.style.cssText = 'border:1px solid #14532d;background:#06241b;border-radius:14px;padding:12px;font-size:12px;line-height:1.5;color:#bfeadb;text-align:left';
  box.innerHTML = '<b style="color:#6ee7b7">What you will need</b><br>1. Your full name, an email and a password<br>2. Your <b>matric number</b> (100 level: your JAMB number works until you get one)<br>3. Your <b>course registration</b> (screenshot or list). Add it after sign-up so your attendance and class notices match your courses.';
  var holder = name.closest('.space-y-3') || name.parentNode.parentNode; holder.insertBefore(box, holder.firstChild);
}
/* remember this phone has an account once someone has signed in */
var goB = W.go;
W.go = function () { try { if (typeof uid !== 'undefined' && uid) ls('as_has_account', '1'); } catch (e) {} return goB.apply(this, arguments); };
})();
/* Academic Summit - att-card.js v1
   Student attendance card, both on Home and on the Attend screen:
   - Matric number instead of course code (the class comes from the lecturer's session on the server).
   - First-mark consent sheet: short privacy notice + optional marketing opt-in (OFF by default), saved on the profile.
   - New accounts are dropped onto the attendance screen once; on the second visit the Attend tab glows until opened.
   Everything still goes through the same mark_attendance function. */
(function () {
'use strict';
var W = window, FL = null, FLat = 0, firstDropNow = false, dropped = false;
function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
function toast(m, t) { try { showToast(m, t); } catch (e) {} }
function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function isLec() { try { return U && U.role === 'lecturer'; } catch (e) { return false; } }
function norm(c) { return String(c || '').toUpperCase().replace(/\s+/g, ''); }
function regCodes() { try { var d = (U.dec && U.dec[U.curHalf || 0]) || []; return d.map(function (c) { return norm(c.code); }).filter(Boolean); } catch (e) { return []; } }
function fallback() { return { server: false, consent: ls('as_consent_v1') === '1', marketing: false, first_visit_done: true, glow_seen: true }; }
function flags() {
  if (FL && Date.now() - FLat < 120000) return Promise.resolve(FL);
  return Promise.resolve(sb.rpc('my_flags')).then(function (r) {
    if (r && !r.error && r.data) { FL = r.data; FL.server = true; FLat = Date.now(); return FL; }
    return fallback();
  }, fallback);
}
function modal(html) {
  var old = document.getElementById('ac-ov'); if (old) old.remove();
  var ov = document.createElement('div'); ov.id = 'ac-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center;padding:12px';
  ov.innerHTML = '<div class="card p-5 space-y-3" style="width:100%;max-width:420px;max-height:88vh;overflow:auto">' + html + '</div>';
  document.body.appendChild(ov); return ov;
}
W.__asCard = { fallback: fallback };

/* ---- consent on the first mark ---- */
function ensureConsent() {
  return flags().then(function (f) {
    if (f.consent) return true;
    return new Promise(function (res) {
      var ov = modal('<div class="font-extrabold">Before you mark attendance</div>' +
        '<div class="text-xs space-y-2" style="color:var(--mut)"><p><b>What we record:</b> your matric number, the class, the time, and a yes/no for whether you were near your lecturer.</p>' +
        '<p><b>Your location:</b> checked once when you mark. Your exact map position is never saved; at most we keep how far you were from your lecturer.</p>' +
        '<p><b>Who sees it:</b> your lecturer sees your name, matric number and the time for classes you attend. Your records are stored securely and are not sold.</p></div>' +
        '<label class="flex gap-2 items-start text-xs"><input id="ac-mk" type="checkbox" style="margin-top:2px"><span>Send me campus news, offers and product updates (optional, you can change this later)</span></label>' +
        '<button class="btn w-full" id="ac-ok">I understand, continue</button><button class="btn2 w-full" id="ac-x">Cancel</button>');
      document.getElementById('ac-x').onclick = function () { ov.remove(); res(false); };
      document.getElementById('ac-ok').onclick = function () {
        var mk = !!document.getElementById('ac-mk').checked; ov.remove(); ls('as_consent_v1', '1');
        Promise.resolve(sb.rpc('record_consent', { p_marketing: mk })).then(function () {}, function () {});
        if (FL) { FL.consent = true; FL.marketing = mk; } res(true);
      };
    });
  });
}

/* ---- matric on the card ---- */
function ensureId() {
  return new Promise(function (res) {
    var inp = document.getElementById('ha-matric'), v = inp ? inp.value.trim() : '', R = W.__asReg;
    if (inp && v && R) {
      var cur = String((U.profile && U.profile.matric) || '').toUpperCase().replace(/\s+/g, '');
      if (v.toUpperCase().replace(/\s+/g, '') !== cur) {
        var c = R.idCheck(v, (U.profile || {}).level);
        if (!c.ok) { toast(c.msg, 'error'); return res(false); }
        U.profile = U.profile || {}; U.profile.matric = c.value; save();
        sb.from('profiles').update({ matric: c.value }).eq('id', uid).then(function () {}, function () {});
        toast('Matric number saved');
      }
      return res(true);
    }
    if (R && R.needsId(U.profile) && typeof W.srMatricAsk === 'function') return W.srMatricAsk(function () { res(true); });
    res(true);
  });
}
var mk = W.markAttendance;
if (typeof mk === 'function') W.markAttendance = async function (pin, course, source) {
  if (isLec() || !/^\d{5}$/.test(pin)) return mk.apply(this, arguments);
  if (!(await ensureId())) return false;
  if (!(await ensureConsent())) return false;
  var ok = await mk.apply(this, arguments);
  try {
    if (ok) { var last = (U.attendance || [])[(U.attendance || []).length - 1], codes = regCodes();
      if (last && codes.length && codes.indexOf(norm(last.code)) < 0) toast('Note: ' + last.code + ' is not on your course registration.'); }
  } catch (e) {}
  return ok;
};

/* save the matric typed on the card BEFORE the course check runs, so the student is never asked twice */
var mfh = W.markFromHome;
if (typeof mfh === 'function') W.markFromHome = async function () { if (!isLec() && !(await ensureId())) return; return mfh.apply(this, arguments); };

/* ---- the card itself ---- */
(function () { var st = document.createElement('style'); st.textContent = '#sr-chips{display:none!important}@keyframes asglow{0%,100%{box-shadow:0 0 0 0 rgba(16,185,129,0)}50%{box-shadow:0 0 16px 7px rgba(16,185,129,.6)}}.as-glow{animation:asglow 1.5s infinite;border-radius:16px}'; document.head.appendChild(st); })();
function decorate() {
  if (isLec()) return;
  var c = document.getElementById('ha-course'); if (!c || document.getElementById('ha-matric')) return;
  c.style.display = 'none';
  var m = document.createElement('input'); m.id = 'ha-matric'; m.className = c.className; m.placeholder = 'Matric / JAMB number'; m.setAttribute('autocomplete', 'off');
  m.value = (U.profile && U.profile.matric) || ''; m.style.textTransform = 'uppercase';
  c.parentNode.insertBefore(m, c);
}
function glow() {
  if (isLec()) return;
  flags().then(function (f) {
    var b = document.querySelector('.bn[data-n="att"]'); if (!b) return;
    if (f.server && f.first_visit_done && !f.glow_seen && !firstDropNow && typeof view !== 'undefined' && view !== 'att') b.classList.add('as-glow'); else b.classList.remove('as-glow');
  });
}
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  try {
    if (!isLec() && typeof uid !== 'undefined' && uid) {
      if (v === 'home' && !dropped) {
        dropped = true;
        flags().then(function (f) { if (f.server && !f.first_visit_done) { firstDropNow = true; FL.first_visit_done = true; Promise.resolve(sb.rpc('mark_first_visit')).then(function () {}, function () {}); setTimeout(function () { W.go('att'); toast('Welcome! Mark your first class here.'); }, 150); } });
      }
      if (v === 'att') flags().then(function (f) { if (f.server && f.first_visit_done && !f.glow_seen && !firstDropNow) { FL.glow_seen = true; Promise.resolve(sb.rpc('mark_glow_seen')).then(function () {}, function () {}); var b = document.querySelector('.bn[data-n="att"]'); if (b) b.classList.remove('as-glow'); } });
      setTimeout(decorate, 450); setTimeout(decorate, 1400); setTimeout(glow, 700);
    }
  } catch (e) {}
  return r;
};
})();
/* Academic Summit - lec-clearance.js v1
   Lecturer "Exam clearance": pick a course and a cutoff (30-100%, default 75). The cutoff belongs to THIS report only;
   it never changes the school-wide pass mark. Students who registered the course but never attended show at 0%.
   Exports (PDF / Word / CSV) are stamped with the cutoff. Every report is also saved on the server as an audit snapshot. */
(function () {
'use strict';
var W = window, LAST = null;
function E(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
function toast(m, t) { try { showToast(m, t); } catch (e) {} }
function csvCell(v) { v = String(v == null ? '' : v); if (/^[=+\-@]/.test(v)) v = "'" + v; return '"' + v.replace(/"/g, '""') + '"'; }
function courses() { try { return ((U.lec && U.lec.courses) || []).filter(function (c) { return c && c.code; }).map(function (c) { return c.code; }); } catch (e) { return []; } }
function card() {
  var cs = courses();
  return '<div id="lc-box" class="card p-4 space-y-3"><div class="font-extrabold">Exam clearance</div>' +
    (cs.length ? '<p class="text-xs" style="color:var(--mut)">Who has attended enough classes to sit the exam. The cutoff applies to this report only.</p>' +
      '<select id="lc-course" class="inp uppercase font-mono font-bold">' + cs.map(function (c) { return '<option>' + E(c) + '</option>'; }).join('') + '</select>' +
      '<div class="flex items-center justify-between text-sm"><span>Cutoff</span><b id="lc-cutv">75%</b></div>' +
      '<input id="lc-cut" type="range" min="30" max="100" step="5" value="75" style="width:100%" oninput="document.getElementById(\'lc-cutv\').textContent=this.value+\'%\'">' +
      '<button class="btn w-full" onclick="lcRun(this)">Generate clearance report</button><div id="lc-out"></div>'
      : '<p class="text-xs" style="color:var(--mut)">Register the courses you teach in your teaching profile first.</p>') + '</div>';
}
var base = LECTURER_VIEWS && LECTURER_VIEWS.records;
if (typeof base === 'function') LECTURER_VIEWS.records = function () {
  var h = base.apply(this, arguments);
  return typeof h === 'string' && h.indexOf('lc-box') < 0 ? h.replace('<div id="rec-list"', card() + '<div id="rec-list"') : h;
};
W.lcRun = async function (btn) {
  var course = (document.getElementById('lc-course') || {}).value, cut = parseInt((document.getElementById('lc-cut') || {}).value, 10) || 75, out = document.getElementById('lc-out');
  if (!course) return toast('Choose a course', 'error');
  if (btn) btn.disabled = true; out.innerHTML = '<div class="text-xs" style="color:var(--mut)">Working...</div>';
  var r = await sb.rpc('clearance_report', { p_course: course, p_cutoff: cut });
  if (btn) btn.disabled = false;
  if (r.error) { out.innerHTML = ''; return toast(r.error.message, 'error'); }
  LAST = r.data; var rows = LAST.rows || [], ok = rows.filter(function (x) { return x.eligible; }).length;
  if (!LAST.held) { out.innerHTML = '<div class="text-xs" style="color:var(--mut)">No saved classes for this course yet.</div>'; return; }
  out.innerHTML = '<div class="text-sm"><b>' + ok + '</b> of ' + rows.length + ' students cleared at ' + LAST.cutoff + '% (' + LAST.held + ' classes held)</div>' +
    '<button class="btn2 w-full" onclick="lcExport()">Export (PDF / Word / CSV)</button><div style="max-height:260px;overflow:auto"><table class="w-full text-left text-xs"><thead><tr style="color:var(--mut)"><th class="py-1 pr-2">Student</th><th class="pr-2">Attended</th><th class="pr-2">%</th><th>Cleared</th></tr></thead><tbody>' +
    rows.map(function (x) {
      return '<tr style="border-top:1px solid var(--bd)"><td class="py-1 pr-2">' + E(x.name || '-') + '<div class="font-mono" style="color:var(--mut)">' + E(x.matric || '') + '</div></td><td class="pr-2">' + x.attended + '/' + x.held + '</td><td class="pr-2">' + x.pct + '%</td><td style="color:' + (x.eligible ? '#16a34a' : '#dc2626') + ';font-weight:700">' + (x.eligible ? 'Yes' : 'No') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
};
W.lcExport = function () {
  var D = W.__asDocs; if (!LAST || !D || !D.choose) return toast('Nothing to export', 'error');
  var rows = LAST.rows || [], ok = rows.filter(function (x) { return x.eligible; }).length, stamp = 'Cutoff ' + LAST.cutoff + '%  |  ' + LAST.held + ' classes held  |  ' + ok + ' of ' + rows.length + ' cleared  |  ' + D.stamp();
  var m = { title: 'Exam clearance - ' + LAST.course, sub: stamp, cols: ['No', 'Name', 'Matric', 'Attended', '%', 'Cleared'], w: [0.6, 3, 2.4, 1.2, 0.8, 1],
    rows: rows.map(function (x, i) { return [i + 1, x.name || '', x.matric || '', x.attended + '/' + x.held, x.pct + '%', x.eligible ? 'Yes' : 'No']; }) };
  var csv = function () {
    var lines = ['# ' + stamp, 'No,Name,Matric,Attended,Held,Percent,Cleared (cutoff ' + LAST.cutoff + '%)'].concat(rows.map(function (x, i) { return [i + 1, x.name, x.matric, x.attended, x.held, x.pct, x.eligible ? 'Yes' : 'No'].map(csvCell).join(','); }));
    var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv' })); a.download = D.slug(LAST.course) + '-clearance-' + LAST.cutoff + '.csv'; document.body.appendChild(a); a.click(); a.remove();
  };
  D.choose(m, csv, D.slug(LAST.course) + '-clearance-' + LAST.cutoff);
};
})();
/* Academic Summit - lec-delete.js v1
   1) Lecturers can delete a class (open roster or any class in Records) only while the owner's switch is ON.
      Deleting goes through a database function; the old direct delete is blocked by design.
   2) Owner-only Admin card: the delete switch, and "Clear all attendance records" for starting fresh at launch.
   3) After a wipe, students' phones clear their local attendance list too. */
(function () {
'use strict';
var W = window, ON = null, ONat = 0;
if (typeof document === 'undefined') return;
function toast(m, t) { try { showToast(m, t); } catch (e) {} }
function isLec() { try { return U && U.role === 'lecturer'; } catch (e) { return false; } }
function delOn(force) {
  if (!force && ON !== null && Date.now() - ONat < 30000) return Promise.resolve(ON);
  return Promise.resolve(sb.rpc('lecturer_delete_on')).then(function (r) { if (r && !r.error && typeof r.data === 'boolean') { ON = r.data; ONat = Date.now(); } return ON === true; }, function () { return ON === true; });
}
async function doDelete(sid) {
  var r = await sb.rpc('delete_my_session', { p_id: sid });
  if (r.error) { toast(r.error.message, 'error'); return false; }
  toast('Class deleted (' + (r.data || 0) + ' records removed)'); return true;
}

/* ---- lecturer: roster danger zone ---- */
W.deleteRoster = async function () {
  var sid = W._rosterSid; if (!sid) return toast('Open a roster first', 'error');
  if (!(await delOn(true))) return toast('Deleting classes is switched off by the administrator', 'error');
  if (!confirm('This permanently deletes this class and every attendance record in it. Export it first if you need it. Delete?')) return;
  if (await doDelete(sid)) { W._rosterSid = null; try { localStorage.removeItem('as_live_' + uid); } catch (e) {} if (typeof W.loadRoster === 'function') W.loadRoster(); }
};
function hideDanger() {
  delOn().then(function (on) {
    var cs = document.querySelectorAll('#main .card');
    Array.prototype.forEach.call(cs, function (c) { var f = c.firstElementChild; if (f && /^Danger zone/.test((f.textContent || '').trim())) c.style.display = on ? '' : 'none'; });
  });
}
/* ---- lecturer: delete button on a class in Records ---- */
var ro = W.recOpen;
if (typeof ro === 'function') W.recOpen = async function (id) {
  await ro.apply(this, arguments);
  if (!(await delOn())) return;
  var c = document.querySelector('#rec-list .card'); if (!c || c.querySelector('[data-del]')) return;
  var b = document.createElement('button'); b.className = 'btn2 w-full'; b.style.color = '#e11d48'; b.setAttribute('data-del', '1'); b.textContent = 'Delete this class';
  b.onclick = async function () { if (!confirm('Delete this class and all its attendance records? This cannot be undone.')) return; if (await doDelete(id) && typeof W.loadRecs === 'function') W.loadRecs(); };
  c.appendChild(b);
};

/* ---- owner: Admin card ---- */
function paintAdmin() {
  var main = document.getElementById('main'); if (!main || document.getElementById('as-wipe-box')) return;
  Promise.resolve(sb.rpc('admin_team')).then(function (r) {
    if (!r || r.error || !r.data || !r.data.me_owner) return;                 // owner only
    delOn(true).then(function (on) {
      var box = document.createElement('div'); box.id = 'as-wipe-box'; box.className = 'card p-6 space-y-3';
      box.innerHTML = '<div class="font-extrabold">Records and deletion (owner only)</div>' +
        '<div class="flex items-center justify-between text-sm"><span>Lecturers can delete classes</span><b style="color:' + (on ? '#16a34a' : '#dc2626') + '">' + (on ? 'ON' : 'OFF') + '</b></div>' +
        '<button class="btn2 w-full" id="wp-tog">' + (on ? 'Turn deleting off' : 'Turn deleting on') + '</button>' +
        '<div class="text-xs" style="color:var(--mut)">Starting fresh at launch: removes every class, attendance record, QR record, clearance report and attempt counter, for lecturers and students. It cannot be undone, so export what you need first.</div>' +
        '<button class="btn2 w-full" style="color:#e11d48" id="wp-wipe">Clear all attendance records</button>';
      var anchor = document.getElementById('as-instdiag-box') || document.getElementById('as-team-box');
      if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(box, anchor); else if (main.firstElementChild) main.firstElementChild.appendChild(box); else return;
      document.getElementById('wp-tog').onclick = function () { sb.rpc('admin_set_lecturer_delete', { p_on: !on }).then(function (x) { if (x.error) return toast(x.error.message, 'error'); ON = x.data; ONat = Date.now(); toast('Lecturer deleting is now ' + (x.data ? 'ON' : 'OFF')); box.remove(); paintAdmin(); }); };
      document.getElementById('wp-wipe').onclick = async function () {
        var p = await sb.rpc('admin_wipe_preview'); if (p.error) return toast(p.error.message, 'error');
        var c = p.data;
        if (!confirm('This will permanently delete:\n' + c.attendance + ' attendance marks\n' + c.sessions + ' classes\n' + c.qr_sessions + ' QR classes\n' + c.clearance_reports + ' clearance reports\n\nContinue?')) return;
        var phrase = prompt('Type exactly: WIPE ALL ATTENDANCE'); if (phrase === null) return;
        var w = await sb.rpc('admin_wipe_attendance', { p_phrase: phrase.trim() });
        if (w.error) return toast(w.error.message, 'error');
        toast('All attendance records cleared'); try { localStorage.removeItem('as_live_' + uid); } catch (e) {}
      };
    });
  }, function () {});
}

/* ---- students: clear the local attendance list after a wipe ---- */
var epochAt = 0;
function syncEpoch() {
  if (isLec() || Date.now() - epochAt < 120000) return; epochAt = Date.now();
  Promise.resolve(sb.from('app_settings').select('key,num_value').eq('key', 'attendance_epoch')).then(function (r) {
    var srv = r && r.data && r.data[0] && r.data[0].num_value; if (!srv) return;
    var loc = 0; try { loc = +localStorage.getItem('as_att_epoch') || 0; } catch (e) {}
    if (srv > loc) { try { if (U.attendance && U.attendance.length) { U.attendance = []; save(); } localStorage.setItem('as_att_epoch', String(srv)); } catch (e) {} }
  }, function () {});
}
var goB = W.go;
W.go = function (v) {
  var r = goB.apply(this, arguments);
  if (v === 'roster' && isLec()) [500, 1400].forEach(function (ms) { setTimeout(hideDanger, ms); });
  if (v === 'admin') [2200, 3600].forEach(function (ms) { setTimeout(paintAdmin, ms); });
  if (v === 'home' || v === 'att') setTimeout(syncEpoch, 1500);
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
