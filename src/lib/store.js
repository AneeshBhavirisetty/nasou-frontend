import { useSyncExternalStore } from 'react';

/* ============================================================================
 * store.js — tiny persisted store shared by the marketplace modules.
 *
 * Each store is one JSON value in localStorage, readable from plain modules
 * (pricing, scope checks, the mock API) as well as from React through
 * useStore(). Writes notify subscribers in this tab; the 'storage' event
 * keeps other tabs in step (admin console open next to the shop).
 *
 * Swap a store's body for API calls when the matching endpoint exists — the
 * selectors that screens use do not change.
 * ==========================================================================*/

const hasStorage = () => {
  try { return typeof localStorage !== 'undefined'; } catch { return false; }
};

export function createStore(key, init) {
  let state;
  const subs = new Set();

  const read = () => {
    if (!hasStorage()) return undefined;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : undefined;
    } catch {
      return undefined;
    }
  };
  const write = () => {
    if (!hasStorage()) return;
    try { localStorage.setItem(key, JSON.stringify(state)); } catch { /* quota — non-fatal */ }
  };
  const emit = () => subs.forEach((fn) => fn());

  const ensure = () => {
    if (state === undefined) {
      const stored = read();
      state = stored === undefined ? init() : stored;
      if (stored === undefined) write();
    }
    return state;
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
      if (e.key !== key) return;
      const next = read();
      state = next === undefined ? init() : next;
      emit();
    });
  }

  return {
    key,
    get: ensure,
    /* set(next) or set(prev => next) */
    set(next) {
      const prev = ensure();
      state = typeof next === 'function' ? next(prev) : next;
      if (state === prev) return;
      write();
      emit();
    },
    subscribe(fn) {
      subs.add(fn);
      return () => subs.delete(fn);
    },
    reset() {
      state = init();
      write();
      emit();
    },
  };
}

/* React binding. The selector must return a stable value for unchanged state
   (pick a slice; derive with useMemo in the component). */
export function useStore(store, selector = (s) => s) {
  return useSyncExternalStore(store.subscribe, () => selector(store.get()), () => selector(store.get()));
}

/* short random ids: prefix_xxxxxxxx */
export const uid = (prefix = 'id') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
