/* Academic Summit - zuma.js v4.2: vector mascot with the Orblight shadow class.
   notice mirrored to face the words; .zuma lets the constitution light him.
   Load AFTER zuma-art.js, BEFORE coach.js. */
(function () {
'use strict';
var W = window;
var MAP = { wave: 'welcome', point: 'notice', read: 'studying', cheer: 'cheer',
            welcome: 'welcome', notice: 'notice', studying: 'studying' };
W.zumaImg = function (pose, px) {
  px = px || 72;
  var key = MAP[pose] || 'welcome';
  var svg = (W.ZUMA_SVG || {})[key];
  if (!svg) return '';
  var flip = key === 'notice' ? 'transform:scaleX(-1);' : '';
  return '<span class="zuma" aria-hidden="true" style="display:inline-flex;flex:none;width:' + px + 'px;height:' + px + 'px;' + flip + '">' + svg + '</span>';
};
})();
