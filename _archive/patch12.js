const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
if(s.includes('id="silver"'))throw new Error('already applied');
const css=String.raw`
:root:not(.dark){--bg:#e6eaee;--card:#fafbfc;--sub:#eef1f4;--bd:#cdd4db;--tx:#0e1217;--mut:#56616b;--sh:0 1px 0 rgba(255,255,255,.95) inset,0 12px 26px -16px rgba(12,18,26,.45)}
:root:not(.dark) body{background:linear-gradient(180deg,#d9dfe5 0%,#eef1f4 38%,#e2e7ec 100%) fixed}
:root:not(.dark) .card{background:linear-gradient(180deg,#ffffff,#f0f3f6);border-color:#cdd4db}
:root:not(.dark) .bg-slate-50{background-color:#e9edf1!important}
:root:not(.dark) .inp{background:#ffffff;border-color:#c3ccd4;box-shadow:inset 0 1px 2px rgba(12,18,26,.07)}
:root:not(.dark) .btn2{background:linear-gradient(180deg,#f8fafb,#dde3e8)!important;color:#1b2530!important;border:1px solid #c3ccd4;box-shadow:0 1px 0 rgba(255,255,255,.9) inset}
:root:not(.dark) .btn2.\!text-rose-500{color:#e11d48!important}
:root:not(.dark) .btn{box-shadow:0 1px 0 rgba(255,255,255,.35) inset,0 8px 16px -8px rgba(5,150,105,.6)}
:root:not(.dark) #top{background:linear-gradient(180deg,#171c22,#06080b)!important;border-bottom:1px solid #2a323a!important;color:#eef2f6}
:root:not(.dark) #top .text-slate-500,:root:not(.dark) #top .text-slate-400{color:#98a3af!important}
:root:not(.dark) #top .text-sm.font-extrabold{background:linear-gradient(180deg,#ffffff 0%,#d3dae0 45%,#8f9aa6 52%,#eef2f5 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;font-size:1.05rem;letter-spacing:.01em}
:root:not(.dark) #top button{border-color:#313a43!important}
:root:not(.dark) #top button:first-child{background:#1c2229!important;color:#e6ebf0}
:root:not(.dark) #side{background:linear-gradient(180deg,#12161b,#040506)!important}
:root:not(.dark) #bnav{background:linear-gradient(180deg,#171c22,#06080b)!important;border-top:1px solid #2a323a!important}
:root:not(.dark) #bnav .bn{color:#9ca7b2!important}
:root:not(.dark) #bnav .bn[class*="text-violet"]{color:#34d399!important}
`;
if((css.match(/\{/g)||[]).length!==(css.match(/\}/g)||[]).length)throw new Error('CSS braces unbalanced');
const rep=(name,a,b)=>{
  const c=s.split(a).length-1;
  if(c!==1)throw new Error(name+': expected 1, found '+c);
  s=s.replace(a,()=>b);console.log('patched',name);
};
rep('tailwind dark mode','<script src="https://cdn.tailwindcss.com"></script>',
'<script src="https://cdn.tailwindcss.com"></script>\n<script>if(window.tailwind)tailwind.config={darkMode:\'class\'};</script>');
rep('silver theme','</head>','<style id="silver">'+css+'</style>\n</head>');
fs.writeFileSync('index.html',s);
console.log('SILVER THEME OK');
