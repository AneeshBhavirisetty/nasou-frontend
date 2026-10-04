/* ============================================================================
 * marketplace.js — the multi-retailer rules, as pure functions.
 *
 *   split checkout (req. 8)    one order → one sub-order ("part") per retailer
 *   commission (req. 10)       % per retailer, optionally per category
 *   Razorpay split (sec. 3)    retailer share = part value − commission
 *   settlement (req. 13)       per retailer, per weekly cycle
 *
 * No React and no storage, so scripts/*.test.mjs can run it under Node.
 * ==========================================================================*/

export const ORDER_FLOW = ['Pending', 'Processing', 'Shipped', 'Delivered'];
export const PART_STATUSES = [...ORDER_FLOW, 'Cancelled'];

export const RETAILER_STATUS = {
  pending: { label: 'Pending review', tone: 'amber' },
  needs_changes: { label: 'Corrections asked', tone: 'amber' },
  approved: { label: 'Active', tone: 'ok' },
  rejected: { label: 'Rejected', tone: 'clay' },
  suspended: { label: 'Suspended', tone: 'clay' },
  deactivated: { label: 'Deactivated', tone: 'neutral' },
  deleted: { label: 'Deleted', tone: 'neutral' },
};
export const retailerStatusLabel = (s) => RETAILER_STATUS[s]?.label || s;

/* Only an approved retailer's products are listed and orderable. */
export const canSell = (r) => r?.status === 'approved';
/* Deactivated and deleted retailers cannot sign in; the rest can (a pending
   or rejected applicant signs in to see where their application stands). */
export const canLogin = (r) => !!r && r.status !== 'deactivated' && r.status !== 'deleted';

export const DEFAULT_COMMISSION = 10;

export const DEFAULT_PLANS = [
  { id: 'starter', name: 'Starter', monthly: 0, perks: 'List up to 500 products · standard payouts' },
  { id: 'growth', name: 'Growth', monthly: 1499, perks: 'Unlimited products · featured placement · 3 staff seats' },
  { id: 'pro', name: 'Pro', monthly: 3999, perks: 'Everything in Growth · priority payouts · 10 staff seats' },
];

/* Documents a retailer uploads at signup (req. 5). */
export const DOC_TYPES = [
  { key: 'business', label: 'Business registration', hint: 'Shop & Establishment, Udyam or incorporation certificate' },
  { key: 'gst', label: 'GST certificate', hint: 'GST registration certificate (REG-06)' },
  { key: 'pan', label: 'PAN card', hint: 'Business or proprietor PAN' },
  { key: 'bank', label: 'Bank proof', hint: 'Cancelled cheque or bank statement page' },
];

const DAY = 86400000;
const doc = (type, name, kb, daysAgo, status = 'verified') => ({ type, name, size: kb * 1024, uploadedAt: Date.now() - daysAgo * DAY, status });

/* The retailers the demo starts with. Products of the generated catalogue are
   spread over the three approved ones (retailerForRow). */
