/* Academic Summit - homeorder.js v1: organised, standard homepage.
   The old home stacked every overlay's card (crowded). This replaces student
   V.home with ONE curated dashboard and disables the competing homehub paint
   (as_hh_off), so order is guaranteed. Every control calls a REAL existing
   handler (go / asReportOpen / hhTarget) - nothing static, nothing mock.
   Sections: greeting -> standing hero -> 3 quick actions -> today ->
   needs attention (top 3) -> this week. Rep desk + class notices still inject.
   Lecturer home untouched. Undo = drop the tag. */
(function(){
'use strict';
if(window.__asHomeOrder)return;window.__asHomeOrder='1';
var W=window;
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function fn(n){return typeof W[n]==='function'?W[n]:null;}
function dow(){return (new Date().getDay()+6)%7;}
function weekAgo(){return new Date(Date.now()-6*864e5).toISOString().slice(0,10);}
function daysLeft(d){return Math.ceil((new Date(d)-new Date().setHours(0,0,0,0))/864e5);}
var IC={
 att:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/><path d="M9 16l2 2 4-4"/></svg>',
 study:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 19.5A2.5 2.5 0 016.5 17H20V2H6.5A2.5 2.5 0 004 4z"/><path d="M4 19.5A2.5 2.5 0 006.5 22H20v-5"/></svg>',
 plan:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
 chart:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 17l6-6 4 3 8-8"/></svg>'
};
function tile(icon,label,sub,js){
  return '<button class="card text-left" style="padding:14px" onclick="'+js+'">'+
    '<span style="color:#10b981">'+icon+'</span>'+
    '<span class="font-extrabold block" style="font-size:13px;margin-top:6px">'+esc(label)+'</span>'+
    '<span class="block text-xs" style="color:var(--mut);margin-top:2px">'+esc(sub)+'</span></button>';
}
V.home=function(){
  var p=(U&&U.profile)||{};
  var c=(typeof cum==='function')?cum():{u:0,q:0,g:0};
  var tot=p.totalUnits||120;
  var pct=Math.max(0,Math.min(1,c.g/5));
  var h='<div class="space-y-4" style="max-width:640px;margin:0 auto">';
  h+='<div><div class="text-2xl font-extrabold">'+esc((typeof greet==='function')?greet():'Good day')+', '+esc(String(U.name||'').split(' ')[0])+'</div>'+
     '<div class="text-xs" style="color:var(--mut)">'+esc([p.program,p.level?p.level+' Level':'',p.matric].filter(Boolean).join(' · '))+'</div></div>';
  h+='<div class="grad rounded-3xl p-6 space-y-3 shadow-lg">'+
     '<div class="flex justify-between items-center"><span class="text-xs font-bold uppercase tracking-wider" style="opacity:.85">Cumulative GPA</span>'+
     '<button class="text-xs font-bold px-3 py-1 rounded-full" style="background:rgba(255,255,255,.2)" onclick="go(\'traj\')">Target '+esc((U.target||4.5).toFixed(2))+'</button></div>'+
     '<div class="flex items-end justify-between"><span class="text-4xl font-extrabold">'+c.g.toFixed(2)+'<span class="text-base" style="opacity:.75"> / 5.00</span></span></div>'+
     '<div style="height:8px;border-radius:6px;background:rgba(255,255,255,.3)"><div style="height:100%;width:'+Math.round(pct*100)+'%;border-radius:6px;background:#fff"></div></div>'+
     '<div class="text-xs font-semibold" style="opacity:.9">'+c.u+' of '+tot+' units completed</div>'+
     '<div class="flex gap-2"><button class="btn2 flex-1" style="background:rgba(255,255,255,.9)!important" onclick="go(\'traj\')">Full results</button>'+
     '<button class="btn2 flex-1" style="background:rgba(255,255,255,.9)!important" onclick="'+(fn('asReportOpen')?'asReportOpen()':'go(\'study\')')+'">Weekly report</button></div></div>';
  h+='<div class="grid grid-cols-3 gap-3">'+
     tile(IC.att,'Mark attendance','In class now?','go(\'att\')')+
     tile(IC.study,'Start studying','Focus session','go(\'study\')')+
     tile(IC.plan,'Plan','Tests & classes','go(\'plan\')')+
     '</div>';
  var td=iso(), d=dow();
  var cls=((U.timetable)||[]).filter(function(r){return +r.day===d;}).sort(function(a,b){return (a.start||'')<(b.start||'')?-1:1;});
  var sess=((U.sh&&U.sh.plan)||[]).filter(function(x){return x.kind==='session'&&x.date===td&&!x.done;});
  h+='<div class="card p-5 space-y-2"><div class="font-extrabold">Today</div>'+
     (cls.length?'<div class="flex justify-between text-sm"><span class="font-extrabold">'+esc(cls[0].code)+'</span><span class="text-xs" style="color:var(--mut)">'+esc(cls[0].start||'')+(cls[0].venue?' · '+esc(cls[0].venue):'')+'</span></div>':'<div class="text-xs" style="color:var(--mut)">No class scheduled today.</div>')+
     '<div class="text-xs" style="color:var(--mut)">'+sess.length+' study session'+(sess.length===1?'':'s')+' planned.</div>'+
     '<div class="flex gap-2"><button class="btn2 flex-1" onclick="go(\'plan\')">Open planner</button><button class="btn2 flex-1" onclick="go(\'study\')">Study now</button></div></div>';
  var pri=[];
  ((U.exams)||[]).forEach(function(e){var l=daysLeft(e.date);if(l>=0)pri.push({l:l,t:e.code,s:'Exam'});});
  ((U.tasks)||[]).forEach(function(t){if(t.done)return;var l=t.end?daysLeft(String(t.end).slice(0,10)):null;pri.push({l:l==null?2:l,t:t.t,s:'Task'});});
  pri.sort(function(a,b){return a.l-b.l;});
  if(pri.length){
    h+='<div class="card p-5 space-y-2"><div class="flex justify-between items-center"><span class="font-extrabold">Needs attention</span><button class="text-xs font-bold" style="color:#10b981" onclick="go(\'plan\')">See all</button></div>'+
       pri.slice(0,3).map(function(x){return '<div class="flex justify-between text-sm"><span style="min-width:0">'+esc(x.t)+'</span><span class="text-xs font-extrabold" style="color:'+(x.l<=2?'#e11d48':'#d97706')+'">'+(x.l<0?'overdue':x.l===0?'today':x.l+'d')+'</span></div>';}).join('')+'</div>';
  }
  var log=((U.sh&&U.sh.log)||[]), wa=weekAgo();
  var wk=log.filter(function(e){return e.date>=wa&&e.date<=td;});
  var mins=wk.reduce(function(a,e){return a+(+e.focused||0);},0);
  h+='<div class="card p-5 space-y-2"><div class="font-extrabold">This week</div>'+
     '<div class="grid grid-cols-3 gap-2 text-center">'+
     '<div><div class="text-xl font-extrabold">'+wk.filter(function(e){return e.status==='done';}).length+'</div><div class="text-xs" style="color:var(--mut)">sessions</div></div>'+
     '<div><div class="text-xl font-extrabold">'+Math.floor(mins/60)+'h '+(mins%60)+'m</div><div class="text-xs" style="color:var(--mut)">focused</div></div>'+
     '<div><div class="text-xl font-extrabold">'+esc(U.streak!=null?U.streak:0)+'</div><div class="text-xs" style="color:var(--mut)">streak</div></div></div>'+
     '<button class="btn2 w-full" onclick="go(\'study\')">Open Study</button></div>';
  return h+'</div>';
};
function order(){
  try{
    localStorage.setItem('as_home_mode','classic');
    localStorage.setItem('as_hh_off','1');
    sessionStorage.removeItem('as_hh_classic');
    var c=document.getElementById('hh-return');if(c)c.remove();
  }catch(e){}
}
var s0=W.start;
W.start=function(){var r=s0.apply(this,arguments);order();return r;};
setInterval(order,2000);
})();
