const fs = require('fs');
let s = fs.readFileSync('home.js', 'utf8'), n = 0;
const DOORS = `'<button type="button" class="card p-5 text-left w-full flex items-center justify-between" onclick="go(\\'traj\\')"><span class="font-extrabold">GPA Trajectory</span>' + ic('r','w-5 h-5') + '</button>' + '<button type="button" class="card p-5 text-left w-full flex items-center justify-between" onclick="carrySheet()"><span class="font-extrabold">Carryover Register</span>' + ic('r','w-5 h-5') + '</button>' + '<button type="button" class="card p-5 text-left w-full flex items-center justify-between" onclick="notifSheet()"><span class="font-extrabold">Academic insight</span>' + ic('r','w-5 h-5') + '</button>' + `;
if (s.indexOf('GPA Trajectory</span>') === -1) {
  const a = ": '') + '</div>';";
  if (s.indexOf(a) > -1) { s = s.replace(a, ": '') + " + DOORS + " '</div>';"); n++; console.log('doors added to courseHome'); }
  else console.log('ANCHOR MISSING: doors');
}
if (s.indexOf('onclick="cgpaBreakdown()"') === -1) {
  const b = "onclick=\"go('acad')\"";
  if (s.indexOf(b) > -1) { s = s.replace(b, 'onclick="cgpaBreakdown()"'); n++; console.log('CGPA card opens the breakdown again'); }
  else console.log('ANCHOR MISSING: cgpa onclick');
}
fs.writeFileSync('home.js', s);
console.log('fixup4: ' + n + ' changes');
