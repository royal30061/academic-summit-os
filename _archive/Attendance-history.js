/* Academic Summit - attend-history.js v1: own attendance history on the Attend screen. */
(function () {
'use strict';
var W = window, cache = null, painted = null;
function fmt(x) { try { return new Date(x).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); } catch (e) { return ''; } }
function html(list) {
  if (!list.length) return '<div class="text-xs" style="color:var(--mut)">No attendance yet. Your marks will appear here.</div>';
  return list.map(function (r) {
    var d = r.distance_m == null ? '' : ' · ' + r.distance_m + ' m';
    return '<div class="flex justify-between text-xs py-1.5" style="border-top:1px solid var(--bd)"><span><b>' + (r.course || '') + '</b> <span style="color:var(--mut)">' + (r.topic || '') + '</span></span><span style="color:var(--mut)">' + fmt(r.marked_at) + d + '</span></div>';
  }).join('');
}
function paint() {
  if (typeof view === 'undefined' || (view !== 'att' && view !== 'attend')) return;
  var nodes = document.querySelectorAll('#main div, #main p'), target = null;
  for (var i = 0; i < nodes.length; i++) {
    if ((nodes[i].textContent || '').trim() === 'History unavailable on this device.') { target = nodes[i]; break; }
  }
  if (!target || cache === null) return;
  var key = JSON.stringify(cache);
  if (painted === key) return;
  target.innerHTML = html(cache); painted = key;
}
function load() {
  if (typeof sb === 'undefined' || !sb || !sb.rpc) return;
  sb.rpc('my_attendance').then(function (r) { cache = (r && !r.error && r.data) ? r.data : []; painted = null; paint(); });
}
var t = null;
function tick() { clearTimeout(t); t = setTimeout(function () { try { paint(); } catch (e) {} }, 250); }
try { new MutationObserver(tick).observe(document.body, { childList: true, subtree: true }); } catch (e) {}
var goB = W.go;
if (goB) W.go = function () { var r = goB.apply(this, arguments); setTimeout(function () { load(); paint(); }, 300); return r; };
setTimeout(load, 1500);
})();
