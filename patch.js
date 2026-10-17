// ===== patch.js: lecturer OTP survives navigation and reload =====
(function(){
const K=()=>'as_live_'+uid;
let tm=null,pl=null;
const rd=()=>{try{return JSON.parse(localStorage.getItem(K()))}catch(e){return null}};
const wr=s=>{try{localStorage.setItem(K(),JSON.stringify(s))}catch(e){}};
function stop(){clearInterval(tm);clearInterval(pl);tm=pl=null;}
function paint(){
  const s=rd();if(!s)return;
  const o=$('otp-display'),t=$('timer-display');
  if(!o||!t)return;
  const left=Math.max(0,Math.round((s.end-Date.now())/1000));
  o.textContent=left?s.code:'EXPIRED';
  t.textContent=left?'Expires in '+left+'s':'Session closed';
  const c=$('sub-count');if(c)c.textContent=(s.count||0)+' Present';
}
async function poll(){
  const s=rd();if(!s)return;
  try{
    const{count}=await sb.from('attendance').select('id',{count:'exact',head:true}).eq('session_id',s.id);
    const n=rd();if(n){n.count=count||0;wr(n);}
  }catch(e){}
  paint();
  if(Date.now()>s.end+5000)stop();
}
function run(){
  stop();paint();poll();
  tm=setInterval(function(){if(!rd())return stop();paint();},1000);
  pl=setInterval(poll,3000);
}
startAttendanceSession=async function(){
  const course=($('lec-course').value.trim()||'POS 204'),topic=$('lec-topic').value.trim();
  const{data,error}=await sb.rpc('start_session',{p_course:course,p_topic:topic});
  if(error)return showToast(error.message,'error');
  const s=data[0];
  wr({id:s.s_id,code:s.s_code,end:new Date(s.s_expires).getTime(),course:course,topic:topic,count:0});
  run();
};
const h0=LECTURER_VIEWS.home;
LECTURER_VIEWS.home=function(){
  const html=h0();
  setTimeout(function(){
    const s=rd();
    if(!s)return;
    if(Date.now()>s.end+600000){localStorage.removeItem(K());return;}
    if($('lec-course'))$('lec-course').value=s.course||$('lec-course').value;
    if($('lec-topic'))$('lec-topic').value=s.topic||'';
    run();
  },0);
  return html;
};
})();
// ===== end patch =====

/* Academic Summit - patch v64
   Load with ONE script tag at the very end of index.html (after all inline scripts):
   <script src="patch.js?v=64"></script>
   Replaces the v63 inline block's behaviour (that block can stay; it is neutralised here). */
