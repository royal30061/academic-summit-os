/* Academic Summit - pinfix.js v1. Load LAST. Undo = remove the <script> tag.
   redeemPin ignored the RPC boolean and boot() is once-per-page guarded, so
   redeem was a dead button for wrong AND right PINs. Now: false/error/throw =>
   clear message + button resets; true => mark local role + reload.
   adminGeneratePin only shows a PIN the server stored. */
(function(){
'use strict';
if(window.__asPinFix)return;window.__asPinFix='1';
function pinBusy(on){
  var b=document.querySelector('#auth button.btn');
  if(!b)return;
  b.disabled=!!on;b.style.opacity=on?0.6:1;
  b.textContent=on?'Please wait…':'Verify and Continue';
}
window.redeemPin=async function(){
  var el=document.getElementById('l-pin');
  var pin=((el&&el.value)||'').trim().toUpperCase();
  if(pin.length<4)return pinGate(null,'Enter your access PIN.');
  pinBusy(true);
  var r;
  try{r=await sb.rpc('redeem_lecturer_pin',{p_pin:pin});}
  catch(e){pinBusy(false);return pinGate(null,'Could not reach the server. Check your network and try again.');}
  pinBusy(false);
  if(r&&r.error)return pinGate(null,r.error.message);
  if(!r||r.data!==true)return pinGate(null,'That PIN is invalid or already used. Ask your administrator for a fresh PIN.');
  try{
    var k=pinUser&&(pinUser.email||pinUser.id);
    if(k&&typeof DB!=='undefined'&&DB.users&&DB.users[k]){
      DB.users[k].role='lecturer';
      localStorage.setItem('as_v8',JSON.stringify(DB));
    }
  }catch(e){}
  location.reload();
};
window.adminGeneratePin=async function(){
  var r;
  try{r=await sb.rpc('request_lecturer_pin',{p_note:null});}
  catch(e){return showToast('Could not reach the server. Try again.','error');}
  if(r&&r.error)return showToast(r.error.message,'error');
  if(r&&r.data&&r.data.status==='approved'&&r.data.pin){
    try{adminLastPin=r.data.pin;}catch(e){}
    showToast('PIN generated: '+r.data.pin);
    go('admin');
  }else{
    showToast('Sent to the owner for approval');
  }
};
})();