export function seedRetailers() {
  const now = Date.now();
  const base = (o) => ({
    commission: { rate: DEFAULT_COMMISSION, byCategory: {} },
    plan: 'starter',
    notes: [],
    pendingChanges: null,
    documents: [],
    statusLog: o.status === 'approved'
      ? [{ status: 'pending', at: o.joinedAt, by: o.contact, note: 'Application submitted' }, { status: 'approved', at: o.joinedAt + 1.5 * DAY, by: 'Priya Sharma', note: 'Documents verified' }]
      : [{ status: 'pending', at: o.joinedAt, by: o.contact, note: 'Application submitted' }],
    ...o,
  });
  return [
    base({
      id: 'r1', name: 'Sri Sai Pipes & Sanitary', legalName: 'Sri Sai Pipes and Sanitary Traders', type: 'Proprietorship',
      contact: 'Ravi Teja', email: 'retailer@nivora.test', phone: '9000000101', address: '12-4, Ranigunj Main Road', city: 'Hyderabad', state: 'Telangana', pin: '500003',
      gstin: '36AAPFS1234K1Z2', pan: 'AAPFS1234K', bank: { holder: 'Sri Sai Pipes and Sanitary Traders', account: '50200012345678', ifsc: 'HDFC0001234' },
      razorpayAccount: 'acc_NvR1SriSai01', status: 'approved', plan: 'growth', joinedAt: now - 210 * DAY,
      commission: { rate: 10, byCategory: { 'cpvc-fittings': 8 } },
      documents: [doc('business', 'shop-establishment.pdf', 412, 212), doc('gst', 'gst-reg06.pdf', 230, 212), doc('pan', 'pan-card.jpg', 180, 212), doc('bank', 'cancelled-cheque.jpg', 160, 212)],
    }),
    base({
      id: 'r2', name: 'Deccan Hardware Mart', legalName: 'Deccan Hardware Mart LLP', type: 'LLP',
      contact: 'Lakshmi Narayana', email: 'retailer2@nivora.test', phone: '9000000102', address: 'Plot 7, SD Road', city: 'Secunderabad', state: 'Telangana', pin: '500003',
      gstin: '36AALFD5678M1Z9', pan: 'AALFD5678M', bank: { holder: 'Deccan Hardware Mart LLP', account: '91802004567890', ifsc: 'ICIC0000456' },
      razorpayAccount: 'acc_NvR2Deccan02', status: 'approved', plan: 'pro', joinedAt: now - 160 * DAY,
      commission: { rate: 9, byCategory: {} },
      documents: [doc('business', 'llp-incorporation.pdf', 640, 162), doc('gst', 'gst-certificate.pdf', 210, 162), doc('pan', 'pan.pdf', 120, 162), doc('bank', 'bank-statement.pdf', 380, 162)],
    }),
    base({
      id: 'r3', name: 'Krishna Agro & Plumbing', legalName: 'Krishna Agro and Plumbing Stores', type: 'Partnership',
      contact: 'Sravani K', email: 'retailer3@nivora.test', phone: '9000000103', address: 'Door 4-21, Eluru Road', city: 'Vijayawada', state: 'Andhra Pradesh', pin: '520002',
      gstin: '37AAKFK9012P1Z4', pan: 'AAKFK9012P', bank: { holder: 'Krishna Agro and Plumbing Stores', account: '33450011223344', ifsc: 'SBIN0004321' },
      razorpayAccount: 'acc_NvR3Krishna3', status: 'approved', plan: 'starter', joinedAt: now - 95 * DAY,
      commission: { rate: 12, byCategory: { 'pvc-pipes': 10 } },
      documents: [doc('business', 'partnership-deed.pdf', 820, 97), doc('gst', 'gst-reg.pdf', 200, 97), doc('pan', 'pan-firm.jpg', 150, 97), doc('bank', 'cheque.jpg', 140, 97)],
    }),
    base({
      id: 'r4', name: 'Balaji Electricals', legalName: 'Balaji Electricals and Lighting', type: 'Proprietorship',
      contact: 'Mahesh Balaji', email: 'pending@nivora.test', phone: '9000000104', address: 'Station Road, Hanamkonda', city: 'Warangal', state: 'Telangana', pin: '506001',
      gstin: '36BBEPB3456C1Z1', pan: 'BBEPB3456C', bank: { holder: 'Mahesh Balaji', account: '62110098765432', ifsc: 'UBIN0806110' },
      razorpayAccount: null, status: 'pending', joinedAt: now - 2 * DAY,
      documents: [doc('business', 'udyam-certificate.pdf', 300, 2, 'submitted'), doc('gst', 'gst-reg06.pdf', 190, 2, 'submitted'), doc('pan', 'pan-card.png', 260, 2, 'submitted'), doc('bank', 'cancelled-cheque.jpg', 170, 2, 'submitted')],
    }),
    base({
      id: 'r5', name: 'Coastal Paints & Tools', legalName: 'Coastal Paints and Tools', type: 'Proprietorship',
      contact: 'Joseph D', email: 'retailer5@nivora.test', phone: '9000000105', address: 'Dwaraka Nagar 3rd Lane', city: 'Visakhapatnam', state: 'Andhra Pradesh', pin: '530016',
      gstin: '37CCPPJ7788D1Z6', pan: 'CCPPJ7788D', bank: { holder: 'Joseph D', account: '1201000456', ifsc: 'CNRB0001201' },
      razorpayAccount: null, status: 'needs_changes', joinedAt: now - 6 * DAY,
      statusLog: [{ status: 'pending', at: now - 6 * DAY, by: 'Joseph D', note: 'Application submitted' }, { status: 'needs_changes', at: now - 4 * DAY, by: 'Priya Sharma', note: 'The bank proof is blurred — please upload a clearer cancelled cheque.' }],
      documents: [doc('business', 'shop-licence.pdf', 280, 6, 'submitted'), doc('gst', 'gst.pdf', 210, 6, 'submitted'), doc('pan', 'pan.jpg', 170, 6, 'submitted'), doc('bank', 'cheque-photo.jpg', 95, 6, 'rejected')],
    }),
  ];
}

/* Generated-catalogue products are owned by the approved demo retailers. */
export const SEED_SELLERS = ['r1', 'r2', 'r3'];
export const retailerForRow = (row = 0) => SEED_SELLERS[Math.abs(row) % SEED_SELLERS.length];

/* Commission % for a product line: category override → retailer rate → default. */
export function commissionRate(retailer, category, fallback = DEFAULT_COMMISSION) {
  const c = retailer?.commission;
  if (c?.byCategory && category && c.byCategory[category] != null) return Number(c.byCategory[category]);
  if (c?.rate != null) return Number(c.rate);
  return fallback;
}

/* Split `total` into integer shares proportional to `weights` (largest
   remainder), so the parts always add back up to the order total. */
