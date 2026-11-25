/* Academic Summit - helpfix.js v2: lecturer-door Help shows lecturer copy.
   v2 keys off the LIVE session role (U.role) + lecturer-door URL only.
   v1 used sticky localStorage.as_role, which leaked lecturer help onto the
   student side after switching roles. Undo = remove the script tag. */
(function(){
'use strict';
if(window.__asHelpFix)return;window.__asHelpFix='2';
function isLect(){
  if(/[?&]lecturer=1/.test(location.search)||location.hash==='#lecturer')return true;
  try{ if(typeof U!=='undefined'&&U&&U.role)return U.role==='lecturer'; }catch(e){}
  return false;
}
function screen(){
  if(document.getElementById('asw-gate'))return 'gate';
  if(document.getElementById('l-pin'))return 'pin';
  if(document.getElementById('ls-n')||document.getElementById('lr-n')||document.getElementById('lr-e'))return 'signup';
  return 'login';
}
var H={
 gate:{t:'Welcome, lecturer',b:'<ol><li><b>Log in</b> if you already have a lecturer account.</li><li><b>Create account</b> if you are new; you will then need the <b>access PIN</b> from your administrator.</li><li>Student? Use the student sign-in link, not this console.</li></ol>'},
 login:{t:'Lecturer sign in',b:'<ol><li>Use the <b>email and password</b> you created when you registered as a lecturer.</li><li><b>Forgot password?</b> Tap it under Log in; we email a code to choose a new one.</li><li><b>New lecturer?</b> Tap Create account, then enter the access PIN your administrator gave you (looks like PIN-123456).</li><li>No matric number here - that is for students only.</li></ol>'},
 signup:{t:'Creating a lecturer account',b:'<ol><li>Enter your <b>full name, email and a password</b> of at least 8 characters. No matric or JAMB number - those are student fields.</li><li>Next, enter the <b>access PIN</b> from your administrator. The PIN is what makes you a lecturer.</li><li>Each PIN works <b>once</b>; if rejected, ask for a fresh one.</li><li>Then you land in the Lecturer Console: attendance, roster, records, planner.</li></ol>'},
 pin:{t:'Lecturer access PIN',b:'<ol><li>Enter the PIN exactly as given, e.g. <b>PIN-123456</b>.</li><li>Each PIN works <b>once</b>. "Invalid or already used" means ask your administrator for a fresh PIN.</li><li>No PIN yet? The platform owner or your campus admin issues one from the Admin Panel.</li></ol>'}
};
function sheet(){
  var m=H[screen()]||H.login;
  var old=document.getElementById('asw-sheet');if(old)old.remove();
  var s=document.createElement('div');s.id='asw-sheet';
  s.innerHTML='<div class="c"><h2>'+m.t+'</h2>'+m.b+'<button type="button">Got it</button></div>';
  s.addEventListener('click',function(e){if(e.target===s||e.target.tagName==='BUTTON')s.remove();});
  document.body.appendChild(s);
}
document.addEventListener('click',function(e){
  var b=e.target.closest&&e.target.closest('#asw-help');
  if(!b||!isLect())return;
  e.stopPropagation();e.preventDefault();sheet();
},true);
})();
