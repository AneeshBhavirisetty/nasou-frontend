import { createStore, useStore, uid } from '../lib/store';
import { cycleEnd, cycleHasMonthStart, cycleLabel, cycleStart, settle } from '../lib/marketplace';
import { audit } from '../lib/auditLog';
import { notify } from './notifications';
import { LIVE } from '../lib/config';
import { post, refresh } from '../lib/live';

/* ============================================================================
 * Retailer payouts (requirement 13) and reconciliation (requirement 20).
 *
 * Customers pay Nivorva. Each weekly cycle (Monday–Sunday) per retailer:
 *     delivered sales − commission − plan fee − refunds ± adjustments = net
 * The running week is "open"; closed weeks are "ready" until Finance presses
 * Settle, which sends everything the retailer is owed (all ready weeks) as
 * one RazorpayX payout: "processing" → "paid" (with UTR), or "failed", which
 * makes the weeks ready again.
 *
 * Reconciliation compares our books with the Razorpay settlement report.
 * The report is simulated here from the same records with a few planted
 * differences so the screen has something to flag; the API replaces
 * razorpayReport() with the real Razorpay reports endpoint.
 * ==========================================================================*/

const DAY = 86400000;
/* demo: { [retailerId:cycleStart]: { settlementId, adjustments, status, utr } } and the payouts sent */
export const payoutRecordsStore = createStore('nivora_payouts_v2', () => ({}));
export const settlementsStore = createStore('nivora_settlements_v1', () => []);
export const reconStore = createStore('nivora_recon_v1', () => ({}));
/* LIVE: the server computes it all (GET /admin/payouts, /seller/payouts)
   and the reconciliation (GET /admin/reconciliation). */
export const payoutsStore = createStore('nivora_payout_rows', () => ({ rows: [], held: {}, due: [], settlements: [] }));
export const reconRowsStore = createStore('nivora_recon_rows', () => ({ rows: [] }));
export const usePayoutRecords = () => useStore(LIVE ? payoutsStore : payoutRecordsStore);
export const useSettlementsSent = () => useStore(settlementsStore);
export const useRecon = () => useStore(reconStore);
export const useReconRows = () => useStore(reconRowsStore);

const key = (rid, start) => `${rid}:${start}`;
const deliveredAt = (p) => [...(p.statusLog || [])].reverse().find((s) => s.status === 'Delivered')?.at;
const shortDay = (ms) => new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
export const rangeLabel = (from, to) => `${shortDay(from)} – ${shortDay(cycleEnd(to))}`;
const maskBank = (b) => (b?.holder && b?.account && b?.ifsc ? { holder: b.holder, last4: String(b.account).slice(-4), ifsc: b.ifsc } : null);

/* every retailer × cycle with money in it, what each retailer is owed now, and the payouts sent */
export function computeSettlements({ orders, refunds, retailers, settings, records, sent = settlementsStore.get() }) {
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

  const byId = new Map(sent.map((x) => [x.id, x]));
  const rows = [];
  for (const b of byKey.values()) {
    const r = retailers.find((x) => x.id === b.retailerId);
    if (!r) continue;
    const rec = records[b.key] || {};
    const plan = settings.plans.find((p) => p.id === r.plan);
    const fee = settings.decisions.subscriptionBilling === 'deduct' && cycleHasMonthStart(b.start) ? plan?.monthly || 0 : 0;
    const money = settle({ parts: b.parts, refunds: b.refunds, fee, adjustments: rec.adjustments || [] });
    const linked = rec.settlementId && byId.get(rec.settlementId);
    const live = linked && linked.status !== 'failed' ? linked : null;
    /* demo history: weeks older than a fortnight count as paid before settlements existed */
    const oldPaid = !rec.settlementId && (rec.status === 'paid' || (!rec.adjustments && b.start < current - 14 * DAY));
    const status = b.start === current ? 'open' : live ? live.status : oldPaid ? 'paid' : 'ready';
    rows.push({
      ...b,
      ...money,
      retailerName: r.name,
      label: cycleLabel(b.start),
      end: cycleEnd(b.start),
      status,
      settlementId: live?.id || null,
      payoutId: live?.payoutId || null,
      utr: live ? live.utr || '' : rec.utr || (oldPaid ? `UTR${String(b.start).slice(-9)}` : ''),
      record: rec,
    });
  }
  rows.sort((a, b) => b.start - a.start || a.retailerName.localeCompare(b.retailerName));

  const due = [];
  for (const r of retailers) {
    const weeks = rows.filter((x) => x.retailerId === r.id && x.status === 'ready');
    if (!weeks.length) continue;
    const amount = weeks.reduce((s, x) => s + x.net, 0);
    const from = Math.min(...weeks.map((x) => x.start));
    const to = Math.max(...weeks.map((x) => x.start));
    const bank = maskBank(r.bank);
    due.push({ retailerId: r.id, retailerName: r.name, amount, weeks: weeks.length, from, to, label: rangeLabel(from, to), bank, canSettle: amount > 0 && !!bank });
  }
  due.sort((a, b) => b.amount - a.amount);
  const mine = new Set(retailers.map((r) => r.id));
  return { rows, held, due, settlements: sent.filter((x) => mine.has(x.retailerId)).sort((a, b) => b.at - a.at), gateway: 'simulated' };
}

