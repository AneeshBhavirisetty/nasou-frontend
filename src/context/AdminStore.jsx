import { useCallback, useMemo } from 'react';
import { catalogBase as CATALOG, syncLiveProduct } from '../data/catalog';
import { createStore, useStore, uid } from '../lib/store';
import { audit } from '../lib/auditLog';
import { LIVE } from '../lib/config';
import { del, patch as apiPatch, post, put, refresh, who } from '../lib/live';

/* ============================================================================
 * AdminStore — the working copy of catalogue + discount data.
 *
 * Products are stored as a *patch* over the generated catalogue (edits, adds,
 * removals) so we never persist the whole 1,400-row array. Coupons and bulk
 * rules are stored in full. The store is module-level so checkout, order
 * cancellation and the seller console all move the same stock numbers, and
 * every stock movement lands in the stock ledger (customer review: "when an
 * order is placed inventory must be updated").
 * ==========================================================================*/

const KEY = 'nasou_admin_v1'; // key kept so existing admin edits survive the rename
const emptyPatch = { overrides: {}, added: [], removed: [] };

/* Bulk (quantity) pricing — see lib/pricing.js for how rules apply. */
function seedBulkRules() {
  return [
    { id: 'b1', name: 'PVC fittings trade pack', scopeType: 'category', scopeValue: 'pvc-fittings', minQty: 50, kind: 'percent', value: 8, active: true },
    { id: 'b2', name: 'Astral volume', scopeType: 'brand', scopeValue: 'astral', minQty: 100, kind: 'percent', value: 5, active: true },
    { id: 'b3', name: 'PVC Elbow ½″ box of 25', scopeType: 'product', scopeValue: 'PL00001', minQty: 25, kind: 'flat', value: 3, active: false },
  ];
}

/* `scope` is '' (whole cart), a sub-category slug, or 'dept:<slug>'.
   `autoApply` codes apply themselves at checkout when the cart qualifies. */
function seedCoupons() {
  return [
    { id: 'c1', code: 'MONSOON10', kind: 'percent', value: 10, minOrder: 999, maxDiscount: 500, scope: '', expiry: '', active: true },
    { id: 'c2', code: 'FIRST150', kind: 'flat', value: 150, minOrder: 1500, maxDiscount: 0, scope: '', expiry: '', active: true },
    { id: 'c3', code: 'CPVC20', kind: 'percent', value: 20, minOrder: 2000, maxDiscount: 1200, scope: 'cpvc-fittings', expiry: '', active: false },
  ];
}

const init = () => ({ patch: emptyPatch, coupons: seedCoupons(), bulkRules: seedBulkRules() });
export const adminStore = createStore(KEY, init, () => ({ patch: emptyPatch, coupons: [], bulkRules: [] }));
export const stockLedgerStore = createStore('nivora_stock_ledger_v1', () => []);
/* LIVE: the console's products as the API returns them (every retailer's
   for the team, the retailer's own in the seller console). */
export const liveProductsStore = createStore('nivora_live_products', () => []);

/* ── LIVE: products, codes and bulk rules through nasou-api ──────────────── */
const base = () => (who()?.role === 'ADMIN' ? '/admin' : '/seller');
const sku = (p) => encodeURIComponent(p.sku || p.id);
const productInput = (p) => ({
  sku: p.sku, name: p.name, description: p.description, department: p.department,
  subcategory: p.subcategoryName || p.category, supplierName: p.supplierName, material: p.material, form: p.form,
  kind: p.kind, art: p.art, size: p.size, price: p.price, mrp: p.mrp, stock: p.stock,
  images: p.images || [], badges: p.badges || [], version: p.version,
});
const afterProducts = () => refresh('products', 'stock', 'catalog');
const live = {
  async saveProduct(prod) {
    const existing = liveProductsStore.get().find((p) => p.id === prod.id || p.sku === prod.sku);
    if (existing) await put(`${base()}/products/${sku(existing)}`, productInput({ ...existing, ...prod, version: existing.version }));
    else if (base() === '/admin') await post(`/admin/products?retailerId=${encodeURIComponent(prod.retailerId || '')}`, productInput(prod));
    else await post('/seller/products', productInput(prod));
    return afterProducts();
  },
  async setStock(id, stock) {
    const p = productById(id);
    await apiPatch(`${base()}/products/${sku(p || { id })}/inventory`, { stock });
    return afterProducts();
  },
  async deleteProduct(id) {
    const p = productById(id);
    await del(`${base()}/products/${sku(p || { id })}`);
    return afterProducts();
  },
  async saveCoupon(c) {
    const body = { code: c.code, kind: c.kind, value: c.value, minOrder: c.minOrder || 0, maxDiscount: c.maxDiscount || 0, scope: c.scope || '', startsOn: c.startsOn || '', expiry: c.expiry || '', active: c.active !== false, usageLimit: c.usageLimit ?? null, version: c.version, autoApply: !!c.autoApply };
    const known = adminStore.get().coupons.some((x) => x.id === c.id);
    if (known) await put(`/admin/coupons/${c.id}`, body);
    else await post('/admin/coupons', body);
    return refresh('discounts');
  },
  /* a whole sheet in one request (POST /admin|seller/products/import) */
  async importProducts(list, retailerId) {
    const rows = list.map((p) => ({
      sku: p.sku, name: p.name, department: p.department, category: p.subcategoryName || p.category, material: p.material,
      size: p.size, brand: p.supplierName, price: String(p.price), mrp: String(p.mrp ?? ''), stock: String(p.stock ?? 0),
      art: p.art, imageUrl: (p.images || [])[0] || null,
    }));
    const report = await post(`${base()}/products/import`, { rows, retailerId, source: 'console import' });
    await afterProducts();
    return report;
  },
  async saveBulkRule(r) {
    const body = { name: r.name, scopeType: r.scopeType, scopeValue: r.scopeValue, minQty: r.minQty, kind: r.kind, value: r.value, active: r.active !== false, version: r.version };
    const known = adminStore.get().bulkRules.some((x) => x.id === r.id);
    if (known) await put(`/admin/bulk-rules/${r.id}`, body);
    else await post('/admin/bulk-rules', body);
    return refresh('discounts', 'catalog');
  },
};

