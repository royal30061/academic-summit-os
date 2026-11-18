import {
  cp,
  mkdir,
  readdir,
  rm
} from 'node:fs/promises';

import { join } from 'node:path';

const root = process.cwd();
const output = join(root, 'www');

const excluded = new Set([
  '.git',
  '.github',
  'node_modules',
  'android',
  'www',
  '_archive',
  'sql',
  'scripts'
]);

await rm(output, {
  recursive: true,
  force: true
});

await mkdir(output, {
  recursive: true
});

const entries = await readdir(root, {
  withFileTypes: true
});

for (const entry of entries) {
  if (excluded.has(entry.name)) continue;
  if (entry.name.startsWith('.')) continue;

  if (
    entry.name === 'package.json' ||
    entry.name === 'package-lock.json' ||
    entry.name.startsWith('capacitor.config.')
  ) continue;

  await cp(
    join(root, entry.name),
    join(output, entry.name),
    { recursive: true }
  );
}

console.log('Academic Summit web assets prepared.');
console.log('Output:', output);
