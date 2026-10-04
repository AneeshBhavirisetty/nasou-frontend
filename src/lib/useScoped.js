import { useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useAdminStore } from '../context/AdminStore';
import { useOrders, useRefunds } from '../store/orders';
import { actorFor, scopeOrders, scopeRows } from './scope';
import { logBypass } from './auditLog';

/* React side of lib/scope.js: every console list reads through these, so
   retailer scoping lives in one place. Super Admin bypasses are logged
   (after render — logging writes to a store). */

const bypass = (info) => setTimeout(() => logBypass(info), 0);

export function useActor() {
  const { user, view } = useAuth();
  return useMemo(() => actorFor(user, view), [user, view]);
}

export function useScopedOrders() {
  const orders = useOrders();
  const actor = useActor();
  return useMemo(() => scopeOrders(orders, actor, { onBypass: bypass }), [orders, actor]);
}

export function useScopedProducts() {
  const { products } = useAdminStore();
  const actor = useActor();
  return useMemo(() => scopeRows(products, actor, { resource: 'products', onBypass: bypass }), [products, actor]);
}

export function useScopedRefunds() {
  const refunds = useRefunds();
  const actor = useActor();
  return useMemo(() => scopeRows(refunds, actor, { resource: 'refunds', onBypass: bypass }), [refunds, actor]);
}
