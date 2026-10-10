const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
const cut=(name,a,b,n)=>{
  const c=s.split(a).length-1;
  if(c!==n)throw new Error(name+': expected '+n+' start markers, found '+c);
  const i=s.indexOf(a),j=s.indexOf(b,i+a.length);
  if(j<0)throw new Error(name+': end marker not found');
  s=s.slice(0,i)+s.slice(j);
  console.log('removed',name,(j-i)+' chars');
};
cut('theme v1',"function applyTheme(){document.documentElement.classList.toggle('dark',isDark);}","// state",1);
cut('authUI v1',"function authUI(mode,msg=''){","async function doSignup(){",1);
cut('onboard v1',"function authOnboard(){","sb.auth.getSession()",2);
cut('toast v1',"function showToast(msg,type='success'){","// SVG ICONS",1);
cut('settings v13',"function openInfoSheet(){","function openSupport(){",2);
cut('policy+faq v13',"function openPolicy(){","// ===== CYBER GREEN THEME (v13 add-on) =====",2);
cut('css v1',"// ===== CYBER GREEN THEME (v13 add-on) =====","// ===== SETTINGS v2 + SILVER/CYBER THEME =====",1);
for(const n of ['authUI','authOnboard','doOnboard','showToast','openFaq','openPolicy','openInfoSheet','openEditSheet','saveEditSheet','openNotifSheet','applyTheme','toggleTheme']){
  const c=(s.match(new RegExp('function '+n+'\\(','g'))||[]).length;
  if(c!==1)throw new Error(n+' defined '+c+' times');
}
const calls=(s.match(/^applyTheme\(\);$/gm)||[]).length;
if(calls!==1)throw new Error('applyTheme() calls: '+calls);
fs.writeFileSync('index.html',s);
console.log('PATCH OK');
