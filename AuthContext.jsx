import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
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

  /* Derived user shape from session */
  const user = useMemo(() => {
    if (!session?.accessToken) return null;
    const payload = parseJwt(session.accessToken);
    return {
      id: session.userId ?? payload?.sub,
      role: session.role ?? payload?.role ?? 'CUSTOMER',
      fullName: session.fullName ?? payload?.fullName ?? '',
      accessToken: session.accessToken,
    };
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
    }),
    [user, login, logout, register, sendOtp, verifyOtp]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
