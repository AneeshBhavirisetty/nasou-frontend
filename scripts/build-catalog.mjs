/* ============================================================================
 * build-catalog.mjs  —  turn "shop data 1.xlsx" into a real storefront catalog
 * ----------------------------------------------------------------------------
 * The workbook has 1,472 rows of genuine product metadata (code, name,
 * description, material, size, sub-category, supplier) but NO price / quantity
 * / discount. This script:
 *   1. reads + normalises the messy source (casing, typos, abbreviations),
 *   2. maps every row to a storefront category,
 *   3. synthesises deterministic commerce data (price, mrp, stock, rating…)
 *      with a seeded PRNG so values never drift between reloads or rebuilds,
 *   4. writes src/data/catalog.generated.json + src/data/suppliers.json.
 *
 * Run:  npm run build:catalog     (or: node scripts/build-catalog.mjs)
 * Output is committed — the app imports the JSON, not this script, so `xlsx`
 * is only an optionalDependency (build/deploy never needs it). If it is
 * missing, install it first:  npm i -D https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz
 * ==========================================================================*/

import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';
import * as XLSX from 'xlsx';

const ROOT = path.resolve(url.fileURLToPath(new URL('.', import.meta.url)), '..');
const SRC_XLSX = path.join(ROOT, 'shop data 1.xlsx');
const OUT_CATALOG = path.join(ROOT, 'src/data/catalog.generated.json');
const OUT_SUPPLIERS = path.join(ROOT, 'src/data/suppliers.json');

