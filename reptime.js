/* Academic Summit - reptime.js v1: realtime class-rep channel.
   Lecturer start/re-issue/appoint broadcast; reps subscribe per course and
   personally, react instantly. Polling remains as offline fallback.
   Undo = drop the tag. */
(function(){
'use strict';
if(window.__asRepTime)return;window.__asRepTime='1';
var W=window, chans={};
function ch(id){ if(chans[id])return chans[id]; chans[id]=sb.channel(id); return chans[id]; }
function on(id,event,cb){ ch(id).on('broadcast',{event:event},function(m){try{cb(m.payload||{});}catch(e){}}).subscribe(); }
function send(id,event,payload){ try{ ch(id).send({type:'broadcast',event:event,payload:payload||{}}); }catch(e){} }
function isLec(){try{return typeof U!=='undefined'&&U&&U.role==='lecturer';}catch(e){return false;}}
function isStudent(){try{return typeof U!=='undefined'&&U&&U.role==='student';}catch(e){return false;}}
function myUid(){try{return (typeof uid!=='undefined'&&uid)?uid:(U&&U.id);}catch(e){return null;}}
function subPersonal(){
  var u=myUid(); if(!u||!isStudent())return;
  on('as-rep-'+u,'appointed',function(p){
    W.__asIsRep=true;
    showToast('You have been made class rep for '+(p.course||'a course'));
    setTimeout(function(){ if(typeof W.go==='function')W.go('rep'); },500);
  });
}
function subCourses(){
  if(!isStudent())return;
  try{
    sb.rpc('my_rep_courses').then(function(r){
      var rows=(r&&!r.error&&r.data)||[];
      rows.forEach(function(x){
        var c=x.r_course; if(!c||chans['as-class-'+c])return;
        on('as-class-'+c,'session',function(p){
          showToast((p.kind==='start'?'Class started: ':'Code updated: ')+c+(p.code?' - code '+p.code:''));
          try{ if(typeof view!=='undefined'&&view==='rep'&&typeof W.go==='function')W.go('rep'); }catch(e){}
        });
      });
      if(rows.length)subPersonal();
    },function(){});
  }catch(e){}
}
var r0=sb.rpc;
sb.rpc=function(name,args){
  var p=r0.apply(sb,arguments);
  if(!isLec())return p;
  return p.then(function(res){
    try{
      if(res&&!res.error){
        if(name==='start_session'||name==='reissue_session'){
          var lv=(typeof liveGet==='function')?liveGet():null;
          var course=(lv&&lv.course)||(args&&args.p_course)||'';
          var d=res.data||{};
          var code=(d&&typeof d==='object')?(d.code||d.r_code||''):'';
          if(course)send('as-class-'+course,'session',{kind:(name==='start_session'?'start':'reissue'),code:code});
        }
        if(name==='appoint_rep'){
          var matric=String((args&&args.p_matric)||'').toUpperCase();
          r0.call(sb,'lecturer_reps',{}).then(function(lr){
            var rows=(lr&&!lr.error&&lr.data)||[];
            var hit=rows.filter(function(x){return String(x.r_matric||'').toUpperCase()===matric;})[0];
            if(hit&&hit.r_id)send('as-rep-'+hit.r_id,'appointed',{course:(args&&args.p_course)||'',by:(U&&U.name)||''});
          },function(){});
        }
      }
    }catch(e){}
    return res;
  });
};
var s0=W.start;
W.start=function(){var r=s0.apply(this,arguments);setTimeout(function(){subCourses();subPersonal();},800);return r;};
})();
