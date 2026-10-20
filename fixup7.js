const fs = require('fs');
let s = fs.readFileSync('home.js', 'utf8');
const DOORS = `'<button type="button" class="card p-5 text-left w-full flex items-center justify-between" onclick="go(\\'traj\\')"><span class="font-extrabold">GPA Trajectory</span>' + ic('r','w-5 h-5') + '</button>' + '<button type="button" class="card p-5 text-left w-full flex items-center justify-between" onclick="carrySheet()"><span class="font-extrabold">Carryover Register</span>' + ic('r','w-5 h-5') + '</button>' + '<button type="button" class="card p-5 text-left w-full flex items-center justify-between" onclick="notifSheet()"><span class="font-extrabold">Academic insight</span>' + ic('r','w-5 h-5') + '</button>' + `;
let n = 0;
while (s.indexOf(DOORS) > -1) { s = s.replace(DOORS, ''); n++; }
console.log('door blocks removed: ' + n);
if ((s.match(/GPA Trajectory/g) || []).length !== 0) { console.log('UNEXPECTED residue - stopping'); process.exit(1); }
const anchor = ": '') + '</div>';";
const i = s.lastIndexOf(anchor);                 // LAST match = end of courseHome, not the row template
if (i === -1) { console.log('ANCHOR MISSING: courseHome end'); process.exit(1); }
s = s.slice(0, i) + ": '') + " + DOORS + " '</div>';" + s.slice(i + anchor.length);
console.log('doors re-inserted once at courseHome end');
const a = "onclick=\"go(\\'acad\\')\"";
const c = s.split(a).length - 1;
if (s.indexOf('onclick="cgpaBreakdown()"') > -1) console.log('cgpa onclick already correct');
else if (c === 1) { s = s.split(a).join('onclick="cgpaBreakdown()"'); console.log('cgpa card now opens the breakdown'); }
else console.log('cgpa onclick count ' + c + ' - left untouched');
fs.writeFileSync('home.js', s);
