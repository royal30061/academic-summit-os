/* Academic Summit Study Hub v5 - integrated upgrade layer.
 * Loads after studyhub2.js. Keeps the existing four-panel hub and data model.
 * Adds student-owned course records, persistent PDF library, cloud sync hooks,
 * and a proposition-led assessment generator.
 */
(function () {
'use strict';
var W = window, DB_NAME = 'academic-summit-study-v1', DB_VERSION = 1;
if (W.__asStudyHub3) return;
W.__asStudyHub3 = true;

function uidValue() {
  try { return typeof uid === 'function' ? String(uid()) : String(uid || (W.U && W.U.id) || ''); }
  catch (e) { return ''; }
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
function toast(s, type) { try { if (W.showToast) W.showToast(s, type || 'success'); } catch (e) {} }
function persist() { try { if (typeof save === 'function') save(); else if (typeof W.save === 'function') W.save(); } catch (e) {} }
function normCode(s) { return String(s || '').toUpperCase().replace(/\s+/g, ' ').trim(); }
function codeKey(s) { return normCode(s).replace(/\s+/g, ''); }
function words(s) { return (String(s || '').trim().match(/\S+/g) || []).length; }
function localDate() { var d = new Date(); return d.getFullYear()+'-'+('0'+(d.getMonth()+1)).slice(-2)+'-'+('0'+d.getDate()).slice(-2); }
function safeId() { return W.crypto && crypto.randomUUID ? crypto.randomUUID() : ('pdf-'+Date.now()+'-'+Math.random().toString(36).slice(2,10)); }
function currentUser() { try { return (typeof U !== 'undefined' && U) ? U : (W.U || {}); } catch (e) { return W.U || {}; } }

function dbOpen() {
  return new Promise(function (resolve, reject) {
    if (!W.indexedDB) return reject(new Error('IndexedDB is unavailable in this browser.'));
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains('pdfs')) {
        var st = db.createObjectStore('pdfs', { keyPath: 'id' });
        st.createIndex('ownerCourse', ['owner', 'courseKey'], { unique: false });
        st.createIndex('owner', 'owner', { unique: false });
      }
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error || new Error('Could not open the local materials library.')); };
  });
}
function dbRun(mode, fn) {
  return dbOpen().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(['pdfs'], mode), st = tx.objectStore('pdfs'), req;
      try { req = fn(st); } catch (e) { reject(e); return; }
      if (req) { req.onsuccess = function () { resolve(req.result); }; req.onerror = function () { reject(req.error); }; }
      else { tx.oncomplete = function () { resolve(true); }; tx.onerror = function () { reject(tx.error); }; }
    }).finally(function () { db.close(); });
  });
}
function pdfPut(row) { return dbRun('readwrite', function (st) { return st.put(row); }); }
function pdfGet(id) { return dbRun('readonly', function (st) { return st.get(id); }); }
function pdfDelete(id) { return dbRun('readwrite', function (st) { return st.delete(id); }); }
function pdfList(owner, courseKey) {
  return dbRun('readonly', function (st) {
    var idx = st.index('ownerCourse');
    return idx.getAll([owner, courseKey]);
  });
}
function pdfListAll(owner) {
  return dbRun('readonly', function (st) { return st.index('owner').getAll(owner); });
}

function customCourses() {
  var u = currentUser(); u.studyHubCourses = Array.isArray(u.studyHubCourses) ? u.studyHubCourses : [];
  return u.studyHubCourses;
}
var oldH2 = W.h2courses;
W.h2courses = function () {
  var base = [];
  try { if (oldH2) base = oldH2() || []; } catch (e) {}
  var all = base.slice(), seen = {};
  all.forEach(function (c) { if (c && c.code) seen[codeKey(c.code)] = 1; });
  customCourses().forEach(function (c) {
    var k = codeKey(c.code);
    if (k && !seen[k]) { seen[k] = 1; all.push({ code: c.code, title: c.title || '', units: c.units || '', level: c.level || '' }); }
  });
  return all;
};
W.asEngineCourses = function () {
  return (W.h2courses ? W.h2courses() : []).map(function (c) {
    return { code: c.code, title: c.title || c.name || '', units: c.units || c.unit || '', level: c.level || '' };
  });
};

