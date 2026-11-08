const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
const rep=(n,a,b)=>{const c=s.split(a).length-1;if(c!==1)throw new Error(n+': expected 1, found '+c);s=s.replace(a,()=>b);console.log('patched',n);};
if(s.includes('id="lecfix"'))throw new Error('already applied');
if(!s.includes("fb.id='tour-fab'"))throw new Error('tour-fab id missing: an earlier patch (patch3) is not in this file');
rep('lecturer nav',
"const LECTURER_NAV=[['home','Attendance Hub','att'],['roster','Student Rosters','prof'],['prof','Account Settings','prof']];",
"const LECTURER_NAV=[['home','Attendance Hub','att'],['plan','Calendar','plan'],['roster','Student Rosters','prof'],['prof','Account Settings','prof']];");
rep('lecturer setup skip',
"if(!U.profile){$('auth').classList.remove('hidden');$('app').classList.add('hidden');return authOnboard();}",
"if(!U.profile&&role==='lecturer'){U.profile={uni:'',level:'',program:'',faculty:'',totalUnits:0,matric:'',phone:'',semail:''};save();}\n  if(!U.profile){$('auth').classList.remove('hidden');$('app').classList.add('hidden');return authOnboard();}");
rep('header label',"esc(U.profile?.program||'Student')","esc(U.profile?.program||(U.role==='lecturer'?'Lecturer':'Student'))");
rep('css','</head>','<style id="lecfix">body[data-role="lecturer"] #tour-fab{display:none!important}</style>\n</head>');
const add=String.raw`<script>
(function(){
  const st0=startTour;
  startTour=function(){if(U&&U.role==='lecturer')return;st0();};
  const s0=start;
  start=function(){s0();try{document.body.dataset.role=(U&&U.role)||'student';}catch(e){}};
  LECTURER_VIEWS.plan=function(){return V.plan();};
  LECTURER_VIEWS.prof=function(){
    const p=U.profile||{};
    return '<div class="space-y-5 max-w-2xl"><div class="card p-6 space-y-3"><div class="font-extrabold">Lecturer Settings</div><div class="space-y-3"><div><label class="lbl block mb-1">Full Name</label><input id="lp-n" class="inp" value="'+esc(U.name)+'"></div><div><label class="lbl block mb-1">Institution</label><input id="lp-u" class="inp" value="'+esc(p.uni||'')+'"></div><div><label class="lbl block mb-1">Department</label><input id="lp-d" class="inp" value="'+esc(p.program||'')+'"></div><div><label class="lbl block mb-1">Email</label><input class="inp" value="'+esc(email)+'" readonly></div></div><button class="btn" onclick="saveLecProfile()">Save Changes</button></div><button class="btn2 w-full !text-rose-500" onclick="logout()">Log Out Console</button></div>';
  };
})();
function saveLecProfile(){
  U.name=$('lp-n').value.trim()||U.name;
  U.profile=U.profile||{};
  U.profile.uni=$('lp-u').value.trim();U.profile.program=$('lp-d').value.trim();
  save();
  sb.from('profiles').update({name:U.name,uni:U.profile.uni,program:U.profile.program}).eq('id',uid).then(function(){});
  start();go('prof');showToast('Profile updated');
}
</script>
</body>`;
rep('lecturer script','</body>',add);
// extend the checker so it also opens the lecturer screens
let c=fs.readFileSync('check.js','utf8');
if(!c.includes('LECTURER SCREENS OK')){
  const LECT=String.raw`
vm.runInContext("U=newUser('Test Lecturer','lecturer');U.profile={uni:'U',level:'',program:'',faculty:'',totalUnits:0,matric:'',phone:'',semail:''};email='l@t.com';start();",ctx);
const o2=[];
['home','plan','roster','prof'].forEach(function(v){try{vm.runInContext("go('"+v+"')",ctx);o2.push('lecturer/'+v+' ok');}catch(e){o2.push('lecturer/'+v+' FAIL '+e.message);}});
console.log(o2.join('\n'));
if(o2.some(function(x){return /FAIL/.test(x);}))process.exit(1);
console.log('LECTURER SCREENS OK');
`;
  if(c.split("console.log('ALL SCREENS OK');").length!==2)throw new Error('check.js marker');
  c=c.replace("console.log('ALL SCREENS OK');",()=>LECT+"console.log('ALL SCREENS OK');");
  fs.writeFileSync('check.js',c);
}
fs.writeFileSync('index.html',s);
console.log('LECTURER PATCH OK');
