/* Order book access for screens. The orders themselves (seeded demo book +
   orders placed at checkout, split per retailer) live in store/orders.js. */

import { PART_STATUSES, ORDER_FLOW as FLOW } from '../lib/marketplace';
import { getOrders, findOrder as find } from '../store/orders';

export const ORDER_STATUSES = PART_STATUSES;
export const ORDER_FLOW = FLOW;

/* every order (the argument is ignored — kept for older call sites) */
export const allOrders = () => getOrders();
export const findOrder = (id) => find(id);

export const formatOrderDate = (ms) =>
  new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