const ensureShape = (s) => ({
  patch: { ...emptyPatch, ...(s?.patch || {}) },
  coupons: Array.isArray(s?.coupons) ? s.coupons : seedCoupons(),
  bulkRules: Array.isArray(s?.bulkRules) ? s.bulkRules : seedBulkRules(),
});
const setSection = (k, fn) => adminStore.set((s) => { const x = ensureShape(s); return { ...x, [k]: fn(x[k]) }; });

/* Derived product list: catalogue minus removed, with overrides applied,
   plus admin-added rows on top. */
let _cache = { patch: null, list: [] };
export function adminProducts() {
  if (LIVE) return liveProductsStore.get();
  const { patch } = ensureShape(adminStore.get());
  if (_cache.patch === patch) return _cache.list;
  const removed = new Set(patch.removed);
  const base = CATALOG.filter((p) => !removed.has(p.id)).map((p) => (patch.overrides[p.id] ? { ...p, ...patch.overrides[p.id] } : p));
  _cache = { patch, list: [...patch.added, ...base] };
  return _cache.list;
}
export const productById = (id) => adminProducts().find((p) => p.id === id || p.sku === id) || null;

function writeStock(id, n) {
  syncLiveProduct(id, { stock: n });
  setSection('patch', (pt) => {
    if (pt.added.some((p) => p.id === id)) return { ...pt, added: pt.added.map((p) => (p.id === id ? { ...p, stock: n } : p)) };
    return { ...pt, overrides: { ...pt.overrides, [id]: { ...pt.overrides[id], stock: n } } };
  });
}

/* Move stock and record why. delta < 0 sells, > 0 restocks. */
export function adjustStock(id, delta, { reason = 'adjustment', ref = null, by = '' } = {}) {
  if (LIVE) return null; // the server moves stock with the order and logs it
  const p = productById(id);
  if (!p) return null;
  const before = Number(p.stock) || 0;
  const after = Math.max(0, before + delta);
  writeStock(p.id, after);
  stockLedgerStore.set((l) => [{ id: uid('sl'), at: Date.now(), productId: p.id, sku: p.sku, name: p.name, retailerId: p.retailerId, before, after, delta: after - before, reason, ref, by }, ...l].slice(0, 1500));
  return after;
}

export function AdminStoreProvider({ children }) {
  return children;
}

