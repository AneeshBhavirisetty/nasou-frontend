import { useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { useStore } from '../lib/store';
import { audiencesOf, hideFor, markRead, notificationsStore, notify } from '../store/notifications';
import { LIVE } from '../lib/config';

/* ============================================================================
 * Bell notifications (customer review item 4) — React side of
 * store/notifications.js. Every portal uses the same hook: customers see
 * their own activity, retailers their store's, team members theirs and their
 * role's. push() defaults the audience to whoever is signed in.
 * ==========================================================================*/

/* kept so the provider tree in main.jsx does not change */
export function NotificationProvider({ children }) {
  return children;
}

export function useNotifications() {
  const { user } = useAuth();
  const all = useStore(notificationsStore);
  const me = user?.id || 'guest';
  const aud = useMemo(() => audiencesOf(user), [user]);

  /* LIVE: the server already returns only this person's notices, with read state */
  const list = useMemo(
    () => (LIVE ? all : all.filter((n) => aud.includes(n.userId) && !n.hiddenFor.includes(me)).map((n) => ({ ...n, read: n.readBy.includes(me) }))),
    [all, aud, me]
  );
  const unread = list.filter((n) => !n.read).length;

  const push = useCallback((n) => notify({ userId: me, ...n }), [me]);
  const markAllRead = useCallback(() => markRead(list.filter((n) => !n.read).map((n) => n.id), me), [list, me]);
  const markOne = useCallback((id) => markRead([id], me), [me]);
  const clear = useCallback(() => hideFor(list.map((n) => n.id), me), [list, me]);
  const dismiss = useCallback((id) => hideFor([id], me), [me]);

  return { list, unread, push, markAllRead, markOne, clear, dismiss };
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
