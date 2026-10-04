import { createStore, useStore, uid } from '../lib/store';
import { allProducts } from '../data/catalog';
import { aggregateStatus, commissionRate, refundSplit, splitOrder, ORDER_FLOW } from '../lib/marketplace';
import { getRetailer, getRetailers } from './retailers';
import { getSettings } from './settings';
import { audit } from '../lib/auditLog';
import { notify } from './notifications';
import { adjustStock } from '../context/AdminStore';
import { LIVE } from '../lib/config';
import { api, patch as apiPatch, post, refresh, who } from '../lib/live';

/* ============================================================================
 * Order book (requirements 8, 9, 12, 15, 19).
 *
 * One customer order = one payment, split into one part per retailer. Each
 * part has its own status, status history, Razorpay Route transfer (the
 * retailer's share, held until delivery) and refunds. The order-level status
 * is derived from its parts (lib/marketplace aggregateStatus).
 *
 *   order { id, createdAt, userId, customer, email, phone, address, city,
 *           state, pin, lines[], parts[], items, subtotal, discount, gst,
 *           shipping, total, payment, paymentStatus, delivery, coupon,
 *           razorpay { orderRef, paymentId } | null, notes[], flagged }
 *   part  { id, retailerId, retailerName, lines[], subtotal, discount, gst,
 *           shipping, total, commissionRate, commission, retailerShare,
 *           status, statusLog[], transfer, refunded, returns[] }
 *
 * `returns` is reserved for the returns workflow (requirement 30):
 *   { id, lines[{ sku, qty }], reason, status: requested | pickup |
 *     inspecting | restocked | rejected, refundId, at }
 * ==========================================================================*/

const DAY = 86400000;
const GST_RATE = 0.18;

const CUSTOMERS = [
  ['u_cust', 'Aarav Reddy', 'customer@nivora.test', '9000000001', 'Flat 402, Lake View Residency, Kondapur', 'Hyderabad', 'Telangana', '500084'],
  [null, 'Priya Menon', 'priya.menon@example.com', '9876543210', '8-2-293, Road No. 12, Banjara Hills', 'Hyderabad', 'Telangana', '500034'],
  [null, 'Rahul Kumar', 'rahul@trade.in', '9876543211', '1-8-45, Paradise Circle', 'Secunderabad', 'Telangana', '500003'],
  [null, 'Amit Patel', 'amit@example.com', '9876543212', '40-1-12, MG Road, Labbipet', 'Vijayawada', 'Andhra Pradesh', '520010'],
  [null, 'Kavya Reddy', 'kavya@example.com', '9876543213', '5-87, Brodipet 4th Line', 'Guntur', 'Andhra Pradesh', '522002'],
  [null, 'Imran Ali', 'imran@mepworks.in', '9876543214', 'Plot 23, Madhapur', 'Hyderabad', 'Telangana', '500081'],
  [null, 'Naveen Rao', 'naveen@example.com', '9876543215', 'Hanamkonda Chowrasta', 'Warangal', 'Telangana', '506001'],
  [null, 'Sana Begum', 'sana.b@example.com', '9876543216', 'Phulong, Armoor Road', 'Nizamabad', 'Telangana', '503001'],
  [null, 'Vikram Shetty', 'vikram@buildpro.in', '9876543217', 'Sanathnagar Industrial Estate', 'Hyderabad', 'Telangana', '500018'],
];
const PAYMENTS = ['UPI', 'Cards', 'Net banking', 'Cash on delivery', 'UPI', 'Cards'];

const rnd = (n) => Math.random().toString(36).slice(2, 2 + n);
const rzp = (prefix) => `${prefix}_${rnd(14).padEnd(14, '0')}`;

function rateFor(retailerId, lines) {
  return commissionRate(getRetailer(retailerId), lines[0]?.category, getSettings().commission.default);
}

