/* Academic Summit - leccourse.js v1: kill the hardcoded POS204 default.
   Remember each lecturer's last-used course (per account), prefill it on
   return, fall back to their teaching profile, clear POS204 when it is not
   one of their real courses, and save the course entered at start_session.
   Undo = drop the tag. */
(function(){
'use strict';
if(window.__asLecCourse)return;window.__asLecCourse='1';
var W=window;
function key(){try{return 'as_lec_course_'+((typeof uid!=='undefined'&&uid)?uid:(U&&U.id)||'me');}catch(e){return 'as_lec_course_me';}}
function remembered(){
  try{var v=localStorage.getItem(key());if(v)return v;}catch(e){}
  try{if(U&&U.lec&&U.lec.courses&&U.lec.courses.length)return U.lec.courses[0].code;}catch(e){}
  return '';
}
function fix(){
  try{
    if(typeof U==='undefined'||!U||U.role!=='lecturer')return;
    var el=document.getElementById('lec-course');if(!el)return;
    var rem=remembered();
    var real=((U.lec&&U.lec.courses)||[]).map(function(c){return c.code;});
    if(el.tagName==='SELECT'){
      if(rem){
        var has=false;for(var i=0;i<el.options.length;i++){if(el.options[i].value===rem||el.options[i].text===rem){has=true;break;}}
        if(!has){var o=document.createElement('option');o.value=rem;o.text=rem;el.insertBefore(o,el.firstChild);}
        el.value=rem;
      }else{
        if(el.value&&real.indexOf(el.value)<0)el.value='';
        if(el.options.length&&el.options[0].value==='POS204'&&real.indexOf('POS204')<0){el.options[0].value='';el.options[0].text='Choose your course';}
      }
    }else{
      if(rem)el.value=rem;
      else if(el.value==='POS204')el.value='';
    }
  }catch(e){}
}
var r0=sb.rpc;
sb.rpc=function(name,args){
  if(name==='start_session'){try{if(args&&args.p_course)localStorage.setItem(key(),String(args.p_course).toUpperCase());}catch(e){}}
  return r0.apply(sb,arguments);
};
setInterval(fix,1200);
var g0=W.go;W.go=function(v){var r=g0.apply(this,arguments);setTimeout(fix,400);return r;};
})();
