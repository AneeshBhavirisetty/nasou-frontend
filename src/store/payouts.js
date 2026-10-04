import { createStore, useStore, uid } from '../lib/store';
import { cycleEnd, cycleHasMonthStart, cycleLabel, cycleStart, settle } from '../lib/marketplace';
import { audit } from '../lib/auditLog';
import { notify } from './notifications';
import { LIVE } from '../lib/config';
import { post, refresh } from '../lib/live';

/* ============================================================================
 * Payouts and settlements (requirement 13) and reconciliation (requirement 20).
 *
 * A retailer's share becomes payable when its part is delivered (the
 * Razorpay transfer is held until then — settings.decisions.releaseOn).
 * Each weekly cycle per retailer:
 *     sales − commission − subscription fee − refunds ± adjustments = net
 * The current cycle is "open"; closed cycles go pending → approved → paid
 * (Finance), and can be put on hold.
 *
 * Reconciliation compares our books with the Razorpay settlement report.
 * The report is simulated here from the same records with a few planted
 * differences so the screen has something to flag; the API replaces
 * razorpayReport() with the real Razorpay reports endpoint.
 * ==========================================================================*/

const DAY = 86400000;
export const payoutRecordsStore = createStore('nivora_payouts_v1', () => ({}));
export const reconStore = createStore('nivora_recon_v1', () => ({}));
/* LIVE: the server computes the cycles (GET /admin/payouts, /seller/payouts)
   and the reconciliation (GET /admin/reconciliation). */
export const payoutsStore = createStore('nivora_payout_rows', () => ({ rows: [], held: {} }));
export const reconRowsStore = createStore('nivora_recon_rows', () => ({ rows: [] }));
export const usePayoutRecords = () => useStore(LIVE ? payoutsStore : payoutRecordsStore);
export const useRecon = () => useStore(reconStore);
export const useReconRows = () => useStore(reconRowsStore);

const key = (rid, start) => `${rid}:${start}`;
const deliveredAt = (p) => [...(p.statusLog || [])].reverse().find((s) => s.status === 'Delivered')?.at;

/* every retailer × cycle with money in it */
export function computeSettlements({ orders, refunds, retailers, settings, records }) {
  if (LIVE) return payoutsStore.get();
  const now = Date.now();
  const current = cycleStart(now);
  const byKey = new Map();
  const bucket = (rid, start) => {
    const k = key(rid, start);
    if (!byKey.has(k)) byKey.set(k, { key: k, retailerId: rid, start, parts: [], refunds: [] });
    return byKey.get(k);
  };
  const held = {};
  for (const o of orders) {
    for (const p of o.parts || []) {
      if (p.status === 'Delivered') {
        const at = deliveredAt(p) || o.createdAt;
        bucket(p.retailerId, cycleStart(at)).parts.push({ ...p, orderId: o.id, deliveredAt: at, total: p.total, commission: p.commission });
      } else if (p.status !== 'Cancelled') {
        held[p.retailerId] = (held[p.retailerId] || 0) + p.retailerShare;
      }
    }
  }
  for (const r of refunds) {
    if (r.status !== 'processed') continue;
    /* refunds of parts that were cancelled before delivery never reached a payout */
    const o = orders.find((x) => x.id === r.orderId);
    const part = o?.parts.find((p) => p.id === r.partId);
    if (!part || part.status === 'Cancelled') continue;
    bucket(r.retailerId, cycleStart(r.processedAt || r.decidedAt || r.requestedAt)).refunds.push(r);
  }
  /* monthly fees land in the first cycle of the month even with no sales */
  if (settings.decisions.subscriptionBilling === 'deduct') {
    for (const r of retailers) {
      if (r.status !== 'approved' && r.status !== 'suspended') continue;
      const plan = settings.plans.find((p) => p.id === r.plan);
      if (!plan?.monthly) continue;
      for (let s = cycleStart(r.joinedAt); s <= current; s += 7 * DAY) if (cycleHasMonthStart(s)) bucket(r.id, s);
    }
  }

  const rows = [];
  for (const b of byKey.values()) {
    const r = retailers.find((x) => x.id === b.retailerId);
    if (!r) continue;
    const rec = records[b.key] || {};
    const plan = settings.plans.find((p) => p.id === r.plan);
    const fee = settings.decisions.subscriptionBilling === 'deduct' && cycleHasMonthStart(b.start) ? plan?.monthly || 0 : 0;
    const money = settle({ parts: b.parts, refunds: b.refunds, fee, adjustments: rec.adjustments || [] });
    const open = b.start === current;
    const defaultStatus = open ? 'open' : b.start < current - 14 * DAY ? 'paid' : 'pending';
    rows.push({
      ...b,
      ...money,
      retailerName: r.name,
      label: cycleLabel(b.start),
      end: cycleEnd(b.start),
      status: open ? 'open' : rec.status || defaultStatus,
      utr: rec.utr || (defaultStatus === 'paid' && !rec.status ? `UTR${String(b.start).slice(-9)}` : ''),
      record: rec,
    });
  }
  rows.sort((a, b) => b.start - a.start || a.retailerName.localeCompare(b.retailerName));
  return { rows, held };
}

