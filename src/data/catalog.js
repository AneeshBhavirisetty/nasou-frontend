/* ============================================================================
 * catalog.js — storefront view over the generated catalog.
 * ----------------------------------------------------------------------------
 * Source of truth is `catalog.generated.json`, built from `shop data 1.xlsx`
 * by `scripts/build-catalog.mjs` (run `npm run build:catalog` to regenerate).
 * This module keeps a stable public API so components never touch the JSON
 * shape directly.
 * ==========================================================================*/

import generated from './catalog.generated.json';
import supplierList from './suppliers.json';
import { DEPARTMENTS, DEFAULT_DEPARTMENT, departmentMeta } from './departments';
import { canSell, retailerForRow } from '../lib/marketplace';
import { getRetailer, retailersStore } from '../store/retailers';
import { settingsStore } from '../store/settings';
import { LIVE } from '../lib/config';

/* Admin edits (add / edit / delist done in /admin/products) are persisted by
   AdminStore under this key. We fold them in here at load so the storefront and
   the admin see the same catalogue. Changes take effect on the next page load. */
const ADMIN_KEY = 'nasou_admin_v1'; // key kept so existing admin edits survive the rename
function applyAdminPatch(list) {
  try {
    if (typeof localStorage === 'undefined') return list;
    const patch = JSON.parse(localStorage.getItem(ADMIN_KEY) || 'null')?.patch;
    if (!patch) return list;
    const removed = new Set(patch.removed || []);
    const overrides = patch.overrides || {};
    const base = list.filter((p) => !removed.has(p.id)).map((p) => (overrides[p.id] ? { ...p, ...overrides[p.id] } : p));
    return [...(patch.added || []), ...base];
  } catch {
    return list;
  }
}

/* Every product carries its department, an image list (empty until an
   admin attaches one — the UI falls back to ProductArt) and the retailer who
   sells it. Generated rows are spread over the demo retailers. */
const withOwnership = generated.products.map((p) => ({
  ...p,
  department: p.department ?? DEFAULT_DEPARTMENT,
  images: p.images ?? [],
  retailerId: p.retailerId ?? retailerForRow(p.row),
}));

/* Rows added before departments / retailers existed get defaults. */
const withDefaults = (p) => ({
  ...p,
  department: p.department || DEFAULT_DEPARTMENT,
  retailerId: p.retailerId || retailerForRow(p.row || 0),
});

/* The as-shipped catalogue, before admin edits — AdminStore builds its patch on this. */
export const catalogBase = withOwnership;
/* Every product, listed or not — orders, carts and the consoles look up here.
   With an API (LIVE) this starts empty and setLiveCatalog() fills it from
   GET /storefront/snapshot before the app renders. */
export let allProducts = LIVE ? [] : applyAdminPatch(withOwnership).map(withDefaults);
export let suppliers = LIVE ? [] : supplierList;
export let generatedAt = LIVE ? null : generated.generatedAt;

let _byId = new Map(allProducts.map((p) => [p.id, p]));
let _bySku = new Map(allProducts.map((p) => [p.sku, p]));
let _supplierName = new Map(suppliers.map((s) => [s.slug, s.name]));

/* Listed on the storefront only while its retailer may sell (requirement 11:
   suspending a retailer hides their products). */
export const isListed = (p) => !!p && canSell(getRetailer(p.retailerId));
export const sellerName = (p) => getRetailer(p?.retailerId)?.name || '';

/* Live bindings: rebuilt whenever a retailer's status changes, so the shop
   updates without a reload. */
export let products = [];
export let categories = [];
export let departments = [];
let _catName = new Map();

let baseSubs = LIVE ? [] : generated.categories.map((c) => ({ ...c, department: DEFAULT_DEPARTMENT }));

/* LIVE: the server's catalogue replaces the bundled one. `row` keeps the
   deterministic per-product details (offers, batch ids) stable. */
export function setLiveCatalog({ products: list = [], categories: cats = [], brands = [], generatedAt: at = null }) {
  allProducts = list.map((p, i) => withDefaults({ ...p, row: p.row ?? i + 1, images: p.images ?? [], badges: p.badges ?? [] }));
  _byId = new Map(allProducts.map((p) => [p.id, p]));
  _bySku = new Map(allProducts.map((p) => [p.sku, p]));
  suppliers = brands.map((b) => ({ slug: b.slug, name: b.name, tier: b.tier, blurb: b.blurb || '' }));
  _supplierName = new Map(suppliers.map((b) => [b.slug, b.name]));
  baseSubs = cats.map((c) => ({ slug: c.slug, name: c.name, department: c.department || DEFAULT_DEPARTMENT, blurb: c.blurb || '' }));
  generatedAt = at;
  rebuild();
}

function rebuild() {
  products = allProducts.filter(isListed);
  /* Sub-categories: the seven generated plumbing categories plus any created
     on products (name carried as product.subcategoryName) or in the master
     catalog. */
  const extra = [];
  for (const p of allProducts) {
    if (baseSubs.some((c) => c.slug === p.category) || extra.some((c) => c.slug === p.category)) continue;
    extra.push({ slug: p.category, name: p.subcategoryName || p.category, department: p.department, blurb: '' });
  }
  for (const c of masterSubs()) {
    if (baseSubs.some((x) => x.slug === c.slug) || extra.some((x) => x.slug === c.slug)) continue;
    extra.push({ ...c, blurb: c.blurb || '' });
  }
  categories = [...baseSubs, ...extra].map((c) => ({ ...c, count: products.filter((p) => p.category === c.slug).length }));
  departments = DEPARTMENTS.map((d) => ({
    ...d,
    subs: categories.filter((c) => c.department === d.slug),
    count: products.filter((p) => p.department === d.slug).length,
  }));
  _catName = new Map(categories.map((c) => [c.slug, c.name]));
  bestsellers = products.filter((p) => p.badges.includes('Bestseller') && p.stock > 0).slice(0, 12);
  newProducts = products.filter((p) => p.badges.includes('New')).slice(0, 8);
  dealProducts = [...products].filter((p) => p.discount >= 18 && p.stock > 0).sort((a, b) => b.discount - a.discount).slice(0, 12);
}
function masterSubs() {
  try { return settingsStore.get().catalog?.subs || []; } catch { return []; }
}

