import { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { catalogBase as CATALOG } from '../data/catalog';

/* ============================================================================
 * AdminStore — the admin's working copy of catalogue + discount data.
 *
 * Products are stored as a *patch* over the generated catalogue (edits, adds,
 * removals) so we never persist the whole 1,400-row array. Coupons are stored
 * in full. Everything is mirrored to localStorage so admin changes survive a
 * reload; `reset()` restores the shipped catalogue.
 * ==========================================================================*/

const KEY = 'nasou_admin_v1';
const AdminStoreContext = createContext(null);

const emptyPatch = { overrides: {}, added: [], removed: [] };

function load() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!raw) return { patch: emptyPatch, coupons: seedCoupons(), retailers: [] };
    return {
      patch: { ...emptyPatch, ...(raw.patch || {}) },
      coupons: Array.isArray(raw.coupons) ? raw.coupons : seedCoupons(),
      retailers: Array.isArray(raw.retailers) ? raw.retailers : [],
    };
  } catch {
    return { patch: emptyPatch, coupons: seedCoupons(), retailers: [] };
  }
}

function seedCoupons() {
  return [
    { id: 'c1', code: 'MONSOON10', kind: 'percent', value: 10, minOrder: 999, maxDiscount: 500, scope: '', expiry: '', active: true },
    { id: 'c2', code: 'FIRST150', kind: 'flat', value: 150, minOrder: 1500, maxDiscount: 0, scope: '', expiry: '', active: true },
    { id: 'c3', code: 'CPVC20', kind: 'percent', value: 20, minOrder: 2000, maxDiscount: 1200, scope: 'cpvc-fittings', expiry: '', active: false },
  ];
}

export function AdminStoreProvider({ children }) {
  const [patch, setPatch] = useState(() => load().patch);
  const [coupons, setCoupons] = useState(() => load().coupons);
  const [retailers, setRetailers] = useState(() => load().retailers);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ patch, coupons, retailers }));
    } catch { /* quota — non-fatal */ }
  }, [patch, coupons, retailers]);

  /* Derived product list: catalogue minus removed, with overrides applied,
     plus admin-added rows on top. */
  const products = useMemo(() => {
    const removed = new Set(patch.removed);
    const base = CATALOG.filter((p) => !removed.has(p.id)).map((p) =>
      patch.overrides[p.id] ? { ...p, ...patch.overrides[p.id] } : p
    );
    return [...patch.added, ...base];
  }, [patch]);

  const dirty = patch.added.length + patch.removed.length + Object.keys(patch.overrides).length > 0;

  const setStock = useCallback((id, stock) => {
    const n = Math.max(0, Math.round(Number(stock) || 0));
    setPatch((pt) => {
      if (pt.added.some((p) => p.id === id)) {
        return { ...pt, added: pt.added.map((p) => (p.id === id ? { ...p, stock: n } : p)) };
      }
      return { ...pt, overrides: { ...pt.overrides, [id]: { ...pt.overrides[id], stock: n } } };
    });
  }, []);

  const saveProduct = useCallback((prod) => {
    setPatch((pt) => {
      // editing an admin-added row
      if (pt.added.some((p) => p.id === prod.id)) {
        return { ...pt, added: pt.added.map((p) => (p.id === prod.id ? { ...p, ...prod } : p)) };
      }
      // editing a catalogue row
      if (CATALOG.some((p) => p.id === prod.id)) {
        return { ...pt, overrides: { ...pt.overrides, [prod.id]: { ...pt.overrides[prod.id], ...prod } } };
      }
      // brand new row
      return { ...pt, added: [{ ...prod }, ...pt.added] };
    });
  }, []);

  const deleteProduct = useCallback((id) => {
    setPatch((pt) => {
      if (pt.added.some((p) => p.id === id)) {
        return { ...pt, added: pt.added.filter((p) => p.id !== id) };
      }
      const { [id]: _drop, ...rest } = pt.overrides;
      return { ...pt, overrides: rest, removed: [...new Set([...pt.removed, id])] };
    });
  }, []);

  const saveCoupon = useCallback((coupon) => {
    setCoupons((cs) => {
      const exists = cs.some((c) => c.id === coupon.id);
      return exists ? cs.map((c) => (c.id === coupon.id ? { ...c, ...coupon } : c)) : [{ ...coupon }, ...cs];
    });
  }, []);

  const deleteCoupon = useCallback((id) => setCoupons((cs) => cs.filter((c) => c.id !== id)), []);

  /* Retailers onboarded from the admin (base list lives in data/retailers.js). */
  const saveRetailer = useCallback((r) => {
    setRetailers((rs) => (rs.some((x) => x.id === r.id) ? rs.map((x) => (x.id === r.id ? { ...x, ...r } : x)) : [{ ...r }, ...rs]));
  }, []);

  const reset = useCallback(() => {
    setPatch(emptyPatch);
    setCoupons(seedCoupons());
    setRetailers([]);
  }, []);

  const value = useMemo(
    () => ({ products, coupons, retailers, dirty, setStock, saveProduct, deleteProduct, saveCoupon, deleteCoupon, saveRetailer, reset }),
    [products, coupons, retailers, dirty, setStock, saveProduct, deleteProduct, saveCoupon, deleteCoupon, saveRetailer, reset]
  );

  return <AdminStoreContext.Provider value={value}>{children}</AdminStoreContext.Provider>;
}

export function useAdminStore() {
  const ctx = useContext(AdminStoreContext);
  if (!ctx) throw new Error('useAdminStore must be used inside AdminStoreProvider');
  return ctx;
}

/* Coupon math — used by admin preview and by checkout. */
export function couponDiscount(coupon, { subtotal, categories = [] }) {
  if (!coupon || !coupon.active) return { ok: false, reason: 'Not a valid code.' };
  if (coupon.expiry && new Date(coupon.expiry) < new Date()) return { ok: false, reason: 'This code has expired.' };
  if (coupon.minOrder && subtotal < coupon.minOrder) return { ok: false, reason: `Spend ₹${coupon.minOrder.toLocaleString('en-IN')} to use this code.` };
  if (coupon.scope && !categories.includes(coupon.scope)) return { ok: false, reason: 'No eligible items in your cart.' };
  let amount = coupon.kind === 'percent' ? Math.round((subtotal * coupon.value) / 100) : coupon.value;
  if (coupon.maxDiscount) amount = Math.min(amount, coupon.maxDiscount);
  amount = Math.min(amount, subtotal);
  return { ok: true, amount };
}