export function allocate(total, weights) {
  const sum = weights.reduce((s, w) => s + w, 0);
  if (!sum) return weights.map((_, i) => (i === 0 ? total : 0));
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map(Math.floor);
  let left = total - out.reduce((s, v) => s + v, 0);
  raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]).forEach(([, i]) => {
    if (left > 0) { out[i] += 1; left -= 1; }
  });
  return out;
}

/* Money of one sub-order. Commission is taken on the part's order value
   (requirements, section 3: Rs 6,000 at 10% → Rs 600 commission, Rs 5,400
   to the retailer). */
export function partMoney(total, rate) {
  const commission = Math.round((total * rate) / 100);
  return { commission, retailerShare: total - commission };
}

/* lines: [{ retailerId, amount, … }] plus order-level amounts → parts[] with
   each retailer's lines and its share of discount / GST / shipping. */
export function splitOrder({ orderId, lines, discount = 0, gst = 0, shipping = 0, shippingByRetailer, gstByRetailer, discountByRetailer, retailers = [], rateFor }) {
  const groups = new Map();
  for (const l of lines) {
    const g = groups.get(l.retailerId) || [];
    g.push(l);
    groups.set(l.retailerId, g);
  }
  const ids = [...groups.keys()];
  const subs = ids.map((id) => groups.get(id).reduce((s, l) => s + l.amount, 0));
  const discounts = discountByRetailer ? ids.map((id) => discountByRetailer[id] || 0) : allocate(discount, subs);
  const gsts = gstByRetailer ? ids.map((id) => gstByRetailer[id] || 0) : allocate(gst, subs);
  const ships = shippingByRetailer ? ids.map((id) => shippingByRetailer[id] || 0) : allocate(shipping, subs);
  return ids.map((rid, i) => {
    const retailer = retailers.find((r) => r.id === rid);
    const partLines = groups.get(rid);
    const total = subs[i] - discounts[i] + gsts[i] + ships[i];
    const rate = rateFor ? rateFor(rid, partLines) : commissionRate(retailer, partLines[0]?.category);
    return {
      id: `${orderId}-${i + 1}`,
      retailerId: rid,
      retailerName: retailer?.name || rid,
      lines: partLines,
      subtotal: subs[i],
      discount: discounts[i],
      gst: gsts[i],
      shipping: ships[i],
      total,
      commissionRate: rate,
      ...partMoney(total, rate),
      status: 'Pending',
      refunded: 0,
      returns: [],
    };
  });
}

/* One order-level status from its parts: all cancelled → Cancelled,
   otherwise the least advanced live part. */
export function aggregateStatus(parts = []) {
  const live = parts.filter((p) => p.status !== 'Cancelled');
  if (!parts.length) return 'Pending';
  if (!live.length) return 'Cancelled';
  return ORDER_FLOW[Math.min(...live.map((p) => Math.max(0, ORDER_FLOW.indexOf(p.status))))];
}

export const nextStatus = (s) => ORDER_FLOW[Math.min(ORDER_FLOW.length - 1, ORDER_FLOW.indexOf(s) + 1)];

/* ── settlement cycles (weekly, Monday to Sunday) ─────────────────────────── */
export function cycleStart(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  const dow = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - dow);
  return d.getTime();
}
export const cycleEnd = (start) => start + 7 * DAY - 1;
export function cycleLabel(start) {
  const f = (ms) => new Date(ms).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${f(start)} – ${f(cycleEnd(start))}`;
}
/* does the cycle contain the 1st of a month? (monthly fees fall there) */
export function cycleHasMonthStart(start) {
  for (let t = start; t <= cycleEnd(start); t += DAY) if (new Date(t).getDate() === 1) return true;
  return false;
}

/* One retailer's settlement for one cycle.
   parts:   that retailer's sub-orders created in the cycle
   refunds: processed refunds on their parts in the cycle (retailer portion)
   fee:     subscription fee deducted in this cycle (0 if billed separately) */
export function settle({ parts = [], refunds = [], fee = 0, adjustments = [] }) {
  const live = parts.filter((p) => p.status !== 'Cancelled');
  const sales = live.reduce((s, p) => s + p.total, 0);
  const commission = live.reduce((s, p) => s + p.commission, 0);
  const refunded = refunds.reduce((s, r) => s + (r.retailerPortion ?? r.amount), 0);
  const adjusted = adjustments.reduce((s, a) => s + a.amount, 0);
  return {
    orders: live.length,
    sales,
    commission,
    fee,
    refunds: refunded,
    adjustments: adjusted,
    net: sales - commission - fee - refunded + adjusted,
  };
}

/* A refund on one part only touches that retailer: commission is returned
   pro rata, the rest comes out of the retailer's share. */
export function refundSplit(amount, rate) {
  const commissionBack = Math.round((amount * rate) / 100);
  return { commissionBack, retailerPortion: amount - commissionBack };
}
