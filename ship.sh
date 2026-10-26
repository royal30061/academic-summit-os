#!/system/bin/sh
# ship.sh "commit message" file1.js file2.js index.html ...
# Refuses to commit or push any .js that does not parse. The gate, mechanized.
MSG="$1"; shift
for f in "$@"; do
  case "$f" in *.js) node --check "$f" || { echo "REFUSED TO SHIP: $f does not parse"; exit 1; };; esac
done
git add "$@" || exit 1
git status --short
git commit -m "$MSG" || exit 1
git push origin master