/* ── deterministic PRNG ──────────────────────────────────────────────────── */
function hash32(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ── vocabulary ──────────────────────────────────────────────────────────── */
// raw lowercased item name -> { base display name, kind, art, qualifier }
const NAME_MAP = {
  lbow: { base: 'Elbow', kind: 'elbow', art: 'elbow' },
  'thread lbow': { base: 'Elbow', kind: 'elbow', art: 'elbow', q: 'Threaded' },
  'macho lbow': { base: 'Elbow', kind: 'elbow', art: 'elbow', q: 'Heavy' },
  'agri lbow': { base: 'Elbow', kind: 'elbow', art: 'elbow', q: 'Agri' },
  'door lbow': { base: 'Elbow', kind: 'elbow', art: 'elbow', q: 'Door' },
  'brass lbow': { base: 'Elbow', kind: 'elbow', art: 'elbow', q: 'Brass' },
  tee: { base: 'Tee', kind: 'tee', art: 'tee' },
  'thread tee': { base: 'Tee', kind: 'tee', art: 'tee', q: 'Threaded' },
  'macho tee': { base: 'Tee', kind: 'tee', art: 'tee', q: 'Heavy' },
  'agri tee': { base: 'Tee', kind: 'tee', art: 'tee', q: 'Agri' },
  'door tee': { base: 'Tee', kind: 'tee', art: 'tee', q: 'Door' },
  'brass tee': { base: 'Tee', kind: 'tee', art: 'tee', q: 'Brass' },
  coupling: { base: 'Coupling', kind: 'coupling', art: 'coupling' },
  'long coupling': { base: 'Coupling', kind: 'coupling', art: 'coupling', q: 'Long' },
  'door coupling': { base: 'Coupling', kind: 'coupling', art: 'coupling', q: 'Door' },
  reducer: { base: 'Reducer', kind: 'reducer', art: 'reducer' },
  bush: { base: 'Reducer Bush', kind: 'bush', art: 'bush' },
  fta: { base: 'FTA · Female Threaded Adapter', kind: 'fta', art: 'adapter' },
  'brass fta': { base: 'FTA · Female Threaded Adapter', kind: 'fta', art: 'adapter', q: 'Brass' },
  'brass fta(reducer)': { base: 'FTA Reducer', kind: 'fta', art: 'adapter', q: 'Brass' },
  mta: { base: 'MTA · Male Threaded Adapter', kind: 'mta', art: 'adapter' },
  'brass mta': { base: 'MTA · Male Threaded Adapter', kind: 'mta', art: 'adapter', q: 'Brass' },
  'long bend': { base: 'Long Bend', kind: 'bend', art: 'bend' },
  'step over bend': { base: 'Step-Over Bend', kind: 'bend', art: 'bend' },
  'stepover bend': { base: 'Step-Over Bend', kind: 'bend', art: 'bend' },
  shoe: { base: 'Shoe Bend', kind: 'shoe', art: 'shoe' },
  'agri shoe': { base: 'Shoe Bend', kind: 'shoe', art: 'shoe', q: 'Agri' },
  dummy: { base: 'End Cap', kind: 'cap', art: 'cap' },
  'thread dummy': { base: 'End Cap', kind: 'cap', art: 'cap', q: 'Threaded' },
  union: { base: 'Union', kind: 'union', art: 'union' },
  'ball valve': { base: 'Ball Valve', kind: 'valve', art: 'valve' },
  'ball vallve': { base: 'Ball Valve', kind: 'valve', art: 'valve' },
  'brass ball valve': { base: 'Ball Valve', kind: 'valve', art: 'valve', q: 'Brass' },
  'thread ball valve': { base: 'Ball Valve', kind: 'valve', art: 'valve', q: 'Threaded' },
  saddle: { base: 'Saddle Clamp', kind: 'saddle', art: 'saddle' },
  pipe: { base: 'Pipe', kind: 'pipe', art: 'pipe' },
  'pvc pipe': { base: 'Pipe', kind: 'pipe', art: 'pipe' },
  'tank nipple (bush)': { base: 'Tank Nipple · Bush', kind: 'nipple', art: 'nipple' },
  'tank nipples(bush)': { base: 'Tank Nipple · Bush', kind: 'nipple', art: 'nipple' },
  'tank nipple (thread)': { base: 'Tank Nipple · Threaded', kind: 'nipple', art: 'nipple' },
  'tank nipples(thread)': { base: 'Tank Nipple · Threaded', kind: 'nipple', art: 'nipple' },
};

const BASE_PRICE = {
  elbow: 46, tee: 68, coupling: 40, reducer: 58, bush: 34, fta: 74, mta: 70,
  bend: 132, shoe: 88, cap: 24, union: 250, valve: 330, saddle: 96, nipple: 118, pipe: 470,
};
const MATERIAL_MULT = { PVC: 1, uPVC: 1.36, cPVC: 1.72 };
const QUALIFIER_MULT = { Brass: 2.25, Threaded: 1.16, Heavy: 1.32, Agri: 0.9, Door: 1.12, Long: 1.18 };

// merge obvious data-entry typos into the real supplier
const SUPPLIER_ALIAS = {
  ahirvad: 'ashirvad', ashirvsd: 'ashirvad', ashiravad: 'ashirvad', ashivad: 'ashirvad',
  ashirvsd: 'ashirvad', ahiravad: 'ashirvad',
  wtaerflo: 'waterflo', waterftec: 'watertec', watetec: 'watertec', 'wa­tertec': 'watertec',
  jeeva: 'jeevan', vaahini: 'vahini', vaari: 'vahini',
  starndard: 'standard', starndrd: 'standard',
  starpro: 'star pro', 'star-pro': 'star pro',
  sunplus: 'sun plus', 'sun-plus': 'sun plus',
};
const SUPPLIER_TIER = {
  astral: 'premium', ashirvad: 'premium', finolex: 'premium', supreme: 'premium',
  sentini: 'premium', 'star pro': 'premium', skipper: 'premium', zoloto: 'premium',
  parryware: 'premium',
  watertec: 'mid', flowman: 'mid', vahini: 'mid', kasta: 'mid', aquatek: 'mid',
  sanystar: 'mid', kothari: 'mid', splendor: 'mid', 'sun plus': 'mid', freshdrop: 'mid',
  star: 'value', waterflo: 'value', jeevan: 'value', narayanee: 'value',
  ajay: 'value', standard: 'value',
};
const TIER_MULT = { premium: 1.19, mid: 1.06, value: 0.95 };
const TIER_BLURB = {
  premium: 'National brand · ISI-marked, warehouse-stocked',
  mid: 'Regional brand · consistent supply, fair pricing',
  value: 'Trade-grade · best price for volume jobs',
};

/* ── helpers ─────────────────────────────────────────────────────────────── */
const clean = (s) => String(s ?? '').replace(/\s+/g, ' ').trim();
const titleCase = (s) =>
  clean(s).toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());