/* what a retailer is still owed: unpaid closed cycles + held shares */
export function pendingBalance(rows, held, retailerId) {
  const unpaid = rows.filter((r) => r.retailerId === retailerId && r.status !== 'paid').reduce((s, r) => s + r.net, 0);
  return { unpaid, held: held[retailerId] || 0 };
}

function writeRecord(k, fn) {
  payoutRecordsStore.set((all) => ({ ...all, [k]: fn(all[k] || {}) }));
}

export function setPayoutStatus(row, status, { by, utr = '', note = '' }) {
  if (LIVE) return post(`/admin/payouts/${row.retailerId}/${row.cycle}/status`, { status, utr: utr || null, note: note || null }).then(() => refresh('payouts', 'notifications', 'recon'));
  writeRecord(row.key, (r) => ({ ...r, status, [`${status}By`]: by, [`${status}At`]: Date.now(), ...(utr ? { utr } : {}), ...(note ? { note } : {}) }));
  audit({ action: `payout.${status === 'paid' ? 'mark_paid' : status}`, entity: 'payout', entityId: row.key, summary: `${row.retailerName} ${row.label}: ${row.status} → ${status} · ₹${row.net.toLocaleString('en-IN')}${utr ? ` · ${utr}` : ''}`, before: { status: row.status }, after: { status } });
  if (status === 'paid') notify({ userId: `retailer:${row.retailerId}`, icon: 'rupee', title: `Payout for ${row.label} sent`, body: `₹${row.net.toLocaleString('en-IN')} · ${utr}`, to: '/seller/payouts' });
}

export function addAdjustment(row, amount, note, by) {
  if (LIVE) return post(`/admin/payouts/${row.retailerId}/${row.cycle}/adjustments`, { amount, note }).then(() => refresh('payouts'));
  writeRecord(row.key, (r) => ({ ...r, adjustments: [...(r.adjustments || []), { id: uid('adj'), amount: Math.round(amount), note, by, at: Date.now() }] }));
  audit({ action: 'payout.adjust', entity: 'payout', entityId: row.key, summary: `${amount > 0 ? 'Added' : 'Deducted'} ₹${Math.abs(Math.round(amount)).toLocaleString('en-IN')} on ${row.retailerName} ${row.label}: ${note}` });
}

/* ── reconciliation ──────────────────────────────────────────────────────── */
/* Our side of every money movement that Razorpay should also show. */
export function ourLedger({ orders, refunds, payoutRows }) {
  const out = [];
  for (const o of orders) {
    if (o.razorpay) out.push({ id: `pay:${o.id}`, type: 'Payment', ref: o.razorpay.paymentId, orderId: o.id, retailer: '—', amount: o.total, at: o.createdAt });
    for (const p of o.parts || []) {
      if (p.transfer) out.push({ id: `trf:${p.id}`, type: 'Transfer', ref: p.transfer.id, orderId: o.id, partId: p.id, retailer: p.retailerName, amount: p.transfer.amount, at: o.createdAt });
    }
  }
  for (const r of refunds) if (r.status === 'processed' && r.razorpayRefundId) out.push({ id: `rf:${r.id}`, type: 'Refund', ref: r.razorpayRefundId, orderId: r.orderId, partId: r.partId, retailer: r.retailerName, amount: r.amount, at: r.processedAt || r.decidedAt });
  for (const p of payoutRows) if (p.status === 'paid' && p.net > 0) out.push({ id: `po:${p.key}`, type: 'Payout', ref: p.utr || '—', retailer: p.retailerName, amount: p.net, at: p.end });
  return out.sort((a, b) => b.at - a.at);
}

/* Simulated Razorpay settlement report: our ledger with planted differences. */
export function razorpayReport(ledger) {
  const report = ledger.map((e) => ({ ...e }));
  const transfer = report.find((e) => e.type === 'Transfer');
  if (transfer) transfer.amount -= 40; // fee deducted on a transfer we did not book
  const refund = report.findIndex((e) => e.type === 'Refund');
  if (refund >= 0) report.splice(refund, 1); // refund not yet settled by Razorpay
  report.push({ id: 'pay:unknown', type: 'Payment', ref: 'pay_Nv8Q2xL0unmatched', orderId: null, retailer: '—', amount: 1250, at: Date.now() - 3 * DAY });
  return report;
}

export function reconcile(ledger, report) {
  const theirs = new Map(report.map((e) => [e.id, e]));
  const rows = ledger.map((e) => {
    const t = theirs.get(e.id);
    theirs.delete(e.id);
    if (!t) return { ...e, ours: e.amount, theirs: null, status: 'missing_in_razorpay' };
    return { ...e, ours: e.amount, theirs: t.amount, status: t.amount === e.amount ? 'matched' : 'mismatch' };
  });
  for (const t of theirs.values()) rows.push({ ...t, ours: null, theirs: t.amount, status: 'missing_in_books' });
  return rows;
}

export function resolveRecon(id, note, by) {
  if (LIVE) return post(`/admin/reconciliation/${encodeURIComponent(id)}/resolve`, { note }).then(() => refresh('recon'));
  reconStore.set((all) => ({ ...all, [id]: { status: 'resolved', note, by, at: Date.now() } }));
  audit({ action: 'recon.resolve', entity: 'reconciliation', entityId: id, summary: `Resolved ${id}: ${note}` });
}