/* what a retailer is still owed: closed weeks not paid yet + shares waiting for delivery */
export function pendingBalance(rows, held, retailerId) {
  const unpaid = rows.filter((r) => r.retailerId === retailerId && (r.status === 'ready' || r.status === 'processing')).reduce((s, r) => s + r.net, 0);
  return { unpaid, held: held[retailerId] || 0 };
}

function writeRecord(k, fn) {
  payoutRecordsStore.set((all) => ({ ...all, [k]: fn(all[k] || {}) }));
}

/* Settle: everything the retailer is owed, to their bank, as one RazorpayX payout.
   The amount on screen goes with it so a stale screen never sends a different sum. */
export function settleRetailer(entry, { rows, by }) {
  if (LIVE) return post(`/admin/payouts/${entry.retailerId}/settle`, { amount: entry.amount }).then((s) => { refresh('payouts', 'notifications', 'recon'); return s; });
  if (!entry.canSettle) throw new Error(entry.bank ? 'Nothing to settle — fees and refunds were more than sales.' : 'No bank account on file for this retailer.');
  const id = uid('settle');
  const s = { id, retailerId: entry.retailerId, retailerName: entry.retailerName, amount: entry.amount, from: entry.from, to: entry.to, label: entry.label,
    status: 'processing', payoutId: `pout_${Math.random().toString(36).slice(2, 16).padEnd(14, '0')}`, razorpayStatus: 'processing', utr: '', bank: entry.bank, by, at: Date.now() };
  settlementsStore.set((all) => [s, ...all]);
  for (const w of rows.filter((x) => x.retailerId === entry.retailerId && x.status === 'ready')) writeRecord(w.key, (r) => ({ ...r, settlementId: id }));
  audit({ action: 'payout.settle', entity: 'payout', entityId: id, summary: `Settled ${entry.retailerName} ${entry.label} · ₹${entry.amount.toLocaleString('en-IN')} to ••••${entry.bank.last4}` });
  /* the demo's stand-in for Razorpay's payout.processed webhook */
  setTimeout(() => checkSettlement(s), 4000);
  return s;
}

/* Check status: ask Razorpay where a processing payout has got to */
export function checkSettlement(s) {
  if (LIVE) return post(`/admin/payouts/settlements/${s.id}/refresh`, {}).then((x) => { refresh('payouts', 'notifications', 'recon'); return x; });
  const cur = settlementsStore.get().find((x) => x.id === s.id);
  if (!cur || cur.status !== 'processing') return cur;
  const utr = `SIMX${String(Date.now()).slice(-12)}`;
  settlementsStore.set((all) => all.map((x) => (x.id === s.id ? { ...x, status: 'paid', razorpayStatus: 'processed', utr, paidAt: Date.now() } : x)));
  audit({ action: 'payout.paid', entity: 'payout', entityId: s.id, summary: `${s.retailerName} ${s.label} paid · ₹${s.amount.toLocaleString('en-IN')} · UTR ${utr}` });
  notify({ userId: `retailer:${s.retailerId}`, icon: 'rupee', title: `₹${s.amount.toLocaleString('en-IN')} sent to your bank`, body: `${s.label} · UTR ${utr}`, to: '/seller/payouts' });
  return { ...cur, status: 'paid', utr };
}

export function addAdjustment(row, amount, note, by) {
  if (LIVE) return post(`/admin/payouts/${row.retailerId}/${row.cycle}/adjustments`, { amount, note }).then(() => refresh('payouts'));
  writeRecord(row.key, (r) => ({ ...r, adjustments: [...(r.adjustments || []), { id: uid('adj'), amount: Math.round(amount), note, by, at: Date.now() }] }));
  audit({ action: 'payout.adjust', entity: 'payout', entityId: row.key, summary: `${amount > 0 ? 'Added' : 'Deducted'} ₹${Math.abs(Math.round(amount)).toLocaleString('en-IN')} on ${row.retailerName} ${row.label}: ${note}` });
}

/* ── reconciliation ──────────────────────────────────────────────────────── */
/* Our side of every money movement that Razorpay should also show. */
export function ourLedger({ orders, refunds, payoutRows, settlements = [] }) {
  const out = [];
  for (const o of orders) {
    if (o.razorpay) out.push({ id: `pay:${o.id}`, type: 'Payment', ref: o.razorpay.paymentId, orderId: o.id, retailer: '—', amount: o.total, at: o.createdAt });
    for (const p of o.parts || []) {
      if (p.transfer) out.push({ id: `trf:${p.id}`, type: 'Transfer', ref: p.transfer.id, orderId: o.id, partId: p.id, retailer: p.retailerName, amount: p.transfer.amount, at: o.createdAt });
    }
  }
  for (const r of refunds) if (r.status === 'processed' && r.razorpayRefundId) out.push({ id: `rf:${r.id}`, type: 'Refund', ref: r.razorpayRefundId, orderId: r.orderId, partId: r.partId, retailer: r.retailerName, amount: r.amount, at: r.processedAt || r.decidedAt });
  for (const x of settlements) if (x.status === 'paid') out.push({ id: `po:${x.id}`, type: 'Payout', ref: x.payoutId || '—', retailer: x.retailerName, amount: x.amount, at: x.paidAt || x.at });
  /* weeks paid before settlements existed */
  for (const p of payoutRows) if (p.status === 'paid' && !p.settlementId && p.net > 0) out.push({ id: `po:${p.key}`, type: 'Payout', ref: p.utr || '—', retailer: p.retailerName, amount: p.net, at: p.end });
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
