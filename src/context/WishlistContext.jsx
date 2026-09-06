import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { findProduct } from '../data/catalog';

const WishlistContext = createContext(null);
const STORAGE_KEY = 'nasou_wishlist';

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

export function WishlistProvider({ children }) {
  const [ids, setIds] = useState(load);

  /* Persist any change */
  useEffect(() => save(ids), [ids]);

  const toggle = useCallback((productId) => {
    setIds((prev) =>
      prev.includes(productId) ? prev.filter((x) => x !== productId) : [...prev, productId]
    );
  }, []);

  const has = useCallback((productId) => ids.includes(productId), [ids]);

  /* Hydrated items — rehydrate from catalog same as cart */
  const items = useMemo(
    () => ids.map((id) => findProduct(id)).filter(Boolean),
    [ids]
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
