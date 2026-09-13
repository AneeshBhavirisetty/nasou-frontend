import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

/* ============================================================================
 * IamStore — admin accounts and what each one may do in the admin console
 * (client review 2, admin items 5 & 6: split internal users from customers and
 * apply IAM when adding a new user).
 *
 * There are only two roles in the product: Admin and Customer. Every internal
 * user here is an Admin; IAM narrows what an individual admin can do, per
 * module:  'none' | 'view' | 'edit'
 *   - none  → module hidden from the console nav; direct links show "no access"
 *   - view  → module opens read-only (create / edit / delete controls hidden)
 *   - edit  → full use
 * The owner account always has full access and cannot be restricted,
 * suspended or removed, so the console can never be locked out. An admin who
 * signs in without a record here (e.g. created in the backend) gets full access.
 * Suspended admins get no access.
 *
 * Stored in localStorage until the users/IAM API exists.
 * ==========================================================================*/

export const MODULES = [
  { key: 'dashboard', label: 'Dashboard', note: 'Store overview and charts' },
  { key: 'products', label: 'Products & catalogue', note: 'Products, stock, bulk and catalogue import' },
  { key: 'orders', label: 'Orders', note: 'Order list, status updates, exports' },
  { key: 'discounts', label: 'Discounts', note: 'Discount codes and bulk pricing' },
  { key: 'billing', label: 'Billing & payments', note: 'Invoices, payments, COD collection' },
  { key: 'reports', label: 'Reports & analytics', note: 'Sales, product and customer reports' },
  { key: 'users', label: 'Users & access', note: 'Admins, customers and permissions' },
];
export const LEVELS = ['none', 'view', 'edit'];

export const FULL_ACCESS = Object.fromEntries(MODULES.map((m) => [m.key, 'edit']));
const NO_ACCESS = Object.fromEntries(MODULES.map((m) => [m.key, 'none']));

const KEY = 'nasou_iam_v2';
const Ctx = createContext(null);

const day = (n) => Date.now() - n * 86400000;
function seed() {
  return [
    { id: 'iu1', accountId: 'demo_admin', owner: true, fullName: 'Priya Sharma', email: 'admin@nasou.test', phone: '9000000009', title: 'Owner', permissions: FULL_ACCESS, status: 'active', createdAt: day(210) },
    { id: 'iu2', fullName: 'Imran Sheikh', email: 'imran@nasouhive.com', phone: '9000000002', title: 'Store manager', permissions: { ...FULL_ACCESS, users: 'none' }, status: 'active', createdAt: day(120) },
    { id: 'iu3', fullName: 'Rahul Kumar', email: 'rahul@nasouhive.com', phone: '9700111111', title: 'Dispatch', permissions: { ...NO_ACCESS, dashboard: 'view', products: 'view', orders: 'edit' }, status: 'active', createdAt: day(64) },
    { id: 'iu4', fullName: 'Vikram Das', email: 'vikram@nasouhive.com', phone: '9700777777', title: 'Accounts', permissions: { ...NO_ACCESS, dashboard: 'view', orders: 'view', billing: 'edit', reports: 'edit' }, status: 'suspended', createdAt: day(31) },
  ];
}

/* earlier builds stored team-member records under nasou_iam_v1 — carry them
   over as admins (their permissions are kept, the old role is dropped) */
function migrateV1() {
  try {
    const old = JSON.parse(localStorage.getItem('nasou_iam_v1') || 'null');
    if (!Array.isArray(old)) return null;
    return old.map(({ role, accountId, ...u }) => ({
      ...u,
      ...(accountId === 'demo_admin' ? { accountId, owner: true, permissions: FULL_ACCESS } : {}),
      email: u.email === 'retailer@nasou.test' ? 'imran@nasouhive.com' : u.email,
      permissions: role === 'ADMIN' ? FULL_ACCESS : u.permissions,
    }));
  } catch {
    return null;
  }
}

const load = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (Array.isArray(raw)) return raw;
  } catch { /* fall through */ }
  return migrateV1() || seed();
};

export function IamProvider({ children }) {
  const { user } = useAuth();
  const [users, setUsers] = useState(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(users));
      localStorage.removeItem('nasou_iam_v1');
    } catch { /* quota */ }
  }, [users]);

  const saveUser = useCallback((u) => {
    setUsers((list) => (list.some((x) => x.id === u.id)
      ? list.map((x) => (x.id === u.id ? { ...x, ...u, ...(x.owner ? { owner: true, permissions: FULL_ACCESS, status: 'active' } : {}) } : x))
      : [{ ...u }, ...list]));
  }, []);
  const removeUser = useCallback((id) => setUsers((list) => list.filter((x) => x.id !== id || x.owner)), []);

  /* the signed-in admin's record + effective permissions */
  const me = useMemo(() => {
    if (!user) return null;
    return users.find((u) => (u.accountId && u.accountId === user.id) || (user.email && u.email === user.email)) || null;
  }, [users, user]);

  const perms = useMemo(() => {
    if (user?.role !== 'ADMIN') return {};
    if (!me || me.owner) return FULL_ACCESS;
    if (me.status === 'suspended') return NO_ACCESS;
    return { ...NO_ACCESS, ...(me.permissions || {}) };
  }, [user, me]);

  const level = useCallback((module) => perms[module] || 'none', [perms]);
  const can = useCallback((module, need = 'view') => {
    const l = perms[module] || 'none';
    return need === 'edit' ? l === 'edit' : l !== 'none';
  }, [perms]);

  const value = useMemo(
    () => ({ users, saveUser, removeUser, me, perms, level, can, suspended: me?.status === 'suspended' && !me?.owner }),
    [users, saveUser, removeUser, me, perms, level, can]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIam() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useIam must be used inside IamProvider');
  return ctx;
}
