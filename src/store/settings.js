import { createStore, useStore } from '../lib/store';
import { audit } from '../lib/auditLog';
import { defaultPresets } from '../lib/access';
import { DEFAULT_COMMISSION, DEFAULT_PLANS } from '../lib/marketplace';
import { LIVE } from '../lib/config';
import { put, refresh } from '../lib/live';

/* ============================================================================
 * Platform settings the Super Admin owns (requirements 3, 10, 16, 18, 24–27)
 * and the open decisions from section 5 of the requirements, each set to the
 * recommended default and changeable from the console.
 * ==========================================================================*/

const ATTRS = {
  plumbing: ['Size', 'Material', 'Pressure class', 'Brand'],
  electrical: ['Voltage', 'Wattage', 'Phase', 'Brand'],
  agriculture: ['Size', 'Flow rate', 'Material'],
  hardware: ['Size', 'Material', 'Finish'],
  paints: ['Volume', 'Finish', 'Colour', 'Coverage'],
  electronics: ['Power', 'Warranty', 'Brand'],
  other: ['Size', 'Material'],
};

function seed() {
  return {
    presets: defaultPresets(),
    commission: { default: DEFAULT_COMMISSION },
    plans: DEFAULT_PLANS,
    decisions: {
      settlementCycle: 'weekly',
      releaseOn: 'delivery', // hold each retailer's share until the part is delivered
      subscriptionBilling: 'deduct', // deduct monthly fees from the first payout of the month
      refundApprovalAbove: 0, // every refund needs Finance approval
      retailerDelete: 'soft',
      sensitiveFields: ['bank', 'gstin', 'pan', 'legalName'],
    },
    taxRules: [
      { id: 't1', department: 'plumbing', region: 'All', rate: 18 },
      { id: 't2', department: 'electrical', region: 'All', rate: 18 },
      { id: 't3', department: 'agriculture', region: 'All', rate: 12 },
      { id: 't4', department: 'paints', region: 'All', rate: 28 },
      { id: 't5', department: 'hardware', region: 'All', rate: 18 },
    ],
    shippingRules: [
      { id: 's1', retailerId: 'all', region: 'All', basis: 'price', min: 0, max: 0, fee: 49, freeAbove: 999 },
      { id: 's2', retailerId: 'r3', region: 'Telangana', basis: 'price', min: 0, max: 0, fee: 79, freeAbove: 1499 },
    ],
    banners: [
      { id: 'b1', eyebrow: 'Nivora marketplace', title: 'Every fitting, from every trusted counter.', sub: 'Compare verified retailers across plumbing, electrical, hardware and more — one cart, one checkout.', cta: 'Shop the catalogue', to: '/shop', tone: 'cream', active: true },
      { id: 'b2', eyebrow: 'This week', title: 'Up to 30% off fast-moving PVC fittings.', sub: 'Verified prices, GST invoice, same-day dispatch on stock.', cta: 'Shop the deals', to: '/deals', tone: 'forest', active: true },
      { id: 'b3', eyebrow: 'For retailers', title: 'Sell on Nivora. Get paid every week.', sub: 'List your counter in a day. Razorpay settles your share straight to your bank.', cta: 'Start selling', to: '/sell', tone: 'sand', active: true },
    ],
    featured: ['plumbing', 'electrical', 'agriculture', 'hardware'],
    templates: [
      { key: 'order_placed', channel: 'email', subject: 'Your Nivora order {{orderId}} is confirmed', body: 'Hi {{name}}, thanks for your order of {{total}}. Each seller ships their part separately — track every part from Orders.' },
      { key: 'part_shipped', channel: 'sms', subject: '', body: 'Nivora: {{retailer}} has shipped part {{partId}} of order {{orderId}}. Track: {{link}}' },
      { key: 'retailer_approved', channel: 'email', subject: 'Welcome to Nivora, {{retailer}}', body: 'Your documents are verified and your store is live. Add products from your seller console.' },
      { key: 'retailer_changes', channel: 'email', subject: 'Action needed on your Nivora application', body: 'Hi {{name}}, please fix the following and re-submit: {{reason}}' },
      { key: 'refund_processed', channel: 'push', subject: 'Refund processed', body: '{{amount}} refunded for part {{partId}}. It reaches your account in 5–7 working days.' },
      { key: 'payout_paid', channel: 'email', subject: 'Payout {{cycle}} sent', body: '{{amount}} has been paid to your bank. UTR {{utr}}.' },
    ],
    catalog: { subs: [], attributes: ATTRS },
  };
}

/* LIVE keeps the defaults until the server's values arrive (public subset at
   start-up, everything for the team after sign-in). */
export const settingsStore = createStore('nivora_settings_v1', seed, seed);
export const useSettings = (sel = (s) => s) => useStore(settingsStore, sel);
export const getSettings = () => settingsStore.get();

/* update one top-level section, with an audit entry */
export function saveSetting(section, value, summary) {
  if (LIVE) {
    settingsStore.set((s) => ({ ...s, [section]: value }));
    return put(section === 'presets' ? '/admin/roles' : `/admin/settings/${section}`, value)
      .finally(() => refresh('settings', 'accounts', 'audit'));
  }
  const before = settingsStore.get()[section];
  settingsStore.set((s) => ({ ...s, [section]: value }));
  audit({
    action: section === 'presets' ? 'permission.change' : 'settings.update',
    entity: 'settings', entityId: section,
    summary: summary || `Updated ${section}`,
    before: typeof before === 'object' ? null : before,
    after: typeof value === 'object' ? null : value,
  });
}

/* GST for a product in a delivery state (requirement 24) */
export function taxRateFor(product, state = 'All') {
  const rules = settingsStore.get().taxRules;
  const dept = product?.department || 'plumbing';
  const hit = rules.find((r) => r.department === dept && r.region === state)
    || rules.find((r) => r.department === dept && r.region === 'All');
  return hit ? Number(hit.rate) : 18;
}

/* Delivery fee for one retailer's part (requirement 25): the most specific
   matching rule wins — retailer + region, retailer, region, then all. */
export function shippingFor({ retailerId, state = 'All', value = 0 }) {
  const rules = settingsStore.get().shippingRules;
  const score = (r) => (r.retailerId === retailerId ? 2 : 0) + (r.region === state ? 1 : 0);
  const fits = rules
    .filter((r) => (r.retailerId === 'all' || r.retailerId === retailerId) && (r.region === 'All' || r.region === state))
    .filter((r) => r.basis !== 'price' || ((!r.min || value >= r.min) && (!r.max || value <= r.max)))
    .sort((a, b) => score(b) - score(a));
  const rule = fits[0];
  if (!rule) return value >= 999 ? 0 : 49;
  return rule.freeAbove && value >= rule.freeAbove ? 0 : Number(rule.fee) || 0;
}
