/* Academic Summit - coursefeed.js v2 (replaces v1, which wrongly dropped the
   level filter). Rule: Study shows CURRENT-level courses only; a lower-level
   course appears only if failed/carried (inferred from uploaded results).
   Current-level set = personal registration, else cohort catalog, else
   current-level results. Manual adds stay Study-only (provisional).
   Contributes verified registrations to the cohort catalog (sql/19).
   Undo = drop the tag. */
(function(){
'use strict';
if(window.__asCourseFeed)return;window.__asCourseFeed='2';
var W=window;
function norm(c){return String(c||'').trim().toUpperCase().replace(/\s+/g,'');}
function codeLevel(code){var m=String(code||'').match(/\d+/);if(!m)return 0;return Math.floor(parseInt(m[0],10)/100)*100;}
function currentLevel(){try{var l=parseInt((U.profile||{}).level,10);if(l)return Math.floor(l/100)*100;}catch(e){}return 100;}
function failedSet(){
  var s={};
  try{
    (U.carry||[]).forEach(function(c){s[norm(c.code||c)]=1;});
    (U.semesters||[]).forEach(function(sem){(sem.courses||[]).forEach(function(c){if(+c.score<40)s[norm(c.code)]=1;});});
  }catch(e){}
  return s;
}
function manual(){try{if(typeof U==='undefined'||!U)return [];U.sh=U.sh||{};U.sh.manual=U.sh.manual||[];return U.sh.manual;}catch(e){return [];}}
function regList(){
  var out=[];
  try{
    if(typeof U==='undefined'||!U)return out;
    var pools=[];
    if(U.dec)Object.keys(U.dec).forEach(function(k){(U.dec[k]||[]).forEach(function(c){pools.push(c);});});
    if(U.reg)pools=pools.concat(U.reg);
    if(U.registration)pools=pools.concat(U.registration);
    pools.forEach(function(c){var code=norm(c&&c.code?c.code:c);if(code)out.push({code:code,title:(c&&c.title)||'',units:(c&&(c.unit||c.units))||''});});
  }catch(e){}
  return out;
}
function resList(){
  var out=[];
  try{(U.semesters||[]).forEach(function(s){(s.courses||[]).forEach(function(c){out.push({code:norm(c.code),title:c.title||'',units:c.unit||''});});});}catch(e){}
  return out;
}
W.asEngineCourses=function(){
  var cur=currentLevel(), fail=failedSet(), map={};
  function put(c){var k=norm(c.code);if(!k)return;var e=map[k]||(map[k]={code:k,title:'',units:''});if(!e.title&&c.title)e.title=c.title;if(!e.units&&c.units)e.units=c.units;}
  var pers=regList(), res=resList();
  var persCur=pers.filter(function(c){return codeLevel(c.code)===cur;});
  var cat=(W.__asCatalog||[]).filter(function(c){return codeLevel(c.code)===cur;});
  var resCur=res.filter(function(c){return codeLevel(c.code)===cur;});
  var base=persCur.length?persCur:(cat.length?cat:resCur);
  base.forEach(put);
  pers.concat(res).forEach(function(c){var L=codeLevel(c.code);if(L<cur&&fail[norm(c.code)])put(c);});
  manual().forEach(function(c){var k=norm(c.code);put(c);if(map[k])map[k].prov=true;});
  return Object.keys(map).map(function(k){var e=map[k];return {code:e.code,title:e.prov?(e.title?e.title+' (manual)':'(manual)'):e.title,units:e.units,provisional:!!e.prov};})
    .sort(function(a,b){return a.code<b.code?-1:1;});
};
function pullCatalog(){
  try{
    if(typeof U==='undefined'||!U||U.role!=='student')return;
    sb.rpc('level_catalog',{p_level:currentLevel(),p_min:3}).then(function(r){
      if(r&&!r.error){W.__asCatalog=(r.data||[]).map(function(x){return {code:norm(x.code),title:x.title||'',units:x.units||''};});}
    },function(){});
  }catch(e){}
}
function pushCatalog(){
  try{
    if(typeof U==='undefined'||!U||U.role!=='student')return;
    var cur=currentLevel();
    var mine=regList().filter(function(c){return codeLevel(c.code)===cur;});
    if(!mine.length)return;
    sb.rpc('sync_level_courses',{p_courses:mine}).then(function(){pullCatalog();},function(){});
  }catch(e){}
}
W.shAddCourse=function(){
  var code=prompt('Course code (e.g. POS201):');if(!code)return;code=norm(code);
  var units=prompt('Units (optional):','2')||'';
  var m=manual();
  if(m.some(function(c){return norm(c.code)===code;})){showToast('Already in your list','error');return;}
  m.push({code:code,units:units,provisional:true});
  try{save();}catch(e){}
  showToast('Added '+code+' to Study (manual)');
  try{if(typeof W.shRefresh==='function')W.shRefresh();else if(typeof W.shTab==='function')W.shTab('courses');}catch(e){}
  setTimeout(inject,200);
};
function inject(){
  try{
    var host=document.querySelector('[data-sh]');
    if(!host||!host.querySelector('button[onclick^="shOpen"]'))return;
    if(document.getElementById('sh-addcourse'))return;
    var d=document.createElement('div');d.id='sh-addcourse';d.className='card p-4 mb-3';
    d.innerHTML='<div class="flex items-center justify-between gap-2"><div><div class="font-extrabold">Missing a course?</div><div class="text-[11px] text-slate-500">Add it manually for study. Manual courses stay in Study only.</div></div><button class="btn" onclick="shAddCourse()">+ Add course</button></div>';
    host.insertBefore(d,host.firstChild);
  }catch(e){}
}
setInterval(inject,1200);
var g0=W.go;W.go=function(v){var r=g0.apply(this,arguments);setTimeout(inject,400);if(v==='study'){pullCatalog();}return r;};
var s0=W.start;W.start=function(){var r=s0.apply(this,arguments);setTimeout(function(){pullCatalog();pushCatalog();},900);return r;};
})();
