/* ============================================================================
 * analytics.js — one place that turns the order book into numbers, so the
 * dashboard, Billing & payments and Reports always agree (client review 2,
 * admin items 1, 4, 7).
 *
 * Order book = seeded demo orders + orders placed at checkout (allOrders()).
 * Two money measures, labelled wherever they are shown:
 *   - billed  : order total incl. GST and delivery (what the customer pays)
 *   - net     : line amounts ex-GST (for product / category / brand splits)
 * Cancelled orders count as 0 in both.
 * ==========================================================================*/

import { findProduct, categoryName, supplierName } from '../data/catalog';
import { departmentMeta, DEFAULT_DEPARTMENT } from '../data/departments';

const DAY = 86400000;
export const startOfDay = (ms) => { const d = new Date(ms); d.setHours(0, 0, 0, 0); return d.getTime(); };

export const billedOf = (o) => (o.status === 'Cancelled' ? 0 : o.total);
export const isLive = (o) => o.status !== 'Cancelled';

/* Payment status for any order (seeded orders predate the field). */
export function paymentStatusOf(o) {
  if (o.status === 'Cancelled') return 'Refunded';
  if (o.paymentStatus) return o.paymentStatus;
  return 'Paid';
}
export const PAYMENT_STATUSES = ['Paid', 'Collected', 'Due on delivery', 'Invoice due', 'Refunded'];
/* collected money vs money still owed */
export const isSettled = (s) => s === 'Paid' || s === 'Collected';
export const isOutstanding = (s) => s === 'Due on delivery' || s === 'Invoice due';

/* orders placed in the last `days` days (0 = everything) */
export const withinDays = (orders, days, now = Date.now()) =>
  days ? orders.filter((o) => o.createdAt >= startOfDay(now) - (days - 1) * DAY) : orders;

/* one point per calendar day: { t, label, billed, orders } */
export function dailySeries(orders, days = 30, now = Date.now()) {
  const first = startOfDay(now) - (days - 1) * DAY;
  const pts = Array.from({ length: days }, (_, i) => {
    const t = first + i * DAY;
    return { t, label: new Date(t).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), billed: 0, orders: 0 };
  });
  for (const o of orders) {
    const i = Math.floor((startOfDay(o.createdAt) - first) / DAY);
    if (i < 0 || i >= days) continue;
    pts[i].billed += billedOf(o);
    pts[i].orders += 1;
  }
  return pts;
}

/* line-level split (net, ex-GST). keyFn(product, line) → [key, label] */
export function splitBy(orders, keyFn) {
  const m = new Map();
  for (const o of orders) {
    if (!isLive(o)) continue;
    for (const l of o.lines) {
      const p = findProduct(l.id || l.sku);
      const [key, label] = keyFn(p, l);
      const row = m.get(key) || { key, label, units: 0, net: 0, orders: new Set() };
      row.units += l.qty;
      row.net += l.amount ?? l.price * l.qty;
      row.orders.add(o.id);
      m.set(key, row);
    }
  }
  return [...m.values()].map((r) => ({ ...r, orders: r.orders.size })).sort((a, b) => b.net - a.net);
}

export const byProduct = (orders) => splitBy(orders, (p, l) => [l.sku, l.name]);
export const bySubcategory = (orders) => splitBy(orders, (p) => [p?.category || 'unknown', p ? (p.subcategoryName || categoryName(p.category)) : 'Unknown']);
export const byDepartment = (orders) => splitBy(orders, (p) => { const d = departmentMeta(p?.department || DEFAULT_DEPARTMENT); return [d.slug, d.name]; });
export const byBrand = (orders) => splitBy(orders, (p) => [p?.supplier || 'unknown', p ? (p.supplierName || supplierName(p.supplier)) : 'Unknown']);

/* count / sum by an order-level field */
export function countBy(orders, keyFn, valueFn = () => 1) {
  const m = new Map();
  for (const o of orders) {
    const k = keyFn(o);
    m.set(k, (m.get(k) || 0) + valueFn(o));
  }
  return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value);
}

/* customers ranked by billed value */
export function topCustomers(orders) {
  const m = new Map();
  for (const o of orders) {
    const k = (o.email || o.customer).toLowerCase();
    const c = m.get(k) || { key: k, name: o.customer, city: o.city, orders: 0, billed: 0 };
    c.orders += 1;
    c.billed += billedOf(o);
    m.set(k, c);
  }
  return [...m.values()].sort((a, b) => b.billed - a.billed);
}

/* compact rupees for axis ticks and tiles: ₹950 · ₹12.4K · ₹3.2L · ₹1.1Cr */
export function rupeesCompact(n) {
  const a = Math.abs(n);
  if (a >= 1e7) return `₹${(n / 1e7).toFixed(a >= 1e8 ? 0 : 1)}Cr`;
  if (a >= 1e5) return `₹${(n / 1e5).toFixed(a >= 1e6 ? 0 : 1)}L`;
  if (a >= 1e3) return `₹${(n / 1e3).toFixed(a >= 1e4 ? 0 : 1)}K`;
  return `₹${Math.round(n)}`;
}
