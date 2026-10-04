import { createStore, useStore, uid } from '../lib/store';
import { seedRetailers, retailerStatusLabel } from '../lib/marketplace';
import { audit } from '../lib/auditLog';
import { notify } from './notifications';

/* ============================================================================
 * Retailers (Super Admin requirements 5, 6, 10, 11, 17) and the Owner's
 * approval requests (retailer deletion asked for by Operations).
 *
 * Retailer statuses: pending → approved | needs_changes | rejected, then
 * approved ⇄ suspended, approved ⇄ deactivated, any → deleted (soft: the row
 * stays so old orders and payouts keep their link).
 * ==========================================================================*/

export const retailersStore = createStore('nivora_retailers_v1', seedRetailers);
export const requestsStore = createStore('nivora_requests_v1', () => []);

export const getRetailers = () => retailersStore.get();
export const getRetailer = (id) => retailersStore.get().find((r) => r.id === id) || null;
export const retailerName = (id) => getRetailer(id)?.name || '—';

export const useRetailers = () => useStore(retailersStore);
export const useRetailer = (id) => useStore(retailersStore, (list) => list.find((r) => r.id === id) || null);
export const useRequests = () => useStore(requestsStore);

const owner = (r) => `retailer:${r.id}`;

function patch(id, fn) {
  let before = null;
  let after = null;
  retailersStore.set((list) => list.map((r) => {
    if (r.id !== id) return r;
    before = r;
    after = fn(r);
    return after;
  }));
  return { before, after };
}

/* plain field edits made by the Super Admin (contact, notes …) */
export function updateRetailer(id, fields, summary = 'Updated retailer details') {
  const { before, after } = patch(id, (r) => ({ ...r, ...fields }));
  if (!before) return;
  const changed = Object.keys(fields);
  audit({
    action: 'retailer.update', entity: 'retailer', entityId: id, summary: `${summary} — ${after.name}`,
    before: Object.fromEntries(changed.map((k) => [k, before[k]])),
    after: Object.fromEntries(changed.map((k) => [k, after[k]])),
  });
}

/* status changes, each logged, each told to the retailer */
const STATUS_COPY = {
  approved: ['Your store is approved', 'You can now list products and take orders on Nivora.'],
  needs_changes: ['Corrections needed on your application', null],
  rejected: ['Your application was not approved', null],
  suspended: ['Your store is suspended', 'Your products are hidden and new orders are paused.'],
  deactivated: ['Your store is deactivated', 'Sign-in is disabled. Contact Nivora support to restore it.'],
  deleted: ['Your store was closed', 'Open orders were closed and paid orders refunded.'],
};
export function setRetailerStatus(id, status, { note = '', by = '' } = {}) {
  const { before, after } = patch(id, (r) => ({
    ...r,
    status,
    ...(status === 'approved' && !r.razorpayAccount ? { razorpayAccount: `acc_Nv${id.toUpperCase()}${Math.random().toString(36).slice(2, 7)}` } : {}),
    ...(status === 'approved' ? { documents: r.documents.map((d) => ({ ...d, status: d.status === 'rejected' ? d.status : 'verified' })) } : {}),
    ...(status === 'deleted' ? { deletedAt: Date.now() } : {}),
    statusLog: [...(r.statusLog || []), { status, at: Date.now(), by, note }],
  }));
  if (!before) return null;
  audit({
    action: `retailer.${status === 'approved' && before.status !== 'pending' && before.status !== 'needs_changes' ? 'reinstate' : status}`,
    entity: 'retailer', entityId: id,
    summary: `${after.name}: ${retailerStatusLabel(before.status)} → ${retailerStatusLabel(status)}${note ? ` (${note})` : ''}`,
    before: { status: before.status }, after: { status },
  });
  const [title, body] = STATUS_COPY[status] || [`Store status: ${retailerStatusLabel(status)}`, null];
  notify({ userId: owner(after), icon: status === 'approved' ? 'check' : 'shield', title, body: note || body || '', to: '/seller' });
  return after;
}

