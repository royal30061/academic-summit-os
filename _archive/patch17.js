const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
if(s.includes('id="darkfix"'))throw new Error('already applied');
const css=String.raw`
html.dark{--bg:#02120c;--card:#07271d;--sub:#0b3527;--bd:#0d3f2e;--tx:#e7fff5;--mut:#8fb8a9;--sh:0 10px 30px -12px rgba(0,0,0,.6)}
html.dark body{background:#02120c;color:#e7fff5}
html.dark #main{color:#e7fff5}
html.dark .card{background:#07271d;border-color:#0d3f2e}
html.dark .donut>div{background:#07271d;color:#e7fff5}
html.dark .inp{background:#0b3527;color:#e7fff5;border-color:#0d3f2e}
html.dark #top{color:#e7fff5}
html.dark #top button{color:#e7fff5}
html.dark #top .text-sm.font-extrabold{background:none;color:#ffffff;-webkit-text-fill-color:#ffffff}
`;
if((css.match(/\{/g)||[]).length!==(css.match(/\}/g)||[]).length)throw new Error('braces');
if(s.split('</head>').length!==2)throw new Error('head marker');
s=s.replace('</head>',()=>'<style id="darkfix">'+css+'</style>\n</head>');
fs.writeFileSync('index.html',s);
console.log('DARK FIX OK');
