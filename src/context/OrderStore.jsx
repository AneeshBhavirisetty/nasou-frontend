import { useMemo } from 'react';
import { placeOrder, setPaymentStatus, updatePart, useOrders } from '../store/orders';

/* ============================================================================
 * OrderStore — React access to the order book in store/orders.js.
 *
 * `placed` is the whole book (seeded + checkout orders); screens that only
 * need one person's orders go through lib/scope (scopeOrders).
 * ==========================================================================*/

export function OrderStoreProvider({ children }) {
  return children;
}

export function useOrderStore() {
  const placed = useOrders();
  /* updateOrder kept for Billing: only the payment status is order-level */
  const updateOrder = (id, patch) => patch.paymentStatus && setPaymentStatus(id, patch.paymentStatus);
  return useMemo(() => ({ placed, orders: placed, placeOrder, updatePart, updateOrder }), [placed]); // eslint-disable-line react-hooks/exhaustive-deps
}