/* Deterministic-enough demo order book over the last six weeks. */
function seed() {
  const list = [];
  const base = new Date(); base.setHours(11, 30, 0, 0);
  const pool = allProducts.filter((p) => p.price > 0);
  for (let i = 0; i < 42; i += 1) {
    const [userId, customer, email, phone, address, city, state, pin] = CUSTOMERS[i % 4 === 1 ? 0 : 1 + (i % (CUSTOMERS.length - 1))];
    const count = 1 + ((i * 7) % 4);
    const picked = new Map();
    for (let j = 0; j < count; j += 1) {
      const p = pool[(i * 53 + j * 211) % pool.length];
      picked.set(p.id, p);
    }
    const lines = [...picked.values()].map((p, j) => {
      const qty = 1 + ((i + j) % 6);
      return { id: p.id, sku: p.sku, name: p.name, size: p.size, qty, price: p.price, amount: p.price * qty, retailerId: p.retailerId, category: p.category };
    });
    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    const gst = Math.round(subtotal * GST_RATE);
    const shipping = subtotal >= 999 ? 0 : 49;
    const daysAgo = i < 3 ? 0 : Math.floor(i * 1.02);
    const createdAt = base.getTime() - daysAgo * DAY - (i % 5) * 3600000;
    const id = `NV-${10100 - i}`;
    const payment = PAYMENTS[i % PAYMENTS.length];
    const online = payment !== 'Cash on delivery';

    const parts = splitOrder({ orderId: id, lines, gst, shipping, retailers: getRetailers(), rateFor });
    const target = daysAgo > 9 ? 3 : daysAgo > 4 ? 2 : daysAgo > 1 ? 1 : 0; // index in ORDER_FLOW
    parts.forEach((pt, k) => {
      let status = ORDER_FLOW[Math.max(0, target - (k === 1 && target < 3 ? 1 : 0))];
      if (i % 11 === 7 || (i % 13 === 5 && k === 1)) status = 'Cancelled';
      pt.status = status;
      const reached = status === 'Cancelled' ? 0 : ORDER_FLOW.indexOf(status);
      pt.statusLog = ORDER_FLOW.slice(0, reached + 1).map((s, n) => ({ status: s, at: createdAt + n * 0.9 * DAY, by: n ? pt.retailerName : customer }));
      if (status === 'Cancelled') pt.statusLog.push({ status: 'Cancelled', at: createdAt + 0.4 * DAY, by: pt.retailerName, note: 'Out of stock at the counter' });
      pt.transfer = online
        ? { id: rzp('trf'), account: getRetailer(pt.retailerId)?.razorpayAccount, amount: pt.retailerShare, status: status === 'Delivered' ? 'released' : status === 'Cancelled' ? 'reversed' : 'on_hold', reversed: status === 'Cancelled' ? pt.retailerShare : 0 }
        : null;
      if (status === 'Cancelled' && online) pt.refunded = pt.total;
    });
    const status = aggregateStatus(parts);
    list.push({
      id, createdAt, userId, customer, email, phone, address, city, state, pin,
      lines, parts, status,
      items: lines.reduce((n, l) => n + l.qty, 0),
      subtotal, discount: 0, gst, shipping, total: parts.reduce((s, p) => s + p.total, 0),
      payment,
      paymentStatus: status === 'Cancelled' ? (online ? 'Refunded' : 'Cancelled') : online ? 'Paid' : status === 'Delivered' ? 'Collected' : 'Due on delivery',
      delivery: 'Standard',
      coupon: null,
      razorpay: online ? { orderRef: rzp('order'), paymentId: rzp('pay'), route: true } : null,
      notes: [],
      flagged: i === 6 ? { by: 'Sana Fatima', at: createdAt + DAY, reason: 'Customer says one box arrived damaged' } : null,
    });
  }
  return list;
}

export const ordersStore = createStore('nivora_orders_v1', seed, () => []);
export const refundsStore = createStore('nivora_refunds_v1', () => {
  /* the cancelled, prepaid parts of the seed were refunded by the system */
  const out = [];
  for (const o of ordersStore.get()) {
    for (const p of o.parts) {
      if (p.status === 'Cancelled' && p.refunded) {
        out.push({ id: uid('rf'), orderId: o.id, partId: p.id, retailerId: p.retailerId, retailerName: p.retailerName, customer: o.customer, amount: p.refunded, reason: 'Part cancelled', status: 'processed', system: true, requestedBy: 'System', requestedAt: o.createdAt + DAY, decidedBy: 'System', decidedAt: o.createdAt + DAY, razorpayRefundId: rzp('rfnd'), ...refundSplit(p.refunded, p.commissionRate) });
      }
    }
  }
  return out;
}, () => []);

/* ── LIVE: nasou-api does the work (and the audit and notifications) ──────── */
const partNo = (partId) => String(partId).split('-').pop();
const afterChange = () => refresh('orders', 'refunds', 'notifications', 'payouts');

/* POST /checkout — the server prices, splits, takes stock and payment. */
export async function checkout(body, idempotencyKey) {
  const order = await api('/checkout', { method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body: JSON.stringify(body) });
  ordersStore.set((list) => [order, ...list.filter((o) => o.id !== order.id)]);
  refresh('notifications', 'catalog');
  return order;
}