function courseManager() {
  var list = W.h2courses ? W.h2courses() : [];
  var custom = customCourses();
  var rows = list.map(function (c) {
    var isCustom = custom.some(function (x) { return codeKey(x.code) === codeKey(c.code); });
    return '<div class="as3-course-row"><div class="as3-course-info"><b>'+esc(c.code)+'</b><span>'+esc(c.title || 'Course title not provided')+'</span><small>'+(c.units ? esc(c.units)+' units · ' : '')+(isCustom ? 'Added by you' : 'Existing registered course')+'</small></div>'+
      (isCustom ? '<button class="btn2" onclick="as3RemoveCourse(\''+esc(codeKey(c.code))+'\')">Remove</button>' : '')+'</div>';
  }).join('');
  var html = '<div class="space-y-4"><div class="as3-intro"><div class="lbl">Your academic catalogue</div><h2 class="text-xl font-extrabold mt-1">Manage courses</h2><p class="text-xs text-slate-500 mt-1">Add the courses you are actually taking. Study Hub will organise materials, practice, plans and progress around this list.</p></div>'+
    '<div class="card space-y-3"><div class="lbl">Add a course</div><div><label class="lbl">Course code</label><input id="as3-code" class="inp mt-1 uppercase" placeholder="e.g. POS 215"></div>'+
    '<div><label class="lbl">Course title</label><input id="as3-title" class="inp mt-1" placeholder="e.g. Political Economy"></div>'+
    '<div class="grid grid-cols-2 gap-2"><div><label class="lbl">Credit units</label><input id="as3-units" class="inp mt-1" type="number" min="0" max="30" placeholder="e.g. 3"></div>'+
    '<div><label class="lbl">Level</label><select id="as3-level" class="inp mt-1"><option value="">Select level</option>'+[100,200,300,400,500,600,700,800,900].map(function(n){return '<option>'+n+'</option>';}).join('')+'</select></div></div>'+
    '<button class="btn w-full" onclick="as3AddCourse()">Add course to my Study Hub</button></div>'+
    '<div class="card space-y-2"><div class="flex items-center justify-between"><b class="text-sm">My courses</b><span class="text-xs text-slate-500">'+list.length+' total</span></div>'+
    (rows || '<p class="text-xs text-slate-500">No courses yet. Add your first course above.</p>')+'</div>'+
    '<button class="btn2 w-full" onclick="as3CloseCourses()">Return to Study Hub</button></div>';
  if (typeof W.fullScreen === 'function') W.fullScreen('My courses', html);
  else {
    var sh = document.getElementById('sheet');
    if (sh) sh.innerHTML = '<div class="fixed inset-0 z-[9999] overflow-y-auto p-4" style="background:var(--bg)"><div class="max-w-lg mx-auto pt-5">'+html+'</div></div>';
  }
}
W.sxCourses = courseManager;
W.as3AddCourse = function () {
  var code = normCode((document.getElementById('as3-code') || {}).value);
  var title = String((document.getElementById('as3-title') || {}).value || '').trim();
  var units = String((document.getElementById('as3-units') || {}).value || '').trim();
  var level = String((document.getElementById('as3-level') || {}).value || '').trim();
  if (!/^[A-Z]{2,6}[- ]?\d{3,4}[A-Z]?$/.test(code)) return toast('Enter a valid course code, for example POS 215.', 'error');
  if (!title) return toast('Add the course title so your materials are organised correctly.', 'error');
  if (units && (+units < 0 || +units > 30 || !Number.isFinite(+units))) return toast('Credit units must be between 0 and 30.', 'error');
  var u = currentUser(), custom = customCourses(), k = codeKey(code);
  var all = W.h2courses ? W.h2courses() : [];
  if (all.some(function (c) { return codeKey(c.code) === k; })) {
    var ex = custom.filter(function (c) { return codeKey(c.code) === k; })[0];
    if (ex) { ex.title = title; ex.units = units; ex.level = level; }
    else return toast('That course is already in your registered course list.', 'error');
  } else custom.push({ code: code, title: title, units: units, level: level, addedAt: new Date().toISOString() });
  u.studyHubCourses = custom; persist(); toast('Course added to your academic catalogue.');
  courseManager();
};
W.as3RemoveCourse = function (key) {
  if (!W.confirm('Remove this course from your personal Study Hub catalogue? Existing study history and files will be kept.')) return;
  var u = currentUser(); u.studyHubCourses = customCourses().filter(function (c) { return codeKey(c.code) !== key; });
  persist(); courseManager();
};
W.as3CloseCourses = function () {
  try { if (typeof W.closeSheet === 'function') W.closeSheet(); } catch (e) {}
  var sh = document.getElementById('sheet'); if (sh) sh.innerHTML = '';
  try { if (W.go) W.go('study'); } catch (e) {}
};