/* Signup (requirement 5): a new retailer always starts as Pending. */
export function createRetailer(app) {
  const id = `r_${Date.now().toString(36)}`;
  const r = {
    id,
    commission: { rate: null, byCategory: {} },
    plan: 'starter',
    notes: [],
    pendingChanges: null,
    razorpayAccount: null,
    statusLog: [{ status: 'pending', at: Date.now(), by: app.contact, note: 'Application submitted' }],
    joinedAt: Date.now(),
    ...app,
    status: 'pending',
  };
  retailersStore.set((list) => [...list, r]);
  audit({ action: 'retailer.signup', entity: 'retailer', entityId: id, summary: `New retailer application: ${r.name}`, after: { status: 'pending' }, actor: { id: app.email, name: app.contact, role: 'retailer applicant' } });
  notify({ userId: 'team:owner', icon: 'store', title: 'New retailer application', body: `${r.name} · ${r.city}`, to: '/admin/approvals' });
  notify({ userId: 'team:operations', icon: 'store', title: 'New retailer application', body: `${r.name} · ${r.city}`, to: '/admin/approvals' });
  return r;
}

/* Corrections re-submitted by the retailer go back into the queue. */
export function resubmitApplication(id, fields) {
  const { after } = patch(id, (r) => ({
    ...r, ...fields, status: 'pending',
    statusLog: [...(r.statusLog || []), { status: 'pending', at: Date.now(), by: r.contact, note: 'Corrections submitted' }],
  }));
  if (!after) return;
  audit({ action: 'retailer.resubmit', entity: 'retailer', entityId: id, summary: `${after.name} re-submitted their application` });
  notify({ userId: 'team:owner', icon: 'store', title: 'Application re-submitted', body: after.name, to: '/admin/approvals' });
}

/* Requirement 17: bank, tax and legal edits wait for approval. */
export const SENSITIVE_FIELDS = ['legalName', 'gstin', 'pan', 'bank', 'type'];
export function proposeChanges(id, fields, by) {
  const { after } = patch(id, (r) => ({ ...r, pendingChanges: { fields: { ...(r.pendingChanges?.fields || {}), ...fields }, at: Date.now(), by } }));
  if (!after) return;
  audit({ action: 'retailer.change_request', entity: 'retailer', entityId: id, summary: `${after.name} asked to change ${Object.keys(fields).join(', ')}`, after: fields });
  notify({ userId: 'team:owner', icon: 'pencil', title: 'Retailer profile change to approve', body: `${after.name}: ${Object.keys(fields).join(', ')}`, to: '/admin/approvals?tab=changes' });
}
export function decideChanges(id, approve, { note = '', by = '' } = {}) {
  const { before, after } = patch(id, (r) => {
    if (!r.pendingChanges) return r;
    return approve ? { ...r, ...r.pendingChanges.fields, pendingChanges: null } : { ...r, pendingChanges: null };
  });
  if (!before?.pendingChanges) return;
  const keys = Object.keys(before.pendingChanges.fields);
  audit({
    action: approve ? 'retailer.change_approve' : 'retailer.change_reject', entity: 'retailer', entityId: id,
    summary: `${approve ? 'Approved' : 'Rejected'} ${after.name}'s change to ${keys.join(', ')}${note ? ` (${note})` : ''}`,
    before: Object.fromEntries(keys.map((k) => [k, before[k]])),
    after: approve ? before.pendingChanges.fields : null,
  });
  notify({ userId: owner(after), icon: approve ? 'check' : 'close', title: approve ? 'Profile change approved' : 'Profile change declined', body: note || keys.join(', '), to: '/seller/profile' });
  void by;
}

/* Operations "request" deletion; only the Owner can carry it out. */
export function requestAction({ kind, retailerId, reason, by }) {
  const r = getRetailer(retailerId);
  const req = { id: uid('rq'), kind, retailerId, retailerName: r?.name, reason, by, at: Date.now(), status: 'open' };
  requestsStore.set((list) => [req, ...list]);
  audit({ action: `request.${kind}`, entity: 'retailer', entityId: retailerId, summary: `${by} asked the Owner to ${kind} ${r?.name}: ${reason}` });
  notify({ userId: 'team:owner', icon: 'shield', title: `Approval needed: ${kind} ${r?.name}`, body: reason, to: '/admin/approvals?tab=owner' });
  return req;
}
export function closeRequest(id, status, by) {
  requestsStore.set((list) => list.map((q) => (q.id === id ? { ...q, status, decidedBy: by, decidedAt: Date.now() } : q)));
}
