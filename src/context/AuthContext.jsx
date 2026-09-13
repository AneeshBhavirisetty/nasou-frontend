import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, profileApi, IS_MOCK } from '../lib/api';
import {
  clearSession,
  getStoredSession,
  isTokenExpired,
  parseJwt,
  setSession,
} from '../lib/auth';

const AuthContext = createContext(null);

/* ─────────────────────────────────────────────────────────────
   AuthProvider — wraps the whole app.
   Restores session from sessionStorage on mount.
   Exposes login, logout, register helpers plus the current user.
   ───────────────────────────────────────────────────────────── */
export function AuthProvider({ children }) {
  const [session, setSessionState] = useState(() => {
    const stored = getStoredSession();
    if (!stored?.accessToken || isTokenExpired(stored.accessToken)) {
      clearSession();
      return null;
    }
    return stored;
  });

  /* Profile details the customer can edit (client review 2, item 1): kept per
     user in localStorage until GET/PATCH /users/me is live; PATCH is called
     when a real backend is configured. */
  const profileKey = (id) => `nasou_profile_${id || 'guest'}`;
  const readProfile = (id) => {
    try { return JSON.parse(localStorage.getItem(profileKey(id)) || 'null') || {}; } catch { return {}; }
  };
  const [profile, setProfile] = useState(() => readProfile(session?.userId));
  useEffect(() => { setProfile(readProfile(session?.userId)); }, [session?.userId]);

  /* Derived user shape from session */
  const user = useMemo(() => {
    if (!session?.accessToken) return null;
    const payload = parseJwt(session.accessToken);
    return {
      id: session.userId ?? payload?.sub,
      role: session.role ?? payload?.role ?? 'CUSTOMER',
      fullName: session.fullName ?? payload?.fullName ?? '',
      email: profile.email ?? session.email ?? payload?.email ?? '',
      phone: profile.phone ?? session.phone ?? '',
      accessToken: session.accessToken,
    };
  }, [session, profile]);

  const updateProfile = useCallback(async (fields) => {
    if (!session) throw new Error('Sign in to edit your profile.');
    if (!IS_MOCK) await profileApi.update(fields);
    const next = { ...readProfile(session.userId), ...fields };
    try { localStorage.setItem(profileKey(session.userId), JSON.stringify(next)); } catch { /* quota */ }
    setProfile(next);
    if (fields.fullName && fields.fullName !== session.fullName) {
      const s = { ...session, fullName: fields.fullName };
      setSession(s);
      setSessionState(s);
    }
    return next;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  /* Persist session + update state */
  const _applySession = useCallback((data) => {
    setSession(data);
    setSessionState(data);
  }, []);

  /* Login with email/phone + password */
  const login = useCallback(
    async (identifier, password) => {
      const data = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ identifier, password }),
      });
      _applySession(data);
      return data;
    },
    [_applySession]
  );

  /* Register (first-time account setup after OTP) */
  const register = useCallback(
    async ({ phone, email, fullName, password }) => {
      const data = await api('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ phone, email, fullName, password }),
      });
      _applySession(data);
      return data;
    },
    [_applySession]
  );

  /* OTP request */
  const sendOtp = useCallback(async (phone) => {
    return api('/auth/otp/send', {
      method: 'POST',
      body: JSON.stringify({ phone }),
    });
  }, []);

  /* OTP verify — returns { isNewUser, session? } */
  const verifyOtp = useCallback(
    async (phone, otp) => {
      const data = await api('/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      });
      if (data?.accessToken) {
        _applySession(data);
      }
      return data;
    },
    [_applySession]
  );

  const logout = useCallback(() => {
    clearSession();
    setSessionState(null);
  }, []);

  /* Demo-only: switch the current session's role without a real JWT.
     Used by <RoleSwitch> when the app runs in mock mode. */
  const devSetRole = useCallback((role) => {
    setSessionState((prev) => {
      const base = prev ?? {
        accessToken: `demo-${role}-${Date.now()}`,
        userId: 'demo-user',
        fullName: role === 'ADMIN' ? 'Demo Admin' : 'Demo Customer',
      };
      const next = { ...base, role };
      setSession(next);
      return next;
    });
  }, []);

  /* Listen for the global 'auth:expired' event emitted by api.js */
  useEffect(() => {
    const handler = () => {
      clearSession();
      setSessionState(null);
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      role: user?.role ?? null,
      isCustomer: user?.role === 'CUSTOMER',
      isRetailer: user?.role === 'RETAILER',
      isAdmin: user?.role === 'ADMIN',
      login,
      logout,
      register,
      sendOtp,
      verifyOtp,
      devSetRole,
      profile,
      updateProfile,
    }),
    [user, login, logout, register, sendOtp, verifyOtp, devSetRole, profile, updateProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
