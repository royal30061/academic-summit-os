/* Academic Summit - studystart.js v1: empty-Study onboarding prompt.
   New users with no results/registration/manual courses get three real paths
   instead of the dead-end "Open classic Study" card. Undo = drop the tag. */
(function(){
'use strict';
if(window.__asStudyStart)return;window.__asStudyStart='1';
var W=window;
function empty(){try{return typeof W.asEngineCourses==='function'&&W.asEngineCourses().length===0;}catch(e){return false;}}
function card(){
  return '<div class="card p-6 space-y-3">'+
    '<div class="font-extrabold" style="font-size:18px">Let\'s set up your Study</div>'+
    '<p class="text-xs text-slate-500">You have no courses yet. Pick whichever is easiest - each one fills your Study workspace.</p>'+
    '<button class="btn w-full" onclick="go(\'acad\')">Add my results (paste or screenshot)</button>'+
    '<button class="btn2 w-full" onclick="if(typeof regOpen===\'function\')regOpen();else go(\'acad\')">Add my course registration</button>'+
    '<button class="btn2 w-full" onclick="shAddCourse()">Add courses manually</button>'+
    '</div>';
}
function paint(){
  try{
    if(typeof U==='undefined'||!U||U.role!=='student')return;
    var host=document.querySelector('[data-sh]');if(!host)return;
    if(!empty())return;
    if(host.querySelector('#sh-start'))return;
    var t=host.textContent||'';
    if(/No courses yet|Add your courses first/.test(t))host.innerHTML='<div id="sh-start">'+card()+'</div>';
  }catch(e){}
}
setInterval(paint,1200);
var g0=W.go;W.go=function(v){var r=g0.apply(this,arguments);setTimeout(paint,400);return r;};
})();
