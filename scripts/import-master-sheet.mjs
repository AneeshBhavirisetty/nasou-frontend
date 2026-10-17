// Loads the client's master product sheet (.xlsx, or .csv without image links)
// into a running Nivora API — the same rows and rules as Admin › Catalog import.
//
//   API_URL=https://<api-host> EMAIL=<owner or operations> PASSWORD=... \
//     node scripts/import-master-sheet.mjs <sheet.xlsx> [--dry-run] [--stock=100] [--retire]
//
//   --dry-run   check every row, write nothing
//   --batch=N   rows per request (default 500; smaller if a slow server times out)
//   --stock=N   stock for new items (the sheet's Quantity column is empty); default 100
//   --retire    afterwards, remove house products the sheet no longer lists
//   --images=<map.json>  photos from scripts/upload-sheet-images.mjs: every row whose
//                Image URL cell is filled gets its item's photo from the media library
// With two-factor sign-in on, also set TWO_FACTOR_CODE.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { masterRowsFromWorkbook, photoFor, photoIndex, sendMasterRows, summarise } from '../src/lib/masterSheet.js';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const file = process.argv.slice(2).find((a) => !a.startsWith('--'));
const flag = (n) => process.argv.includes(`--${n}`);
const batch = Number((process.argv.find((a) => a.startsWith('--batch=')) || '--batch=500').split('=')[1]);
const stock = Number((process.argv.find((a) => a.startsWith('--stock=')) || '--stock=100').split('=')[1]);
const api = (process.env.API_URL || '').replace(/\/$/, '') + '/api/v1';
if (!file || !process.env.API_URL || !process.env.EMAIL || !process.env.PASSWORD) {
  console.error('Usage: API_URL=… EMAIL=… PASSWORD=… node scripts/import-master-sheet.mjs <sheet.xlsx> [--dry-run] [--stock=100] [--retire]');
  process.exit(1);
}

const csv = /\.csv$/i.test(file);
const wb = csv ? XLSX.read(fs.readFileSync(file, 'utf8'), { type: 'string', raw: true }) : XLSX.readFile(file);
const sheet = masterRowsFromWorkbook(XLSX, wb);
if (!sheet) {
  console.error('No sheet with the master columns (Item Code, Category, Sub category, Item Name, Selling price) found.');
  process.exit(1);
}
const imagesArg = process.argv.find((a) => a.startsWith('--images='));
if (imagesArg) {
  const index = photoIndex(JSON.parse(fs.readFileSync(imagesArg.slice('--images='.length), 'utf8')));
  let matched = 0, missing = new Set();
  for (const r of sheet.rows) {
    if (!r.imageUrl) continue;            // the sheet gives this row no photo
    const url = photoFor(r, index);
    if (url) { r.imageUrl = url; matched++; } else missing.add(`${r.category} / ${r.subCategory} / ${r.itemName}`);
  }
  console.log(`Photos: ${matched} rows matched` + (missing.size ? ` · no photo found for ${[...missing].join('; ')}` : ''));
}
const s = summarise(sheet.rows);
console.log(`${file} › ${sheet.sheet}: ${s.rows} rows · priced ${s.priced} · no price ${s.unpriced} · image links ${s.imageLinks}`
  + (s.imageText ? ` · ${s.imageText} image cells without a link${csv ? ' (CSV keeps no hyperlinks — use the .xlsx)' : ''}` : ''));
console.log('Categories:', Object.entries(s.categories).map(([k, v]) => `${k} ${v}`).join(' · '));

async function call(path, body, token) {
  const res = await fetch(api + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(`${path} → ${res.status} ${data.message || ""}`), { status: res.status });
  return data;
}

async function signIn() {
  let session = await call('/auth/login', { identifier: process.env.EMAIL, password: process.env.PASSWORD });
  if (!session.accessToken && session.challengeId) {
    if (!process.env.TWO_FACTOR_CODE) throw new Error('Two-factor sign-in is on — set TWO_FACTOR_CODE.');
    session = await call('/auth/2fa/verify', { challengeId: session.challengeId, code: process.env.TWO_FACTOR_CODE });
  }
  return session;
}
let session = await signIn();
/* Sessions last 15 minutes and a full sheet can take longer: sign in again once on 401. */
const post = async (path, body) => {
  try {
    return await call(path, body, session.accessToken);
  } catch (x) {
    if (x.status !== 401) throw x;
    session = await signIn();
    return call(path, body, session.accessToken);
  }
};

const started = Date.now();
const report = await sendMasterRows(sheet.rows, {
  post, dryRun: flag('dry-run'), defaultStock: stock, batch,
  onProgress: (done, all) => process.stdout.write(`\r  ${flag('dry-run') ? 'checked' : 'imported'} ${done}/${all}`),
});
console.log(`\n${report.dryRun ? 'Dry run' : 'Imported'} in ${Math.round((Date.now() - started) / 1000)} s: `
  + `created ${report.created} · updated ${report.updated} · skipped ${report.skipped} · `
  + `price on request ${report.priceOnRequest} · with photo ${report.withImage}`);

const errors = report.lines.filter((l) => l.errors.length);
const notes = report.lines.filter((l) => !l.errors.length && l.notes.some((n) => !n.startsWith('no selling price')));
for (const l of errors.slice(0, 30)) console.log(`  SKIPPED line ${l.line} ${l.sku ?? ''}: ${l.errors.join('; ')}`);
if (errors.length > 30) console.log(`  … ${errors.length - 30} more skipped rows`);
for (const l of notes.slice(0, 30)) console.log(`  note line ${l.line} ${l.sku}: ${l.notes.filter((n) => !n.startsWith('no selling price')).join('; ')}`);

if (flag('retire')) {
  const keep = sheet.rows.map((r) => r.itemCode).filter(Boolean);
  const retired = await post('/admin/catalog/master-import/retire', { keep, dryRun: flag('dry-run') });
  console.log(`${retired.dryRun ? 'Would remove' : 'Removed'} ${retired.retired} products not in the sheet`
    + (retired.skus.length ? ` (e.g. ${retired.skus.slice(0, 5).join(', ')})` : ''));
}