async function updatePartLive(orderId, partId, status, note) {
  const role = who()?.role;
  if (role === 'CUSTOMER') await post(`/orders/${orderId}/parts/${partNo(partId)}/cancel`, { reason: note || null });
  else await apiPatch(`/${role === 'ADMIN' ? 'admin' : 'seller'}/orders/${orderId}/parts/${partNo(partId)}/status`, { status, note: note || null });
  await afterChange();
  return findOrder(orderId);
}

export const getOrders = () => ordersStore.get();
export const findOrder = (id) => ordersStore.get().find((o) => o.id === id) || null;
export const useOrders = () => useStore(ordersStore);
export const useRefunds = () => useStore(refundsStore);

function nextId() {
  const max = ordersStore.get().reduce((m, o) => Math.max(m, Number(String(o.id).replace(/\D/g, '')) || 0), 10100);
  return `NV-${max + 1}`;
}

function writeOrder(id, fn) {
  let out = null;
  ordersStore.set((list) => list.map((o) => {
    if (o.id !== id) return o;
    out = fn(o);
    return out;
  }));
  return out;
}

/* derived order fields after any part change */
function settleOrder(o) {
  const status = aggregateStatus(o.parts);
  const online = o.payment !== 'Cash on delivery' && o.payment !== 'GST invoice';
  let paymentStatus = o.paymentStatus;
  if (status === 'Cancelled') paymentStatus = online ? 'Refunded' : 'Cancelled';
  else if (o.paymentStatus === 'Due on delivery' && status === 'Delivered') paymentStatus = 'Collected';
  return { ...o, status, paymentStatus };
}

/* ── placing an order (checkout) ──────────────────────────────────────────── */
export function placeOrder(draft) {
  if (LIVE) throw new Error('Orders are placed through checkout().');
  const id = nextId();
  const createdAt = Date.now();
  const online = draft.payment !== 'Cash on delivery' && draft.payment !== 'GST invoice';
  const parts = splitOrder({
    orderId: id,
    lines: draft.lines,
    discount: draft.couponDiscount ?? draft.discount ?? 0,
    discountByRetailer: draft.discountByRetailer,
    gst: draft.gst || 0,
    shipping: draft.shipping || 0,
    shippingByRetailer: draft.shippingByRetailer,
    gstByRetailer: draft.gstByRetailer,
    retailers: getRetailers(),
    rateFor,
  }).map((p) => ({
    ...p,
    statusLog: [{ status: 'Pending', at: createdAt, by: draft.customer }],
    transfer: online ? { id: rzp('trf'), account: getRetailer(p.retailerId)?.razorpayAccount, amount: p.retailerShare, status: 'on_hold', reversed: 0 } : null,
  }));
  const order = settleOrder({
    ...draft,
    id,
    createdAt,
    parts,
    total: parts.reduce((s, p) => s + p.total, 0),
    razorpay: online ? { orderRef: rzp('order'), paymentId: rzp('pay'), route: true } : null,
    notes: [],
    flagged: null,
  });
  ordersStore.set((list) => [order, ...list]);

  /* inventory: every ordered unit leaves stock now */
  draft.lines.forEach((l) => adjustStock(l.id, -l.qty, { reason: 'order', ref: id, by: draft.customer }));

  audit({ action: 'order.create', entity: 'order', entityId: id, summary: `Order ${id} placed · ${parts.length} seller${parts.length > 1 ? 's' : ''} · ₹${order.total.toLocaleString('en-IN')} · ${draft.payment}`, actor: { id: draft.userId, name: draft.customer, role: 'customer' } });
  notify({ userId: draft.userId, icon: 'package', kind: 'orders', title: `Order ${id} placed`, body: `${draft.items} units from ${parts.length} seller${parts.length > 1 ? 's' : ''} · ₹${order.total.toLocaleString('en-IN')} · ${draft.payment}`, to: `/orders?id=${id}` });
  parts.forEach((p) => notify({ userId: `retailer:${p.retailerId}`, icon: 'package', title: `New order ${p.id}`, body: `${p.lines.reduce((n, l) => n + l.qty, 0)} units · ₹${p.total.toLocaleString('en-IN')} · ${draft.city}`, to: `/seller/orders/${id}` }));
  return order;
}

const WORDS = { Processing: 'is being packed', Shipped: 'has shipped', Delivered: 'was delivered', Cancelled: 'was cancelled', Pending: 'is back to pending' };

