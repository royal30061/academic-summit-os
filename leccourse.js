/* Academic Summit - leccourse.js v2.
   v1 only touched #lec-course; the baked POS204 default also lives in other
   form controls, so it survived until a teaching profile existed. v2 sweeps
   every lecturer-form input/select holding POS204 (or any non-taught default),
   replaces it with the lecturer's remembered last course, then teaching
   profile, else empty; saves the course entered at start_session per account. */
(function(){
'use strict';
if(window.__asLecCourse)return;window.__asLecCourse='2';
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
    var real=((U.lec&&U.lec.courses)||[]).map(function(c){return String(c.code).toUpperCase();});
    var rem=remembered();
    var host=document.getElementById('main')||document;
    host.querySelectorAll('input,select').forEach(function(el){
      var v=String(el.value||'').toUpperCase();
      var bogus=(v==='POS204'||(v&&real.indexOf(v)<0&&/^[A-Z]{2,6}\d{3}$/.test(v)&&!rem));
      if(el.tagName==='SELECT'){
        if(rem){
          var has=false;for(var i=0;i<el.options.length;i++){if(String(el.options[i].value).toUpperCase()===rem){has=true;break;}}
          if(!has){var o=document.createElement('option');o.value=rem;o.text=rem;el.insertBefore(o,el.firstChild);}
          el.value=rem;
        }else if(bogus){
          el.value='';
          for(var j=0;j<el.options.length;j++){if(String(el.options[j].value).toUpperCase()==='POS204'&&real.indexOf('POS204')<0){el.options[j].value='';el.options[j].text='Choose your course';}}
        }
      }else{
        if(rem)el.value=rem;
        else if(v==='POS204')el.value='';
      }
    });
  }catch(e){}
}
var r0=sb.rpc;
sb.rpc=function(name,args){
  if(name==='start_session'){try{if(args&&args.p_course)localStorage.setItem(key(),String(args.p_course).toUpperCase());}catch(e){}}
  return r0.apply(sb,arguments);
};
setInterval(fix,1200);
var g0=W.go;W.go=function(v){var r=g0.apply(this,arguments);setTimeout(fix,300);setTimeout(fix,900);return r;};
})();
