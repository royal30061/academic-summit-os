const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
const rep=(n,a,b)=>{const c=s.split(a).length-1;if(c!==1)throw new Error(n+': expected 1, found '+c);s=s.replace(a,()=>b);console.log('patched',n);};
rep('lec flag',"const LEC_LINK=location.hash==='#lecturer';","const LEC_LINK=location.hash==='#lecturer'||/[?&]lecturer=1/.test(location.search);");
rep('signup redirect',"options:{data:{name}}","options:{data:{name},emailRedirectTo:location.origin+location.pathname+(LEC_LINK?'?lecturer=1':'')}");
fs.writeFileSync('index.html',s);
console.log('LECTURER REDIRECT OK');