/* ── one part moves on (retailer or platform) ─────────────────────────────── */
export function updatePart(orderId, partId, status, { by = '', note = '', byRetailer = false } = {}) {
  if (LIVE) return updatePartLive(orderId, partId, status, note);
  const before = findOrder(orderId);
  const part = before?.parts.find((p) => p.id === partId);
  if (!part || part.status === status) return before;
  if (part.status === 'Cancelled' || (part.status === 'Delivered' && status !== 'Delivered')) return before;

  const online = before.payment !== 'Cash on delivery' && before.payment !== 'GST invoice';
  const after = writeOrder(orderId, (o) => settleOrder({
    ...o,
    parts: o.parts.map((p) => {
      if (p.id !== partId) return p;
      const next = { ...p, status, statusLog: [...(p.statusLog || []), { status, at: Date.now(), by, note }] };
      if (status === 'Delivered' && p.transfer?.status === 'on_hold' && getSettings().decisions.releaseOn === 'delivery') {
        next.transfer = { ...p.transfer, status: 'released', releasedAt: Date.now() };
      }
      if (status === 'Cancelled' && p.transfer) next.transfer = { ...p.transfer, status: 'reversed', reversed: p.transfer.amount };
      return next;
    }),
  }));

  if (status === 'Cancelled') {
    part.lines.forEach((l) => adjustStock(l.id, l.qty, { reason: 'cancelled', ref: partId, by }));
    const owed = part.total - (part.refunded || 0);
    if (online && owed > 0) processRefund(createRefund({ orderId, partId, amount: owed, reason: note || 'Part cancelled', by: 'System', system: true }), 'System');
  }

  audit({ action: 'order.status', entity: 'order', entityId: partId, summary: `${partId} (${part.retailerName}): ${part.status} → ${status}${note ? ` — ${note}` : ''}`, before: { status: part.status }, after: { status } });
  notify({ userId: before.userId || 'guest', icon: status === 'Delivered' ? 'check' : status === 'Cancelled' ? 'close' : 'truck', kind: 'orders', title: `Part ${partId} ${WORDS[status] || status}`, body: `${part.retailerName} · ${part.lines.length} item${part.lines.length > 1 ? 's' : ''}${note ? ` · ${note}` : ''}`, to: `/orders?id=${orderId}` });
  if (!byRetailer) notify({ userId: `retailer:${part.retailerId}`, icon: 'truck', title: `${partId} set to ${status} by Nivora`, body: note || by, to: `/seller/orders/${orderId}` });
  return after;
}

export function addOrderNote(orderId, text, by) {
  if (LIVE) return post(`/admin/orders/${orderId}/notes`, { text }).then(() => refresh('orders'));
  writeOrder(orderId, (o) => ({ ...o, notes: [{ id: uid('nt'), text, by, at: Date.now() }, ...(o.notes || [])] }));
  audit({ action: 'order.note', entity: 'order', entityId: orderId, summary: `Note on ${orderId}`, after: { note: text } });
}
export function setOrderFlag(orderId, flag, by) {
  if (LIVE) return post(`/admin/orders/${orderId}/flag`, { reason: flag || null }).then(() => refresh('orders'));
  writeOrder(orderId, (o) => ({ ...o, flagged: flag ? { by, at: Date.now(), reason: flag } : null }));
  audit({ action: flag ? 'order.flag' : 'order.unflag', entity: 'order', entityId: orderId, summary: flag ? `Flagged ${orderId}: ${flag}` : `Cleared flag on ${orderId}` });
}
export function updateOrderContact(orderId, fields, by) {
  if (LIVE) return apiPatch(`/admin/orders/${orderId}/contact`, fields).then(() => refresh('orders'));
  const before = findOrder(orderId);
  writeOrder(orderId, (o) => ({ ...o, ...fields }));
  audit({ action: 'order.update', entity: 'order', entityId: orderId, summary: `Delivery details changed on ${orderId} by ${by}`, before: Object.fromEntries(Object.keys(fields).map((k) => [k, before?.[k]])), after: fields });
}

/* ── refunds (requirement 19) ─────────────────────────────────────────────── */
export function refundableOn(orderId, partId) {
  const p = findOrder(orderId)?.parts.find((x) => x.id === partId);
  if (!p) return 0;
  const pending = refundsStore.get().filter((r) => r.partId === partId && (r.status === 'requested' || r.status === 'approved')).reduce((s, r) => s + r.amount, 0);
  return Math.max(0, p.total - (p.refunded || 0) - pending);
}

