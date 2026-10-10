const fs=require('fs');
let s=fs.readFileSync('index.html','utf8');
const n=s.split('e.g. Miracle Moses').length-1;
if(n<1)throw new Error('placeholder not found');
s=s.split('e.g. Miracle Moses').join('Your full name');
if(/Miracle|Moses/.test(s))throw new Error('name still present');
fs.writeFileSync('index.html',s);
console.log('replaced',n,'- NAME PATCH OK');
