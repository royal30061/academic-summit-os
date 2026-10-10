const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
const fn=String.raw`function parseReg(t){
  const L=String(t).split('\n').map(function(x){return x.trim();}).filter(Boolean);
  const out=[[],[]];let sem=0;
  const full=/^(?:\d{1,2} )?((?:UA-)?[A-Z]{2,4}\d{3}[A-Z]?) .*?\b([1-6]) ([CE])$/i;
  const lone=/^(?:\d{1,2} )?((?:UA-)?[A-Z]{2,4}\d{3}[A-Z]?)$/i;
  const add=function(code,u,st){
    const c=code.toUpperCase().replace(/^UA-/,'');
    if(!out[sem].some(function(r){return r.code===c;}))out[sem].push({code:c,unit:+u,st:st.toUpperCase()});
  };
  for(let i=0;i<L.length;i++){
    const ln=L[i].replace(/\s+/g,' ');
    if(/^total/i.test(ln)){if(out[sem].length&&sem<1)sem=1;continue;}
    let m=ln.match(full);
    if(m){add(m[1],m[2],m[3]);continue;}
    m=ln.match(lone);
    if(m){
      for(let k=1;k<=4;k++){
        if(/^[1-6]$/.test(L[i+k]||'')&&/^[CE]$/i.test(L[i+k+1]||'')){add(m[1],L[i+k],L[i+k+1]);i+=k+1;break;}
      }
    }
  }
  return out;
}
function decCalc(D){
  const a=D[0].reduce(function(x,r){return x+r.unit;},0),b=D[1].reduce(function(x,r){return x+r.unit;},0);
  return{u:[a,b],den:(a&&b)?a+b:2*(a||b)};
}`;
// ---- self-test on real registrations (course codes only) ----
const T=new Function(fn+';return{parseReg:parseReg,decCalc:decCalc};')();
const near=(x,y,m)=>{if(Math.abs(x-y)>1e-9)throw new Error(m+': '+x+' vs '+y);};
const sumA=(D,K)=>[0,1].reduce((t,si)=>t+D[si].reduce((q,r)=>q+5*r.unit/K.den,0),0);
{ // 100 level, tab separated like the portal copy
  const rows=(a)=>a.map((x,i)=>(i+1)+'\t'+x[0]+'\tSome Title\t'+x[1]+'\t'+x[2]).join('\n');
  const t='First Semester\tSecond Semester\n'+rows([['GST111',2,'C'],['HIS101',2,'C'],['POS101',3,'C'],['POS103',3,'C'],['POS105',2,'C'],['POS107',2,'C'],['POS111',2,'C'],['POS113',2,'C'],['UA-GNS104',2,'C']])+'\nTotal:\n20\n'+rows([['GST112',2,'C'],['HIS102',3,'C'],['POL108',2,'E'],['POS102',3,'C'],['POS106',2,'C'],['POS108',2,'C'],['POS110',2,'C'],['POS112',2,'C'],['UA-GNS122',2,'C']])+'\nTotal:\n20';
  const D=T.parseReg(t),K=T.decCalc(D);
  if(D[0].length!==9||D[1].length!==9)throw new Error('100L parse counts '+D[0].length+'/'+D[1].length);
  if(K.u[0]!==20||K.u[1]!==20||K.den!==40)throw new Error('100L units');
  near(sumA(D,K),5,'100L all-A sum');
}
{ // 200 level, one line per course
  const mk=(a)=>a.map((x,i)=>(i+1)+' '+x[0]+' Some Title '+x[1]+' C').join('\n');
  const t=mk(['CSC200','ENT211','FSS201','POS201','POS203','POS205','POS207','POS209','POS211','POS213','POS215','UA-GNS201','UA-GNS211P'].map(c=>[c,2]))+'\nTotal: 26\n'+mk([['FSS202',2],['GST212',2],['HIS204',3],['POL108',2],['POS202',2],['POS204',2],['POS206',2],['POS208',2],['POS210',2],['UA-CES222',2],['UA-GNS212P',2]])+'\nTotal: 23';
  const D=T.parseReg(t),K=T.decCalc(D);
  if(D[0].length!==13||D[1].length!==11)throw new Error('200L parse counts '+D[0].length+'/'+D[1].length);
  if(K.u[0]!==26||K.u[1]!==23||K.den!==49)throw new Error('200L units');
  near(sumA(D,K),5,'200L all-A sum');
}
{ // one field per line
  const D=T.parseReg(['1','GST111','Communication in English','2','C','2','POS101','Intro','3','C','Total:','5'].join('\n')),K=T.decCalc(D);
  if(D[0].length!==2||K.den!==10)throw new Error('field-per-line parse');
  near(D[0].reduce((q,r)=>q+5*r.unit/K.den,0),2.5,'one-semester all-A = 2.5');
}
console.log('parser self-test OK');
// ---- apply ----
const cut=(a,b)=>{
  if(s.split(a).length!==2||s.split(b).length!==2)throw new Error('markers: '+a.trim()+' / '+b.trim());
  const i=s.indexOf(a),j=s.indexOf(b);
  if(j<i)throw new Error('marker order');
  s=s.slice(0,i)+s.slice(j);console.log('removed old Menu of Decimals');
};
cut('\ndec(){','\nrec(){');
const ui=String.raw`ACAD.dec=function(){
  const D=U.dec=U.dec||[[],[]],K=decCalc(D);
  const G=[['A',5],['B',4],['C',3],['D',2],['E',1],['F',0]];
  const fx=function(v){return v.toFixed(3);};
  const tbl=function(si,name){
    const R=D[si];
    if(!R.length)return '<div class="text-xs text-slate-400 p-4 rounded-2xl border border-dashed text-center" style="border-color:var(--bd)">No courses added for '+name+' yet.</div>';
    const head='<tr><th class="p-2 font-sans font-extrabold">Course</th>'+G.map(function(g){return '<th class="p-2 text-center font-extrabold">'+g[0]+'</th>';}).join('')+'<th></th></tr>';
    const rows=R.map(function(r,i){
      return '<tr class="border-t" style="border-color:var(--bd)"><td class="p-2 font-sans"><b class="font-mono">'+esc(r.code)+'</b><div class="text-[10px] text-slate-400">'+r.unit+'u '+(r.st==='E'?'Elective':'Compulsory')+'</div></td>'+G.map(function(g){return '<td class="p-2 text-center '+(g[0]==='A'?'font-extrabold text-emerald-600 dark:text-emerald-400':'')+'">'+fx(K.den?g[1]*r.unit/K.den:0)+'</td>';}).join('')+'<td class="p-2"><button class="text-slate-400" onclick="decDel('+si+','+i+')">'+ic('x','w-3 h-3')+'</button></td></tr>';
    }).join('');
    const tot='<tr class="border-t-2 font-extrabold" style="border-color:var(--bd)"><td class="p-2 font-sans">Total</td>'+G.map(function(g){return '<td class="p-2 text-center">'+fx(K.den?g[1]*K.u[si]/K.den:0)+'</td>';}).join('')+'<td></td></tr>';
    return '<div class="space-y-2"><div class="flex justify-between text-xs"><b>'+name+'</b><span class="text-slate-400">'+K.u[si]+' units</span></div><div class="overflow-x-auto"><table class="w-full text-[11px] text-left font-mono"><thead class="text-slate-400">'+head+'</thead><tbody>'+rows+tot+'</tbody></table></div></div>';
  };
  const note=(K.u[0]&&K.u[1])?'Both semesters added. If you score A in every course, the two semesters add up to 5.000.':(K.u[0]||K.u[1])?'One semester added. A semester is worth half of the session, so an all-A semester adds up to 2.500. Add your other semester to complete it.':'Paste your course registration above to begin.';
  $('sub').innerHTML='<div class="space-y-5"><div class="card p-6 space-y-4"><div><div class="font-extrabold">Menu of Decimals</div><p class="text-xs text-slate-500 mt-1">See exactly what every grade is worth in each of your courses. Each number is how much that grade adds to your CGPA.</p></div><textarea id="d-paste" rows="4" class="inp font-mono text-xs" placeholder="Paste your course registration page text here..."></textarea><div class="flex gap-2 items-center"><select id="d-tgt" class="inp" style="width:auto"><option value="1">If one semester: First</option><option value="2">If one semester: Second</option></select><button class="btn flex-1" onclick="decParse()">Read Registration</button></div><div class="grid grid-cols-12 gap-2 pt-3 border-t" style="border-color:var(--bd)"><input id="d-code" class="inp col-span-5 uppercase font-mono" placeholder="Code"><input id="d-unit" type="number" class="inp col-span-3" placeholder="Units"><select id="d-s" class="inp col-span-4"><option value="1">1st Sem</option><option value="2">2nd Sem</option></select></div><button class="btn2 w-full" onclick="decAdd()">Add Course Manually</button></div><div class="card p-6 space-y-5">'+tbl(0,'First Semester')+tbl(1,'Second Semester')+'<p class="text-xs text-slate-500">'+note+'</p>'+((D[0].length||D[1].length)?'<button class="text-xs font-bold text-rose-500" onclick="decClear()">Clear all courses</button>':'')+'</div></div>';
};
function decParse(){
  const t=$('d-paste').value;
  if(!t.trim())return showToast('Paste your course registration first','error');
  const r=parseReg(t);
  if(!r[0].length&&!r[1].length)return showToast('No courses found in that text','error');
  U.dec=U.dec||[[],[]];
  if(r[0].length&&r[1].length)U.dec=r;
  else U.dec[$('d-tgt').value==='2'?1:0]=r[0].length?r[0]:r[1];
  save();go('acad');showToast('Registration loaded: '+(U.dec[0].length+U.dec[1].length)+' courses');
}
function decAdd(){
  const code=$('d-code').value.trim().toUpperCase().replace(/^UA-/,'').replace(/\s/g,''),unit=parseFloat($('d-unit').value),si=$('d-s').value==='2'?1:0;
  if(!/^[A-Z]{2,4}\d{3}[A-Z]?$/.test(code)||!(unit>0&&unit<=6))return showToast('Enter a course code and units (1-6)','error');
  U.dec=U.dec||[[],[]];U.dec[si].push({code:code,unit:unit,st:'C'});
  save();go('acad');
}
function decDel(si,i){U.dec[si].splice(i,1);save();go('acad');}
function decClear(){if(!confirm('Clear all courses from this tab?'))return;U.dec=[[],[]];save();go('acad');}`;
if(s.split('</body>').length!==2)throw new Error('body marker');
s=s.replace('</body>',()=>'<script>\n'+fn+'\n'+ui+'\n</script>\n</body>');
fs.writeFileSync('index.html',s);
console.log('DECIMALS PATCH OK');
