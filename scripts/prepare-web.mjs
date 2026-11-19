import { cp, mkdir, readdir, rm, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const root = process.cwd();
const output = join(root, 'www');

const excluded = new Set([
  '.git', '.github', 'node_modules', 'android', 'www',
  '_archive', 'sql', 'scripts', 'downloads'
]);

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });

const entries = await readdir(root, { withFileTypes: true });
for (const entry of entries) {
  if (excluded.has(entry.name)) continue;
  if (entry.name.startsWith('.')) continue;
  if (entry.name.endsWith('.apk')) continue;               // never ship an APK inside the APK
  if (entry.name === 'package.json' || entry.name === 'package-lock.json') continue;
  if (entry.name.startsWith('capacitor.config.')) continue;
  await cp(join(root, entry.name), join(output, entry.name), { recursive: true });
}

/* Vendor the two CDN scripts so the native app starts with no internet. */
const vendor = join(output, 'vendor');
await mkdir(vendor, { recursive: true });
let html = await readFile(join(output, 'index.html'), 'utf8');
const targets = [
  ['https://cdn.tailwindcss.com', 'tailwind.js'],
  ['https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2', 'supabase.js']
];
for (const [url, file] of targets) {
  try {
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const text = await res.text();
    if (text.length < 10000) throw new Error('response too small');
    await writeFile(join(vendor, file), text);
    html = html.split('src="' + url + '"').join('src="vendor/' + file + '"');
    console.log('vendored', file);
  } catch (e) {
    console.warn('keeping CDN for', url, '-', e.message);
  }
}
// APK_NO_FONT_BLOCK: drop render-blocking Google Fonts link in the APK only
html = html.replace(/<link[^>]+fonts\.googleapis\.com[^>]*>/g, '');
const stamp = {
  ref: process.env.GITHUB_REF_NAME || 'local',
  sha: process.env.GITHUB_SHA || '',
  at: new Date().toISOString()
};
html = html.replace('<head>', '<head>\n<script>window.__AS_BUILD__=' + JSON.stringify(stamp) + ';</script>');
await writeFile(join(output, 'index.html'), html);

console.log('Academic Summit web assets prepared.');
console.log('Output:', output);
