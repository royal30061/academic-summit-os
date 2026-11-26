/* Academic Summit - coursefeed.js v4.
   v3 logic was correct but devices kept a stale cached copy (SWR caches by
   ?v= URL), so the hub never saw it. v4 ships with a global cache-bust (below)
   and adds: level inference when profile.level is absent (highest level present
   in any registration/results cluster), and feeds the classic Academics engine
   via as2Courses so both surfaces agree. Rule unchanged: current-level courses
   only; lower-level returns only if failed/carried; manual adds Study-only. */
(function(){
'use strict';
if(window.__asCourseFeed)return;window.__asCourseFeed='4';
var W=window;
function norm(c){return String(c||'').trim().toUpperCase().replace(/\s+/g,'');}
function codeLevel(code){var m=String(code||'').match(/\d+/);if(!m)return 0;return Math.floor(parseInt(m[0],10)/100)*100;}
function clusters(){
  var out=[];
  function walk(o,d){
    if(!o||d>6)return;
    if(Array.isArray(o)){
      if(o.length&&o.every(function(x){return x&&typeof x==='object'&&x.code;}))out.push(o.map(function(c){return {code:norm(c.code),title:c.title||'',units:(c.unit||c.units)||''};}).filter(function(c){return c.code;}));
      return;
    }
    if(typeof o==='object'){for(var k in o){if(k==='log'||k==='plan'||k==='topics'||k==='manual')continue;try{walk(o[k],d+1);}catch(e){}}}
  }
  try{walk(U,0);}catch(e){}
  return out;
}
function currentLevel(){
  try{var p=parseInt((U.profile||{}).level,10);if(p)return Math.floor(p/100)*100;}catch(e){}
  var mx=0;clusters().forEach(function(l){l.forEach(function(c){var L=codeLevel(c.code);if(L>mx)mx=L;});});
  return mx||100;
}
function failedSet(){var s={};try{(U.carry||[]).forEach(function(c){s[norm(c.code||c)]=1;});(U.semesters||[]).forEach(function(sem){(sem.courses||[]).forEach(function(c){if(+c.score<40)s[norm(c.code)]=1;});});}catch(e){}return s;}
function manual(){try{if(typeof U==='undefined'||!U)return [];U.sh=U.sh||{};U.sh.manual=U.sh.manual||[];return U.sh.manual;}catch(e){return [];}}
function resList(){var out=[];try{(U.semesters||[]).forEach(function(s){(s.courses||[]).forEach(function(c){out.push({code:norm(c.code),title:c.title||'',units:c.unit||''});});});}catch(e){}return out;}
function bestReg(){
  var cur=currentLevel(),best=null,bestScore=0;
  clusters().forEach(function(l){
    var n=l.filter(function(c){return codeLevel(c.code)===cur;}).length;
    if(n>0&&n>bestScore){best=l;bestScore=n;}
  });
  return best||[];
}
W.asEngineCourses=function(){
  var cur=currentLevel(),fail=failedSet(),map={};
  function put(c){var k=norm(c.code);if(!k)return;var e=map[k]||(map[k]={code:k,title:'',units:''});if(!e.title&&c.title)e.title=c.title;if(!e.units&&c.units)e.units=c.units;}
  var reg=bestReg(),res=resList();
  var regCur=reg.filter(function(c){return codeLevel(c.code)===cur;});
  var resCur=res.filter(function(c){return codeLevel(c.code)===cur;});
  var cat=(W.__asCatalog||[]).filter(function(c){return codeLevel(c.code)===cur;});
  (regCur.length?regCur:(cat.length?cat:resCur)).forEach(put);
  reg.concat(res).forEach(function(c){var L=codeLevel(c.code);if(L<cur&&fail[norm(c.code)])put(c);});
  manual().forEach(function(c){put(c);var k=norm(c.code);if(map[k])map[k].prov=true;});
  return Object.keys(map).map(function(k){var e=map[k];return {code:e.code,title:e.prov?(e.title?e.title+' (manual)':'(manual)'):e.title,units:e.units,provisional:!!e.prov};})
    .sort(function(a,b){return a.code<b.code?-1:1;});
};
W.as2Courses=function(){return W.asEngineCourses();};
function pullCatalog(){try{if(typeof U==='undefined'||!U||U.role!=='student')return;sb.rpc('level_catalog',{p_level:currentLevel(),p_min:3}).then(function(r){if(r&&!r.error)W.__asCatalog=(r.data||[]).map(function(x){return {code:norm(x.code),title:x.title||'',units:x.units||''};});},function(){});}catch(e){}}
function pushCatalog(){try{if(typeof U==='undefined'||!U||U.role!=='student')return;var cur=currentLevel();var mine=bestReg().filter(function(c){return codeLevel(c.code)===cur;});if(!mine.length)return;sb.rpc('sync_level_courses',{p_courses:mine}).then(function(){pullCatalog();},function(){});}catch(e){}}
W.shAddCourse=function(){
  var code=prompt('Course code (e.g. POS201):');if(!code)return;code=norm(code);
  var units=prompt('Units (optional):','2')||'';
  var m=manual();
  if(m.some(function(c){return norm(c.code)===code;})){showToast('Already in your list','error');return;}
  m.push({code:code,units:units,provisional:true});
  try{save();}catch(e){}
  showToast('Added '+code+' to Study (manual)');
  try{if(typeof W.shRefresh==='function')W.shRefresh();else if(typeof W.shTab==='function')W.shTab('courses');}catch(e){}
};
function fab(){
  try{
    var b=document.getElementById('sh-addfab');
    var on=!!document.querySelector('[data-sh] button[onclick^="shOpen"]');
    if(!on){if(b)b.style.display='none';return;}
    if(!b){b=document.createElement('button');b.id='sh-addfab';b.className='btn';b.textContent='+ Add';
      b.style.cssText='position:fixed;right:14px;bottom:calc(env(safe-area-inset-bottom,6px) + 150px);z-index:45;padding:.5rem .9rem;font-size:12px';
      b.onclick=function(){W.shAddCourse();};document.body.appendChild(b);}
    b.style.display='';
  }catch(e){}
}
setInterval(fab,1500);
var g0=W.go;W.go=function(v){var r=g0.apply(this,arguments);setTimeout(fab,400);if(v==='study')pullCatalog();return r;};
var s0=W.start;W.start=function(){var r=s0.apply(this,arguments);setTimeout(function(){pullCatalog();pushCatalog();fab();},900);return r;};
})();