export function useAdminStore() {
  const state = useStore(adminStore);
  const liveList = useStore(liveProductsStore);
  const { patch, coupons, bulkRules } = ensureShape(state);
  const products = useMemo(() => (LIVE ? liveList : adminProducts()), [patch, liveList]); // eslint-disable-line react-hooks/exhaustive-deps
  const dirty = !LIVE && patch.added.length + patch.removed.length + Object.keys(patch.overrides).length > 0;

  const setStock = useCallback((id, stock, meta = {}) => {
    if (LIVE) return live.setStock(id, Math.max(0, Math.round(Number(stock) || 0)));
    const p = productById(id);
    const n = Math.max(0, Math.round(Number(stock) || 0));
    if (!p) return;
    adjustStock(id, n - (Number(p.stock) || 0), { reason: 'manual count', ...meta });
  }, []);

  const saveProduct = useCallback((prod, by) => {
    if (LIVE) return live.saveProduct(prod);
    syncLiveProduct(prod.id, prod);
    const existing = productById(prod.id);
    setSection('patch', (pt) => {
      if (pt.added.some((p) => p.id === prod.id)) return { ...pt, added: pt.added.map((p) => (p.id === prod.id ? { ...p, ...prod } : p)) };
      if (CATALOG.some((p) => p.id === prod.id)) return { ...pt, overrides: { ...pt.overrides, [prod.id]: { ...pt.overrides[prod.id], ...prod } } };
      return { ...pt, added: [{ ...prod }, ...pt.added] };
    });
    audit({
      action: existing ? 'product.update' : 'product.create', entity: 'product', entityId: prod.sku || prod.id,
      summary: `${existing ? 'Edited' : 'Added'} ${prod.name}${by ? ` (${by})` : ''}`,
      before: existing ? { price: existing.price, stock: existing.stock } : null,
      after: { price: prod.price, stock: prod.stock, retailerId: prod.retailerId },
    });
  }, []);

  const deleteProduct = useCallback((id) => {
    if (LIVE) return live.deleteProduct(id);
    const p = productById(id);
    setSection('patch', (pt) => {
      if (pt.added.some((x) => x.id === id)) return { ...pt, added: pt.added.filter((x) => x.id !== id) };
      const { [id]: _drop, ...rest } = pt.overrides;
      return { ...pt, overrides: rest, removed: [...new Set([...pt.removed, id])] };
    });
    audit({ action: 'product.delete', entity: 'product', entityId: p?.sku || id, summary: `Delisted ${p?.name || id}` });
  }, []);

  const saveCoupon = useCallback((coupon) => {
    if (LIVE) return live.saveCoupon(coupon);
    setSection('coupons', (cs) => (cs.some((c) => c.id === coupon.id) ? cs.map((c) => (c.id === coupon.id ? { ...c, ...coupon } : c)) : [{ ...coupon }, ...cs]));
    audit({ action: 'discount.save', entity: 'coupon', entityId: coupon.code, summary: `Saved code ${coupon.code}${coupon.autoApply ? ' (auto-applies)' : ''}`, after: { value: coupon.value, kind: coupon.kind, scope: coupon.scope, active: coupon.active } });
  }, []);
  const deleteCoupon = useCallback((id) => {
    if (LIVE) return del(`/admin/coupons/${id}`).then(() => refresh('discounts'));
    setSection('coupons', (cs) => cs.filter((c) => c.id !== id));
    audit({ action: 'discount.delete', entity: 'coupon', entityId: id, summary: 'Deleted a discount code' });
  }, []);

  const saveBulkRule = useCallback((rule) => {
    if (LIVE) return live.saveBulkRule(rule);
    setSection('bulkRules', (rs) => (rs.some((r) => r.id === rule.id) ? rs.map((r) => (r.id === rule.id ? { ...r, ...rule } : r)) : [{ ...rule }, ...rs]));
    audit({ action: 'discount.bulk_rule', entity: 'bulk_rule', entityId: rule.id, summary: `Saved bulk rule “${rule.name}”` });
  }, []);
  const deleteBulkRule = useCallback((id) => (LIVE ? del(`/admin/bulk-rules/${id}`).then(() => refresh('discounts'))
    : setSection('bulkRules', (rs) => rs.filter((r) => r.id !== id))), []);

  const reset = useCallback(() => {
    if (LIVE) return;
    adminStore.set(init());
    audit({ action: 'catalog.reset', entity: 'catalog', summary: 'Restored the shipped catalogue' });
  }, []);

  const importProducts = useCallback(async (list, retailerId, by) => {
    if (LIVE) return live.importProducts(list, retailerId);
    list.forEach((p) => saveProduct({ ...p, ...(retailerId ? { retailerId } : {}) }, by));
    return { created: list.length };
  }, [saveProduct]);

  return { products, coupons, bulkRules, dirty, setStock, saveProduct, deleteProduct, importProducts, saveCoupon, deleteCoupon, saveBulkRule, deleteBulkRule, reset };
}

/* Coupon math — used by admin preview and by checkout.
   `categories` lists the cart's sub-category slugs and 'dept:<slug>' keys. */
export function couponDiscount(coupon, { subtotal, categories = [], eligibleSubtotal }) {
  if (!coupon || !coupon.active) return { ok: false, reason: 'Not a valid code.' };
  if (coupon.expiry && new Date(`${coupon.expiry}T23:59:59`) < new Date()) return { ok: false, reason: 'This code has expired.' };
  if (coupon.minOrder && subtotal < coupon.minOrder) return { ok: false, reason: `Spend ₹${coupon.minOrder.toLocaleString('en-IN')} to use this code.` };
  if (coupon.scope && !categories.includes(coupon.scope)) return { ok: false, reason: 'No eligible items in your cart.' };
  const base = coupon.scope && eligibleSubtotal ? eligibleSubtotal(coupon.scope) : subtotal;
  let amount = coupon.kind === 'percent' ? Math.round((base * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount) amount = Math.min(amount, coupon.maxDiscount);
  amount = Math.min(amount, base);
  return { ok: true, amount };
}
