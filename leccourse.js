/* Academic Summit - leccourse.js v3.
   Purpose (unchanged): the lecturer's class-start form must never show the baked "POS204" example as a real course, and the
   course used at start_session is remembered per account so the next class starts with it.
   v3 fixes v2, which set EVERY input and dropdown on the lecturer page to the remembered course every 1.2 seconds. That filled
   Level, Topic and matric boxes, made it impossible to type a second course in the teaching profile, and brought a cleared box
   straight back. v3 only ever touches:
     1) a box that holds the baked POS204 default the lecturer does not teach (replaced by the remembered course, else emptied);
     2) the main Course box on the class-start form when it is EMPTY and the lecturer has not used it yet - filled once per screen.
   Anything the lecturer types or picks is never overwritten. */
(function(){
'use strict';
if(window.__asLecCourse)return;window.__asLecCourse='3';
var W=window, DEFAULT='POS204';
function norm(v){return String(v==null?'':v).toUpperCase().replace(/\s+/g,'');}
function key(){try{return 'as_lec_course_'+((typeof uid!=='undefined'&&uid)?uid:(U&&U.id)||'me');}catch(e){return 'as_lec_course_me';}}
function taught(){try{return ((U.lec&&U.lec.courses)||[]).map(function(c){return norm(c.code);});}catch(e){return [];}}
function remembered(){
  try{var v=localStorage.getItem(key());if(v)return v;}catch(e){}
  try{if(U&&U.lec&&U.lec.courses&&U.lec.courses.length)return U.lec.courses[0].code;}catch(e){}
  return '';
}
function isLec(){try{return typeof U!=='undefined'&&U&&U.role==='lecturer';}catch(e){return false;}}
function mark(e){try{if(e.isTrusted&&e.target&&e.target.setAttribute)e.target.setAttribute('data-lcu','1');}catch(x){}}
document.addEventListener('input',mark,true);
document.addEventListener('change',mark,true);

function hasOption(sel,v){for(var i=0;i<sel.options.length;i++){if(norm(sel.options[i].value)===norm(v))return sel.options[i].value;}return null;}
function sweep(){
  try{
    if(!isLec())return;
    var real=taught(), rem=remembered(), host=document.getElementById('main')||document;
    host.querySelectorAll('input,select').forEach(function(el){
      var typed=el.getAttribute('data-lcu')==='1', v=norm(el.value), sel=el.tagName==='SELECT';
      if(typed)return;                                            // the lecturer chose this value: leave it alone
      if(v===DEFAULT&&real.indexOf(DEFAULT)<0){                   // 1) the baked example, not a course they teach
        if(sel){
          var o=rem&&hasOption(el,rem);
          if(o!=null)el.value=o;
          else{el.value='';for(var j=0;j<el.options.length;j++){if(norm(el.options[j].value)===DEFAULT){el.options[j].value='';el.options[j].text='Choose your course';}}}
        }else el.value=rem||'';
        return;
      }
      if(el.id==='lec-course'&&!el.value&&el.getAttribute('data-lcdone')!=='1'&&rem){   // 2) empty main Course box: start with the last course, once
        if(sel){var o2=hasOption(el,rem);if(o2!=null){el.value=o2;el.setAttribute('data-lcdone','1');}}
        else{el.value=rem;el.setAttribute('data-lcdone','1');}
      }
    });
  }catch(e){}
}
var r0=sb.rpc;
sb.rpc=function(name,args){
  if(name==='start_session'){try{if(args&&args.p_course)localStorage.setItem(key(),String(args.p_course).toUpperCase());}catch(e){}}
  return r0.apply(sb,arguments);
};
setInterval(sweep,1500);
var g0=W.go;W.go=function(v){var r=g0.apply(this,arguments);setTimeout(sweep,300);setTimeout(sweep,900);return r;};
})();
