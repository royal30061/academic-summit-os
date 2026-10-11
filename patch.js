// ===== patch.js: lecturer OTP survives navigation and reload =====
(function(){
const K=()=>'as_live_'+uid;
let tm=null,pl=null;
const rd=()=>{try{return JSON.parse(localStorage.getItem(K()))}catch(e){return null}};
const wr=s=>{try{localStorage.setItem(K(),JSON.stringify(s))}catch(e){}};
function stop(){clearInterval(tm);clearInterval(pl);tm=pl=null;}
function paint(){
  const s=rd();if(!s)return;
  const o=$('otp-display'),t=$('timer-display');
  if(!o||!t)return;
  const left=Math.max(0,Math.round((s.end-Date.now())/1000));
  o.textContent=left?s.code:'EXPIRED';
  t.textContent=left?'Expires in '+left+'s':'Session closed';
  const c=$('sub-count');if(c)c.textContent=(s.count||0)+' Present';
}
async function poll(){
  const s=rd();if(!s)return;
  try{
    const{count}=await sb.from('attendance').select('id',{count:'exact',head:true}).eq('session_id',s.id);
    const n=rd();if(n){n.count=count||0;wr(n);}
  }catch(e){}
  paint();
  if(Date.now()>s.end+5000)stop();
}
function run(){
  stop();paint();poll();
  tm=setInterval(function(){if(!rd())return stop();paint();},1000);
  pl=setInterval(poll,3000);
}
startAttendanceSession=async function(){
  const course=($('lec-course').value.trim()||'POS 204'),topic=$('lec-topic').value.trim();
  const{data,error}=await sb.rpc('start_session',{p_course:course,p_topic:topic});
  if(error)return showToast(error.message,'error');
  const s=data[0];
  wr({id:s.s_id,code:s.s_code,end:new Date(s.s_expires).getTime(),course:course,topic:topic,count:0});
  run();
};
const h0=LECTURER_VIEWS.home;
LECTURER_VIEWS.home=function(){
  const html=h0();
  setTimeout(function(){
    const s=rd();
    if(!s)return;
    if(Date.now()>s.end+600000){localStorage.removeItem(K());return;}
    if($('lec-course'))$('lec-course').value=s.course||$('lec-course').value;
    if($('lec-topic'))$('lec-topic').value=s.topic||'';
    run();
  },0);
  return html;
};
})();
// ===== end patch =====
