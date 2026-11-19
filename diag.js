(function(){
  var W=window;
  if(!(W.Capacitor&&W.Capacitor.isNativePlatform&&W.Capacitor.isNativePlatform()))return;
  var m=/Chrome\/(\d+)/.exec(navigator.userAgent);
  setTimeout(function(){
    var miss=[];
    if(typeof supabase==='undefined')miss.push('supabase');
    if(!W.tailwind)miss.push('tailwind');
    var c=document.createElement('div');
    c.style.cssText='position:fixed;top:0;left:0;z-index:2147483647;background:#000;color:#0f0;font:10px monospace;padding:2px 6px;opacity:.9';
    c.textContent='WebView '+(m?m[1]:'?')+(miss.length?' MISSING '+miss.join(','):' libs ok');
    document.body.appendChild(c);
  },3000);
})();