function stripIntro(text) {
  return String(text || '').replace(/\r/g, '\n').split('\n').map(function (line) {
    var s = line.trim();
    if (!s) return '';
    if (/^(?:POS|PSS|GST|GNS|CSC|MTH|POL)\s?\d{3,4}\s*(?:[-–|:].*)?$/i.test(s)) return '';
    if (/^(?:lecture\s+notes?|course\s+outline|page\s+\d+|section\s+\d+|chapter\s+\d+|unit\s+\d+|table\s+of\s+contents?)\b/i.test(s)) return '';
    if (/^(?:learning objectives?|course objectives?|overview|introduction|preliminary remarks?)\s*:?$/i.test(s)) return '';
    if (/^(?:scope|aims?|objectives?)\s+of\s+(?:this|the)\s+(?:lecture|course|chapter|unit)\b/i.test(s)) return '';
    if (/\b(?:in this lecture|in today'?s lecture|we are going to (?:look|discuss|examine)|this lecture will|the purpose of this lecture|today we will)\b/i.test(s)) return '';
    return s;
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}
function cleanSentence(s) {
  return String(s || '').replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').replace(/\s+/g, ' ').trim();
}
function academicQuestions(text, requested) {
  var src = stripIntro(text), limit = Math.max(1, Math.min(30, Number(requested) || 8));
  var paras = src.split(/\n\s*\n/), candidates = [], seen = {};
  function add(q, a, type, level, source, score) {
    q = cleanSentence(q); a = cleanSentence(a); source = cleanSentence(source);
    if (!q || !a || a.length < 8 || words(a) > 55 || words(q) < 5 || words(q) > 45) return;
    var k = q.toLowerCase();
    if (seen[k]) return;
    seen[k] = 1;
    candidates.push({ q: q, a: a.replace(/[.;\s]+$/, ''), kind: type, level: level, src: source, score: score || 1 });
  }
  paras.forEach(function (para) {
    var p = cleanSentence(para);
    if (!p || words(p) < 12) return;
    if (/^(?:contents|references|bibliography|course outline|lecture notes?)\b/i.test(p)) return;
    var sentences = p.match(/[^.!?]+[.!?]+(?:["')\]]*)|[^.!?]+$/g) || [p];
    sentences.forEach(function (raw) {
      var s = cleanSentence(raw);
      if (words(s) < 12 || words(s) > 90) return;
      if (/^(?:in conclusion|to conclude|in summary|this lecture|we will|we are going to)\b/i.test(s)) return;
      var m;
      // Definition and conceptual meaning: preserve the definition as the answer.
      m = s.match(/^(.{3,85}?)\s+(?:is defined as|are defined as|refers to|refer to|is understood as|means|denotes|is (?:the )?(?:systematic )?study of|is concerned with|are concerned with|is characterized by|is characterised by|is associated with|involves|constitutes)\s+(.{10,260})$/i);
      if (m) add('How does the material define or explain '+m[1].trim()+'?', m[2], 'definition', 'understand', s, 10);
      // Components and dimensions.
      m = s.match(/^(.{3,75}?)\s+(?:consists of|is composed of|comprises|has the following (?:elements|features|components))\s+(.{8,240})$/i);
      if (m) add('What are the principal components or elements of '+m[1].trim()+'?', m[2], 'components', 'understand', s, 9);
      // Explicit causal propositions.
      m = s.match(/^because\s+(.{8,180}),\s*(.{8,180})$/i);
      if (m) add('According to the lecture, what consequence follows from '+m[1].trim()+'?', m[2], 'causation', 'analyse', s, 9);
      m = s.match(/^(.{8,160}?)\s+because\s+(.{8,180})$/i);
      if (m && /\b(?:important|significant|necessary|essential|occurs|happens|results?|leads?)\b/i.test(m[1]))
        add('What explanation does the material give for this claim: "'+m[1].trim()+'"?', m[2], 'causation', 'analyse', s, 8);
      // Comparison/contrast with an explicit distinction.
      m = s.match(/^(.{3,70}?)\s+differs from\s+(.{3,70}?)\s+in that\s+(.{8,180})$/i);
      if (m) add('What is the substantive distinction between '+m[1].trim()+' and '+m[2].trim()+'?', m[3], 'comparison', 'analyse', s, 10);
      m = s.match(/^unlike\s+(.{3,70}),\s*(.{8,180})$/i);
      if (m) add('How does the material distinguish '+m[2].trim().split(/\s+/).slice(0,5).join(' ')+' from '+m[1].trim()+'?', m[2], 'comparison', 'analyse', s, 7);
      // Significance is only generated where the source states a reason.
      m = s.match(/^(.{3,75}?)\s+(?:is important|is significant|matters)\s+because\s+(.{8,180})$/i);
      if (m) add('Why does the material regard '+m[1].trim()+' as significant?', m[2], 'significance', 'evaluate', s, 9);
      // Avoid heading-like cloze prompts. Historical details are secondary and only
      // asked where a complete proposition supplies context, not from the first page title.
      m = s.match(/^(.{8,150}?)\s+(?:emerged|developed|originated|was established|was introduced)\s+(?:in|during|after|before)\s+(.{3,100})$/i);
      if (m) add('In what historical period or context does the material place '+m[1].trim()+'?', m[2], 'historical-context', 'remember', s, 4);
    });
  });
  // Prefer higher-order questions, then alternate categories to avoid a list of near-identical prompts.
  candidates.sort(function (a,b) { return b.score-a.score; });
  var out = [], usedTypes = {};
  while (out.length < limit && candidates.length) {
    var idx = candidates.findIndex(function (x) { return !usedTypes[x.kind]; });
    if (idx < 0) idx = 0;
    var item = candidates.splice(idx,1)[0]; usedTypes[item.kind] = 1; out.push(item);
  }
  return out.map(function (x) { return { q:x.q, a:x.a, kind:x.kind, level:x.level, src:x.src }; });
}
function installQuestionEngine() {
  var C = W.StudyCore;
  if (!C) return false;
  C.questionsFor = academicQuestions;
  C.cleanMaterial = stripIntro;
  return true;
}
installQuestionEngine();
if (W.StudyCore && !W.StudyCore.__as3Metadata) {
  var originalNewItem = W.StudyCore.newItem;
  W.StudyCore.newItem = function (o, created) {
    var item = originalNewItem(o, created);
    item.level = o.level || 'understand';
    item.source = o.src || o.source || '';
    return item;
  };
  W.StudyCore.__as3Metadata = true;
}

var css = document.createElement('style');
css.id = 'as3-css';
css.textContent = '.as3-course-row{display:flex;align-items:center;gap:10px;justify-content:space-between;padding:11px 0;border-top:1px solid var(--bd)}.as3-course-info{display:flex;flex-direction:column;gap:3px;min-width:0}.as3-course-info b{font:700 13px "JetBrains Mono",monospace}.as3-course-info span{font-size:12px;color:var(--tx)}.as3-course-info small{font-size:10px;color:var(--mut)}.as3-pdf-box{margin-top:14px;padding:14px;border:1px solid rgba(16,185,129,.35);border-radius:16px;background:var(--sub)}.as3-pdf-row{display:flex;align-items:center;gap:9px;padding:10px 0;border-top:1px solid var(--bd)}.as3-pdf-row .meta{flex:1;min-width:0}.as3-pdf-row .meta b{display:block;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.as3-pdf-row .meta small{font-size:10px;color:var(--mut)}';
document.head.appendChild(css);

function currentCourseCode() {
  var root = document.querySelector('#main .sx');
  if (!root) return '';
  var el = root.querySelector('.sx-segs') ? root.querySelector('.sx-mono') : null;
  if (!el) return '';
  var s = String(el.textContent || '').split('/')[0].trim();
  return /^[A-Z]{2,6}[- ]?\d{3,4}[A-Z]?$/i.test(s) ? normCode(s) : '';
}
function activeCourseKey() { return codeKey(currentCourseCode()); }
function courseMeta(code) {
  var cs = W.h2courses ? W.h2courses() : [];
  return cs.filter(function (c) { return codeKey(c.code) === codeKey(code); })[0] || { code: code, title: '' };
}
function getSupabase() { try { var client = (typeof sb !== 'undefined' && sb) ? sb : W.sb; return client && client.storage ? client : null; } catch (e) { return null; } }
function storagePath(owner, code, id, name) {
  var safe = String(name || 'material.pdf').replace(/[^a-zA-Z0-9._-]+/g,'_').slice(-90);
  return owner+'/'+codeKey(code)+'/'+id+'-'+safe;
}
function cloudUpload(row) {
  var client = getSupabase();
  if (!client || !row.owner) return Promise.resolve({ cloud:false, reason:'No authenticated cloud session.' });
  var path = storagePath(row.owner, row.course, row.id, row.name);
  return client.storage.from('study-materials').upload(path, row.blob, { upsert:true, contentType:'application/pdf' })
    .then(function (r) {
      if (r.error) return { cloud:false, reason:r.error.message };
      row.storagePath = path; row.cloud = true;
      return client.from('study_materials').upsert({
        id: row.id, owner_id: row.owner, course_code: row.course, course_key: row.courseKey,
        file_name: row.name, storage_path: path, file_size: row.size, page_count: row.pages || null,
        word_count: row.wordCount || null, updated_at: new Date().toISOString()
      }, { onConflict:'id' }).then(function (m) {
        if (m.error) return { cloud:false, reason:m.error.message };
        return { cloud:true };
      });
    }).catch(function (e) { return { cloud:false, reason:e.message || String(e) }; });
}
function cloudDelete(row) {
  var client = getSupabase(); if (!client || !row.storagePath) return Promise.resolve();
  return client.storage.from('study-materials').remove([row.storagePath]).then(function () {
    return client.from('study_materials').delete().eq('id',row.id);
  }).catch(function () {});
}
function loadPdfLib() {
  return new Promise(function (resolve,reject) {
    if (W.pdfjsLib) return resolve(W.pdfjsLib);
    var s=document.createElement('script'); s.src='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.onload=function(){W.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';resolve(W.pdfjsLib);};
    s.onerror=function(){reject(new Error('PDF reader could not load.'));}; document.head.appendChild(s);
  });
}
async function extractPdf(blob) {
  var lib=await loadPdfLib(), doc=await lib.getDocument({data:await blob.arrayBuffer()}).promise, pages=[], n=Math.min(doc.numPages,200);
  for(var i=1;i<=n;i++){var tc=await (await doc.getPage(i)).getTextContent();pages.push(tc.items.map(function(x){return x.str;}).join(' ').replace(/\s+/g,' ').trim());}
  return { text:pages.join('\n\n'), pages:doc.numPages };
}
function materialStoreKey() {
  var id=uidValue() || 'me';
  return 'as_mat_'+id;
}
function saveExtractedText(code, text) {
  var key=materialStoreKey(), m={};
  try { m=JSON.parse(localStorage.getItem(key)) || {}; } catch(e) {}
  var old=m[code], all=(old && old.text ? old.text+'\n\n' : '')+text;
  m[code]={text:all.slice(0,250000),words:words(all),added:localDate()};
  localStorage.setItem(key,JSON.stringify(m));
}
async function uploadPdf(input) {
  var file=input && input.files && input.files[0], code=currentCourseCode(), owner=uidValue();
  if(!file)return;
  if(!code)return toast('Open a course before adding a PDF.','error');
  if(file.type!=='application/pdf' && !/\.pdf$/i.test(file.name))return toast('Choose a PDF document.','error');
  if(file.size>25*1024*1024)return toast('PDFs must be 25 MB or smaller.','error');
  if(!owner)return toast('Sign in again before saving course materials.','error');
  toast('Saving PDF to this device...');
  try {
    var id=safeId(), row={id:id,owner:owner,course:code,courseKey:codeKey(code),name:file.name,size:file.size,type:'application/pdf',addedAt:new Date().toISOString(),blob:file,cloud:false};
    await pdfPut(row);
    toast('PDF saved on this device. Preparing searchable notes...');
    var parsed=await extractPdf(file); row.pages=parsed.pages; row.wordCount=words(parsed.text); await pdfPut(row);
    if(words(parsed.text)>=30) {
      saveExtractedText(code,parsed.text);
      var note=document.getElementById('sx-notes'); if(note) note.value='';
      if(typeof W.sxMatSave==='function') {
        // The extracted text is already saved into the canonical material store.
        toast('PDF saved and its text is ready for practice.');
      }
    } else toast('PDF saved, but it contains little selectable text. It may be a scanned document.');
    var cloud=await cloudUpload(row);
    if(cloud.cloud) { await pdfPut(row); toast('PDF saved on this device and synced to your account.'); }
    else toast('PDF saved on this device. Cloud sync unavailable: '+(cloud.reason||'check storage setup')+'.','warning');
    renderPdfLibrary();
  } catch(e) { toast('Could not save this PDF: '+(e.message||e),'error'); }
}
function fmtSize(n) { return n<1024*1024 ? Math.max(1,Math.round(n/1024))+' KB' : (n/1024/1024).toFixed(1)+' MB'; }
function renderPdfLibrary() {
  var box=document.getElementById('as3-pdf-library'), code=currentCourseCode(), owner=uidValue();
  if(!box || !code || !owner)return;
  Promise.all([pdfList(owner,codeKey(code)), Promise.resolve((currentUser().studyHubCloudFiles||[]).filter(function(x){return codeKey(x.course_code)===codeKey(code);} ))])
  .then(function(pair){
    if(!document.getElementById('as3-pdf-library'))return;
    var local=pair[0]||[], cloud=pair[1]||[], seen={};
    var localHtml=local.map(function(r){
      seen[r.id]=1;
      return '<div class="as3-pdf-row"><span style="font-size:20px">PDF</span><div class="meta"><b>'+esc(r.name)+'</b><small>'+fmtSize(r.size)+' · '+(r.pages||'?')+' pages · '+(r.cloud?'Cloud synced':'On this device')+'</small></div>'+
      '<button class="btn2" onclick="as3OpenPdf(\''+esc(r.id)+'\')">Open</button><button class="btn2" onclick="as3DeletePdf(\''+esc(r.id)+'\')">Delete</button></div>';
    }).join('');
    var cloudHtml=cloud.filter(function(r){return !seen[r.id];}).map(function(r){
      return '<div class="as3-pdf-row"><span style="font-size:20px">PDF</span><div class="meta"><b>'+esc(r.file_name)+'</b><small>'+fmtSize(r.file_size||0)+' · Cloud copy · restore to this device</small></div>'+
      '<button class="btn2" onclick="as3RestorePdf(\''+esc(r.id)+'\')">Restore</button></div>';
    }).join('');
    box.innerHTML=(localHtml+cloudHtml) || '<p class="text-xs text-slate-500 py-2">No PDFs saved for this course yet.</p>';
  }).catch(function(){box.innerHTML='<p class="text-xs text-slate-500">Local PDF library is unavailable in this browser.</p>';});
}
W.as3OpenPdf = async function(id) {
  try {
    var row=await pdfGet(id);
    if(!row) {
      var cloud=(currentUser().studyHubCloudFiles||[]).filter(function(x){return x.id===id;})[0];
      if(cloud) row=await W.as3RestorePdf(id);
      if(!row) return toast('This PDF is not stored on this device. Sign in online to restore it.','error');
    }
    var url=URL.createObjectURL(row.blob), a=document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener'; a.click();
    setTimeout(function(){URL.revokeObjectURL(url);},60000);
  } catch(e){toast('Could not open this PDF.','error');}
};
W.as3DeletePdf = async function(id) {
  if(!W.confirm('Delete this PDF from your device and cloud library?'))return;
  try { var row=await pdfGet(id); if(row){await cloudDelete(row);await pdfDelete(id);} currentUser().studyHubCloudFiles=(currentUser().studyHubCloudFiles||[]).filter(function(x){return x.id!==id;}); persist(); renderPdfLibrary(); toast('PDF deleted.'); }
  catch(e){toast('Could not delete this PDF.','error');}
};
function enhanceHubCopy() {
  var root=document.querySelector('#main .sx'); if(!root)return;
  var note=root.querySelector('#sx-notes');
  if(note) note.placeholder='Paste lecture material here. The Study Hub will identify concepts, arguments, definitions and relationships worth testing.';
  root.querySelectorAll('.sx-sub').forEach(function(el){
    var t=String(el.textContent||'');
    if(/Questions ask for the dates, names and key terms/i.test(t)) el.textContent='Practice tests conceptual understanding, definitions, comparisons, causal arguments and applications supported by your lecture material.';
    if(/Your notes stay on this phone/i.test(t)) el.textContent='Your notes are saved for this course. Original PDFs are kept separately in the document library below.';
    if(/Paste your lecture notes here\. Practice questions are made from them/i.test(t)) el.textContent='Build this course library with lecture notes and original PDF documents. Practice is generated from the substantive material.';
  });
}
function addPdfPanel() {
  if (uidValue() && cloudSyncUser !== uidValue()) syncCloudIndex();
  enhanceHubCopy();
  var note=document.getElementById('sx-notes');
  if(!note)return;
  var sec=note.closest('.sx-sec'); if(!sec || document.getElementById('as3-pdf-library'))return;
  var c=document.createElement('div'); c.className='as3-pdf-box';
  c.innerHTML='<div class="flex items-center justify-between gap-2"><div><b class="text-sm">Course document library</b><p class="text-xs text-slate-500 mt-1">Keep the original PDFs, not just extracted text.</p></div><span class="sx-pill">Persistent</span></div>'+
    '<label class="lbl block mt-3">Add lecture PDF</label><input id="as3-pdf-input" type="file" accept="application/pdf,.pdf" class="inp mt-1">'+
    '<p class="text-[10px] text-slate-500 mt-2">Saved in this app on this device. When cloud storage is configured, it also syncs to your account.</p>'+
    '<div id="as3-pdf-library" class="mt-2"><p class="text-xs text-slate-500">Loading saved PDFs…</p></div>';
  sec.appendChild(c);
  var input=c.querySelector('#as3-pdf-input');
  input.addEventListener('change',function(){uploadPdf(input);});
  renderPdfLibrary();
}
var observerTimer=0;
try {
  new MutationObserver(function(){
    if(observerTimer)return;
    observerTimer=setTimeout(function(){observerTimer=0;addPdfPanel();},80);
  }).observe(document.getElementById('main') || document.body,{childList:true,subtree:true});
} catch(e) {}
setTimeout(addPdfPanel,400);

// Restore cloud index for this user and hydrate missing local PDF binaries on demand.
var cloudSyncUser = '';
async function syncCloudIndex() {
  var client=getSupabase(), owner=uidValue(); if(!client||!owner || cloudSyncUser===owner)return;
  cloudSyncUser=owner;
  try {
    var r=await client.from('study_materials').select('id,owner_id,course_code,course_key,file_name,storage_path,file_size,page_count,word_count,updated_at').eq('owner_id',owner).order('updated_at',{ascending:false});
    if(r.error){cloudSyncUser='';return;}
    var meta=currentUser().studyHubCloudFiles || [];
    r.data.forEach(function(x){if(!meta.some(function(y){return y.id===x.id;}))meta.push(x);});
    currentUser().studyHubCloudFiles=meta; persist(); renderPdfLibrary();
  } catch(e) { cloudSyncUser=''; }
}
syncCloudIndex();
W.as3RestorePdf = async function(id) {
  var client=getSupabase(), owner=uidValue(); if(!client||!owner)return toast('Sign in to restore cloud materials.','error');
  try {
    var r=await client.from('study_materials').select('*').eq('id',id).eq('owner_id',owner).single();
    if(r.error)throw r.error;
    var d=await client.storage.from('study-materials').download(r.data.storage_path);
    if(d.error)throw d.error;
    var row={id:id,owner:owner,course:r.data.course_code,courseKey:r.data.course_key,name:r.data.file_name,size:r.data.file_size,blob:d.data,cloud:true,storagePath:r.data.storage_path,pages:r.data.page_count,wordCount:r.data.word_count,addedAt:r.data.updated_at};
    await pdfPut(row);
    try {
      var parsed=await extractPdf(d.data);
      row.pages=parsed.pages; row.wordCount=words(parsed.text);
      if(row.wordCount>=30) saveExtractedText(row.course,parsed.text);
      await pdfPut(row);
    } catch(parseError) {}
    toast('PDF restored to this device and its course material is ready.');
    renderPdfLibrary();
    return row;
  } catch(e){toast('Could not restore PDF: '+(e.message||e),'error');}
};
})();
