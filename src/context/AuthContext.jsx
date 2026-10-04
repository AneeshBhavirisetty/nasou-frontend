import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, authApi, profileApi, IS_MOCK, sessionFor } from '../lib/api';
import { clearSession, getStoredSession, isTokenExpired, parseJwt, setSession } from '../lib/auth';
import { audit, resetBypassLog, setAuditActor } from '../lib/auditLog';
import { DEMO_PROFILES, findAccount, getAccount, passwordMatches, setPassword, updateAccount } from '../store/accounts';
import { getRetailer } from '../store/retailers';
import { notify } from '../store/notifications';

const AuthContext = createContext(null);

/* ============================================================================
 * AuthProvider — the signed-in person, for all three portals.
 *
 * Login resolves who the user is and, for retailers, which retailer they
 * belong to (requirement 2): the session carries role, teamRole (Nasou Hive
 * team preset), retailerId and staffRole. Team accounts finish sign-in with
 * a second factor (requirement 3).
 *
 * "View as retailer" (requirement 29) is a separate, view-only overlay kept
 * in sessionStorage with a reason, a 15-minute timeout and audit entries at
 * start and end. Only Owner and Operations may start one.
 * ==========================================================================*/

const VIEW_KEY = 'nivora_view_as';
const VIEW_MINUTES = 15;

const readView = () => {
  try {
    const v = JSON.parse(sessionStorage.getItem(VIEW_KEY) || 'null');
    return v && v.expiresAt > Date.now() ? v : null;
  } catch {
    return null;
  }
};

function initialSession() {
  const stored = getStoredSession();
  if (!stored?.accessToken || isTokenExpired(stored.accessToken)) {
    clearSession();
    return null;
  }
  if (IS_MOCK) {
    /* sessions from older builds (demo_admin …) or closed accounts end here */
    const a = getAccount(stored.userId);
    if (!a || a.status === 'blocked' || a.status === 'deleted' || a.status === 'suspended') {
      clearSession();
      return null;
    }
  }
  return stored;
}

