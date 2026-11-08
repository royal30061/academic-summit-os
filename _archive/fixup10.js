const fs = require('fs');
let s = fs.readFileSync('home.js', 'utf8');
const from = "onclick=\"pTab='week';go('plan')\">Timetable</button>";
const to = "onclick=\"pTab='week';go('plan')\">Classes</button><button class=\"text-xs font-bold text-emerald-600\" onclick=\"go('rtt')\">Reading plan</button>";
const n = s.split(from).length - 1;
if (s.indexOf('Reading plan</button>') > -1) console.log('already present');
else if (n === 1) { fs.writeFileSync('home.js', s.split(from).join(to)); console.log('reading-plan door added'); }
else console.log('ANCHOR COUNT ' + n + ' - not touching');
