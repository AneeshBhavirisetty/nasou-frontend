import { createStore, useStore, uid } from '../lib/store';
import { audit } from '../lib/auditLog';
import { notify } from './notifications';

/* ============================================================================
 * Accounts — every sign-in identity the demo knows about, so the mock auth
 * behaves like the real one: Nasou Hive team members (ADMIN + role preset),
 * retailer owners and their staff (RETAILER + retailerId), and customers.
 *
 * Demo passwords are checked here only because there is no server in the
 * deployed demo; nothing about this is meant for production. The real API
 * (nasou-api) hashes with BCrypt and enforces lockout.
 *
 * Status: active · suspended (team) · blocked (customer) · deactivated
 * (customer self-service, reversible by signing in) · deleted (soft).
 * ==========================================================================*/

export const DEMO_PASSWORD = 'nivora123';
const LEGACY_PASSWORDS = ['nasou123'];
export const DEMO_2FA_CODE = '123456';

const DAY = 86400000;
const acc = (o) => ({ status: 'active', demo: true, notes: [], createdAt: Date.now() - 120 * DAY, aliases: [], ...o });

function seed() {
  return [
    acc({ id: 'u_owner', fullName: 'Priya Sharma', email: 'owner@nivora.test', phone: '9000000009', role: 'ADMIN', teamRole: 'owner', title: 'Founder & IAM admin', aliases: ['admin@nasou.test'], createdAt: Date.now() - 300 * DAY }),
    acc({ id: 'u_ops', fullName: 'Imran Sheikh', email: 'ops@nivora.test', phone: '9000000002', role: 'ADMIN', teamRole: 'operations', title: 'Operations lead' }),
    acc({ id: 'u_support', fullName: 'Sana Fatima', email: 'support@nivora.test', phone: '9000000003', role: 'ADMIN', teamRole: 'support', title: 'Customer support' }),
    acc({ id: 'u_finance', fullName: 'Vikram Das', email: 'finance@nivora.test', phone: '9000000004', role: 'ADMIN', teamRole: 'finance', title: 'Finance & settlements' }),
    acc({ id: 'u_mgmt', fullName: 'Anita Rao', email: 'management@nivora.test', phone: '9000000005', role: 'ADMIN', teamRole: 'management', title: 'Head of business' }),
    acc({ id: 'u_r1', fullName: 'Ravi Teja', email: 'retailer@nivora.test', phone: '9000000101', role: 'RETAILER', retailerId: 'r1', staffRole: 'owner' }),
    acc({ id: 'u_r1staff', fullName: 'Kiran Goud', email: 'staff@nivora.test', phone: '9000000111', role: 'RETAILER', retailerId: 'r1', staffRole: 'fulfilment' }),
    acc({ id: 'u_r2', fullName: 'Lakshmi Narayana', email: 'retailer2@nivora.test', phone: '9000000102', role: 'RETAILER', retailerId: 'r2', staffRole: 'owner' }),
    acc({ id: 'u_r3', fullName: 'Sravani K', email: 'retailer3@nivora.test', phone: '9000000103', role: 'RETAILER', retailerId: 'r3', staffRole: 'owner' }),
    acc({ id: 'u_r4', fullName: 'Mahesh Balaji', email: 'pending@nivora.test', phone: '9000000104', role: 'RETAILER', retailerId: 'r4', staffRole: 'owner', createdAt: Date.now() - 2 * DAY }),
    acc({ id: 'u_r5', fullName: 'Joseph D', email: 'retailer5@nivora.test', phone: '9000000105', role: 'RETAILER', retailerId: 'r5', staffRole: 'owner', createdAt: Date.now() - 6 * DAY }),
    acc({ id: 'u_cust', fullName: 'Aarav Reddy', email: 'customer@nivora.test', phone: '9000000001', role: 'CUSTOMER', aliases: ['customer@nasou.test'], city: 'Hyderabad' }),
    acc({ id: 'u_cust2', fullName: 'Test User', email: 'test@example.com', phone: '9876543210', role: 'CUSTOMER', legacyPassword: 'password123', city: 'Hyderabad' }),
  ];
}

export const accountsStore = createStore('nivora_accounts_v1', seed);

/* Saved addresses for the demo customer, used until they edit their own. */
export const DEMO_PROFILES = {
  u_cust: {
    addresses: [
      { id: 'ad_home', label: 'Home', name: 'Aarav Reddy', phone: '9000000001', line1: 'Flat 402, Lake View Residency, Road 3', landmark: 'Near Kondapur bus stop', city: 'Hyderabad', state: 'Telangana', pin: '500084', isDefault: true },
      { id: 'ad_site', label: 'Site', name: 'Aarav Reddy (site office)', phone: '9000000001', line1: 'Plot 17, Green Meadows layout, Shankarpally Road', landmark: 'Opposite the water tank', city: 'Hyderabad', state: 'Telangana', pin: '501203', isDefault: false },
    ],
  },
};
export const invitesStore = createStore('nivora_invites_v1', () => [
  { token: 'demo-invite-r1', email: 'newstaff@nivora.test', retailerId: 'r1', staffRole: 'catalog', invitedBy: 'Ravi Teja', at: Date.now() - DAY, status: 'pending' },
]);

export const useAccounts = () => useStore(accountsStore);
export const useInvites = () => useStore(invitesStore);
export const getAccount = (id) => accountsStore.get().find((a) => a.id === id) || null;