function normSize(raw) {
  let s = clean(raw).toLowerCase();
  if (!s) return '';
  s = s.replace(/inch(es)?/g, '').replace(/["']+/g, '').replace(/\s+/g, ' ').trim();
  s = s.replace(/\s*\*\s*/g, ' × ');
  return s ? s + '″' : '';
}
function maxInches(sizeRaw) {
  const nums = [];
  const cleaned = clean(sizeRaw).toLowerCase().replace(/["']|inch(es)?/g, '');
  for (const raw of cleaned.split(/[×*x]/)) {
    const t = raw.trim();
    let m;
    if ((m = t.match(/^(\d+)-(\d+)\/(\d+)$/))) nums.push(Number(m[1]) + Number(m[2]) / Number(m[3]));
    else if ((m = t.match(/^(\d+)\/(\d+)$/))) nums.push(Number(m[1]) / Number(m[2]));
    else if ((m = t.match(/^(\d+)$/))) nums.push(Number(m[1]));
  }
  return nums.length ? Math.max(...nums) : 0.75;
}
function roundPrice(v) {
  if (v < 100) return Math.max(5, Math.round(v));
  if (v < 1000) return Math.round(v / 5) * 5;
  return Math.round(v / 10) * 10;
}
const slugify = (s) =>
  clean(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/* ── read workbook ───────────────────────────────────────────────────────── */
if (!fs.existsSync(SRC_XLSX)) {
  console.error(`✗ workbook not found: ${SRC_XLSX}`);
  process.exit(1);
}
const wb = XLSX.read(fs.readFileSync(SRC_XLSX), { type: 'buffer' });
const sheet = wb.Sheets[wb.SheetNames[0]];
const rawRows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
const header = rawRows[0].map((h) => clean(h).toLowerCase());
const col = (name) => header.findIndex((h) => h.includes(name));
const IDX = {
  code: col('item code'),
  name: col('item name'),
  desc: col('item description'),
  type: col('item type'),
  size: col('item size'),
  sub: col('sub category'),
  supplier: col('supplier name'),
};

/* ── transform ───────────────────────────────────────────────────────────── */
const supplierAgg = new Map();
const catAgg = new Map();
const seenIds = new Set();
const products = [];
let newestPool = [];

for (let r = 1; r < rawRows.length; r++) {
  const row = rawRows[r];
  if (!row || !clean(row[IDX.code])) continue;

  const sku = clean(row[IDX.code]).toUpperCase();
  const rawName = clean(row[IDX.name]).toLowerCase();
  const rawDesc = clean(row[IDX.desc]);
  let material = clean(row[IDX.type]);
  material = { pvc: 'PVC', upvc: 'uPVC', cpvc: 'cPVC' }[material.toLowerCase()] || 'PVC';
  const sizeRaw = clean(row[IDX.size]);
  const size = normSize(sizeRaw);
  let supplierRaw = clean(row[IDX.supplier]).toLowerCase() || 'nasou';
  supplierRaw = SUPPLIER_ALIAS[supplierRaw] || supplierRaw;
  const subRaw = clean(row[IDX.sub]).toLowerCase();

  const meta =
    NAME_MAP[rawName] ||
    NAME_MAP[rawName.replace(/s$/, '')] || { base: titleCase(rawName || 'Fitting'), kind: 'fitting', art: 'coupling' };
  const qualifier = meta.q || '';

  // form + category
  const isPipe = meta.kind === 'pipe' || /pipe/.test(subRaw);
  const isAccessory = ['valve', 'saddle', 'union', 'nipple'].includes(meta.kind);
  const matSlug = { PVC: 'pvc', uPVC: 'upvc', cPVC: 'cpvc' }[material];
  const form = isPipe ? 'Pipes' : isAccessory ? 'Accessories' : 'Fittings';
  const category = isAccessory
    ? 'plumbing-accessories'
    : isPipe
      ? `${matSlug}-pipes`
      : `${matSlug}-fittings`;

  // display names
  const shortName = clean(`${qualifier} ${material} ${meta.base}`);
  const title = size ? `${shortName} · ${size}` : shortName;
  const variantLabel = [material, size, qualifier].filter(Boolean).join(' · ');
  const baseLabel = meta.base.replace(/ ·.*/, '');
  const description =
    `${material} ${baseLabel.toLowerCase()}${size ? ` in ${size}` : ''}, solvent-weld grade, ` +
    `manufactured by ${titleCase(supplierRaw)}. ${
      isPipe ? 'Supplied in standard lengths.' : 'Sold per piece.'
    }`;

  // deterministic commerce data
  const rng = mulberry32(hash32(sku + '|' + supplierRaw));
  const tier = SUPPLIER_TIER[supplierRaw] || 'value';
  const sizeMult = 0.7 + 0.52 * maxInches(sizeRaw);
  const qMult = QUALIFIER_MULT[qualifier] || 1;
  let price =
    (BASE_PRICE[meta.kind] ?? 50) *
    (MATERIAL_MULT[material] ?? 1) *
    sizeMult *
    qMult *
    (TIER_MULT[tier] ?? 1) *
    (0.93 + rng() * 0.14);
  price = roundPrice(price);
  const mrp = roundPrice(price * (1.12 + rng() * 0.3) + 1);
  const discount = Math.max(0, Math.round(((mrp - price) / mrp) * 100));

  const stockRoll = rng();
  const stock = stockRoll < 0.07 ? 0 : stockRoll < 0.16 ? 1 + Math.floor(rng() * 8) : 12 + Math.floor(rng() * 130);
  const rating = Math.round((3.7 + rng() * 1.2) * 10) / 10;
  const reviewCount = 3 + Math.floor(rng() * rng() * 260);

  let id = sku;
  while (seenIds.has(id)) id = `${sku}-${seenIds.size}`;
  seenIds.add(id);

  const product = {
    id,
    sku,
    row: Number(clean(row[IDX.code]).replace(/\D/g, '')) || r,
    name: shortName,
    title,
    variantLabel,
    description,
    material,
    form,
    kind: meta.kind,
    art: meta.art,
    size,
    sizeRaw,
    supplier: slugify(supplierRaw),
    supplierName: titleCase(supplierRaw),
    supplierTier: tier,
    category,
    price,
    mrp,
    discount,
    stock,
    rating,
    reviewCount,
    badges: [],
    _score: rng(), // seeded, for badge selection below
  };
  products.push(product);
  newestPool.push(product);

  // aggregates
  const s = supplierAgg.get(product.supplier) || { slug: product.supplier, name: product.supplierName, tier, count: 0 };
  s.count++;
  supplierAgg.set(product.supplier, s);

  const c = catAgg.get(category) || {
    slug: category,
    material,
    form,
    count: 0,
  };
  c.count++;
  catAgg.set(category, c);
}

/* ── badges (seeded, stable) ─────────────────────────────────────────────── */
const byScore = [...products].sort((a, b) => b._score - a._score);
byScore.slice(0, Math.round(products.length * 0.06)).forEach((p) => p.badges.push('Bestseller'));
products
  .filter((p) => p.discount >= 22)
  .sort((a, b) => b.discount - a.discount)
  .slice(0, Math.round(products.length * 0.12))
  .forEach((p) => p.badges.push('Value'));
newestPool
  .sort((a, b) => b.row - a.row)
  .slice(0, 48)
  .forEach((p) => p.badges.push('New'));
products.forEach((p) => delete p._score);

/* ── category display copy ──────────────────────────────────────────────── */
const CAT_COPY = {
  'pvc-fittings': ['PVC fittings', 'Elbows, tees, couplings, reducers and valves in rigid PVC'],
  'pvc-pipes': ['PVC pipes', 'Rigid PVC pipe in every pressure grade and size'],
  'upvc-fittings': ['uPVC fittings', 'High-durability threaded and solvent-weld uPVC fittings'],
  'upvc-pipes': ['uPVC pipes', 'Lead-free uPVC pressure pipe for potable water'],
  'cpvc-fittings': ['cPVC fittings', 'Hot-water rated cPVC fittings for concealed plumbing'],
  'cpvc-pipes': ['cPVC pipes', 'SDR-11 cPVC pipe rated for 93°C hot water'],
  'plumbing-accessories': ['Accessories', 'Ball valves, unions, saddles and tank nipples'],
};
const categories = [...catAgg.values()]
  .map((c) => ({
    slug: c.slug,
    name: CAT_COPY[c.slug]?.[0] || titleCase(c.slug.replace(/-/g, ' ')),
    blurb: CAT_COPY[c.slug]?.[1] || '',
    material: c.material,
    form: c.form,
    count: c.count,
  }))
  .sort((a, b) => b.count - a.count);

const suppliers = [...supplierAgg.values()]
  .map((s) => ({ ...s, blurb: TIER_BLURB[s.tier] }))
  .sort((a, b) => b.count - a.count);

/* ── write ──────────────────────────────────────────────────────────────── */
const catalog = {
  generatedAt: new Date().toISOString(),
  source: 'shop data 1.xlsx',
  counts: { products: products.length, categories: categories.length, suppliers: suppliers.length },
  categories,
  products,
};
fs.mkdirSync(path.dirname(OUT_CATALOG), { recursive: true });
fs.writeFileSync(OUT_CATALOG, JSON.stringify(catalog));
fs.writeFileSync(OUT_SUPPLIERS, JSON.stringify(suppliers, null, 2));

console.log(`✓ ${products.length} products → ${path.relative(ROOT, OUT_CATALOG)}`);
console.log(`  ${categories.length} categories: ${categories.map((c) => `${c.slug}(${c.count})`).join(', ')}`);
console.log(`  ${suppliers.length} suppliers → ${path.relative(ROOT, OUT_SUPPLIERS)}`);
const priced = products.filter((p) => p.price > 0).length;
const inStock = products.filter((p) => p.stock > 0).length;
console.log(`  priced: ${priced}/${products.length}  ·  in stock: ${inStock}  ·  badged: ${products.filter((p) => p.badges.length).length}`);
