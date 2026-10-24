/* Academic Summit - zuma.js v4: the vector mascot.
   No assets to courier, no crops to suspect, no 404s to haunt.
   Aliases keep every existing call site working:
   wave->welcome, point->notice, read->studying, cheer->cheer.
   Load AFTER zuma-art.js, BEFORE coach.js. */
(function () {
'use strict';
var W = window;
var MAP = { wave: 'welcome', point: 'notice', read: 'studying', cheer: 'cheer',
            welcome: 'welcome', notice: 'notice', studying: 'studying' };
W.zumaImg = function (pose, px) {
  px = px || 72;
  var svg = (W.ZUMA_SVG || {})[MAP[pose] || 'welcome'];
  if (!svg) return '';
  return '<span aria-hidden="true" style="display:inline-flex;flex:none;width:' + px + 'px;height:' + px + 'px">' + svg + '</span>';
};
})();
