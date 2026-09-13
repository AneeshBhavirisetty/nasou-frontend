import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

/* ============================================================================
 * NotificationStore — the header bell (client review 2: "right side in app
 * bell – it should display any actions").
 *
 * Every notable action is pushed here: added to cart, wishlist changes, order
 * placed, order status changes made by the team, profile updates. Items are
 * tagged with a userId so each account sees only its own; guests share
 * 'guest'. Kept in localStorage (newest 60) until a notifications API exists.
 * ==========================================================================*/

const KEY = 'nasou_notices_v1';
const MAX = 60;
const Ctx = createContext(null);

const load = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
};

export function NotificationProvider({ children }) {
  const { user } = useAuth();
  const me = user?.id || 'guest';
  const [all, setAll] = useState(load);

  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(all.slice(0, MAX))); } catch { /* quota */ }
  }, [all]);

  /* the team's order updates are written from the admin tab — pick them up */
  useEffect(() => {
    const onStorage = (e) => { if (e.key === KEY) setAll(load()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /* push({ title, body?, icon?, to?, userId? }) — userId defaults to whoever is signed in */
  const push = useCallback((n) => {
    const item = { id: `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`, at: Date.now(), read: false, icon: 'bell', userId: me, ...n };
    setAll((list) => [item, ...list].slice(0, MAX));
  }, [me]);

  const list = useMemo(() => all.filter((n) => n.userId === me), [all, me]);
  const unread = list.filter((n) => !n.read).length;
  const markAllRead = useCallback(() => setAll((l) => l.map((n) => (n.userId === me ? { ...n, read: true } : n))), [me]);
  const clear = useCallback(() => setAll((l) => l.filter((n) => n.userId !== me)), [me]);

  const value = useMemo(() => ({ list, unread, push, markAllRead, clear }), [list, unread, push, markAllRead, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useNotifications() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationProvider');
  return ctx;
}

/* "just now", "5 min ago", "2 h ago", "3 d ago" */
export function timeAgo(ms) {
  const s = Math.max(0, Math.round((Date.now() - ms) / 1000));
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}
