
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
  'scripts',
  'native'
]);

const excludedFiles = new Set([
  'package.json',
  'package-lock.json',
  'capacitor.config.ts',
  'capacitor.config.json',
  'README.txt',
  'ship.sh',
  'precheck.sh',
  'apply-polish.sh'
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
  if (excludedFiles.has(entry.name)) continue;
  if (entry.name.startsWith('.')) continue;

  const source = join(root, entry.name);
  const destination = join(output, entry.name);

  if (entry.isDirectory()) {
    if (['assets', 'icons'].includes(entry.name)) {
      await cp(source, destination, {
        recursive: true
      });
    }
    continue;
  }

  if (entry.name.endsWith('.test.js')) continue;

  await cp(source, destination);
}

console.log('Academic Summit web assets prepared.');
console.log('Output directory: www/');

