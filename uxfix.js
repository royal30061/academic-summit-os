/* Academic Summit - uxfix.js v1
   1) Class rep desk card on ANY dashboard (new home never calls attBar, so
      appointed reps saw nothing). Shows only when my_rep_courses has rows.
   2) Warm Zuma sprites at boot so the ? sheet art appears instantly.
   3) go() guard: if a screen chain throws, show a usable retry card plus the
      real error instead of the native "reload the door" shell.
   Undo = remove the script tag. */
(function(){
'use strict';
if(window.__asUxFix)return;window.__asUxFix='1';
var W=window;
function warmZuma(){
  try{
    var src=W.ZUMA_IMG||null; if(!src)return;
    Object.keys(src).forEach(function(k){var im=new Image();im.src=src[k];});
  }catch(e){}
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',warmZuma);else setTimeout(warmZuma,0);
function isStudent(){try{return typeof U!=='undefined'&&U&&U.role==='student';}catch(e){return false;}}
function onHome(){try{return typeof view==='undefined'||view==='home';}catch(e){return true;}}
function repCard(){
  if(!isStudent()||!onHome())return;
  if(document.getElementById('as-rep-desk'))return;
  var main=document.getElementById('main');if(!main||!main.firstChild)return;
  var c=document.createElement('div');
  c.id='as-rep-desk';c.className='card p-5 mb-4';c.style.cursor='pointer';
  c.innerHTML='<div class="font-extrabold">Class rep desk</div>'+
    '<p class="text-[11px] text-slate-500">You are a class rep. Tap to open your desk: live attendance code, re-issue, and name requests.</p>';
  c.onclick=function(){if(typeof W.go==='function')W.go('rep');};
  main.insertBefore(c,main.firstChild);
}
function repLoad(){
  if(!isStudent())return;
  try{
    sb.rpc('my_rep_courses').then(function(r){
      if(r&&!r.error&&(r.data||[]).length){W.__asIsRep=true;setTimeout(repCard,120);}
    },function(){});
  }catch(e){}
}
var g0=W.go;
W.go=function(v){
  try{return g0.apply(this,arguments);}
  catch(e){
    W.__asHomeErr=String((e&&e.message)||e);
    try{showToast('Screen error: '+W.__asHomeErr,'error');}catch(_){}
    try{
      var m=document.getElementById('main');
      if(m){m.innerHTML='<div class="card p-6 space-y-3"><div class="font-extrabold">This screen hit an error</div>'+
        '<p class="text-xs text-slate-500">'+(W.__asHomeErr||'').replace(/[<>&]/g,'')+'</p>'+
        '<button class="btn w-full" onclick="location.reload()">Reload</button>'+
        '<button class="btn2 w-full" onclick="go(\'home\')">Try Home again</button></div>';}
    }catch(_){}
    return undefined;
  }
};
var g1=W.go;
W.go=function(v){var r=g1.apply(this,arguments);if(v==='home'){setTimeout(repLoad,300);setTimeout(repCard,500);}return r;};
var s0=W.start;
W.start=function(){var r=s0.apply(this,arguments);setTimeout(repLoad,400);setTimeout(repCard,600);return r;};
})();
