/* Academic Summit - matricguard.js v1: claim matric via set_my_matric (server
   refuses duplicates) and set the verified tag when an uploaded portal page
   carries the same matric. Undo = drop tag. */
(function(){
'use strict';
if(window.__asMatricGuard)return;window.__asMatricGuard='1';
var W=window;
function norm(s){return String(s||'').trim().toUpperCase();}
function claim(){
  try{
    if(typeof U==='undefined'||!U||U.role!=='student')return;
    var m=norm((U.profile||{}).matric);if(!m)return;
    sb.rpc('set_my_matric',{p_matric:m}).then(function(r){
      if(r&&!r.error&&r.data==='taken'){
        showToast('That matric number is already claimed by another account. Correct it in Profile.','error');
      }else if(r&&!r.error&&r.data==='ok'&&norm((U.profile||{}).matric)!==m){
        U.profile.matric=m;try{save();}catch(e){}
      }
    },function(){});
  }catch(e){}
}
function verifyFromRaw(raw){
  try{
    if(typeof U==='undefined'||!U||!raw)return;
    var m=norm((U.profile||{}).matric);if(!m)return;
    var mm=raw.match(/matric[^A-Z0-9]{0,6}([A-Z0-9][A-Z0-9\/-]{3,19})/i);
    if(!mm)return;
    var p=norm(mm[1]);if(p!==m)return;
    sb.rpc('mark_matric_verified',{p_portal_matric:p}).then(function(r){
      if(r&&!r.error&&r.data===true)showToast('Matric verified against your portal result.');
    },function(){});
  }catch(e){}
}
var s0=W.start;W.start=function(){var r=s0.apply(this,arguments);setTimeout(claim,600);return r;};
var ss=W.saveSem;W.saveSem=function(){var raw=W._lastPasteRaw||W._lastRaw||'';var r=ss.apply(this,arguments);setTimeout(function(){verifyFromRaw(raw);claim();},300);return r;};
})();
