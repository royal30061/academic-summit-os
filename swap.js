const fs=require('fs');
const [,,a0,b0,file]=process.argv;
if(!a0||!b0||!file){console.log('usage: node swap.js "start anchor" "end anchor" newfile');process.exit(1);}
const h=fs.readFileSync('index.html','utf8');
const nf=fs.readFileSync(file,'utf8').trim();
const cnt=(s,x)=>s.split(x).length-1;
if(cnt(h,a0)!==1||cnt(h,b0)!==1){console.log('anchor not found exactly once:',cnt(h,a0),cnt(h,b0));process.exit(1);}
const a=h.indexOf(a0),b=h.indexOf(b0);
if(b<a){console.log('end anchor is before start');process.exit(1);}
const out=h.slice(0,a)+nf+'\n\n'+h.slice(b);
const chk=t=>{const s=[...t.matchAll(/<script>([\s\S]*?)<\/script>/g)];let bad=0;s.forEach((m,i)=>{try{new Function(m[1])}catch(e){bad++;console.log('BAD',i,e.message)}});return{n:s.length,bad};};
const before=chk(h),after=chk(out);
console.log('blocks',before.n,'->',after.n,'| bad',after.bad,'| size',h.length,'->',out.length);
if(after.bad||after.n!==before.n||out.length<h.length*0.9||out.length>h.length*1.2){console.log('NOT written');process.exit(1);}
fs.copyFileSync('index.html','index.before-swap.html');
fs.writeFileSync('index.html',out);console.log('written OK');
