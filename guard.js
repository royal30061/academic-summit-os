/* Academic Summit - guard.js: load FIRST */
(function () {
'use strict';
window._featureFailures = window._featureFailures || {};
window._cbNotify = function (mod) {
  try { showToast(mod + ' hit an error and was safely disabled - the rest of the app is fine.', 'error'); } catch (e) {}
};
window.addEventListener('error', function (ev) {
  try {
    var key = String(ev.filename || 'app').split('/').pop();
    var f = window._featureFailures[key] = window._featureFailures[key] || { count: 0 };
    f.count += 1; f.last = ev.message;
  } catch (e) {}
});
})();
