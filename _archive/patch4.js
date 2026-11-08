const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
const rep=(name,a,b)=>{
  const c=s.split(a).length-1;
  if(c!==1)throw new Error(name+': expected 1, found '+c);
  s=s.replace(a,()=>b);console.log('patched',name);
};
const paths='<path d="M2 54 24 16l12 20 6-9 20 27z" fill="#10b981"/><path d="M26 54 42 27l20 27z" fill="#047857"/><path d="M24 16l6 10-4-2-2 4-4-4-1.5 1.5z" fill="#ecfdf5"/>';
rep('MTN fn','// SVG ICONS (no emojis)',
"function MTN(c){return '<svg class=\"'+(c||'w-10 h-10')+'\" viewBox=\"0 0 64 64\" fill=\"none\" aria-hidden=\"true\">"+paths+"</svg>';}\n// SVG ICONS (no emojis)");
rep('sidebar logo',
'<div class="w-10 h-10 rounded-2xl grad grid place-items-center font-extrabold text-sm">AS</div>',
"<div class=\"w-10 h-10 shrink-0\">'+MTN('w-10 h-10')+'</div>");
rep('welcome',
'<div class="w-12 h-1 rounded-full" style="background:#10b981"></div>',
"'+MTN('w-20 h-20')+'");
rep('side card',
'space-y-1"><b class="text-white block text-sm">',
"space-y-1\"><div class=\"mb-2\">'+MTN('w-12 h-12')+'</div><b class=\"text-white block text-sm\">");
const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">'+paths+'</svg>';
rep('favicon','<title>Academic Summit - Campus Operating System</title>',
'<title>Academic Summit - Campus Operating System</title>\n<link rel="icon" href="data:image/svg+xml,'+encodeURIComponent(svg)+'">');
if((s.match(/function MTN\(/g)||[]).length!==1)throw new Error('MTN count');
fs.writeFileSync('index.html',s);
console.log('MOUNTAIN PATCH OK');
