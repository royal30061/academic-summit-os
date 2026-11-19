(function(){
  if(window.__asErrCatch)return;window.__asErrCatch='1';
  var errs=[];window.__asErrs=errs;
  function push(kind,msg,src,line){
    errs.push({k:kind,m:msg,s:src,l:line,t:new Date().toLocaleTimeString()});
    if(errs.length>8)errs.shift();
    render();
  }
  window.addEventListener('error',function(e){
    var t=e.target;
    if(t&&t!==window&&(t.src||t.href)){push('resource','failed to load',t.src||t.href,0);return;}
    push('error',e.message||'unknown',e.filename||'',e.lineno||0);
  },true);
  window.addEventListener('unhandledrejection',function(e){var r=e.reason;push('promise',(r&&r.message)?r.message:String(r),'',0);},true);
  var badge=null,sheet=null;
  function css(){var s=document.createElement('style');s.textContent='#asErrBadge{position:fixed;left:10px;bottom:76px;z-index:99999;background:#7F1D1D;color:#FEE2E2;border:1px solid #FCA5A5;border-radius:999px;padding:6px 12px;font:700 12px/1 monospace;box-shadow:0 4px 14px rgba(0,0,0,.4);cursor:pointer}#asErrSheet{position:fixed;inset:auto 8px 76px 8px;z-index:99999;background:#111827;color:#E5E7EB;border:1px solid #374151;border-radius:14px;padding:12px;font:12px/1.5 monospace;max-height:45vh;overflow:auto;-webkit-overflow-scrolling:touch}#asErrSheet b{color:#FCA5A5}#asErrSheet div{margin:6px 0;word-break:break-all}';document.head.appendChild(s);}
  function render(){
    if(!errs.length)return;
    var dbg=false;try{dbg=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform())||/[?&]debug=1/.test(location.search)||localStorage.getItem('as_debug')==='1';}catch(e){}
    if(!dbg)return;
    if(!badge){css();badge=document.createElement('button');badge.id='asErrBadge';document.body.appendChild(badge);badge.addEventListener('click',toggle);}
    badge.textContent='\u26A0 '+errs.length+' error'+(errs.length>1?'s':'')+' \u2014 tap';
  }
  function toggle(){
    if(sheet){sheet.remove();sheet=null;return;}
    sheet=document.createElement('div');sheet.id='asErrSheet';
    sheet.innerHTML='<div><b>build</b> '+(((window.__AS_BUILD__||{}).ref)||'dev')+' '+String((window.__AS_BUILD__||{}).sha||'').slice(0,7)+'</div>'+errs.map(function(e){return '<div><b>'+e.k+' @'+e.t+'</b> '+esc(e.m)+(e.s?' <i>'+short(e.s)+':'+e.l+'</i>':'')+'</div>';}).join('');
    document.body.appendChild(sheet);
  }
  function esc(s){return String(s).replace(/[&<>]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;'}[c];});}
  function short(s){var p=s.split('/');return p.slice(-2).join('/');}
})();
