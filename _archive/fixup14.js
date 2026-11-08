const fs = require('fs');

let home = fs.readFileSync('home.js', 'utf8');
home = home.replace(/<div class="text-\[11px\] text-slate-500">' \+ new Date\(\)\.toDateString\(\) \+ '<\/div>/g, '');
home = home.replace(/\(n \? ' <span class="px-2\.5 py-1 rounded-full text-\[10px\] font-extrabold" style="background:rgba\(16,185,129,\.15\);color:#047857">' \+ n \+ '-day streak <\/span>' : ''\) \+ /g, '');
fs.writeFileSync('home.js', home);
console.log('home.js: removed date line and duplicate streak badge');

let pulse = fs.readFileSync('pulse.js', 'utf8');
pulse = pulse.replace(/<p class="text-\[11px\] text-slate-500">Every day you read keeps its mountain forever[^<]*<\/p>\s*\+/g, '+');
fs.writeFileSync('pulse.js', pulse);
console.log('pulse.js: removed calendar explanatory paragraph');

let read = fs.readFileSync('read.js', 'utf8');
const newCompactCard = `function compactCard() {
  var plan = U.studyPlan;
  if (!plan) {
    return '<div class="flex justify-between items-start"><div class="font-extrabold text-lg">Today\\'s reading</div>' + streakBtn() + '</div>' +
      '<p class="text-xs text-slate-500 py-2">Set up a study plan to distribute your courses across the week.</p>' +
      '<button class="btn w-full" onclick="planSetupOpen()">Set up your study plan</button>';
  }
  var courses = ((U.dec && U.dec[0]) || []).concat((U.dec && U.dec[1]) || []);
  var schedule = W.buildSchedule ? W.buildSchedule(courses, plan) : null;
  var dow = (new Date().getDay() + 6) % 7;
  var isReadingDay = plan.days.indexOf(dow) > -1;
  var todayItems = schedule && schedule[dow] ? schedule[dow] : [];
  var log = U.readLog || {}, t = new Date(), z = new Date(t.getTime() - t.getTimezoneOffset() * 6e4), iso = z.toISOString().slice(0, 10);
  var doneCount = todayItems.filter(function(i) { return (log[iso] || []).indexOf(i.code) > -1; }).length;
  var next = todayItems.find(function(i) { return (log[iso] || []).indexOf(i.code) < 0; });

  var out = '<div class="flex justify-between items-start"><div class="font-extrabold text-lg">Today\\'s reading</div>' + streakBtn() + '</div>';
  if (!isReadingDay) {
    out += '<div class="p-3 rounded-xl text-xs font-bold" style="background:var(--sub);color:var(--mut)">Rest day. Your next reading day is on your plan.</div>';
  } else {
    out += '<div class="pt-1">' + ring(doneCount, todayItems.length) + '</div>';
    if (next) {
      out += '<div class="flex items-center justify-between gap-3 p-3 rounded-xl" style="background:var(--sub)"><div><b class="font-mono">' + esc(next.code) + '</b><div class="text-[11px] text-slate-500">' + next.sessions + ' session' + (next.sessions===1?'':'s') + '</div></div>' +
        '<div class="flex gap-2 shrink-0"><button class="btn2" onclick="timerStart(\\'' + esc(next.code) + '\\',' + next.sessions + ')">Start</button><button class="btn2" onclick="readDone(\\'' + esc(next.code) + '\\')">Done</button></div></div>';
    } else {
      out += '<div class="p-3 rounded-xl text-xs font-bold" style="background:rgba(16,185,129,.12);color:#047857">All done today.</div>';
    }
  }
  out += '<p class="text-xs text-slate-500 mt-2" style="font-style:italic">' + (W.pickTip ? W.pickTip() : '') + '</p>';
  out += '<button type="button" class="btn2 w-full justify-between" onclick="go(\\'read\\')">View all' + ic('r', 'w-4 h-4') + '</button>';
  return out;
}`;
read = read.replace(/function compactCard\(\) \{[\s\S]*?return out;\n\}/, newCompactCard);
read = read.replace(
  `'<button class="btn2 ml-auto" onclick="readEditToggle()">' + (editing ? 'Done' : 'Edit') + '</button></div>'`,
  `'<button class="btn2" onclick="planSetupOpen()">Plan</button>' +\n    '<button class="btn2 ml-auto" onclick="readEditToggle()">' + (editing ? 'Done' : 'Edit') + '</button></div>'`
);
fs.writeFileSync('read.js', read);
console.log('read.js: updated with study plan card and timer entry');
