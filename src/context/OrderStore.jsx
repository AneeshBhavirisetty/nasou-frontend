import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

/* ============================================================================
 * OrderStore — orders placed through checkout (client review 2, admin #9).
 *
 * Until the orders API exists, placed orders are kept in localStorage in the
 * same shape as the seeded demo order book (data/orders.js) so every screen
 * can read both: the customer's Orders page, admin Orders / Billing /
 * Reports, and the printable invoice (via findOrder in data/orders.js).
 *
 * Order shape:
 *   { id, createdAt, userId, customer, email, phone, address, city, pin,
 *     lines: [{ id, sku, name, size, qty, price, amount, bulk }],
 *     items, subtotal, discount, gst, shipping, total,
 *     payment, paymentStatus: 'Paid' | 'Due on delivery' | 'Collected' | 'Refunded',
 *     delivery, coupon, status: 'Pending' | 'Processing' | 'Shipped' | 'Delivered' | 'Cancelled' }
 *
 * Stock is decremented by checkout through AdminStore.setStock at the moment
 * the order is placed.
 * ==========================================================================*/

export const ORDERS_KEY = 'nasou_orders_v1';
const OrderStoreContext = createContext(null);

export function loadPlacedOrders() {
  try {
    const raw = JSON.parse(localStorage.getItem(ORDERS_KEY) || '[]');
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

/* NH-5 digit ids, unique against what is already stored */
function nextOrderId(existing) {
  const taken = new Set(existing.map((o) => o.id));
  let id;
  do { id = `NH-${Math.floor(10000 + Math.random() * 90000)}`; } while (taken.has(id));
  return id;
}

export function OrderStoreProvider({ children }) {
  const [placed, setPlaced] = useState(loadPlacedOrders);
  const latest = useRef(placed);
  latest.current = placed;

  useEffect(() => {
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(placed)); } catch { /* quota — non-fatal */ }
  }, [placed]);

  /* other tabs (e.g. admin open next to the shop) see new orders */
  useEffect(() => {
    const onStorage = (e) => { if (e.key === ORDERS_KEY) setPlaced(loadPlacedOrders()); };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /* Returns the saved order synchronously (id is minted against the latest
     list, not inside the state updater, which React may run later). */
  const placeOrder = useCallback((draft) => {
    const saved = { ...draft, id: nextOrderId(latest.current), createdAt: Date.now(), status: 'Pending' };
    latest.current = [saved, ...latest.current];
    /* persist now, so an invoice opened straight away can find it */
    try { localStorage.setItem(ORDERS_KEY, JSON.stringify(latest.current)); } catch { /* non-fatal */ }
    setPlaced((list) => [saved, ...list]);
    return saved;
  }, []);

  const updateOrder = useCallback((id, patch) => {
    setPlaced((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }, []);

  const value = useMemo(() => ({ placed, placeOrder, updateOrder }), [placed, placeOrder, updateOrder]);
  return <OrderStoreContext.Provider value={value}>{children}</OrderStoreContext.Provider>;
}

export function useOrderStore() {
  const ctx = useContext(OrderStoreContext);
  if (!ctx) throw new Error('useOrderStore must be used inside OrderStoreProvider');
  return ctx;
}
