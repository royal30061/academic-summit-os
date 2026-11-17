/* Academic Summit - zuma.js v6: 3D clay mascot, alive.
   PNG renders + blink patches (closed lids painted from his own clay),
   breathing squash, per-pose motion, pulsing orb behind, ground shadow.
   Load AFTER zuma-art.js (harmless if absent), BEFORE coach.js. */
(function () {
'use strict';
var W = window, V = '2';
var MAP = { wave: 'welcome', point: 'notice', read: 'studying', cheer: 'cheer',
            welcome: 'welcome', notice: 'notice', studying: 'studying' };
var NOTICE_FLIP = false;
/* aspect = image width/height; eyes = [left%, top%, width%, height%] of the image */
var ASPECT = { welcome: 1.0344, notice: 0.7589, studying: 0.7616, cheer: 0.7824 };
var EYES = {
  welcome:  [38.736, 11.78, 25.27, 15.649],
  notice:   [20.902, 11.975, 41.598, 19.751],
  studying: [31.087, 21.854, 45.0, 20.199],
  cheer:    [32.347, 13.117, 36.884, 19.753]
};

var css =
'.zuma{position:relative;display:inline-flex;flex:none;align-items:flex-end;justify-content:center;overflow:visible}' +
'.zuma-orb{position:absolute;left:50%;top:52%;width:135%;height:135%;margin:-67% 0 0 -67%;border-radius:50%;' +
  'background:radial-gradient(circle at 40% 35%,rgba(110,231,183,.50),rgba(16,185,129,.26) 42%,rgba(34,211,238,.10) 62%,transparent 72%);' +
  'filter:blur(6px);animation:zOrb 3.6s ease-in-out infinite;pointer-events:none}' +
'.zuma-shadow{position:absolute;left:50%;bottom:-2%;width:62%;height:9%;margin-left:-31%;border-radius:50%;' +
  'background:radial-gradient(ellipse,rgba(0,0,0,.38),transparent 70%);animation:zShadow 3s ease-in-out infinite;pointer-events:none}' +
'.zuma-fig{position:relative;flex:none;transform-origin:50% 100%;' +
  'filter:drop-shadow(0 8px 14px rgba(0,0,0,.38)) drop-shadow(0 0 14px rgba(16,185,129,.22));' +
  'animation:zBreathe 3s ease-in-out infinite;will-change:transform}' +
'.zuma-fig img{position:absolute;display:block;user-select:none;-webkit-user-drag:none}' +
'.zuma-body{left:0;top:0;width:100%;height:100%}' +
'.zuma-blink{opacity:0;animation:zBlink 4.8s infinite}' +
'.zuma.z-welcome .zuma-fig{animation:zBreathe 3s ease-in-out infinite,zSway 5s ease-in-out infinite}' +
'.zuma.z-notice .zuma-fig{animation:zBreathe 3s ease-in-out infinite,zLean 4.2s ease-in-out infinite}' +
'.zuma.z-studying .zuma-fig{animation:zBreathe 3.6s ease-in-out infinite,zBob 4.4s ease-in-out infinite}' +
'.zuma.z-cheer .zuma-fig{animation:zHop 1.25s cubic-bezier(.3,.7,.4,1) infinite}' +
'.zuma.z-cheer .zuma-shadow{animation:zShadowHop 1.25s cubic-bezier(.3,.7,.4,1) infinite}' +
'@keyframes zBlink{0%,90%,100%{opacity:0}92%,95%{opacity:1}}' +
'@keyframes zBreathe{0%,100%{transform:scale(1,1)}50%{transform:scale(.985,1.03)}}' +
'@keyframes zSway{0%,100%{rotate:-1.6deg}50%{rotate:1.6deg}}' +
'@keyframes zLean{0%,100%{rotate:0deg}50%{rotate:-2.2deg}}' +
'@keyframes zBob{0%,100%{translate:0 0}50%{translate:0 -3%}}' +
'@keyframes zHop{0%,100%{transform:translateY(0) scale(1.03,.95)}18%{transform:translateY(0) scale(.97,1.04)}50%{transform:translateY(-9%) scale(.99,1.03)}82%{transform:translateY(0) scale(1.04,.95)}}' +
'@keyframes zShadowHop{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(.7);opacity:.55}}' +
'@keyframes zOrb{0%,100%{transform:scale(.94);opacity:.75}50%{transform:scale(1.06);opacity:1}}' +
'@keyframes zShadow{0%,100%{transform:scale(1)}50%{transform:scale(.94)}}' +
'@media (prefers-reduced-motion:reduce){.zuma-orb,.zuma-shadow,.zuma-fig,.zuma-blink{animation:none !important}}';

var st = document.createElement('style');
st.id = 'zuma-style';
st.textContent = css;
document.head.appendChild(st);

W.zumaImg = function (pose, px) {
  px = px || 72;
  var key = MAP[pose] || 'welcome';
  var a = ASPECT[key], e = EYES[key];
  var fw = a >= 1 ? px : Math.round(px * a), fh = a >= 1 ? Math.round(px / a) : px;
  var flip = (key === 'notice' && NOTICE_FLIP) ? 'transform:scaleX(-1);' : '';
  var d1 = '-' + (Math.random() * 3).toFixed(2) + 's';   /* de-sync several mascots */
  var d2 = '-' + (Math.random() * 4.8).toFixed(2) + 's'; /* and their blinks */
  return '<span class="zuma z-' + key + '" aria-hidden="true" style="width:' + px + 'px;height:' + px + 'px;' + flip + '">' +
    '<span class="zuma-orb" style="animation-delay:' + d1 + '"></span>' +
    '<span class="zuma-shadow"></span>' +
    '<span class="zuma-fig" style="width:' + fw + 'px;height:' + fh + 'px;animation-delay:' + d1 + '">' +
      '<img class="zuma-body" src="zuma-' + key + '.png?v=' + V + '" alt="" draggable="false" decoding="async">' +
      '<img class="zuma-blink" src="zuma-' + key + '-blink.png?v=' + V + '" alt="" draggable="false" decoding="async" ' +
        'style="left:' + e[0] + '%;top:' + e[1] + '%;width:' + e[2] + '%;height:' + e[3] + '%;animation-delay:' + d2 + '">' +
    '</span></span>';
};
})();
