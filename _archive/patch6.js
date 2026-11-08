const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
const add=fs.readFileSync('pin.txt','utf8');
const rep=(n,a,b)=>{const c=s.split(a).length-1;if(c!==1)throw new Error(n+': expected 1, found '+c);s=s.replace(a,()=>b);console.log('patched',n);};
rep('signup',"if(LEC_LINK){document.querySelectorAll('#auth button[onclick=\"authUI(\\'signup\\')\"]').forEach(b=>b.style.display='none');}","");
rep('gate',"if(LEC_LINK&&role!=='lecturer'){await sb.auth.signOut();return authUI('login','This link is reserved for lecturers.');}","if(LEC_LINK&&role!=='lecturer'){return pinGate(user);}");
rep('screen','</body>',add+'\n</body>');
fs.writeFileSync('index.html',s);
console.log('LECTURER PATCH OK');
