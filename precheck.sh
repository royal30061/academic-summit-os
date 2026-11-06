#!/data/data/com.termux/files/usr/bin/sh
cd ~/gpa-app || exit 1
fail=0
for f in *.js; do node --check "$f" >/dev/null 2>&1 || { echo "SYNTAX FAIL: $f"; fail=1; }; done
node -e '
const fs=require("fs");
const html=fs.readFileSync("index.html","utf8");
const blocks=[...html.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/gi)];
blocks.forEach((m,i)=>{ try{ new Function(m[1]); }catch(e){ console.log("INDEX INLINE BLOCK #"+i+" FAIL: "+e.message); process.exitCode=1; } });
console.log("inline blocks checked: "+blocks.length);
' || fail=1
[ "$fail" = 0 ] && echo "ALL CLEAN - safe to commit"
