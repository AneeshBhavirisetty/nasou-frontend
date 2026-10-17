// Copies the client's product photos into a Nivora API's media library, resized
// for phones, and writes a map of blob path → media URL for import-master-sheet.
//
// The photos live in the client's private Blob Storage (browsers cannot load
// them). Download them first, keeping the folder layout:
//   az storage blob download-batch --account-name <account> --auth-mode login \
//     -s <container> -d C:\nvimg --pattern "Nivora Products/*"
// (use a short folder — the paths are long). Then:
//   npm i --no-save sharp            (or SHARP=<path to a sharp install>)
//   API_URL=… EMAIL=… PASSWORD=… SOURCE_BASE=https://<account>.blob.core.windows.net/<container>/ \
//     node scripts/upload-sheet-images.mjs C:\nvimg [map.json]
// SOURCE_BASE (optional) keeps each photo's original address on its media file.
//
// Each photo becomes a WebP of at most 1000 px on the long side (a few dozen
// KB instead of ~600 KB). Re-running skips photos already in the map, so an
// interrupted run can simply be started again.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';

const require = createRequire(import.meta.url);
const sharp = require(process.env.SHARP || 'sharp');

const root = process.argv[2];
const mapFile = process.argv[3] || 'sheet-images.map.json';
const api = (process.env.API_URL || '').replace(/\/$/, '') + '/api/v1';
if (!root || !process.env.API_URL || !process.env.EMAIL || !process.env.PASSWORD) {
  console.error('Usage: API_URL=… EMAIL=… PASSWORD=… node scripts/upload-sheet-images.mjs <downloaded folder> [map.json]');
  process.exit(1);
}

const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full);
    else if (/\.(png|jpe?g|webp)$/i.test(e.name)) files.push(full);
  }
})(root);
const rel = (f) => path.relative(root, f).split(path.sep).join('/');

async function call(p, init) {
  const res = await fetch(api + p, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${p} → ${res.status} ${data.message || ''}`);
  return data;
}
const json = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
let session = await call('/auth/login', json({ identifier: process.env.EMAIL, password: process.env.PASSWORD }));
if (!session.accessToken && session.challengeId) {
  if (!process.env.TWO_FACTOR_CODE) throw new Error('Two-factor sign-in is on — set TWO_FACTOR_CODE.');
  session = await call('/auth/2fa/verify', json({ challengeId: session.challengeId, code: process.env.TWO_FACTOR_CODE }));
}

const map = fs.existsSync(mapFile) ? JSON.parse(fs.readFileSync(mapFile, 'utf8')) : {};
let done = 0, before = 0, after = 0, failed = 0;
for (const f of files) {
  const key = rel(f);
  if (map[key]) { done++; continue; }
  try {
    const original = fs.readFileSync(f);
    const webp = await sharp(original).rotate()
      .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 }).toBuffer();
    const form = new FormData();
    form.append('file', new Blob([webp], { type: 'image/webp' }), path.basename(f).replace(/\.[^.]+$/, '.webp'));
    if (process.env.SOURCE_BASE) {
      form.append('source', process.env.SOURCE_BASE.replace(/\/?$/, '/') + key.split('/').map(encodeURIComponent).join('/'));
    }
    const media = await call('/admin/media', { method: 'POST', headers: { Authorization: `Bearer ${session.accessToken}` }, body: form });
    map[key] = media.url;
    before += original.length; after += webp.length;
    fs.writeFileSync(mapFile, JSON.stringify(map, null, 1));
  } catch (x) {
    failed++;
    console.log(`\n  failed ${key}: ${x.message}`);
  }
  done++;
  process.stdout.write(`\r  ${done}/${files.length} photos`);
}
console.log(`\nUploaded ${Object.keys(map).length} photos → ${mapFile}`
  + (before ? ` · ${(before / 1048576).toFixed(0)} MB → ${(after / 1048576).toFixed(1)} MB` : '') + (failed ? ` · ${failed} failed` : ''));
