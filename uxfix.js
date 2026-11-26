/* Academic Summit - uxfix.js v2
   v1 BUG: repCard() ran unconditionally, so EVERY student saw the rep desk.
   v2: card renders only after my_rep_courses confirms membership, and removes
       itself otherwise. Adds a one-time class-rep appointment alert (toast +
       pinned card) when an account's rep list first becomes non-empty.
   Also keeps: Zuma sprite warm-up and the go() error guard. Undo = drop tag. */
(function(){
'use strict';
if(window.__asUxFix)return;window.__asUxFix='2';
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
function storeKey(){
  try{var u=(typeof uid!=='undefined'&&uid)?uid:((typeof U!=='undefined'&&U&&U.id)?U.id:'me');return 'as_rep_courses_'+u;}catch(e){return 'as_rep_courses_me';}
}
function repCard(){
  if(!isStudent()||!onHome())return;
  if(W.__asIsRep!==true){var old=document.getElementById('as-rep-desk');if(old)old.remove();return;}
  if(document.getElementById('as-rep-desk'))return;
  var main=document.getElementById('main');if(!main||!main.firstChild)return;
  var c=document.createElement('div');
  c.id='as-rep-desk';c.className='card p-5 mb-4';c.style.cursor='pointer';
  c.innerHTML='<div class="font-extrabold">Class rep desk</div>'+
    '<p class="text-[11px] text-slate-500">You are a class rep. Tap to open your desk: live attendance code, re-issue, and name requests.</p>';
  c.onclick=function(){if(typeof W.go==='function')W.go('rep');};
  main.insertBefore(c,main.firstChild);
}
function apptCard(courses){
  if(document.getElementById('as-rep-appt'))return;
  var main=document.getElementById('main');if(!main||!main.firstChild)return;
  var c=document.createElement('div');c.id='as-rep-appt';c.className='card p-5 mb-3';c.style.borderLeft='4px solid #10b981';
  c.innerHTML='<div class="font-extrabold">You are now a class rep</div>'+
    '<p class="text-xs text-slate-500">Your lecturer appointed you class rep for '+courses.map(function(x){return esc(x);}).join(', ')+'. Open your rep desk below to run live codes and forward names of students who cannot mark.</p>'+
    '<button class="btn2 w-full mt-2" onclick="this.parentNode.remove()">Got it</button>';
  main.insertBefore(c,main.firstChild);
}
function repLoad(){
  if(!isStudent())return;
  try{
    sb.rpc('my_rep_courses').then(function(r){
      var rows=(r&&!r.error&&r.data)||[];
      var cur=rows.map(function(x){return x.r_course;}).filter(Boolean);
      if(cur.length){
        W.__asIsRep=true;
        var prev=[];try{prev=JSON.parse(localStorage.getItem(storeKey())||'[]');}catch(e){}
        var fresh=cur.filter(function(c){return prev.indexOf(c)<0;});
        if(fresh.length){
          showToast('You have been made class rep for '+fresh.join(', '));
          setTimeout(function(){apptCard(fresh);},300);
        }
        try{localStorage.setItem(storeKey(),JSON.stringify(cur));}catch(e){}
      }else{
        W.__asIsRep=false;
        try{localStorage.removeItem(storeKey());}catch(e){}
      }
      setTimeout(repCard,120);
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
