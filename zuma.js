/* Academic Summit - zuma.js v3: mascot slots as real <img> sprites.
   object-fit cover + object-position = the thirds math; onerror gives the
   chain CSS backgrounds never could: sheet -> wave -> hide. No ghost chairs.
   Load BEFORE coach.js. */
(function () {
'use strict';
var W = window;
W.ZUMA = { sheet: 'assets/zuma-sheet.png', wave: 'assets/zuma-wave.png' };
W.ZUMA_POS = { read: '50% 50%' };
var CHIP = '#f6f8f9';
var HIDE = "this.style.display='none'";
var TO_WAVE = "if(this.dataset.fb){this.style.display='none'}else{this.dataset.fb='1';this.src='assets/zuma-wave.png';this.style.objectPosition='50% 50%';this.style.height=this.offsetWidth+'px'}";
W.zumaImg = function (pose, px) {
  px = px || 72;
  var pos = W.ZUMA_POS[pose];
  var src = pos ? W.ZUMA.sheet : W.ZUMA.wave;
  var h = pos ? px * 2 : px;
  var style = 'width:' + px + 'px;height:' + h + 'px;flex:none;border-radius:' + Math.round(px * 0.3) +
    'px;background:' + CHIP + ';object-fit:cover;object-position:' + (pos || '50% 50%') + ';display:inline-block';
  return '<img src="' + src + '" alt="" loading="lazy" style="' + style + '" onerror="' + (pos ? TO_WAVE : HIDE) + '">';
};
})();
