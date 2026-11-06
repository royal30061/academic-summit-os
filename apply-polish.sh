#!/bin/sh
# Academic Summit - home cleanup + smooth screen transitions.
# Run from INSIDE your repo folder (cd ~/gpa-app). Safe to run twice. Pushes nothing.
fail() { echo "STOP: $1"; exit 1; }
[ -f index.html ] && [ -f ship.sh ] || fail "run this inside your repo folder (cd ~/gpa-app)"
for f in homeflow.js hfdelegate.js hometune.js smooth.js; do [ -f "$f" ] || fail "$f is not here. Unzip first."; done

# load smooth.js last, right after announce.js
if grep -q 'smooth.js' index.html; then echo "ok  smooth.js tag already there"
else
  grep -q '<script src="announce.js' index.html || fail "announce.js script tag not found in index.html"
  sed -i 's|<script src="announce.js[^"]*"></script>|&\n<script src="smooth.js?v=203"></script>|' index.html
  echo "ok  added smooth.js script tag"
fi

bad=0
for f in homeflow.js hfdelegate.js hometune.js smooth.js; do node --check "$f" || { echo "BAD $f"; bad=1; }; done
n=$(grep -c 'smooth.js' index.html);  [ "$n" = "1" ] || { echo "BAD smooth.js tag count = $n (want 1)"; bad=1; }
g=$(grep -c 'attend-guard.js' index.html); [ "$g" = "1" ] || { echo "BAD attend-guard tag count = $g (want 1)"; bad=1; }
d=$(grep -o 'src="[^"]*"' index.html | sed 's/?.*//' | sort | uniq -d | wc -l); [ "$d" = "0" ] || { echo "BAD duplicate script tags: $d"; bad=1; }
c=$(grep -c '</script></script>' index.html); [ "$c" = "0" ] || { echo "BAD stray closing tags: $c"; bad=1; }
[ "$bad" = "0" ] || fail "a check failed. Do not deploy. Send me a screenshot."
echo; echo "ALL CHECKS PASSED. Now ship:"
echo '  sh ship.sh "Home cleanup, smooth transitions, greeting tap" homeflow.js hfdelegate.js hometune.js smooth.js index.html'
