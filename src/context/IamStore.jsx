import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

/* ============================================================================
 * IamStore — internal users and what each one may do in the admin console
 * (client review 2, admin items 3, 5, 6).
 *
 * Internal users are Admins and Team members (the backend role for a team
 * member is still `RETAILER`; see lib/roles.js). Every internal user carries
 * a permission per module:  'none' | 'view' | 'edit'.
 *   - none  → module hidden from the console nav; direct links show "no access"
 *   - view  → module opens read-only (create / edit / delete controls hidden)
 *   - edit  → full use
 * Admins always have full access (so nobody can lock the console out).
 * A signed-in team member is matched to their record by account id or email;
 * without a record they get TEAM_DEFAULTS. Suspended users get no access.
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
  { key: 'users', label: 'Users & access', note: 'Internal users, customers, permissions' },
];
export const LEVELS = ['none', 'view', 'edit'];

export const ADMIN_PERMS = Object.fromEntries(MODULES.map((m) => [m.key, 'edit']));
export const TEAM_DEFAULTS = {
  dashboard: 'view', products: 'edit', orders: 'edit', discounts: 'view', billing: 'view', reports: 'view', users: 'none',
};

const KEY = 'nasou_iam_v1';
const Ctx = createContext(null);

const day = (n) => Date.now() - n * 86400000;
function seed() {
  return [
    { id: 'iu1', accountId: 'demo_admin', fullName: 'Priya Sharma', email: 'admin@nasou.test', phone: '9000000009', title: 'Owner', role: 'ADMIN', permissions: ADMIN_PERMS, status: 'active', createdAt: day(210) },
    { id: 'iu2', accountId: 'demo_retailer', fullName: 'Imran Sheikh', email: 'retailer@nasou.test', phone: '9000000002', title: 'Store manager', role: 'RETAILER', permissions: { ...TEAM_DEFAULTS, discounts: 'edit', reports: 'edit' }, status: 'active', createdAt: day(120) },
    { id: 'iu3', fullName: 'Rahul Kumar', email: 'rahul@nasouhive.com', phone: '9700111111', title: 'Dispatch lead', role: 'RETAILER', permissions: { ...TEAM_DEFAULTS, products: 'view', discounts: 'none', billing: 'none', reports: 'none' }, status: 'active', createdAt: day(64) },
    { id: 'iu4', fullName: 'Vikram Das', email: 'vikram@nasouhive.com', phone: '9700777777', title: 'Accounts', role: 'RETAILER', permissions: { ...TEAM_DEFAULTS, products: 'view', orders: 'view', billing: 'edit', reports: 'edit' }, status: 'suspended', createdAt: day(31) },
  ];
}

const load = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || 'null');
    return Array.isArray(raw) ? raw : seed();
  } catch {
    return seed();
  }
};

export function IamProvider({ children }) {
  const { user } = useAuth();
  const [users, setUsers] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(users)); } catch { /* quota */ }
  }, [users]);

  const saveUser = useCallback((u) => {
    setUsers((list) => (list.some((x) => x.id === u.id) ? list.map((x) => (x.id === u.id ? { ...x, ...u } : x)) : [{ ...u }, ...list]));
  }, []);
  const removeUser = useCallback((id) => setUsers((list) => list.filter((x) => x.id !== id)), []);

  /* the signed-in person's record + effective permissions */
  const me = useMemo(() => {
    if (!user) return null;
    return users.find((u) => (u.accountId && u.accountId === user.id) || (user.email && u.email === user.email)) || null;
  }, [users, user]);

  const perms = useMemo(() => {
    if (!user) return {};
    if (user.role === 'ADMIN') return ADMIN_PERMS;
    if (user.role !== 'RETAILER') return {};
    if (me?.status === 'suspended') return Object.fromEntries(MODULES.map((m) => [m.key, 'none']));
    return { ...TEAM_DEFAULTS, ...(me?.permissions || {}) };
  }, [user, me]);

  const level = useCallback((module) => perms[module] || 'none', [perms]);
  const can = useCallback((module, need = 'view') => {
    const l = perms[module] || 'none';
    return need === 'edit' ? l === 'edit' : l !== 'none';
  }, [perms]);

  const value = useMemo(
    () => ({ users, saveUser, removeUser, me, perms, level, can, suspended: me?.status === 'suspended' }),
    [users, saveUser, removeUser, me, perms, level, can]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useIam() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useIam must be used inside IamProvider');
  return ctx;
}
