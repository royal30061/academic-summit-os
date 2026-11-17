/* Academic Summit - fixes.js
   Load LAST: <script src="fixes.js?v=1"></script> after patch.js */
(function(){
'use strict';

/* 1. Logout wipes local data (shared-phone safety) */
const _logoutOld=window.logout;
window.logout=async function(){
  try{await syncNow();}catch(e){}
  try{
    Object.keys(localStorage).forEach(function(k){
      if(k==='as_v8'||k.indexOf('as_live_')===0)localStorage.removeItem(k);
    });
  }catch(e){}
  await sb.auth.signOut();
  location.reload();
};

/* 2. Analytics only after consent (NDPA) */
function consent(){try{return localStorage.getItem('as_consent');}catch(e){return null;}}
function applyConsent(){
  try{
    if(!window.posthog)return;
    if(consent()==='1'){posthog.opt_in_capturing&&posthog.opt_in_capturing();}
    else{posthog.opt_out_capturing&&posthog.opt_out_capturing();}
  }catch(e){}
}
function consentBanner(){
  if(consent()||document.getElementById('consent-bar'))return;
  const d=document.createElement('div');
  d.id='consent-bar';
  d.style.cssText='position:fixed;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 84px);z-index:9998;background:#07271d;color:#e7fff5;border:1px solid #0d3f2e;border-radius:16px;padding:14px;font-size:12px;box-shadow:0 10px 30px rgba(0,0,0,.5)';
  d.innerHTML='<div style="margin-bottom:10px;line-height:1.5">Allow anonymous usage analytics to help improve Academic Summit? Your results and finances are never shared.</div><div style="display:flex;gap:8px"><button id="cb-no" class="btn2" style="flex:1">No thanks</button><button id="cb-yes" class="btn" style="flex:1">Allow</button></div>';
  document.body.appendChild(d);
  document.getElementById('cb-yes').onclick=function(){localStorage.setItem('as_consent','1');applyConsent();d.remove();};
  document.getElementById('cb-no').onclick=function(){localStorage.setItem('as_consent','0');applyConsent();d.remove();};
}
applyConsent();
const _start=window.start;
window.start=function(){_start.apply(this,arguments);setTimeout(consentBanner,1500);};

/* 3. Backup restore (validates https links, strips unknown keys) */
window.importBackup=function(file){
  const r=new FileReader();
  r.onload=function(){
    try{
      const d=JSON.parse(r.result);
      if(!d||typeof d!=='object'||!Array.isArray(d.semesters))throw new Error('Not an Academic Summit backup');
      d.materials=(d.materials||[]).filter(function(m){return /^https:\/\//i.test(m.link||'');});
      d.role=U.role;
      Object.assign(U,d);
      save();start();showToast('Backup restored');
    }catch(e){showToast(e.message,'error');}
  };
  r.readAsText(file);
};

/* 4. Per-semester merge on cloud sync (two-device safety) */
const _boot=window.boot;
window.boot=async function(user){
  const localBefore=(DB.users[user.email]||{}).semesters||[];
  const res=await _boot.call(this,user);
  try{
    if(U&&localBefore.length){
      const key=function(s){return semPrint(s);};
      const have={};(U.semesters||[]).forEach(function(s){have[key(s)]=1;});
      let added=0;
      localBefore.forEach(function(s){if(!have[key(s)]){U.semesters.push(s);added++;}});
      if(added){refreshCarry();save();}
    }
  }catch(e){}
  return res;
};

/* 5. Local-date helper (UTC+1 fix). The base iso() is a const, so
   edit it in the main file:
   const iso=d=>{const z=new Date(d.getTime()-d.getTimezoneOffset()*6e4);return z.toISOString().slice(0,10);};
   Use localIso() for any new code. */
window.localIso=function(d){const z=new Date(d.getTime()-d.getTimezoneOffset()*6e4);return z.toISOString().slice(0,10);};

/* 6. Detective disclaimer */
const _runDet=window.runDet;
window.runDet=function(){
  const r=_runDet.apply(this,arguments);
  const box=document.getElementById('d-res');
  if(box&&!box.querySelector('[data-disc]')){
    const p=document.createElement('p');
    p.setAttribute('data-disc','1');
    p.className='text-[10px] text-slate-500 pt-2';
    p.textContent='Grade shapes are inferred estimates, not your actual course results.';
    box.appendChild(p);
  }
  return r;
};
})();

/* 7. load-order manifest check (diagnostic only) */
(function(){
var NEED=['attBar','ocrPick','regOpen','filesOpen','repAdd','lecAppoint','deleteLecAccount','doLogin','undoImport','coachGo'];
function check(){
var missing=NEED.filter(function(n){return typeof window[n]!=='function';});
if(missing.length){console.warn('[manifest] missing:',missing.join(', '));try{track('manifest_missing',{missing:missing.join(',')});}catch(e){}}
}
var s0=window.start;window.start=function(){var r=s0.apply(this,arguments);setTimeout(check,900);return r;};
})();
