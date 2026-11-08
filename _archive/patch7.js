const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
const rep=(name,a,b)=>{
  const c=s.split(a).length-1;
  if(c!==1)throw new Error(name+': expected 1, found '+c);
  s=s.replace(a,()=>b);console.log('patched',name);
};
rep('recovery flag',"const sb=supabase.createClient(SB_URL,SB_KEY);",
"const RECOVERY=/type=recovery/.test(location.hash);\nconst sb=supabase.createClient(SB_URL,SB_KEY);");
rep('session start',
"sb.auth.getSession().then(({data})=>data.session?boot(data.session.user):authUI('login'));",
"sb.auth.getSession().then(({data})=>data.session?(RECOVERY?resetUI(data.session.user):boot(data.session.user)):authUI('login'));");
rep('forgot link',
'onclick="doLogin()">Enter Campus Portal</button>',
'onclick="doLogin()">Enter Campus Portal</button><button class="text-xs text-slate-500 w-full hover:underline pt-3" onclick="forgotUI()">Forgot password?</button>');
const add=String.raw`<script>
let resetUser=null;
function authCard(title,sub,body,msg,bad){
  $('app').classList.add('hidden');
  $('auth').innerHTML='<div class="min-h-screen grid place-items-center p-5" style="background:#021812"><div class="card p-8 w-full max-w-md space-y-4 dark:bg-slate-900"><div class="text-center space-y-2"><h1 class="text-2xl font-extrabold">'+title+'</h1><p class="text-xs text-slate-500">'+sub+'</p></div>'+body+(msg?'<p class="text-xs text-center font-semibold py-2 px-3 rounded-lg '+(bad?'text-rose-500 bg-rose-500/10':'text-emerald-600 bg-emerald-500/10')+'">'+esc(msg)+'</p>':'')+'</div></div>';
}
function forgotUI(msg,bad){
  authCard('Reset Password','Enter your account email and we will send you a reset link.',
  '<div class="space-y-3"><input id="f-email" type="email" class="inp" placeholder="Email address"><button class="btn w-full py-3" onclick="doForgot()">Send Reset Link</button><button class="text-xs text-slate-500 w-full hover:underline" onclick="authUI(\'login\')">Back to login</button></div>',msg,bad);
}
async function doForgot(){
  const em=$('f-email').value.trim().toLowerCase();
  if(!em)return forgotUI('Enter your email.',true);
  const{error}=await sb.auth.resetPasswordForEmail(em,{redirectTo:location.origin+location.pathname});
  if(error)return forgotUI(error.message,true);
  forgotUI('If that email has an account, a reset link is on its way. Check your inbox and spam folder.',false);
}
function resetUI(user,msg,bad){
  resetUser=user||resetUser;
  authCard('Set New Password','Choose a new password for your account.',
  '<div class="space-y-3"><input id="r-pass" type="password" class="inp" placeholder="New password (6+ characters)"><input id="r-pass2" type="password" class="inp" placeholder="Confirm new password"><button class="btn w-full py-3" onclick="doReset()">Save Password</button></div>',msg,bad);
}
async function doReset(){
  const a=$('r-pass').value,b=$('r-pass2').value;
  if(a.length<6)return resetUI(null,'Password must be 6+ characters.',true);
  if(a!==b)return resetUI(null,'Passwords do not match.',true);
  const{error}=await sb.auth.updateUser({password:a});
  if(error)return resetUI(null,error.message,true);
  history.replaceState(null,'',location.pathname);
  boot(resetUser);
}
</script>
</body>`;
rep('reset screens','</body>',add);
fs.writeFileSync('index.html',s);
console.log('RESET PATCH OK');
