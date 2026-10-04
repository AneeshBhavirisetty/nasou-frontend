import { LIVE } from './config';
import { api, del, get, patch, post, put } from './api';
import { getStoredSession } from './auth';
import { setLiveCatalog } from '../data/catalog';
import { retailersStore, requestsStore } from '../store/retailers';
import { ordersStore, refundsStore } from '../store/orders';
import { accountsStore, invitesStore } from '../store/accounts';
import { payoutsStore, reconRowsStore } from '../store/payouts';
import { settingsStore } from '../store/settings';
import { notificationsStore } from '../store/notifications';
import { adminStore, stockLedgerStore, liveProductsStore } from '../context/AdminStore';
import { auditStore, setServerChain } from './auditLog';
import { createStore } from './store';

/* The signed-in team member's own access levels (GET /admin/me/access). */
export const accessStore = createStore('nivora_my_access', () => ({}));

/* ============================================================================
 * live.js — keeps the stores in step with nasou-api (LIVE mode only).
 *
 * The app renders from the same stores in both modes. Here they are filled
 * from the API: the public snapshot before the first render, then what the
 * signed-in person may see (team / retailer / customer), and refreshed after
 * every change they make. Each loader is safe to call when the role cannot
 * read that resource — a 403 just leaves the store as it is.
 * ==========================================================================*/

export const who = () => {
  const s = getStoredSession();
  return s?.accessToken ? s : null;
};
const isAdmin = () => who()?.role === 'ADMIN';
const isSeller = () => who()?.role === 'RETAILER';
const quiet = (p) => p.catch(() => undefined);

/* ── storefront ─────────────────────────────────────────────────────────── */

export async function bootstrap() {
  if (!LIVE) return;
  try {
    const snap = await get('/storefront/snapshot');
    setLiveCatalog(snap);
    if (!isAdmin()) retailersStore.set(snap.retailers || []);
    settingsStore.set((s) => ({ ...s, ...(snap.settings || {}) }));
    adminStore.set((s) => ({ ...s, bulkRules: snap.bulkRules || [] }));
  } catch (e) {
    console.error('Could not load the catalogue', e);
  }
}

/* ── per resource ───────────────────────────────────────────────────────── */

export const load = {
  async access() {
    if (isAdmin()) accessStore.set(await get('/admin/me/access'));
  },
  async retailers() {
    if (isAdmin()) retailersStore.set(await get('/admin/retailers'));
    else if (isSeller()) {
      const me = await get('/seller/me');
      retailersStore.set((list) => [me.retailer, ...list.filter((r) => r.id !== me.retailer.id)]);
    }
  },
  async requests() {
    if (isAdmin()) requestsStore.set(await get('/admin/requests'));
  },
  async orders() {
    const path = isAdmin() ? '/admin/orders' : isSeller() ? '/seller/orders' : '/orders';
    ordersStore.set(await get(path));
  },
  async refunds() {
    if (isAdmin()) refundsStore.set(await get('/admin/refunds'));
    else if (isSeller()) refundsStore.set(await get('/seller/refunds'));
  },
  async payouts() {
    if (isAdmin()) payoutsStore.set(await get('/admin/payouts'));
    else if (isSeller()) payoutsStore.set(await get('/seller/payouts'));
  },
  async recon() {
    if (isAdmin()) reconRowsStore.set(await get('/admin/reconciliation'));
  },
  async accounts() {
    if (isAdmin()) {
      const [team, customers] = await Promise.all([quiet(get('/admin/team')), quiet(get('/admin/customers'))]);
      if (team?.presets) settingsStore.set((s) => ({ ...s, presets: team.presets }));
      accountsStore.set([...(team?.members || []), ...(customers || [])]);
    } else if (isSeller()) {
      const team = await get('/seller/team');
      accountsStore.set(team.members || []);
      invitesStore.set((team.invites || []).map((i) => ({ ...i, token: i.id, retailerId: who()?.retailerId })));
    }
  },
  async settings() {
    if (isAdmin()) {
      const all = await get('/admin/settings');
      settingsStore.set((s) => ({ ...s, ...all }));
    }
  },
  async notifications() {
    if (who()) notificationsStore.set(await get('/notifications'));
  },
  async products() {
    if (isAdmin()) liveProductsStore.set(await get('/admin/catalog/all'));
    else if (isSeller()) liveProductsStore.set(await get('/seller/products'));
  },
  async discounts() {
    if (!isAdmin()) return;
    const [coupons, bulkRules] = await Promise.all([quiet(get('/admin/coupons')), quiet(get('/admin/bulk-rules'))]);
    adminStore.set((s) => ({ ...s, ...(coupons ? { coupons } : {}), ...(bulkRules ? { bulkRules } : {}) }));
  },
  async stock() {
    if (isSeller()) stockLedgerStore.set(await get('/seller/stock-movements'));
  },
  async audit() {
    if (!isAdmin()) return;
    const [rows, chain] = await Promise.all([get('/admin/audit?limit=3000'), quiet(get('/admin/audit/verify'))]);
    setServerChain(chain || { ok: true });
    auditStore.set(rows);
  },
  async catalog() {
    await bootstrap();
  },
};

/* Everything this person's screens use, in parallel. */
export async function loadSession() {
  if (!LIVE || !who()) return;
  const jobs = isAdmin()
    ? ['access', 'settings', 'retailers', 'requests', 'orders', 'refunds', 'payouts', 'accounts', 'products', 'discounts', 'notifications', 'audit', 'recon']
    : isSeller()
      ? ['retailers', 'orders', 'refunds', 'payouts', 'products', 'stock', 'notifications', 'accounts']
      : ['orders', 'notifications'];
  await Promise.allSettled(jobs.map((k) => load[k]()));
}

/* Reload several resources after a change. */
export const refresh = (...names) => Promise.allSettled(names.map((k) => load[k]?.()));

/* Forget everything that belonged to the person who signed out. */
export function clearSessionData() {
  if (!LIVE) return;
  [ordersStore, refundsStore, accountsStore, invitesStore, requestsStore, notificationsStore, stockLedgerStore,
    liveProductsStore, auditStore].forEach((s) => s.set([]));
  accessStore.set({});
  payoutsStore.set({ rows: [], held: {} });
  reconRowsStore.set({ rows: [] });
  bootstrap();
}

/* Bell + order updates without a reload: notifications every 30 s, the
   person's lists every 2 minutes while the tab is visible. */
let timers = [];
export function startPolling() {
  stopPolling();
  if (!LIVE) return;
  const visible = () => typeof document === 'undefined' || document.visibilityState === 'visible';
  timers.push(setInterval(() => { if (visible() && who()) load.notifications().catch(() => {}); }, 30000));
  timers.push(setInterval(() => {
    if (!visible() || !who()) return;
    refresh('orders', 'refunds', ...(isAdmin() ? ['retailers', 'requests', 'access'] : []));
  }, 120000));
}
export function stopPolling() {
  timers.forEach(clearInterval);
  timers = [];
}

export { api, get, post, put, patch, del };
