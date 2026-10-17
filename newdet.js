async function runDet(){
  const g1=parseFloat($('d1').value),cg=parseFloat($('dc').value);
  const u1=parseFloat($('du1').value)||20,u2=parseFloat($('du2').value)||20;
  if(isNaN(g1)||isNaN(cg))return showToast('Enter both GPA values','error');
  $('d-res').innerHTML='<p class="text-xs text-slate-400 py-3 text-center">Detective analyzing trajectory...</p>';
  const{data,error}=await sb.rpc('detect_second_sem',{p_g1:g1,p_u1:u1,p_cg:cg,p_u2:u2});
  if(error||!data){$('d-res').innerHTML='';return showToast(error?error.message:'Connection error','error');}
  const col={good:'#10b981',mid:'#f59e0b',hard:'#f43f5e'}[data.mood]||'#10b981';
  let h='<div class="space-y-3 mt-3">';
  h+='<div class="p-5 rounded-2xl text-center space-y-1 shadow-sm" style="background:var(--sub);border-left:4px solid '+col+'"><div class="lbl">Predicted 2nd Semester Target</div><div class="text-4xl font-extrabold tracking-tight" style="color:'+col+'">'+(data.ok?Number(data.need).toFixed(2):'-')+'</div><div class="font-extrabold text-sm">'+esc(data.title)+'</div></div>';
  h+='<div class="p-4 rounded-2xl text-xs leading-relaxed shadow-sm" style="background:var(--sub)">'+esc(data.message)+'</div>';
  if(data.scenarios){
    h+='<div class="p-4 rounded-2xl space-y-2 shadow-sm" style="background:var(--sub)"><div class="lbl">Plausible Scenarios</div>';
    data.scenarios.forEach(s=>{
      h+='<div class="flex justify-between items-center text-xs py-1.5 border-b border-slate-200/40"><b>'+esc(s.type)+'</b><span class="text-slate-500 text-right max-w-[60%]">'+esc(s.desc)+'</span></div>';
    });
    h+='</div>';
  }
  h+='<details class="p-4 rounded-2xl text-xs shadow-sm" style="background:var(--sub)"><summary class="font-bold cursor-pointer text-violet-600 dark:text-violet-400">How is this calculated?</summary><p class="pt-2 leading-relaxed" style="color:var(--mut)">'+esc(data.how)+'</p></details></div>';
  $('d-res').innerHTML=h;
}
