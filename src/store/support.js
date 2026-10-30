import { createStore, useStore } from '../lib/store';
import { LIVE } from '../lib/config';
import { api, get, patch } from '../lib/api';
import { getStoredSession } from '../lib/auth';

/* ============================================================================
 * Review 6 data the consoles read from nasou-api:
 *
 *   tickets     support tickets — a store's or customer's own, or everyone's (team)
 *   enquiries   price requests / leads — about the store's products (seller)
 *               or all of them (team)
 *   customers   people who ordered from this store (seller only)
 *
 * The browser demo (no API) has no backend for these: the stores stay empty
 * and the screens say so.
 * ==========================================================================*/

export const ticketsStore = createStore('nivora_tickets_v1', () => []);
export const enquiriesStore = createStore('nivora_enquiries_v1', () => []);
export const sellerCustomersStore = createStore('nivora_seller_customers_v1', () => []);

export const useTickets = () => useStore(ticketsStore);
export const useEnquiries = () => useStore(enquiriesStore);
export const useSellerCustomers = () => useStore(sellerCustomersStore);

const role = () => getStoredSession()?.role;
const side = () => (role() === 'ADMIN' ? '/admin' : role() === 'RETAILER' ? '/seller' : '/support');

export const TICKET_CATEGORIES = [
  ['technical', 'Technical issue'],
  ['products', 'Product uploads'],
  ['orders', 'Orders'],
  ['payments', 'Payments'],
  ['payouts', 'Payouts'],
  ['account', 'Account'],
  ['other', 'Something else'],
];
/* what a shopper can raise a ticket about */
export const CUSTOMER_TICKET_CATEGORIES = [
  ['orders', 'An order'],
  ['payments', 'A payment'],
  ['products', 'A product'],
  ['account', 'My account'],
  ['technical', 'The website'],
  ['other', 'Something else'],
];
export const TICKET_PRIORITIES = [
  ['low', 'Low'],
  ['medium', 'Medium'],
  ['high', 'High'],
  ['urgent', 'Urgent'],
];
export const TICKET_STATUSES = [
  ['OPEN', 'Open'],
  ['IN_PROGRESS', 'In progress'],
  ['RESOLVED', 'Resolved'],
  ['CLOSED', 'Closed'],
];
export const ticketStatusLabel = (s) => TICKET_STATUSES.find((x) => x[0] === s)?.[1] || s;
export const categoryLabel = (c) => TICKET_CATEGORIES.find((x) => x[0] === String(c).toLowerCase())?.[1] || c;

export async function loadTickets() {
  if (!LIVE) return;
  ticketsStore.set(await get(`${side()}/tickets`));
}
export async function loadEnquiries() {
  if (!LIVE) return;
  const res = await get(role() === 'ADMIN' ? '/admin/enquiries?size=200' : '/seller/enquiries');
  enquiriesStore.set(Array.isArray(res) ? res : res?.content || res?.items || []);
}
export async function loadSellerCustomers() {
  if (!LIVE) return;
  sellerCustomersStore.set(await get('/seller/customers'));
}

export const getTicket = (id) => get(`${side()}/tickets/${id}`);

const form = (fields, file) => {
  const f = new FormData();
  Object.entries(fields).forEach(([k, v]) => { if (v != null && v !== '') f.append(k, v); });
  if (file) f.append('file', file, file.name);
  return f;
};

export async function openTicket({ category, priority, subject, description, orderRef, file }) {
  const t = await api(`${side()}/tickets`, { method: 'POST', body: form({ category, priority, subject, description, orderRef }, file) });
  await loadTickets();
  return t;
}
export async function replyTicket(id, body, file) {
  const t = await api(`${side()}/tickets/${id}/messages`, { method: 'POST', body: form({ body }, file) });
  loadTickets().catch(() => {});
  return t;
}
export async function updateTicket(id, fields) {
  const t = await patch(`${side()}/tickets/${id}`, fields);
  loadTickets().catch(() => {});
  return t;
}
/* attachments need the bearer token, so they are fetched and opened as a blob */
export async function openAttachment(ticketId, messageId) {
  const { API_BASE_URL } = await import('../lib/config');
  const res = await fetch(`${API_BASE_URL}${side()}/tickets/${ticketId}/messages/${messageId}/file`, {
    headers: { Authorization: `Bearer ${getStoredSession()?.accessToken}` },
  });
  if (!res.ok) throw new Error('Could not open the attachment.');
  const url = URL.createObjectURL(await res.blob());
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
export async function setEnquiryStatus(id, status, note) {
  await patch(`/admin/enquiries/${id}`, { status, note });
  await loadEnquiries();
}