export const departmentName = (slug) => departmentMeta(slug).name;
export const subcategoriesOf = (dept) => categories.filter((c) => c.department === dept);

export const findProduct = (id) => _byId.get(id) ?? _bySku.get(id) ?? null;

/* Keep the in-memory storefront copy in step with admin edits and orders
   (stock after checkout, price/stock edits) without a page reload. The
   persisted source of truth is still the AdminStore patch in localStorage. */
export function syncLiveProduct(id, fields) {
  const p = _byId.get(id);
  if (p) Object.assign(p, fields);
  else if (fields?.id) {
    const row = withDefaults(fields);
    allProducts.unshift(row);
    _byId.set(row.id, row);
    if (row.sku) _bySku.set(row.sku, row);
    rebuild();
  }
}
export const categoryName = (slug) => _catName.get(slug) ?? slug;
export const supplierName = (slug) => _supplierName.get(slug) ?? slug;

/* Brand record for a typed brand name (admin forms / bulk import), or null. */
const slugifyBrand = (name) => String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export const brandSlug = (name) => slugifyBrand(name) || 'nasou';
export const brandForName = (name) => suppliers.find((s) => s.slug === slugifyBrand(name)) ?? null;

/* Curated rails ----------------------------------------------------------- */
export let bestsellers = [];
export let newProducts = [];
export let dealProducts = [];

rebuild();
retailersStore.subscribe(rebuild);
settingsStore.subscribe(rebuild);

export const byCategory = (slug) => products.filter((p) => p.category === slug);

export function relatedProducts(product, n = 8) {
  if (!product) return [];
  return products
    .filter((p) => p.id !== product.id && p.category === product.category)
    .sort((a, b) => Math.abs(a.price - product.price) - Math.abs(b.price - product.price))
    .slice(0, n);
}

/* Search — name / sku / supplier / size / material ----------------------- */
export function searchProducts(query, { limit = Infinity } = {}) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return [];
  const terms = needle.split(/\s+/);
  const scored = [];
  for (const p of products) {
    const hay = `${p.name} ${p.sku} ${p.supplierName} ${p.size} ${p.material} ${p.description}`.toLowerCase();
    if (!terms.every((t) => hay.includes(t))) continue;
    let score = 0;
    if (p.sku.toLowerCase() === needle) score += 100;
    if (p.name.toLowerCase().includes(needle)) score += 20;
    if (p.name.toLowerCase().startsWith(needle)) score += 10;
    if (p.stock > 0) score += 3;
    score += p.rating;
    scored.push([score, p]);
  }
  scored.sort((a, b) => b[0] - a[0]);
  const out = scored.map(([, p]) => p);
  return Number.isFinite(limit) ? out.slice(0, limit) : out;
}

/* Supplier offers — the primary supplier plus a couple of competing quotes,
   deterministic so the grid card and product page always agree. --------- */
const CITIES = ['Hyderabad', 'Suryapet', 'Vijayawada', 'Guntur', 'Warangal', 'Nizamabad'];
const ETAS = ['Ships today', 'Ships in 1 day', 'Ships in 2 days'];

export function offersFor(product) {
  if (!product) return [];
  const others = suppliers
    .filter((s) => s.slug !== product.supplier)
    .slice(0, 6)
    .filter((_, i) => (product.row + i) % 3 === 0)
    .slice(0, 2);
  const primary = {
    id: product.supplier,
    name: product.supplierName,
    tier: product.supplierTier,
    city: CITIES[product.row % CITIES.length],
    eta: product.stock > 0 ? ETAS[product.row % ETAS.length] : 'Out of stock',
    price: product.price,
    inStock: product.stock > 0,
    best: true,
  };
  const rest = others.map((s, i) => ({
    id: s.slug,
    name: s.name,
    tier: s.tier,
    city: CITIES[(product.row + i + 1) % CITIES.length],
    eta: ETAS[(product.row + i) % ETAS.length],
    price: Math.round((product.price * (1.04 + ((product.row + i) % 5) * 0.03)) / 5) * 5,
    inStock: true,
    best: false,
  }));
  return [primary, ...rest];
}

/* Trace record — origin → maker → batch, derived from the product. ------- */
export const batchId = (product) =>
  product ? `${product.sku}-${String((product.row * 7) % 900 + 100)}` : '';

export function buildTrace(product) {
  if (!product) return [];
  return [
    { stage: 'Supplier', place: product.supplierName, detail: 'Manufacturer of record', code: 'SUP' },
    { stage: 'Material', place: product.material, detail: `${product.form} · ${product.size || 'standard'}`, code: 'MAT' },
    { stage: 'Batch', place: batchId(product), detail: 'Deterministic batch reference', code: 'BAT' },
    { stage: 'Seller', place: sellerName(product) || 'Nivora seller', detail: product.stock > 0 ? `${product.stock} in stock` : 'Awaiting restock', code: 'WH' },
    { stage: 'Dispatch', place: 'Pan-India courier', detail: 'GST invoice included', code: 'SHIP' },
  ];
}
