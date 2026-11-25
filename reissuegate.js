/* Academic Summit - reissuegate.js v1: rep re-issue becomes a one-time request
   the lecturer approves. Overrides the rep button, relabels it by status, and
   adds a pending-reissue panel to the lecturer home. Undo = drop the tag. */
(function(){
'use strict';
if(window.__asReissueGate)return;window.__asReissueGate='1';
var W=window;
function sidOf(i){var c=document.getElementById('rc-'+i);return (c&&c.dataset.sid)||null;}
W.repReissue=function(i){
  var sid=sidOf(i);
  if(!sid)return showToast('No class session to re-issue','error');
  sb.rpc('rep_request_reissue',{p_session_id:sid}).then(function(r){
    if(r&&r.error)return showToast(r.error.message,'error');
    showToast('Re-issue requested - waiting for your lecturer to approve');
    setTimeout(paintRep,400);
  }).catch(function(e){showToast((e&&e.message)||'Could not request a re-issue','error');});
};
function paintRep(){
  try{
    if(typeof view==='undefined'||view!=='rep')return;
    document.querySelectorAll('#rep-root [id^="rc-"]').forEach(function(card){
      var sid=card.dataset.sid;if(!sid)return;
      var btn=card.querySelector('button[onclick^="repReissue"]');if(!btn)return;
      sb.rpc('rep_reissue_status',{p_session_id:sid}).then(function(r){
        var st=(r&&!r.error&&r.data)||'none';
        if(st==='pending'){btn.disabled=true;btn.textContent='Re-issue requested - waiting for lecturer';}
        else if(st==='approved'){btn.disabled=true;btn.textContent='Re-issue used for this class';}
        else if(st==='rejected'){btn.disabled=false;btn.textContent='Re-issue code';}
      },function(){});
    });
  }catch(e){}
}
function lecPanel(){
  try{
    if(typeof U==='undefined'||!U||U.role!=='lecturer')return;
    var host=document.getElementById('lec-extras');if(!host)return;
    var box=document.getElementById('as-reissue-box');
    if(!box){box=document.createElement('div');box.id='as-reissue-box';box.className='card p-6 space-y-2';host.appendChild(box);}
    sb.rpc('lecturer_pending_reissues').then(function(r){
      var rows=(r&&!r.error&&r.data)||[];
      box.innerHTML='<div class="font-extrabold">Re-issue requests from reps</div>'+
        (rows.length?rows.map(function(x){
          return '<div class="flex justify-between items-center text-xs p-3 rounded-xl" style="background:var(--sub)">'+
            '<span><b>'+esc(x.course)+'</b> - '+esc(x.rep_name||'rep')+'</span>'+
            '<span class="flex gap-2"><button class="btn" onclick="riDecide(\''+x.id+'\',true)">Approve</button>'+
            '<button class="btn2" onclick="riDecide(\''+x.id+'\',false)">Deny</button></span></div>';
        }).join(''):'<p class="text-xs text-slate-500">Nothing waiting.</p>');
    },function(){});
  }catch(e){}
}
W.riDecide=function(id,ok){
  sb.rpc('decide_reissue',{p_id:id,p_ok:ok}).then(function(r){
    if(r&&r.error)return showToast(r.error.message,'error');
    showToast(ok?('Approved - new code '+r.data+' is live'):'Denied');
    lecPanel();
    if(typeof livePollOnce==='function')livePollOnce();
  }).catch(function(e){showToast((e&&e.message)||'Could not decide','error');});
};
setInterval(paintRep,2500);
setInterval(lecPanel,4000);
var g0=W.go;
W.go=function(v){var r=g0.apply(this,arguments);if(v==='rep')setTimeout(paintRep,600);if(v==='home')setTimeout(lecPanel,800);return r;};
})();
