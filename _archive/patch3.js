const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
const E='[\\u{1F000}-\\u{1FAFF}\\u2300-\\u23FF\\u2600-\\u27BF\\u2B50\\u2B55\\uFE0F\\u200D]';
const rep=(name,a,b,n=1)=>{
  const c=s.split(a).length-1;
  if(c!==n)throw new Error(name+': expected '+n+', found '+c);
  s=s.split(a).join(b);console.log('patched',name);
};
const re=(name,pat,to,n=1)=>{
  const r=new RegExp(pat,'gu');
  const c=(s.match(r)||[]).length;
  if(c!==n)throw new Error(name+': expected '+n+', found '+c);
  s=s.replace(r,()=>to);console.log('patched',name);
};
// 1. welcome screen
{
  const a="if(mode==='welcome'){";
  if(s.split(a).length!==2)throw new Error('welcome: start marker');
  const i=s.indexOf(a),j=s.indexOf("const f={",i);
  if(j<0)throw new Error('welcome: end marker');
  const NEW=String.raw`if(mode==='welcome'){
    $('auth').innerHTML='<div class="min-h-screen flex flex-col px-6 pt-10" style="background:#021812;padding-bottom:max(1.5rem,env(safe-area-inset-bottom))"><div class="flex-1 flex flex-col justify-center max-w-md w-full mx-auto space-y-4"><div class="w-12 h-1 rounded-full" style="background:#10b981"></div><h1 class="text-4xl font-extrabold text-white leading-tight">Welcome to Academic Summit</h1><p class="text-base" style="color:#a7f3d0">Your one companion for your academic journey.</p></div><div class="max-w-md w-full mx-auto flex justify-end"><button class="btn px-8 py-3" onclick="localStorage.setItem(\'as_welcomed\',\'1\');authUI(\'login\')">Continue</button></div></div>';
    $('app').classList.add('hidden');return;
  }
  `;
  s=s.slice(0,i)+NEW+s.slice(j);
  console.log('patched welcome');
}
// 2. hide the ? button on auth screens
rep('fab css','@media print{aside,nav,header','#app.hidden~#tour-fab{display:none}\n@media print{aside,nav,header');
rep('fab id',"fb.textContent='?';fb.onclick=startTour;","fb.id='tour-fab';fb.textContent='?';fb.onclick=startTour;");
// 3. notifications: icons instead of emojis (and fix the filter)
[['Exam reminder','plan'],['Task due soon','clock'],['Fee alert','fin'],['Milestone achieved','goal'],['Academic insight','acad']]
 .forEach(([l,k])=>re('note '+l,"\\['"+E+"+','"+l+"'","['"+k+"','"+l+"'"));
rep('note render',`<span class="text-lg">'+n[0]+'</span>`,`<span class="text-emerald-600 dark:text-emerald-400 mt-0.5" data-k="'+n[0]+'">'+ic(n[0],'w-5 h-5')+'</span>`);
re('pref map',String.raw`const map=\{[^}]*\};`,"const map={'plan':'exam','clock':'tasks','fin':'fees','goal':'goals'};");
rep('pref filter',
String.raw`const re=new RegExp('<div class="flex gap-3 text-xs"><span class="text-lg">'+e+'[\\s\\S]*?</div></div>','g');`,
String.raw`const re=new RegExp('<div class="flex gap-3 text-xs"><span class="[^"]*" data-k="'+e+'"[\\s\\S]*?</div></div></div>','g');`);
// 4. logo, greeting, toasts
re('logo','font-extrabold text-xl">'+E+'</div>','font-extrabold text-sm">AS</div>');
re('greeting',"\\+' "+E+"</h1>","+'</h1>");
re('toast',String.raw`t\.innerHTML=\(type==='error'\?'[^']*':'[^']*'\)\+esc\(msg\);`,'t.innerHTML=esc(msg);');
// 5. sweep anything left
const left=(s.match(new RegExp(E,'gu'))||[]).length;
s=s.replace(new RegExp(E+'+ ?','gu'),'');
if(new RegExp(E,'u').test(s))throw new Error('emoji still present');
console.log('swept',left,'leftover emoji characters');
fs.writeFileSync('index.html',s);
console.log('UI PATCH OK');
