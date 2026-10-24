/* Academic Summit - zuma.js v2: mascot slot system, sprite edition.
   One sheet (point | read | cheer) + a lone wave. Chip colour equals the
   renders' own background: seamless in light, sticker-pop in dark.
   Missing sheet -> poses fall back to the wave; missing wave -> slot hides.
   Load BEFORE coach.js. */
(function () {
'use strict';
var W = window;
W.ZUMA = { sheet: 'assets/zuma-sheet.png', wave: 'assets/zuma-wave.png' };
W.ZUMA_POS = { read: '50% 50%' };
var sheetOk = true;
(function () { var im = new Image(); im.onerror = function () { sheetOk = false; }; im.src = W.ZUMA.sheet; })();
var CHIP = '#f6f8f9';
W.zumaImg = function (pose, px) {
  px = px || 72;
  if (pose !== 'wave' && sheetOk && W.ZUMA_POS[pose]) {
    var h = px * 2;
    return '<div aria-hidden="true" style="width:' + px + 'px;height:' + h + 'px;flex:none;border-radius:' + Math.round(px * 0.3) +
      'px;background:' + CHIP + ' url(\'' + W.ZUMA.sheet + '\') ' + W.ZUMA_POS[pose] +
      ' / 300% 100% no-repeat;box-shadow:0 2px 10px rgba(0,0,0,.10)"></div>';
  }
  var OE = "if(this.dataset.fb){this.style.display='none'}else{this.dataset.fb='1';this.onerror=null}";
  return '<img src="' + W.ZUMA.wave + '" alt="" width="' + px + '" height="' + px + '" loading="lazy" style="border-radius:' +
    Math.round(px * 0.3) + 'px;background:' + CHIP + ';object-fit:cover;flex:none" onerror="' + OE + '">';
};
})();
