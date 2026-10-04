import { createStore, uid } from '../lib/store';

/* ============================================================================
 * Notifications — the bell in every portal (customer review item 4).
 *
 * `userId` is the audience. It is either one account id, or a group:
 *   role:ADMIN      every Nasou Hive team member
 *   team:finance    team members with that role preset
 *   retailer:r1     everyone working for that retailer
 * Read / cleared state is kept per person, so a group notice stays unread
 * for colleagues who have not opened it. Newest 300 kept until a
 * notifications API exists.
 * ==========================================================================*/

const MAX = 300;
export const notificationsStore = createStore('nivora_notices_v2', () => []);

/* kind drives the tabs in the customer bell */
const KIND_BY_ICON = { package: 'orders', truck: 'orders', check: 'orders', rupee: 'orders', refresh: 'orders', tag: 'offers', heart: 'activity', cart: 'activity' };

export function notify(n) {
  const item = {
    id: uid('n'),
    at: Date.now(),
    icon: 'bell',
    userId: 'guest',
    readBy: [],
    hiddenFor: [],
    ...n,
    kind: n.kind || KIND_BY_ICON[n.icon] || 'account',
  };
  notificationsStore.set((list) => [item, ...list].slice(0, MAX));
  return item;
}

/* the audiences a signed-in person belongs to */
export function audiencesOf(user) {
  if (!user) return ['guest'];
  const out = [user.id];
  if (user.role) out.push(`role:${user.role}`);
  if (user.role === 'ADMIN' && user.teamRole) out.push(`team:${user.teamRole}`);
  if (user.role === 'RETAILER' && user.retailerId) out.push(`retailer:${user.retailerId}`);
  return out;
}

export function markRead(ids, me) {
  const set = new Set(ids);
  notificationsStore.set((list) => list.map((n) => (set.has(n.id) && !n.readBy.includes(me) ? { ...n, readBy: [...n.readBy, me] } : n)));
}
export function hideFor(ids, me) {
  const set = new Set(ids);
  notificationsStore.set((list) => list.map((n) => (set.has(n.id) && !n.hiddenFor.includes(me) ? { ...n, hiddenFor: [...n.hiddenFor, me] } : n)));
}
