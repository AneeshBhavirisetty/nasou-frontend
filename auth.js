/* ─────────────────────────────────────────────────────────────
   Auth helpers — token storage + decode.
   We keep the token in memory as primary store and mirror to
   sessionStorage so a page refresh doesn't force re-login
   without using the less-secure localStorage.
   ───────────────────────────────────────────────────────────── */

const SESSION_KEY = 'nasou_session';

let _memToken = null;

export function getToken() {
  if (_memToken) return _memToken;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      _memToken = parsed.accessToken ?? null;
    }
  } catch {
    _memToken = null;
  }
  return _memToken;
}

export function setSession(sessionData) {
  _memToken = sessionData?.accessToken ?? null;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch {
    /* storage quota — non-fatal */
  }
}

export function clearSession() {
  _memToken = null;
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function getStoredSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/* Parse JWT payload without a library.
   We never trust the client-side role for security decisions —
   the backend enforces it — but we use it for UX routing. */
export function parseJwt(token) {
  if (!token) return null;
  try {
    const [, payload] = token.split('.');
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = parseJwt(token);
  if (!payload?.exp) return true;
  return Date.now() / 1000 > payload.exp;
}
