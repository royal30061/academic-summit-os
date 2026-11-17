const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
const rep=(name,a,b)=>{
  const c=s.split(a).length-1;
  if(c!==1)throw new Error(name+': expected 1 match, found '+c);
  s=s.replace(a,()=>b);
  console.log('patched',name);
};
rep('save',
"const save=()=>{try{localStorage.setItem('as_v8',JSON.stringify(DB));}catch(e){showToast('Failed to save','error');}};",
`let cloudReady=false,syncT=null;
async function syncNow(){
  clearTimeout(syncT);syncT=null;
  if(!cloudReady||!uid||!U)return;
  const{error}=await sb.from('user_data').upsert({id:uid,data:U,updated_at:new Date().toISOString()});
  if(error)console.warn('sync failed',error.message);
}
const save=()=>{
  try{if(U)U.updatedAt=Date.now();localStorage.setItem('as_v8',JSON.stringify(DB));}
  catch(e){showToast('Failed to save','error');}
  if(cloudReady){clearTimeout(syncT);syncT=setTimeout(syncNow,1500);}
};
if(document.addEventListener)document.addEventListener('visibilitychange',function(){if(document.visibilityState==='hidden')syncNow();});`);
rep('boot',
"U=DB.users[email]||(DB.users[email]=newUser(user.user_metadata?.name||email,role));",
`U=DB.users[email]||(DB.users[email]=newUser(user.user_metadata?.name||email,role));
  cloudReady=false;
  try{
    const{data:row,error:ce}=await sb.from('user_data').select('data').eq('id',uid).maybeSingle();
    if(ce)throw ce;
    if(row&&row.data&&(row.data.updatedAt||0)>(U.updatedAt||0)){DB.users[email]=row.data;U=row.data;}
    cloudReady=true;
  }catch(e){showToast('Cloud sync unavailable - working offline','error');}`);
rep('logout',
"async function logout(){await sb.auth.signOut();location.reload();}",
"async function logout(){await syncNow();await sb.auth.signOut();location.reload();}");
fs.writeFileSync('index.html',s);
console.log('SYNC PATCH OK');