export function createRefund({ orderId, partId, amount, reason, by, system = false }) {
  if (LIVE) return post('/admin/refunds', { orderId, partId, amount: Number(amount), reason }).then(async (r) => { await afterChange(); return r; });
  const o = findOrder(orderId);
  const p = o?.parts.find((x) => x.id === partId);
  if (!p) throw new Error('Pick a part of the order to refund.');
  const max = refundableOn(orderId, partId);
  const amt = Math.round(Number(amount) || 0);
  if (amt <= 0) throw new Error('Enter an amount above zero.');
  if (amt > max) throw new Error(`At most ₹${max.toLocaleString('en-IN')} can be refunded on ${partId}.`);
  const threshold = Number(getSettings().decisions.refundApprovalAbove) || 0;
  const autoApprove = system || (threshold > 0 && amt <= threshold);
  const r = {
    id: uid('rf'), orderId, partId, retailerId: p.retailerId, retailerName: p.retailerName, customer: o.customer,
    amount: amt, reason, status: autoApprove ? 'approved' : 'requested', system,
    requestedBy: by, requestedAt: Date.now(), ...refundSplit(amt, p.commissionRate),
  };
  refundsStore.set((l) => [r, ...l]);
  if (!system) {
    audit({ action: 'refund.start', entity: 'refund', entityId: r.id, summary: `${by} started a ₹${amt.toLocaleString('en-IN')} refund on ${partId}: ${reason}` });
    if (!autoApprove) notify({ userId: 'team:finance', icon: 'rupee', title: 'Refund waiting for approval', body: `${partId} · ₹${amt.toLocaleString('en-IN')} · ${reason}`, to: '/admin/refunds' });
  }
  return r;
}

/* approve → Razorpay refund on the payment, reversal on that part's transfer */
export function processRefund(r, by) {
  if (!r) return;
  const rf = { ...r, status: 'processed', decidedBy: r.decidedBy || by, decidedAt: r.decidedAt || Date.now(), razorpayRefundId: rzp('rfnd'), processedAt: Date.now() };
  refundsStore.set((l) => l.map((x) => (x.id === r.id ? rf : x)));
  writeOrder(r.orderId, (o) => settleOrder({
    ...o,
    parts: o.parts.map((p) => (p.id === r.partId
      ? { ...p, refunded: (p.refunded || 0) + r.amount, transfer: p.transfer ? { ...p.transfer, reversed: Math.min(p.transfer.amount, (p.transfer.reversed || 0) + r.retailerPortion) } : p.transfer }
      : p)),
  }));
  audit({ action: 'refund.process', entity: 'refund', entityId: r.id, summary: `Refunded ₹${r.amount.toLocaleString('en-IN')} on ${r.partId} (${rf.razorpayRefundId})`, after: { status: 'processed' } });
  const o = findOrder(r.orderId);
  notify({ userId: o?.userId || 'guest', icon: 'rupee', kind: 'orders', title: `Refund of ₹${r.amount.toLocaleString('en-IN')} processed`, body: `${r.partId} · reaches your account in 5–7 working days`, to: `/orders?id=${r.orderId}` });
  notify({ userId: `retailer:${r.retailerId}`, icon: 'rupee', title: `Refund on ${r.partId}`, body: `₹${r.retailerPortion.toLocaleString('en-IN')} comes off your next payout`, to: '/seller/payouts' });
}

export function decideRefund(id, approve, { by, note = '' }) {
  if (LIVE) return post(`/admin/refunds/${id}/decision`, { approve, note }).then(afterChange);
  const r = refundsStore.get().find((x) => x.id === id);
  if (!r || r.status !== 'requested') return;
  if (!approve) {
    refundsStore.set((l) => l.map((x) => (x.id === id ? { ...x, status: 'rejected', decidedBy: by, decidedAt: Date.now(), note } : x)));
    audit({ action: 'refund.reject', entity: 'refund', entityId: id, summary: `${by} declined the ₹${r.amount.toLocaleString('en-IN')} refund on ${r.partId}${note ? `: ${note}` : ''}` });
    return;
  }
  audit({ action: 'refund.approve', entity: 'refund', entityId: id, summary: `${by} approved the ₹${r.amount.toLocaleString('en-IN')} refund on ${r.partId}` });
  processRefund({ ...r, decidedBy: by, decidedAt: Date.now() }, by);
}

/* COD / invoice money received (Billing & payments) */
export function setPaymentStatus(orderId, paymentStatus, by = '') {
  if (LIVE) return apiPatch(`/admin/orders/${orderId}/payment`, { status: paymentStatus }).then(() => refresh('orders'));
  const before = findOrder(orderId);
  if (!before) return;
  writeOrder(orderId, (o) => ({ ...o, paymentStatus }));
  audit({ action: 'payment.status', entity: 'order', entityId: orderId, summary: `${orderId} payment: ${before.paymentStatus} → ${paymentStatus}${by ? ` (${by})` : ''}`, before: { paymentStatus: before.paymentStatus }, after: { paymentStatus } });
}
