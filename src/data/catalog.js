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

/* Admin edits (add / edit / delist done in /admin/products) are persisted by
   AdminStore under this key. We fold them in here at load so the storefront and
   the admin see the same catalogue. Changes take effect on the next page load. */
const ADMIN_KEY = 'nasou_admin_v1';
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

/* The as-shipped catalogue, before admin edits — AdminStore builds its patch on this. */
export const catalogBase = generated.products;
export const products = applyAdminPatch(generated.products);
export const suppliers = supplierList;
export const generatedAt = generated.generatedAt;

export const categories = generated.categories;

const _byId = new Map(products.map((p) => [p.id, p]));
const _bySku = new Map(products.map((p) => [p.sku, p]));
const _catName = new Map(categories.map((c) => [c.slug, c.name]));
const _supplierName = new Map(suppliers.map((s) => [s.slug, s.name]));

export const findProduct = (id) => _byId.get(id) ?? _bySku.get(id) ?? null;
export const categoryName = (slug) => _catName.get(slug) ?? slug;
export const supplierName = (slug) => _supplierName.get(slug) ?? slug;

/* Curated rails ----------------------------------------------------------- */
export const bestsellers = products.filter((p) => p.badges.includes('Bestseller') && p.stock > 0).slice(0, 12);
export const newProducts = products.filter((p) => p.badges.includes('New')).slice(0, 8);
export const dealProducts = [...products]
  .filter((p) => p.discount >= 18 && p.stock > 0)
  .sort((a, b) => b.discount - a.discount)
  .slice(0, 12);

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
    { stage: 'Warehouse', place: 'Nasou · Hyderabad', detail: product.stock > 0 ? `${product.stock} in stock` : 'Awaiting restock', code: 'WH' },
    { stage: 'Dispatch', place: 'Pan-India courier', detail: 'GST invoice included', code: 'SHIP' },
  ];
}