export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(initialSession);
  const [view, setView] = useState(readView);

  /* Profile details the customer can edit (name, email, phone, address
     book). Kept per user in localStorage until GET/PATCH /users/me is live;
     PATCH is called when a real backend is configured. */
  const profileKey = (id) => `nasou_profile_${id || 'guest'}`;
  const readProfile = (id) => {
    try { return JSON.parse(localStorage.getItem(profileKey(id)) || 'null') || (IS_MOCK && DEMO_PROFILES[id]) || {}; } catch { return {}; }
  };
  const [profile, setProfile] = useState(() => readProfile(session?.userId));
  useEffect(() => { setProfile(readProfile(session?.userId)); }, [session?.userId]);

  const user = useMemo(() => {
    if (!session?.accessToken) return null;
    const payload = parseJwt(session.accessToken) || {};
    return {
      id: session.userId ?? payload.sub,
      role: session.role ?? payload.role ?? 'CUSTOMER',
      teamRole: session.teamRole ?? payload.teamRole ?? null,
      retailerId: session.retailerId ?? payload.retailerId ?? null,
      staffRole: session.staffRole ?? payload.staffRole ?? null,
      fullName: profile.fullName ?? session.fullName ?? payload.fullName ?? '',
      email: profile.email ?? session.email ?? '',
      phone: profile.phone ?? session.phone ?? '',
      accessToken: session.accessToken,
    };
  }, [session, profile]);

  /* who the audit trail credits */
  useEffect(() => {
    setAuditActor(user ? { id: user.id, name: user.fullName, role: user.teamRole || user.staffRole || user.role.toLowerCase() } : null);
  }, [user]);

  const updateProfile = useCallback(async (fields) => {
    if (!session) throw new Error('Sign in to edit your profile.');
    if (!IS_MOCK) await profileApi.update(fields);
    const next = { ...readProfile(session.userId), ...fields };
    try { localStorage.setItem(profileKey(session.userId), JSON.stringify(next)); } catch { /* quota */ }
    setProfile(next);
    if (IS_MOCK) {
      const keep = ['fullName', 'email', 'phone'].filter((k) => fields[k] !== undefined);
      if (keep.length) updateAccount(session.userId, Object.fromEntries(keep.map((k) => [k, fields[k]])), 'Profile edited by the customer');
    }
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const _apply = useCallback((data) => {
    resetBypassLog();
    setSession(data);
    setSessionState(data);
    const who = { id: data.userId, name: data.fullName, role: data.teamRole || data.staffRole || String(data.role).toLowerCase() };
    audit({ action: 'auth.login', entity: 'session', entityId: data.userId, summary: `${data.fullName} signed in${data.twoFactor ? ' with a two-factor code' : ''}${data.reactivated ? ' and re-activated their account' : ''}`, actor: who });
    if (data.role === 'CUSTOMER') {
      notify({ userId: data.userId, icon: 'shieldCheck', kind: 'account', title: data.reactivated ? 'Welcome back — your account is active again' : 'Signed in on this device', body: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }), to: '/account' });
    }
  }, []);

  /* Password step. Team accounts get { twoFactorRequired, challengeId } and
     finish with verify2fa(); everyone else is signed in straight away. */
  const login = useCallback(async (identifier, password) => {
    const data = await api('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) });
    if (data?.twoFactorRequired) return data;
    _apply(data);
    return data;
  }, [_apply]);

  const verify2fa = useCallback(async (challengeId, code) => {
    const data = await authApi.verify2fa(challengeId, code);
    _apply(data);
    return data;
  }, [_apply]);

  const register = useCallback(async ({ phone, email, fullName, password }) => {
    const data = await api('/auth/register', { method: 'POST', body: JSON.stringify({ phone, email, fullName, password }) });
    _apply(data);
    return data;
  }, [_apply]);

  const sendOtp = useCallback((phone) => api('/auth/otp/send', { method: 'POST', body: JSON.stringify({ phone }) }), []);

  const verifyOtp = useCallback(async (phone, otp) => {
    const data = await api('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ phone, otp }) });
    if (data?.accessToken) _apply(data);
    return data;
  }, [_apply]);

  /* Retailer signup and staff invites create their account, then sign in. */
  const signInAccount = useCallback((account) => _apply(sessionFor(account)), [_apply]);

  const endView = useCallback((why = 'ended') => {
    const v = readView();
    try { sessionStorage.removeItem(VIEW_KEY); } catch { /* ignore */ }
    setView(null);
    if (v) audit({ action: 'impersonate.end', entity: 'retailer', entityId: v.retailerId, summary: `Stopped viewing as ${v.retailerName} (${why})` });
  }, []);

  const logout = useCallback(({ everywhere = false } = {}) => {
    if (session) {
      audit({ action: everywhere ? 'auth.logout_all' : 'auth.logout', entity: 'session', entityId: session.userId, summary: `${session.fullName} signed out${everywhere ? ' of every device' : ''}` });
      if (!IS_MOCK) api(everywhere ? '/auth/logout-all' : '/auth/logout', { method: 'POST' }).catch(() => {});
    }
    if (readView()) endView('signed out');
    clearSession();
    setSessionState(null);
  }, [session, endView]);

  /* Customer self-service (customer review item 5). Deactivation is undone
     by signing in again; deletion is permanent for the customer and keeps
     only what tax law needs (orders and invoices). */
  const deactivateAccount = useCallback((reason) => {
    if (!session) return;
    updateAccount(session.userId, { status: 'deactivated', deactivatedAt: Date.now(), deactivationReason: reason || '' }, 'Customer deactivated their account');
    logout();
  }, [session, logout]);

  const deleteAccount = useCallback((reason) => {
    if (!session) return;
    updateAccount(session.userId, { status: 'deleted', deletedAt: Date.now(), deletionReason: reason || '', email: `deleted+${session.userId}@nivora.invalid`, phone: '', aliases: [] }, 'Customer deleted their account');
    try {
      localStorage.removeItem(profileKey(session.userId));
      localStorage.removeItem('nasou_wishlist');
      localStorage.removeItem('nasou_cart');
    } catch { /* ignore */ }
    logout({ everywhere: true });
  }, [session, logout]);

  const changePassword = useCallback(async (current, next) => {
    if (!session) throw new Error('Sign in first.');
    if (!IS_MOCK) return profileApi.changePassword(current, next);
    const a = getAccount(session.userId);
    if (!(await passwordMatches(a, current))) throw new Error('Your current password is not right.');
    await setPassword(a.id, next);
    audit({ action: 'auth.password_change', entity: 'account', entityId: a.id, summary: `${a.fullName} changed their password` });
    notify({ userId: a.id, icon: 'lock', kind: 'account', title: 'Password changed', body: 'If this was not you, contact support straight away.', to: '/account' });
    return null;
  }, [session]);

  /* "Log in as retailer" (requirement 29) */
  const startView = useCallback((retailerId, reason) => {
    if (!session || session.role !== 'ADMIN') throw new Error('Only the Nasou Hive team can do this.');
    if (!['owner', 'operations'].includes(session.teamRole)) throw new Error('Only Owner and Operations can view as a retailer.');
    if (!reason || reason.trim().length < 8) throw new Error('Give a reason (at least 8 characters) — it goes in the audit log.');
    const r = getRetailer(retailerId);
    const v = { retailerId, retailerName: r?.name, reason: reason.trim(), by: session.fullName, startedAt: Date.now(), expiresAt: Date.now() + VIEW_MINUTES * 60000 };
    try { sessionStorage.setItem(VIEW_KEY, JSON.stringify(v)); } catch { /* ignore */ }
    setView(v);
    audit({ action: 'impersonate.start', entity: 'retailer', entityId: retailerId, summary: `Started a view-only session as ${r?.name}: ${v.reason}` });
    return v;
  }, [session]);

  /* the view ends itself at its timeout */
  useEffect(() => {
    if (!view) return undefined;
    const t = setTimeout(() => endView('timed out'), Math.max(0, view.expiresAt - Date.now()));
    return () => clearTimeout(t);
  }, [view, endView]);

  /* Demo pill: sign in as any seeded account in one click (skips 2FA). */
  const quickLogin = useCallback((email) => {
    const a = findAccount(email);
    if (!a) throw new Error('No such demo account.');
    _apply(sessionFor(a, { quick: true }));
    return a;
  }, [_apply]);

  /* the global 'auth:expired' event from api.js */
  useEffect(() => {
    const handler = () => { clearSession(); setSessionState(null); };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      role: user?.role ?? null,
      isCustomer: user?.role === 'CUSTOMER',
      isAdmin: user?.role === 'ADMIN',
      isRetailer: user?.role === 'RETAILER',
      login, verify2fa, logout, register, sendOtp, verifyOtp, signInAccount, quickLogin,
      profile, updateProfile, changePassword, deactivateAccount, deleteAccount,
      view, startView, endView,
    }),
    [user, login, verify2fa, logout, register, sendOtp, verifyOtp, signInAccount, quickLogin, profile, updateProfile, changePassword, deactivateAccount, deleteAccount, view, startView, endView]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
