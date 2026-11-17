const fs=require('fs'),vm=require('vm');
const h=fs.readFileSync('index.html','utf8');
const sc=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const st=()=>new Proxy(function(){},{get:(t,k)=>k===Symbol.toPrimitive?()=>'':k==='then'?undefined:st(),apply:()=>st(),construct:()=>st(),set:()=>true});
const mem={};
const sbx=new Proxy({},{get:(t,k)=>k==='auth'?{getSession:()=>new Promise(()=>{}),signOut:()=>Promise.resolve()}:st()});
const ctx=vm.createContext({console,setTimeout:()=>0,setInterval:()=>0,clearInterval:()=>{},
 localStorage:{getItem:k=>mem[k]??null,setItem:(k,v)=>{mem[k]=String(v)}},
 location:{hash:''},window:{scrollTo(){},print(){}},
 matchMedia:()=>({matches:false,addEventListener(){}}),
 supabase:{createClient:()=>sbx},
 document:{getElementById:()=>st(),querySelectorAll:()=>[],createElement:()=>st(),documentElement:st(),head:st(),body:st()},
 URL:{createObjectURL:()=>''},Blob:function(){},confirm:()=>true,prompt:()=>''});
try{sc.forEach(c=>vm.runInContext(c,ctx));console.log('LOAD OK');}
catch(e){console.log('LOAD FAIL:',e.message);process.exit(1);}
const test=`
U=newUser('Test User');U.profile={uni:'UniAbuja',level:'200',program:'Political Science',faculty:'Social Sciences',totalUnits:120,matric:''};
U.semesters.push({id:1,name:'S1',courses:[{code:'POS101',unit:3,score:72},{code:'POS102',unit:3,score:55}]});
email='t@t.com';start();
const out=[];
['home','acad','plan','fin','mat','att','goal','car','prof'].forEach(v=>{try{go(v);out.push(v+' ok')}catch(e){out.push(v+' FAIL '+e.message)}});
['calc','det','dec','rec'].forEach(t=>{try{aTab=t;go('acad');out.push('acad/'+t+' ok')}catch(e){out.push('acad/'+t+' FAIL '+e.message)}});
['openInfoSheet','openEditSheet','openNotifSheet','openFaq','openPolicy','openSupport'].forEach(f=>{try{eval(f+'()');out.push(f+' ok')}catch(e){out.push(f+' FAIL '+e.message)}});
['login','signup'].forEach(m=>{try{authUI(m);out.push('authUI/'+m+' ok')}catch(e){out.push('authUI/'+m+' FAIL '+e.message)}});
out.join('\\n')`;
const res=vm.runInContext(test,ctx);
console.log(res);
if(/FAIL/.test(res))process.exit(1);

vm.runInContext("U=newUser('Test Lecturer','lecturer');U.profile={uni:'U',level:'',program:'',faculty:'',totalUnits:0,matric:'',phone:'',semail:''};email='l@t.com';start();",ctx);
const o2=[];
['home','plan','roster','prof'].forEach(function(v){try{vm.runInContext("go('"+v+"')",ctx);o2.push('lecturer/'+v+' ok');}catch(e){o2.push('lecturer/'+v+' FAIL '+e.message);}});
console.log(o2.join('\n'));
if(o2.some(function(x){return /FAIL/.test(x);}))process.exit(1);
console.log('LECTURER SCREENS OK');
console.log('ALL SCREENS OK');
