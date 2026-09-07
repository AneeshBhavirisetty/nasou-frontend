/* Seeded demo order book — deterministic, shared by the admin Orders table,
   the export dialog and the printable invoice page. Swap for the real orders
   API when the backend lands; the shape is what the UI consumes. */

import { products } from './catalog';

export const ORDER_STATUSES = ['Pending', 'Processing', 'Shipped', 'Delivered', 'Cancelled'];
export const ORDER_FLOW = ['Pending', 'Processing', 'Shipped', 'Delivered'];

const NAMES = [
  ['Priya Sharma', 'priya@example.com', '9876543210', 'Hyderabad', '500081'],
  ['Rahul Kumar', 'rahul@trade.in', '9876543211', 'Secunderabad', '500003'],
  ['Amit Patel', 'amit@example.com', '9876543212', 'Vijayawada', '520010'],
  ['Kavya Reddy', 'kavya@example.com', '9876543213', 'Guntur', '522001'],
  ['Imran Sheikh', 'imran@mepworks.in', '9876543214', 'Hyderabad', '500032'],
  ['Naveen Rao', 'naveen@example.com', '9876543215', 'Warangal', '506002'],
  ['Sana Fatima', 'sana@example.com', '9876543216', 'Nizamabad', '503001'],
  ['Vikram Das', 'vikram@buildpro.in', '9876543217', 'Hyderabad', '500018'],
];

const DAY = 86400000;
const GST_RATE = 0.18;

export function seedOrders(count = 26) {
  const midnightToday = new Date();
  midnightToday.setHours(11, 30, 0, 0);
  const base = midnightToday.getTime();

  return Array.from({ length: count }).map((_, i) => {
    const [customer, email, phone, city, pin] = NAMES[i % NAMES.length];
    const lineCount = 1 + ((i * 7) % 4);
    const lines = Array.from({ length: lineCount }).map((_, j) => {
      const p = products[(i * 53 + j * 17) % products.length];
      const qty = 1 + ((i + j) % 6);
      return { sku: p.sku, name: p.name, size: p.size, qty, price: p.price, amount: p.price * qty };
    });
    const subtotal = lines.reduce((s, l) => s + l.amount, 0);
    const gst = Math.round(subtotal * GST_RATE);
    const shipping = subtotal >= 999 ? 0 : 49;

    /* Spread orders over the last ~5 weeks, a few landing today so the
       "single day = today" export always has something to show. */
    const daysAgo = i < 3 ? 0 : Math.floor(i * 1.4);
    const createdAt = base - daysAgo * DAY - (i % 5) * 3600000;

    return {
      id: `NH-${4900 - i * 3}`,
      customer, email, phone, city, pin,
      lines,
      items: lines.reduce((n, l) => n + l.qty, 0),
      subtotal,
      gst,
      shipping,
      total: subtotal + gst + shipping,
      status: i % 11 === 7 ? 'Cancelled' : ORDER_FLOW[(i + 1) % ORDER_FLOW.length],
      payment: ['UPI', 'Cards', 'Net banking'][i % 3],
      createdAt,
    };
  });
}

/* One shared instance so the admin table and /invoice/:id agree. */
export const orders = seedOrders();
export const findOrder = (id) => orders.find((o) => o.id === id) ?? null;

export const formatOrderDate = (ms) =>
  new Date(ms).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
