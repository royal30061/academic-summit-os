const assert = require('assert');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
let core;
try { core = require('../study-core.js'); }
catch (e) { core = { questionsFor: function(){return [];} }; }
const installedOverlay = path.join(__dirname, '..', 'studyhub3.js');
const bundledOverlay = path.join(__dirname, '..', 'files', 'studyhub3.js');
const overlayPath = fs.existsSync(installedOverlay) ? installedOverlay : bundledOverlay;
if (!fs.existsSync(overlayPath)) throw new Error('Study Hub overlay not found in bundle or installed repository.');
const src = fs.readFileSync(overlayPath, 'utf8');
const doc = { createElement: () => ({ style: {}, appendChild: () => {} }), head: { appendChild: () => {} },
  getElementById: () => null, body: { appendChild: () => {} } };
const ctx = { window: { StudyCore: core, U: {}, h2courses: () => [], save: () => {} },
  document: doc, setTimeout: () => 1, clearTimeout: () => {}, console, Date, Math, Number, String,
  Array, Object, RegExp, Promise, JSON, isFinite };
ctx.window.window = ctx.window;
vm.createContext(ctx);
vm.runInContext(src, ctx);
const notes = `
POS 215 – Lecture Notes | Page 1
In this lecture, we are going to look at the early scope of political science.
Political science is the systematic study of the state, government, political institutions and political behaviour.
Sovereignty refers to the supreme authority of a state within its territory and its independence in external relations.
Internal sovereignty differs from external sovereignty in that internal sovereignty concerns authority within a territory while external sovereignty concerns independence from outside control.
Because political authority is distributed among several institutions, constitutional systems often establish checks and balances.
Political economy is concerned with the relationship between political institutions and economic processes.
`;
const q = ctx.window.StudyCore.questionsFor(notes, 10);
assert(q.length >= 3, 'should produce multiple concept questions');
assert(!q.some(x => /lecture notes|page 1|we are going to/i.test(x.q)), 'must exclude title and introductory prose');
assert(q.some(x => x.kind === 'definition'), 'must ask a definition');
assert(q.some(x => x.kind === 'comparison'), 'must ask a comparison');
assert(q.every(x => x.a && x.src && x.level), 'each item must have answer, source and cognitive level');
console.log('Study Hub v5 quality tests passed.');