const norm = (v) => String(v || '').trim().toLowerCase();
const digits = (v) => String(v || '').replace(/\D/g, '').slice(-10);

export function findAccount(identifier) {
  const id = norm(identifier);
  const ph = /^\d{10}$/.test(digits(identifier)) && /^[\d\s+-]+$/.test(String(identifier).trim()) ? digits(identifier) : null;
  return accountsStore.get().find((a) =>
    a.status !== 'deleted' && (a.email === id || a.aliases?.includes(id) || (ph && a.phone === ph))) || null;
}

async function sha256(text) {
  try {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch {
    return `plain:${text}`; // insecure context (http on a LAN IP) — demo only
  }
}
const pwHash = (account, password) => sha256(`${account.id}:${password}`);

export async function passwordMatches(account, password) {
  if (!account || !password) return false;
  if (account.pwHash) return account.pwHash === await pwHash(account, password);
  if (account.legacyPassword && password === account.legacyPassword) return true;
  return account.demo && (password === DEMO_PASSWORD || LEGACY_PASSWORDS.includes(password));
}

export async function setPassword(id, password) {
  const a = getAccount(id);
  if (!a) return;
  const h = await pwHash(a, password);
  accountsStore.set((list) => list.map((x) => (x.id === id ? { ...x, pwHash: h, demo: false, legacyPassword: undefined } : x)));
}

export async function createAccount(fields, { password, by } = {}) {
  const email = norm(fields.email);
  if (email && findAccount(email)) throw new Error('An account with that email already exists.');
  if (fields.phone && findAccount(fields.phone)) throw new Error('An account with that mobile number already exists.');
  const a = { id: uid('u'), status: 'active', notes: [], aliases: [], createdAt: Date.now(), demo: false, ...fields, email };
  if (password) a.pwHash = await pwHash(a, password);
  else a.demo = true; // invited team members use the demo password until they set one
  accountsStore.set((list) => [...list, a]);
  audit({ action: 'account.create', entity: 'account', entityId: a.id, summary: `Created ${a.role.toLowerCase()} account ${a.email || a.phone}${by ? ` (by ${by})` : ''}`, after: { role: a.role, teamRole: a.teamRole, retailerId: a.retailerId } });
  return a;
}

/* field edits, each audited with old → new values */
export function updateAccount(id, fields, summary = 'Updated account') {
  const before = getAccount(id);
  if (!before) return null;
  const after = { ...before, ...fields };
  accountsStore.set((list) => list.map((x) => (x.id === id ? after : x)));
  const keys = Object.keys(fields).filter((k) => k !== 'lastLoginAt');
  if (keys.length) {
    audit({
      action: keys.includes('teamRole') || keys.includes('staffRole') ? 'permission.change' : keys.includes('status') ? `account.${fields.status}` : 'account.update',
      entity: 'account', entityId: id, summary: `${summary} — ${after.fullName}`,
      before: Object.fromEntries(keys.map((k) => [k, before[k] ?? null])),
      after: Object.fromEntries(keys.map((k) => [k, fields[k] ?? null])),
    });
  }
  return after;
}

export function addAccountNote(id, text, by) {
  const a = getAccount(id);
  if (!a) return;
  accountsStore.set((list) => list.map((x) => (x.id === id ? { ...x, notes: [{ id: uid('nt'), text, by, at: Date.now() }, ...(x.notes || [])] } : x)));
  audit({ action: 'customer.note', entity: 'account', entityId: id, summary: `Internal note on ${a.fullName}`, after: { note: text } });
}

/* ── retailer staff invites (requirement 21) ─────────────────────────────── */
export function inviteStaff({ email, retailerId, staffRole, invitedBy, retailerName }) {
  const e = norm(email);
  if (findAccount(e)) throw new Error('Someone already has an account with that email.');
  if (invitesStore.get().some((i) => i.email === e && i.status === 'pending')) throw new Error('That person already has a pending invite.');
  const inv = { token: uid('inv').replace('_', '-'), email: e, retailerId, staffRole, invitedBy, at: Date.now(), status: 'pending' };
  invitesStore.set((list) => [inv, ...list]);
  audit({ action: 'staff.invite', entity: 'retailer', entityId: retailerId, summary: `${invitedBy} invited ${e} as ${staffRole} at ${retailerName}` });
  notify({ userId: `retailer:${retailerId}`, icon: 'userPlus', title: `Invite sent to ${e}`, body: `Role: ${staffRole}`, to: '/seller/team' });
  return inv;
}
export const findInvite = (token) => invitesStore.get().find((i) => i.token === token) || null;
export async function acceptInvite(token, { fullName, phone, password }) {
  const inv = findInvite(token);
  if (!inv || inv.status !== 'pending') throw new Error('This invite is no longer valid.');
  const a = await createAccount({ fullName, phone, email: inv.email, role: 'RETAILER', retailerId: inv.retailerId, staffRole: inv.staffRole }, { password });
  invitesStore.set((list) => list.map((i) => (i.token === token ? { ...i, status: 'accepted', acceptedAt: Date.now() } : i)));
  notify({ userId: `retailer:${inv.retailerId}`, icon: 'users', title: `${fullName} joined your team`, body: inv.staffRole, to: '/seller/team' });
  return a;
}
export function revokeInvite(token) {
  invitesStore.set((list) => list.map((i) => (i.token === token ? { ...i, status: 'revoked' } : i)));
}
