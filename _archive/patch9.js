const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
const fn=`function detMsg(n){
  const g=Math.round(n*100)/100;
  if(!(g>=0&&g<=5))return '';
  const t=[
    [4.5,'First Class range','Elite performance. Outstanding work: you are operating at the top of the class. Protect this standing and keep the discipline that got you here.'],
    [3.5,'Second Class Upper range','Excellent work. You are in strong territory, and a couple of sharper semesters put First Class within reach. Keep pushing.'],
    [2.4,'Second Class Lower range','Solid effort, and you can do more. Tighten your weakest courses and next semester can move you up a class.'],
    [1.5,'Third Class range','You tried and you put in work. Now it is time to go harder next semester. Start your reading early and begin with your lowest-scoring courses.'],
    [1.0,'Pass range','Warning: this is not over. You still have semesters left to boost this. Set a clear target, protect your attendance and start your academic comeback now.'],
    [0,'Below Pass','Warning: this is serious, but it is recoverable. Meet your course adviser this week, build a recovery plan and make the next semester your comeback.']
  ];
  const x=t.find(function(r){return g>=r[0];});
  const col=g>=3.5?'emerald':g>=1.5?'amber':'rose';
  return '<div class="mt-3 space-y-1"><span class="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-'+col+'-100 dark:bg-'+col+'-950 text-'+col+'-600 dark:text-'+col+'-300">'+x[1]+'</span><p class="text-xs leading-relaxed pt-2" style="color:var(--mut)">'+x[2]+'</p></div>';
}`;
// self-test the message logic before touching the file
const T=new Function(fn+';return detMsg;')();
const chk=(v,w)=>{const o=T(v);if(w===''?o!=='':!o.includes(w))throw new Error('detMsg('+v+') expected '+w);};
chk(4.5,'First Class');chk(4.499,'First Class');chk(4.49,'Second Class Upper');chk(3.5,'Second Class Upper');
chk(2.4,'Second Class Lower');chk(2.39,'Third Class');chk(1.5,'Third Class');chk(1.2,'Pass range');chk(0.5,'Below Pass');
chk(-1,'');chk(6,'');chk(NaN,'');
console.log('message logic OK');
const rep=(name,a,b)=>{
  const c=s.split(a).length-1;
  if(c!==1)throw new Error(name+': expected 1, found '+c);
  s=s.replace(a,()=>b);console.log('patched',name);
};
// drop the QP working line if patch8 was not applied yet
const q='<p class="text-[11px] text-slate-500 font-mono">QP:';
if(s.includes(q)){const i=s.indexOf(q),j=s.indexOf('</p>',i);s=s.slice(0,i)+s.slice(j+4);console.log('removed QP line');}
rep('result message',"r.need.toFixed(2)+'</div></div>'","r.need.toFixed(2)+'</div>'+detMsg(r.need)+'</div>'");
rep('detMsg fn','</body>','<script>\n'+fn+'\n</script>\n</body>');
if(/QP:/.test(s))throw new Error('QP still present');
fs.writeFileSync('index.html',s);
console.log('DETECTIVE MESSAGES OK');
