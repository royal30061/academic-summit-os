/* Academic Summit - profileux.js v3: compact Profile per approved reference.
   v3 drops the homepage-mode forcing (homeorder.js now owns the homepage).
   Avatar single tap -> go('prof'). Identity card, PROFILE, PREFERENCES
   (Display, Notifications), PRIVACY & SUPPORT, red Sign out. Real handlers
   only; no dead rows. Lecturer profile, auth, data, DB untouched. */
(function(){
'use strict';
if(window.__asProfileUx)return;window.__asProfileUx='3';
var W=window;
function fn(){for(var i=0;i<arguments.length;i++){if(typeof W[arguments[i]]==='function')return W[arguments[i]];}return null;}
function findMark(){var d=fn('openMarks','marksOpen','showMarks','openSummitMarks','summitMarks');if(d)return d;for(var k in W){try{if(/mark/i.test(k)&&typeof W[k]==='function'&&!/benchmark/i.test(k))return W[k];}catch(e){}}return null;}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function initials(n){return String(n||'?').trim().split(/\s+/).map(function(w){return w[0];}).slice(0,2).join('').toUpperCase();}
var I={
 user:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
 cap:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l10 5-10 5L2 8z"/><path d="M6 10v5c0 2 3 3 6 3s6-1 6-3v-5"/></svg>',
 pal:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><circle cx="9" cy="10" r="1"/><circle cx="15" cy="10" r="1"/><circle cx="12" cy="15" r="1"/></svg>',
 bell:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 004 0"/></svg>',
 shield:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z"/></svg>',
 help:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 13a8 8 0 0116 0"/><rect x="3" y="13" width="4" height="6" rx="2"/><rect x="17" y="13" width="4" height="6" rx="2"/></svg>',
 info:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 8h.01"/></svg>',
 down:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4v10m0 0l-4-4m4 4l4-4"/><path d="M4 20h16"/></svg>',
 out:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>',
 mark:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/></svg>'
};
function row(icon,label,sub,js,first){
  if(!js)return '';
  return '<button class="w-full flex items-center gap-3 text-left" style="padding:14px 16px;'+(first?'':'border-top:1px solid var(--bd);')+'" onclick="'+js+'">'+
    '<span style="color:var(--mut);flex-shrink:0">'+icon+'</span>'+
    '<span style="min-width:0;flex:1"><span class="font-extrabold block" style="font-size:14px">'+esc(label)+'</span>'+
    (sub?'<span class="block text-xs" style="color:var(--mut);margin-top:2px">'+esc(sub)+'</span>':'')+'</span>'+
    '<span style="color:var(--mut)">&rsaquo;</span></button>';
}
function section(title,rows){
  if(!rows)return '';
  return '<div class="lbl" style="margin:16px 0 6px">'+title+'</div><div class="card" style="padding:0;overflow:hidden">'+rows+'</div>';
}
W.__themeSheet=function(){
  var cur=(typeof themeMode!=='undefined')?themeMode:'system';
  var b=function(m,l){return '<button class="'+(cur===m?'btn':'btn2')+' w-full" style="margin-bottom:8px" onclick="setThemeMode(\''+m+'\');closeSheet();go(\'prof\')">'+l+'</button>';};
  fullScreen('Display',b('light','Light')+b('dark','Dark')+b('system','Match system'));
};
W.__aboutSheet=function(){
  var b=(W.__AS_BUILD__||{});
  fullScreen('About Academic Summit','<div class="card space-y-2"><div class="font-extrabold">Academic Summit</div>'+
    '<p class="text-xs" style="color:var(--mut)">Build '+esc(b.ref||'dev')+' '+esc(String(b.sha||'').slice(0,7))+'</p>'+
    '<p class="text-xs" style="color:var(--mut)">Your attendance, results and study space in one place.</p>'+
    '<button class="btn2 w-full" onclick="closeSheet();openPolicy()">Privacy policy</button>'+
    '<button class="btn2 w-full" onclick="closeSheet();openSupport()">Contact support</button></div>');
};
V.prof=function(){
  var p=(U&&U.profile)||{};
  var personal=fn('openInfoSheet'), edit=fn('openEditSheet'),
      academic=fn('openAcadSheet','openAcademicSheet','openAcadInfo')||edit,
      notif=fn('openNotifSheet'), policy=fn('openPolicy'),
      support=fn('openSupport'), security=fn('openSecuritySheet','openPrivacySheet')||policy,
      mydata=fn('asExport','exportData'), backup=fn('exportData','asExport'),
      admin=fn('adminLoadLecturers'), out=fn('logout');
  var h='<div style="max-width:640px;margin:0 auto">';
  h+='<button class="card w-full flex items-center gap-4 text-left" style="padding:16px" onclick="'+(edit?'openEditSheet()':(personal?'openInfoSheet()':''))+'">'+
     '<span style="width:52px;height:52px;border-radius:50%;background:var(--sub);display:grid;place-items:center;font-weight:800;font-size:18px;color:#10b981;flex-shrink:0">'+esc(initials(U&&U.name))+'</span>'+
     '<span style="min-width:0;flex:1"><span class="font-extrabold block" style="font-size:16px">'+esc(U&&U.name)+'</span>'+
     '<span class="block text-xs" style="color:var(--mut)">Student profile</span>'+
     '<span class="block text-xs font-bold" style="color:#10b981;margin-top:2px">View profile &rarr;</span></span>'+
     '<span style="color:var(--mut)">&rsaquo;</span></button>';
  var r1='';
  r1+=row(I.user,'Personal information','Names, contact information and student details',personal?'openInfoSheet()':'',true);
  r1+=row(I.cap,'Academic information','University, programme, level and matriculation',academic?(academic===edit?'openEditSheet()':'openAcadSheet()'):'');
  h+=section('PROFILE',r1);
  var r2='';
  r2+=row(I.pal,'Display','Theme and display preferences','__themeSheet()',true);
  r2+=row(I.bell,'Notifications','Manage reminders and alerts',notif?'openNotifSheet()':'');
  h+=section('PREFERENCES',r2);
  var r3='';
  r3+=row(I.shield,'Privacy & security','Account security and data management',security?(security===policy?'openPolicy()':'openSecuritySheet()'):'',true);
  r3+=row(I.help,'Help & support','FAQ, contact and report a problem',support?'openSupport()':'');
  r3+=row(I.info,'About Academic Summit','Version, policies and information','__aboutSheet()');
  if(mydata)r3+=row(I.down,'Download my data','Everything on this account',mydata===W.asExport?'asExport()':'exportData()');
  if(backup&&backup!==mydata)r3+=row(I.down,'Download backup','Portable copy for restore','exportData()');
  h+=section('PRIVACY & SUPPORT',r3);
  if(admin&&typeof isAdmin==='function'&&isAdmin())h+=section('ADMIN',row(I.cap,'Open Admin Panel','Lecturer onboarding and controls','adminLoadLecturers()',true));
  if(out)h+='<button class="card w-full flex items-center gap-3 text-left" style="padding:14px 16px;margin-top:16px;color:#e11d48" onclick="logout()">'+I.out+'<span class="font-extrabold">Sign out</span></button>';
  return h+'</div>';
};
var marks=findMark();
if(marks){
  ['traj','acad'].forEach(function(v){
    if(typeof V[v]==='function'){
      var base=V[v];
      V[v]=function(){
        var h=base.apply(this,arguments);
        if(typeof h==='string'&&h.indexOf('Summit Marks')<0){
          h+='<button class="card w-full flex items-center gap-3 text-left" style="padding:14px 16px;margin-top:12px" onclick="__openMarks()">'+I.mark+'<span style="flex:1"><span class="font-extrabold block">Summit Marks</span><span class="block text-xs" style="color:var(--mut)">Achievements and progress</span></span><span style="color:var(--mut)">&rsaquo;</span></button>';
        }
        return h;
      };
    }
  });
  W.__openMarks=function(){marks();};
}
function forceAvatar(){
  try{
    var b=document.querySelector('#top button[onclick*="prof"]');
    if(!b){var bs=document.querySelectorAll('#top button');b=bs[bs.length-1];}
    if(b)b.setAttribute('onclick',"go('prof')");
  }catch(e){}
}
var s0=W.start;
W.start=function(){var r=s0.apply(this,arguments);forceAvatar();return r;};
setInterval(forceAvatar,2000);
})();