(function () {
  var W = window;
  var GC = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#fb923c', E: '#f43f5e', F: '#b91c1c' };
  var NARROW_MAX = 44; // E band: 40-44. Exactly 40 gets the loudest warning.
  var TS = { lv: null };

  /* ---------- neutralise the v63 inline block (it matched uppercase text that never exists in textContent) ---------- */
  W.homeExtras = function () {};
  W.acadExtras = function () {};
  W.makeHomeCardsClickable = function () {};
  W.fixTrajectory = function () {};
  W.fixSemTitle = function () {};
  W.fixAttHero = function () {};

  if (typeof document !== 'undefined' && document.head) {
    var st = document.createElement('style');
    st.textContent = '.tg-t{fill:var(--mut)}.tg-g{stroke:var(--bd);stroke-width:.6}.tg-ax{stroke:var(--mut);stroke-width:1}';
    document.head.appendChild(st);
  }

  /* ---------- helpers ---------- */
  function fmt(n) { return Math.abs(n - Math.round(n)) < 1e-9 ? String(Math.round(n)) : n.toFixed(1); }
  function nums(courses, exSup) {
    var u = 0, q = 0;
    (courses || []).forEach(function (c) {
      if (exSup && c.sup) return;
      var un = +c.unit; u += un; q += un * gr(c.score)[1];
    });
    return { u: u, q: q, g: u ? q / u : 0 };
  }
  function majorityHalf(s, i) {
    var a = 0, b = 0;
    (s.courses || []).forEach(function (c) {
      if (typeof semOfCode === 'function' && semOfCode(c.code) === 1) a++; else b++;
    });
    if (a > b) return 0;
    if (b > a) return 1;
    return i % 2;
  }
  /* Give every semester a level (lv) and half (0 first, 1 second). */
  function tagAll() {
    var sems = (U && U.semesters) || [], cnt = [0, 0], ch = false;
    sems.forEach(function (s, i) {
      if (s.lv == null || s.half == null) {
        var nm = String(s.name || ''), m = nm.match(/(\d{3})\s*level/i), hh = null;
        if (/first/i.test(nm)) hh = 0; else if (/second/i.test(nm)) hh = 1;
        if (hh === null) hh = majorityHalf(s, i);
        s.half = hh;
        s.lv = m ? parseInt(m[1], 10) : 100 + cnt[hh] * 100;
        ch = true;
      }
      cnt[s.half] = Math.max(cnt[s.half], (s.lv - 100) / 100 + 1);
    });
    if (ch) save();
  }
  function lvl2(s) { return s.lv + 'L ' + (s.half ? 'Second' : 'First') + ' Semester'; }
  function lvlLong(s) { return s.lv + ' Level ' + (s.half ? 'Second' : 'First') + ' Semester'; }
  function lowestRows() {
    tagAll();
    var out = [];
    (U.semesters || []).forEach(function (s) {
      var cs = (s.courses || []).filter(function (c) { return c.score != null && c.score !== ''; });
      if (!cs.length) return;
      var low = cs.reduce(function (a, b) { return +b.score < +a.score ? b : a; });
      out.push({ s: s, c: low });
    });
    return out;
  }
  function closeBtn() { return '<button class="btn w-full mt-2" onclick="closeSheet()">Close</button>'; }

  /* ---------- Attendance: home is a single button, the page holds the inputs ---------- */
  W.attBar = function () {
    return '<button type="button" class="rounded-3xl p-6 grad shadow-lg text-left w-full flex items-center justify-between" onclick="go(\'att\')"><span class="font-extrabold text-white text-lg">Mark attendance</span>' + ic('r', 'w-5 h-5 text-white') + '</button>';
  };
  V.att = function () {
    setTimeout(function () { if (typeof attHistory === 'function') attHistory(); }, 80);
    return '<div class="space-y-5"><div class="card p-6 space-y-4"><div class="font-extrabold text-lg">Mark attendance</div>' +
      '<p class="text-xs text-slate-500">Enter your course code and the 5-digit code your lecturer calls out, then tap Mark.</p>' +
      '<input id="ha-course" class="inp uppercase font-mono font-bold" placeholder="Course code (e.g. POS 204)">' +
      '<input id="ha-pin" class="inp font-mono font-bold tracking-widest" placeholder="Lecturer code" maxlength="5" inputmode="numeric">' +
      '<button class="btn w-full py-3" onclick="markFromHome()">Mark</button></div>' +
      '<div class="card p-6 space-y-3"><div class="font-extrabold">My attendance</div><div id="att-hist" class="space-y-2 text-xs text-slate-500">Loading...</div></div></div>';
  };

  /* ---------- Carryover Register: a button that opens the register ---------- */
  W.carryCard = function () {
    return '<button type="button" class="card p-6 text-left w-full flex items-center justify-between" onclick="carrySheet()"><span class="font-extrabold">Carryover Register</span>' + ic('r', 'w-5 h-5') + '</button>';
  };
  W.carrySheet = function () {
    tagAll();
    var carries = [], narrow = [];
    (U.semesters || []).forEach(function (s) {
      (s.courses || []).forEach(function (c) {
        if (c.sup) return;
        var sc = +c.score;
        if (sc < 40) carries.push({ s: s, c: c });
        else if (sc <= NARROW_MAX) narrow.push({ s: s, c: c });
      });
    });
    var b = '';
    if (!carries.length) {
      b += '<div class="p-5 rounded-2xl text-center space-y-1" style="background:var(--sub);border-left:4px solid #10b981"><div class="font-extrabold">No carryovers yet - you are killing it.</div><p class="text-xs text-slate-500">Keep up the good work.</p></div>';
    } else {
      b += '<div class="p-4 rounded-2xl space-y-1" style="background:var(--sub);border-left:4px solid #e11d48"><div class="font-extrabold text-sm" style="color:#e11d48">Carryovers (' + carries.length + ')</div>' +
        carries.map(function (x) {
          return '<div class="flex justify-between py-2 text-xs border-b border-slate-200/40"><span>' + lvl2(x.s) + ' - <b>' + esc(x.c.code) + '</b></span><b style="color:#e11d48">' + x.c.score + ' (F)</b></div>';
        }).join('') + '</div>';
    }
    if (narrow.length) {
      narrow.sort(function (a, c) { return a.c.score - c.c.score; });
      b += '<div class="p-4 rounded-2xl space-y-1" style="background:var(--sub);border-left:4px solid #d97706"><div class="font-extrabold text-sm" style="color:#d97706">Narrow escapes (' + narrow.length + ')</div>' +
        '<p class="text-[11px] text-slate-500">40 is the lowest pass mark. One mark less and it becomes a carryover. Guard these.</p>' +
        narrow.map(function (x) {
          var ex = +x.c.score === 40;
          return '<div class="flex justify-between items-center py-2 text-xs border-b border-slate-200/40"><span>' + lvl2(x.s) + ' - <b>' + esc(x.c.code) + '</b></span>' +
            '<b style="color:' + (ex ? '#e11d48' : '#d97706') + ';font-size:' + (ex ? '16px' : '12px') + '">' + x.c.score + (ex ? ' - exactly 40' : ' (E)') + '</b></div>';
        }).join('') + '</div>';
    }
    fullScreen('Carryover Register', b + closeBtn());
  };

  /* ---------- Notifications: lowest score per level and semester ---------- */
  W.notifSheet = function () {
    var rows = lowestRows();
    var b;
    if (!rows.length) {
      b = '<p class="text-xs text-slate-500">No results yet.</p>';
    } else {
      var min = rows.reduce(function (a, r) { return +r.c.score < +a.c.score ? r : a; });
      b = '<div class="p-4 rounded-2xl space-y-1" style="background:var(--sub);border-left:4px solid #e11d48"><div class="lbl">Lowest score overall</div><div class="font-extrabold">' + esc(min.c.code) + ' - ' + min.c.score + ' (' + gr(min.c.score)[0] + ')</div><div class="text-xs text-slate-500">' + lvlLong(min.s) + '</div></div>' +
        '<div class="p-4 rounded-2xl space-y-1" style="background:var(--sub)"><div class="lbl pb-1">Lowest in each semester</div>' +
        rows.map(function (r) {
          return '<div class="flex justify-between py-2 text-xs border-b border-slate-200/40"><span>' + lvlLong(r.s) + '</span><b>' + esc(r.c.code) + ' - ' + r.c.score + ' (' + gr(r.c.score)[0] + ')</b></div>';
        }).join('') + '</div>';
    }
    fullScreen('Academic insight', b + closeBtn());
  };

  /* ---------- CGPA breakdown ---------- */
  W.cgpaBreakdown = function () {
    tagAll();
    var sems = U.semesters || [];
    if (!sems.length) { fullScreen('How your CGPA is built', '<p class="text-xs text-slate-500">No results yet.</p>' + closeBtn()); return; }
    var ru = 0, rq = 0, rows = '', anySup = false;
    sems.forEach(function (s) {
      var a = nums(s.courses, false), c = nums(s.courses, true);
      (s.courses || []).forEach(function (x) { if (x.sup) anySup = true; });
      ru += c.u; rq += c.q;
      rows += '<div class="p-3 rounded-xl space-y-2" style="background:var(--sub)"><div class="flex justify-between text-xs"><b>' + lvlLong(s) + '</b><span class="text-slate-500">' + a.u + ' units</span></div>' +
        '<div class="grid grid-cols-3 gap-2 text-center text-xs"><div><div class="lbl">Points</div><b>' + fmt(a.q) + '</b></div><div><div class="lbl">GPA</div><b>' + a.g.toFixed(2) + '</b></div><div><div class="lbl">CGPA after</div><b>' + (ru ? (rq / ru).toFixed(2) : '-') + '</b></div></div></div>';
    });
    var cg = ru ? rq / ru : 0;
    var top = '<div class="grad rounded-3xl p-5 space-y-1"><div class="text-xs font-bold opacity-80">Cumulative GPA</div><div class="text-4xl font-extrabold">' + cg.toFixed(2) + '<span class="text-base opacity-75"> / 5.00</span></div><div class="text-xs opacity-90">' + fmt(rq) + ' total points / ' + ru + ' total units</div></div>';
    var how = '<p class="text-[11px] text-slate-500">GPA = total points / total units, where each course earns grade point x units (A 5, B 4, C 3, D 2, E 1, F 0). CGPA is the same sum across every semester so far.' + (anySup ? ' A failed course you later retook is replaced by the retake.' : '') + '</p>';
    var portal = (U.portalCGPA && Math.abs(U.portalCGPA - cg) > 0.005) ? '<p class="text-[11px] text-slate-500">Your portal prints ' + U.portalCGPA.toFixed(2) + '. It can differ while some results are unreleased.</p>' : '';
    fullScreen('How your CGPA is built', top + '<div class="space-y-2">' + rows + '</div>' + how + portal + closeBtn());
  };

  /* ---------- Trajectory: course-by-course build-up toward 5.00 ---------- */
  function stepGraph(cs, title) {
    var N = cs.length;
    if (!N) return '<div class="space-y-1"><div class="text-xs font-extrabold">' + title + '</div><div class="p-3 rounded-xl text-[11px] text-slate-500" style="background:var(--sub)">No results here yet.</div></div>';
    var den = 0;
    cs.forEach(function (c) { den += +c.unit; });
    var Wd = 360, L = 30, R = 14, T = 14, B = 26, PW = Wd - L - R, RH = N <= 12 ? 22 : N <= 24 ? 14 : 9, H = T + N * RH + B;
    var X = function (g) { return L + g / 5 * PW; };
    var Y = function (k) { return H - B - k * RH; };
    var cu = 0, cg = 0, pts = [[X(0), Y(0)]], ideal = [[X(0), Y(0)]], dots = '', labs = '', dips = [];
    cs.forEach(function (c, i) {
      var g = gr(c.score), u = +c.unit, gain = g[1] * u / den, loss = (5 - g[1]) * u / den;
      cu += u; cg += gain;
      var prev = pts[i];
      pts.push([X(cg), Y(i + 1)]);
      ideal.push([X(5 * cu / den), Y(i + 1)]);
      dots += '<circle cx="' + X(cg).toFixed(1) + '" cy="' + Y(i + 1).toFixed(1) + '" r="' + (N > 24 ? 2 : 3) + '" fill="' + GC[g[0]] + '"/>';
      if (N <= 16) labs += '<text class="tg-t" x="' + ((prev[0] + X(cg)) / 2 - 4).toFixed(1) + '" y="' + ((prev[1] + Y(i + 1)) / 2 - 1).toFixed(1) + '" font-size="7" text-anchor="end">' + gain.toFixed(2) + '</text>';
      if (g[1] < 5) dips.push({ code: c.code, l: g[0], loss: loss, gain: gain });
    });
    var poly = function (a) { return a.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' '); };
    var grid = '', k, g;
    for (g = 0; g <= 5; g++) grid += '<line class="tg-g" x1="' + X(g).toFixed(1) + '" y1="' + T + '" x2="' + X(g).toFixed(1) + '" y2="' + (H - B) + '"/><text class="tg-t" x="' + X(g).toFixed(1) + '" y="' + (H - B + 12) + '" font-size="9" text-anchor="middle">' + g + '</text>';
    var ls = N <= 20 ? 1 : N <= 40 ? 2 : 5;
    for (k = 0; k <= N; k++) {
      if (k > 0 && k % ls && k !== N) continue;
      grid += '<line class="tg-g" x1="' + L + '" y1="' + Y(k).toFixed(1) + '" x2="' + (Wd - R) + '" y2="' + Y(k).toFixed(1) + '"/><text class="tg-t" x="' + (L - 6) + '" y="' + (Y(k) + 3).toFixed(1) + '" font-size="8" text-anchor="end">' + k + '</text>';
    }
    var svgH = '<svg viewBox="0 0 ' + Wd + ' ' + H + '" style="width:100%;height:auto"><line x1="' + X(5).toFixed(1) + '" y1="' + T + '" x2="' + X(5).toFixed(1) + '" y2="' + (H - B) + '" stroke="#10b981" stroke-width="1.2" stroke-dasharray="4 3"/>' + grid +
      '<line class="tg-ax" x1="' + L + '" y1="' + (H - B) + '" x2="' + (Wd - R) + '" y2="' + (H - B) + '"/><line class="tg-ax" x1="' + L + '" y1="' + T + '" x2="' + L + '" y2="' + (H - B) + '"/>' +
      '<polyline points="' + poly(ideal) + '" fill="none" stroke="#94a3b8" stroke-width="1.2" stroke-dasharray="3 3"/>' +
      '<polyline points="' + poly(pts) + '" fill="none" stroke="#10b981" stroke-width="2.2" stroke-linejoin="round"/>' + dots + labs + '</svg>';
    dips.sort(function (a, b) { return b.loss - a.loss; });
    var chips = dips.slice(0, 8).map(function (d) {
      return '<span class="px-2 py-1 rounded-lg text-[10px] font-bold" style="background:var(--sub)"><b style="color:' + GC[d.l] + '">' + d.l + '</b> ' + esc(d.code) + ' -' + d.loss.toFixed(2) + (d.gain === 0 ? ' (no movement)' : '') + '</span>';
    }).join(' ');
    var dipHtml = dips.length ? '<div class="space-y-1"><div class="text-[11px] text-slate-500">Where the line fell short of the dashed all-A path (' + dips.length + ' course' + (dips.length > 1 ? 's' : '') + '):</div><div class="flex flex-wrap gap-1">' + chips + (dips.length > 8 ? ' <span class="text-[10px] text-slate-500">+' + (dips.length - 8) + ' more</span>' : '') + '</div></div>' : '<div class="text-[11px] font-bold" style="color:#10b981">Straight A line. Nothing fell short.</div>';
    return '<div class="space-y-2"><div class="flex justify-between text-xs"><b>' + title + '</b><b style="color:#10b981">' + cg.toFixed(2) + ' / 5.00</b></div>' + svgH + dipHtml + '</div>';
  }
  function coursesOf(list, half, exSup) {
    var out = [];
    list.forEach(function (s) {
      if (half !== null && s.half !== half) return;
      (s.courses || []).forEach(function (c) { if (exSup && c.sup) return; out.push(c); });
    });
    return out;
  }
  function trajInner() {
    tagAll();
    var sems = U.semesters || [], lvs = [];
    sems.forEach(function (s) { if (lvs.indexOf(s.lv) < 0) lvs.push(s.lv); });
    lvs.sort(function (a, b) { return a - b; });
    if (!lvs.length) return '<div class="font-extrabold">GPA Trajectory</div><div class="h-28 flex items-center justify-center text-xs text-slate-400 border border-dashed rounded-2xl" style="border-color:var(--bd)">Save a semester to see your trajectory</div>';
    if (TS.lv == null || (TS.lv !== 'all' && lvs.indexOf(TS.lv) < 0)) TS.lv = lvs[lvs.length - 1];
    var all = TS.lv === 'all';
    var chips = lvs.map(function (l) {
      return '<button type="button" class="' + (TS.lv === l ? 'btn' : 'btn2') + ' whitespace-nowrap" onclick="trajSet(' + l + ')">' + l + 'L</button>';
    }).join('') + (lvs.length > 1 ? '<button type="button" class="' + (all ? 'btn' : 'btn2') + ' whitespace-nowrap" onclick="trajSet(\'all\')">All levels</button>' : '');
    var list = all ? sems : sems.filter(function (s) { return s.lv === TS.lv; });
    var tag = all ? 'all levels' : TS.lv + ' Level';
    var pend = 0;
    list.forEach(function (s) { pend += (s.pending || []).length; });
    var legend = '<div class="flex gap-3 text-[10px] text-slate-500 items-center">' + ['A', 'B', 'C', 'D', 'E', 'F'].map(function (x) { return '<span><b style="color:' + GC[x] + '">' + x + '</b></span>'; }).join('') + '<span>Dashed grey = all A. Rows are courses, across is GPA.</span></div>';
    return '<div class="font-extrabold">GPA Trajectory</div><div class="flex gap-2 overflow-x-auto pb-1">' + chips + '</div>' +
      stepGraph(coursesOf(list, 0, all), 'First semester - ' + tag) +
      stepGraph(coursesOf(list, 1, all), 'Second semester - ' + tag) +
      stepGraph(coursesOf(list, null, all), all ? 'CGPA - all semesters' : 'Whole session - ' + tag) +
      legend + (pend ? '<p class="text-[11px] text-slate-500">' + pend + ' registered course' + (pend > 1 ? 's are' : ' is') + ' awaiting results and not plotted yet.</p>' : '');
  }
  W.trajSet = function (v) {
    TS.lv = v;
    var c = $('traj-card');
    if (c) c.innerHTML = trajInner();
  };
  function trajectoryCard() { return '<div class="card p-6 space-y-4" id="traj-card">' + trajInner() + '</div>'; }

  /* ---------- Home: wire the cards by rewriting the markup (no timing, no text matching) ---------- */
  var _home64 = V.home;
  V.home = function () {
    var h = _home64();
    try {
      h = h.replace('<div class="grad rounded-3xl p-6 space-y-3 shadow-lg">', '<div class="grad rounded-3xl p-6 space-y-3 shadow-lg" style="cursor:pointer" onclick="cgpaBreakdown()">');
      h = h.replace('onclick="setTarget()"', 'onclick="event.stopPropagation();setTarget()"');
      h = h.replace('<div class="card p-6 flex items-center justify-between gap-4">', '<div class="card p-6 flex items-center justify-between gap-4" style="cursor:pointer" onclick="aTab=\'rec\';editing=null;go(\'acad\')">');
      h = h.replace('<div class="card p-6 space-y-2"><div class="font-extrabold">Notifications</div>', '<div class="card p-6 space-y-2" style="cursor:pointer" onclick="notifSheet()"><div class="font-extrabold">Notifications</div>');
      var low = lowestRows();
      if (low.length) {
        var r = low[low.length - 1];
        h = h.replace(/Lowest score last semester:[^<]*/, esc(lvl2(r.s) + ' lowest: ' + r.c.code + ' (' + r.c.score + '). Tap for all.'));
      }
      var a = h.indexOf('<div class="card p-6 space-y-4"><div class="font-extrabold">GPA Trajectory</div>');
      var b = h.indexOf('<div class="card p-6 space-y-3"><div class="font-extrabold">Quick Actions</div>');
      if (a > -1 && b > a) h = h.slice(0, a) + trajectoryCard() + h.slice(b);
      else console.warn('v64: trajectory markers not found');
    } catch (e) { console.error('v64 home patch', e); }
    return h;
  };

  /* ---------- Calculator: level + First/Second/Both, rows appear on "Add courses manually" ---------- */
  var _calc64 = ACAD.calc;
  ACAD.calc = function () {
    W._semHalf = null; W._pasted = false;
    _calc64();
    try { calcRestructure(); } catch (e) { console.error(e); showToast('Layout patch error: ' + e.message, 'error'); }
  };
  function calcRestructure() {
    if (editing !== null) return;
    var nm = $('c-name'), rows = $('rows');
    if (!nm || !rows || nm.dataset.v64) return;
    nm.dataset.v64 = '1'; nm.style.display = 'none';
    var box = nm.parentNode, lab = box.querySelector('.lbl');
    if (lab) lab.textContent = 'Session and semester';
    var lv = parseInt((U.profile || {}).level, 10) || 100;
    var d = document.createElement('div');
    d.className = 'space-y-2 mt-1';
    d.innerHTML = '<select id="sem-lv" class="inp" onchange="semPick()">' + [100, 200, 300, 400, 500, 600].map(function (l) { return '<option value="' + l + '"' + (l === lv ? ' selected' : '') + '>' + l + ' Level</option>'; }).join('') + '</select>' +
      '<div class="grid grid-cols-3 gap-2">' + [['first', 'First'], ['second', 'Second'], ['both', 'Both']].map(function (x) { return '<button type="button" id="sh-' + x[0] + '" class="btn2 justify-center" onclick="semPick(\'' + x[0] + '\')">' + x[1] + '</button>'; }).join('') + '</div>' +
      '<p id="sem-note" class="text-[11px] text-slate-500"></p>';
    box.appendChild(d);
    var save = rows.nextElementSibling, head = rows.previousElementSibling;
    var wrap = document.createElement('div');
    wrap.id = 'manual-wrap'; wrap.className = 'space-y-5 hidden';
    var mb = document.createElement('button');
    mb.type = 'button'; mb.id = 'manual-btn'; mb.className = 'btn2 w-full justify-center'; mb.textContent = 'Add courses manually';
    mb.onclick = W.revealManual;
    rows.parentNode.insertBefore(mb, head);
    rows.parentNode.insertBefore(wrap, head);
    wrap.appendChild(head); wrap.appendChild(rows); wrap.appendChild(save);
    rows.innerHTML = '';
    if (save) save.setAttribute('onclick', 'saveBtn64()');
  }
  W.semPick = function (h) {
    if (h) W._semHalf = h;
    var hh = W._semHalf, lv = ($('sem-lv') || {}).value || '100';
    ['first', 'second', 'both'].forEach(function (k) { var b = $('sh-' + k); if (b) b.className = (k === hh ? 'btn' : 'btn2') + ' justify-center'; });
    var nm = $('c-name');
    if (nm && hh) nm.value = lv + ' Level - ' + (hh === 'both' ? 'Full Session' : (hh === 'first' ? 'First' : 'Second') + ' Semester');
    var n = $('sem-note');
    if (n) n.textContent = hh === 'both' ? 'Whole session: enter every course in one list. Codes ending in an odd number go to First Semester, even to Second.' : '';
  };
  W.revealManual = function () {
    if (!W._semHalf) return showToast('Pick First, Second or Both first', 'error');
    var w = $('manual-wrap'); if (w) w.classList.remove('hidden');
    if (!document.querySelector('#rows > div')) { addRow(); addRow(); addRow(); }
  };
  var _parse64 = parsePasteTrojan;
  W.parsePasteTrojan = function () {
    var r = _parse64.apply(this, arguments);
    var w = $('manual-wrap');
    if (w && document.querySelectorAll('#rows > div').length) { w.classList.remove('hidden'); W._pasted = true; }
    return r;
  };
  W.saveBtn64 = function () { return W._pasted ? saveSem() : W.saveManual64(); };
  W.saveManual64 = function () {
    var half = W._semHalf, lv = parseInt(($('sem-lv') || {}).value, 10) || 100;
    if (!half) return showToast('Pick First, Second or Both', 'error');
    var courses = [];
    document.querySelectorAll('#rows > div').forEach(function (r) {
      var code = r.querySelector('.c-code').value.trim().toUpperCase().replace(/\s+/g, '');
      var unit = parseFloat(r.querySelector('.c-unit').value), sc = r.querySelector('.c-score').value;
      if (code && unit >= 1 && unit <= 6 && sc !== '' && +sc >= 0 && +sc <= 100) courses.push({ code: code, unit: unit, score: +sc });
    });
    if (!courses.length) return showToast('Enter at least one valid course with a score (0-100)', 'error');
    tagAll();
    var groups = [];
    if (half === 'both') {
      var f = courses.filter(function (c) { return semOfCode(c.code) === 1; }), s2 = courses.filter(function (c) { return semOfCode(c.code) === 2; });
      if (f.length) groups.push({ h: 0, cs: f });
      if (s2.length) groups.push({ h: 1, cs: s2 });
    } else groups.push({ h: half === 'first' ? 0 : 1, cs: courses });
    var msg = [];
    groups.forEach(function (g) {
      var ex = U.semesters.filter(function (s) { return s.lv === lv && s.half === g.h; })[0];
      if (ex) {
        g.cs.forEach(function (c) {
          var o = (ex.courses || []).filter(function (x) { return x.code === c.code; })[0];
          if (o) { o.unit = c.unit; o.score = c.score; } else ex.courses.push(c);
        });
      } else {
        U.semesters.push({ id: Date.now() + g.h, name: lv + ' Level - ' + (g.h ? 'Second' : 'First') + ' Semester', courses: g.cs, pending: [], lv: lv, half: g.h });
      }
      msg.push((g.h ? '2nd' : '1st') + ' sem GPA ' + nums(g.cs, false).g.toFixed(2));
    });
    U.semesters.sort(function (a, b) { return (a.lv - b.lv) || (a.half - b.half); });
    refreshCarry(); save();
    try { track('semester_saved', { semesters: U.semesters.length }); } catch (e) {}
    go('home');
    showToast('Saved. ' + msg.join(', ') + ' | CGPA ' + cum().g.toFixed(2));
    try { rwDone(); } catch (e) {}
  };
})();

