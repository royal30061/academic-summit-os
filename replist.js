/* Academic Summit - replist.js v1: rep outbox. Queue several students who
   cannot mark and forward the list to the lecturer in one tap (per live
   session). Lecturer already has Approve all / Reject all. Undo = drop tag. */
(function(){
'use strict';
if(window.__asRepList)return;window.__asRepList='1';
var W=window;
var RZ={no_phone:'No phone',network:'Network problem',battery:'Battery dead',other:'Other'};
function opts(sel){return Object.keys(RZ).map(function(k){return '<option value="'+k+'"'+(k===sel?' selected':'')+'>'+RZ[k]+'</option>';}).join('');}
function inject(){
  try{
    if(typeof view==='undefined'||view!=='rep')return;
    document.querySelectorAll('#rep-root [id^="rc-"]').forEach(function(card){
      var i=card.id.slice(3);
      if(!card.dataset.sid||card.querySelector('.rl-out'))return;
      var d=document.createElement('div');d.className='rl-out space-y-2 pt-3 border-t';d.style.borderColor='var(--bd)';
      d.innerHTML='<div class="lbl">Forward a list of students who cannot mark</div>'+
        '<div id="rl-rows-'+i+'" class="space-y-2"></div>'+
        '<button type="button" class="text-xs font-bold text-emerald-600" onclick="rlAdd('+i+')">+ Add another student</button>'+
        '<button class="btn2 w-full" onclick="rlSend('+i+')">Send list to lecturer</button>'+
        '<div id="rl-sum-'+i+'" class="text-[11px] text-slate-500"></div>';
      card.appendChild(d);
    });
  }catch(e){}
}
W.rlAdd=function(i){
  var box=document.getElementById('rl-rows-'+i);if(!box)return;
  var d=document.createElement('div');d.className='rl-row grid grid-cols-12 gap-2';
  d.innerHTML='<input class="inp col-span-7 font-mono uppercase rl-m" placeholder="Matric number">'+
              '<select class="inp col-span-5 rl-r">'+opts('no_phone')+'</select>';
  box.appendChild(d);
};
W.rlSend=function(i){
  var card=document.getElementById('rc-'+i);var sid=card&&card.dataset.sid;
  if(!sid)return showToast('Your lecturer has not started the class yet','error');
  var items=[].slice.call(document.querySelectorAll('#rl-rows-'+i+' .rl-row')).map(function(r){
    return {m:(r.querySelector('.rl-m').value||'').trim().toUpperCase(), r:r.querySelector('.rl-r').value};
  }).filter(function(x){return x.m.length>=3;});
  if(!items.length)return showToast('Add at least one matric number first','error');
  Promise.all(items.map(function(it){
    return sb.rpc('rep_request_add',{p_session_id:sid,p_matric:it.m,p_reason:it.r}).then(function(r){if(r.error)throw r.error;return r.data;});
  })).then(function(){
    var box=document.getElementById('rl-rows-'+i);if(box)box.innerHTML='';
    var s=document.getElementById('rl-sum-'+i);if(s)s.textContent='Sent '+items.length+' name'+(items.length>1?'s':'')+' to your lecturer for approval.';
    showToast('List sent to lecturer');
    if(typeof W.go==='function')W.go('rep');
  }).catch(function(e){showToast((e&&e.message)||'Could not send the list','error');});
};
setInterval(inject,900);
var g0=W.go;W.go=function(v){var r=g0.apply(this,arguments);if(v==='rep')setTimeout(inject,500);return r;};
})();
