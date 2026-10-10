const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
const a='<meta charset="utf-8">';
if(s.split(a).length!==2)throw new Error('marker');
const add=a+`
<script>
if(window.addEventListener){
  var dbg=function(m){if(document.getElementById('dbg'))return;var d=document.createElement('pre');d.id='dbg';d.style.cssText='position:fixed;z-index:99999;top:0;left:0;right:0;background:#7f1d1d;color:#fff;font:12px monospace;padding:10px;white-space:pre-wrap;margin:0';d.textContent='ERROR: '+m;document.documentElement.appendChild(d);};
  window.addEventListener('error',function(e){dbg(e.message+' (line '+e.lineno+')');});
  window.addEventListener('unhandledrejection',function(e){dbg(String((e.reason&&e.reason.message)||e.reason));});
}
</script>`;
s=s.replace(a,()=>add);
fs.writeFileSync('index.html',s);
console.log('DEBUG BANNER OK');
