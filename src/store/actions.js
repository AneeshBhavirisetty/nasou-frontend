import { adminProducts } from '../context/AdminStore';
import { getOrders, updatePart } from './orders';
import { setRetailerStatus, getRetailer } from './retailers';
import { LIVE } from '../lib/config';

/* Actions that touch several stores at once (requirement 11). */

const OPEN = ['Pending', 'Processing', 'Shipped'];

/* What deleting (or suspending) a retailer would touch — shown before the
   Owner confirms. */
export function retailerFootprint(retailerId) {
  const products = adminProducts().filter((p) => p.retailerId === retailerId);
  const openParts = [];
  let refund = 0;
  for (const o of getOrders()) {
    for (const p of o.parts || []) {
      if (p.retailerId !== retailerId || !OPEN.includes(p.status)) continue;
      openParts.push({ orderId: o.id, partId: p.id, total: p.total, payment: o.payment, customer: o.customer });
      if (o.payment !== 'Cash on delivery' && o.payment !== 'GST invoice') refund += p.total - (p.refunded || 0);
    }
  }
  return { liveProducts: products.filter((p) => p.stock > 0).length, products: products.length, openParts, refund };
}

/* Soft delete: products leave the shop (the retailer can no longer sell),
   open sub-orders are cancelled and any money taken is refunded. The row
   stays so old orders and payouts keep their link. */
export function deleteRetailer(retailerId, { by, reason }) {
  if (LIVE) return setRetailerStatus(retailerId, 'deleted', { by, note: reason });
  const { openParts } = retailerFootprint(retailerId);
  openParts.forEach((p) => updatePart(p.orderId, p.partId, 'Cancelled', { by, note: 'Retailer closed on Nivora' }));
  return setRetailerStatus(retailerId, 'deleted', { by, note: reason });
}

/* Suspending blocks new orders; open ones are left for the retailer to
   finish (the Owner can still cancel them one by one). */
export function suspendRetailer(retailerId, { by, reason }) {
  if (!getRetailer(retailerId)) return null;
  return setRetailerStatus(retailerId, 'suspended', { by, note: reason });
}

