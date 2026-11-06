import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { findProduct } from '../data/catalog';
import { useNotifications } from './NotificationStore';
import { useAuth } from './AuthContext';
import { LIVE } from '../lib/config';
import { api } from '../lib/api';
import { useCatalogVersion } from '../lib/live';

const WishlistContext = createContext(null);
const STORAGE_KEY = 'nasou_wishlist';
/* the signed-in customer's server list, kept so a reload starts with it
   instead of an empty page while /users/me/wishlist is on its way */
const SYNCED_KEY = 'nasou_wishlist_synced';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function save(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch { /* quota */ }
}

function loadSynced(userId) {
  try {
    const c = JSON.parse(localStorage.getItem(SYNCED_KEY) ?? 'null');
    return c && c.userId === userId && Array.isArray(c.ids) ? c.ids : null;
  } catch {
    return null;
  }
}

export function WishlistProvider({ children }) {
  const { push } = useNotifications();
  const { user } = useAuth();
  const synced = LIVE && user?.role === 'CUSTOMER';
  const [ids, setIds] = useState(() => (synced && loadSynced(user.id)) || load());
  const catalog = useCatalogVersion();

  /* the server list, remembered for the next start */
  useEffect(() => {
    if (!synced) return;
    try { localStorage.setItem(SYNCED_KEY, JSON.stringify({ userId: user.id, ids })); } catch { /* quota */ }
  }, [ids, synced, user?.id]);

  /* Persist any change (guests, and the browser demo) */
  useEffect(() => { if (!synced) save(ids); }, [ids, synced]);

  /* LIVE: a signed-in customer's wishlist lives on the server; anything saved
     as a guest on this device is added to it once. */
  useEffect(() => {
    if (!synced) return;
    (async () => {
      try {
        const local = load();
        let list = await api('/users/me/wishlist');
        for (const sku of local.filter((x) => !list.some((p) => p.sku === x))) {
          list = await api('/users/me/wishlist', { method: 'POST', body: JSON.stringify({ productId: sku }) }).catch(() => list);
        }
        save([]);
        setIds(list.map((p) => p.sku));
      } catch { /* keep what we have */ }
    })();
  }, [synced, user?.id]);

  const toggle = useCallback((productId) => {
    const saved = ids.includes(productId);
    const p = findProduct(productId);
    push({ icon: 'heart', title: saved ? 'Removed from wishlist' : 'Saved to wishlist', body: p?.name, to: '/wishlist' });
    setIds((prev) =>
      prev.includes(productId) ? prev.filter((x) => x !== productId) : [...prev, productId]
    );
    if (synced) {
      const sku = p?.sku || productId;
      (saved ? api(`/users/me/wishlist/${encodeURIComponent(sku)}`, { method: 'DELETE' })
        : api('/users/me/wishlist', { method: 'POST', body: JSON.stringify({ productId: sku }) }))
        .then((list) => list && setIds(list.map((x) => x.sku)))
        .catch(() => {});
    }
  }, [ids, push, synced]);

  const has = useCallback((productId) => ids.includes(productId), [ids]);

  /* Hydrated items — from the catalogue, again whenever it reloads */
  const items = useMemo(
    () => ids.map((id) => findProduct(id)).filter(Boolean),
    [ids, catalog] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const value = useMemo(
    () => ({ ids, items, count: ids.length, toggle, has }),
    [ids, items, toggle, has]
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used inside WishlistProvider');
  return ctx;
}
