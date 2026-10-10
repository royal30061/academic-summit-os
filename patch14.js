const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
if(s.split('</body>').length!==2)throw new Error('body marker');
const add=String.raw`<script>
function showRecover(e){
  const msg=String((e&&e.message)||e||'unknown error');
  $('app').classList.add('hidden');
  $('auth').innerHTML='<div class="min-h-screen grid place-items-center p-5" style="background:#021812"><div class="card p-8 w-full max-w-md space-y-4"><h1 class="text-xl font-extrabold text-center">Something went wrong loading your data</h1><p class="text-xs text-slate-500 text-center break-words">'+esc(msg)+'</p><button class="btn w-full py-3" onclick="location.reload()">Reload</button><button class="btn2 w-full" onclick="resetLocal()">Reset local data and reload</button><p class="text-[11px] text-slate-400 text-center">Resetting clears this device only. Your account data stays in the cloud.</p></div></div>';
}
function resetLocal(){
  try{['as_v8','as_theme','as_theme_mode','as_tour','as_welcomed'].forEach(function(k){localStorage.removeItem(k);});}catch(e){}
  location.reload();
}
(function(){
  const orig=boot;
  boot=async function(user){
    try{return await orig(user);}catch(e){console.error(e);showRecover(e);}
  };
})();
</script>
</body>`;
s=s.replace('</body>',()=>add);
fs.writeFileSync('index.html',s);
console.log('RECOVERY PATCH OK');
