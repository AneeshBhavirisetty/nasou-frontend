import { useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useAccounts } from '../store/accounts';
import { useSettings } from '../store/settings';
import { ADMIN_MODULES, allows, staffRole } from '../lib/access';
import { LIVE } from '../lib/config';
import { useStore } from '../lib/store';
import { accessStore } from '../lib/live';

/* ============================================================================
 * IamStore — what the signed-in person may do (requirement 3).
 *
 * Team members (role ADMIN) get the preset of their team role (Owner,
 * Operations, Support, Finance, Management) from settings — the Owner edits
 * presets in Team & access › Roles. The Owner preset is always full access
 * so the console can never be locked out. Suspended members get nothing.
 * Retailer staff get the sections of their staff role (lib/access).
 *
 * Module names used by older screens are mapped onto the new matrix.
 * ==========================================================================*/

const ALIAS = { dashboard: 'dashboards', products: 'catalog', discounts: 'catalog', billing: 'payouts', reports: 'dashboards', users: 'team' };
const FULL = Object.fromEntries(ADMIN_MODULES.map((m) => [m.key, 'edit']));

export function IamProvider({ children }) {
  return children;
}

export function useIam() {
  const { user } = useAuth();
  const accounts = useAccounts();
  const presets = useSettings((s) => s.presets);

  const access = useStore(accessStore);
  const users = useMemo(() => accounts.filter((a) => a.role === 'ADMIN' && a.status !== 'deleted'), [accounts]);
  const me = useMemo(() => {
    if (!user) return null;
    const found = accounts.find((a) => a.id === user.id);
    /* LIVE: the team list may be out of this role's reach; the session says who they are */
    return found || (LIVE && user.role === 'ADMIN' ? { id: user.id, role: 'ADMIN', teamRole: user.teamRole, status: 'active', fullName: user.fullName } : null);
  }, [accounts, user]);

  const perms = useMemo(() => {
    /* decided by the server (IamService); the preset fills in until it answers */
    if (LIVE && user?.role === 'ADMIN' && access && Object.keys(access).length) return access;
    if (LIVE && user?.role === 'ADMIN') return user.teamRole === 'owner' ? FULL : presets?.[user.teamRole] || {};
    if (user?.role !== 'ADMIN' || !me) return {};
    if (me.status === 'suspended') return {};
    if (me.teamRole === 'owner') return FULL;
    return presets?.[me.teamRole] || {};
  }, [user, me, presets, access]);

  const level = useCallback((module) => perms[ALIAS[module] || module] || 'none', [perms]);
  const can = useCallback((module, need = 'view') => allows(perms[ALIAS[module] || module], need), [perms]);

  /* retailer side */
  const sections = useMemo(() => (user?.role === 'RETAILER' ? staffRole(user.staffRole).sections : []), [user]);
  const canSection = useCallback((k) => sections.includes(k), [sections]);

  return {
    users, me, perms, level, can, presets,
    isOwner: me?.teamRole === 'owner',
    suspended: me?.status === 'suspended',
    sections, canSection,
  };
}
