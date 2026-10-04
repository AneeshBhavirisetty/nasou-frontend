/* Split checkout, commission and settlement maths. Run: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateStatus, allocate, commissionRate, partMoney, refundSplit, settle, splitOrder } from '../src/lib/marketplace.js';
import { allows, defaultPresets } from '../src/lib/access.js';

test('the brief’s example: ₹10,000 cart at 10% commission', () => {
  const lines = [
    { id: 'a', retailerId: 'A', amount: 6000 },
    { id: 'b', retailerId: 'B', amount: 4000 },
  ];
  const parts = splitOrder({ orderId: 'NV-1', lines, retailers: [{ id: 'A', name: 'A', commission: { rate: 10 } }, { id: 'B', name: 'B', commission: { rate: 10 } }] });
  assert.deepEqual(parts.map((p) => [p.retailerId, p.total, p.retailerShare, p.commission]), [['A', 6000, 5400, 600], ['B', 4000, 3600, 400]]);
  assert.equal(parts.reduce((s, p) => s + p.commission, 0), 1000);
});

test('one sub-order per retailer, ids follow the order id', () => {
  const parts = splitOrder({ orderId: 'NV-9', lines: [{ retailerId: 'A', amount: 10 }, { retailerId: 'B', amount: 10 }, { retailerId: 'A', amount: 5 }] });
  assert.deepEqual(parts.map((p) => p.id), ['NV-9-1', 'NV-9-2']);
  assert.equal(parts[0].lines.length, 2);
});

test('order-level money is shared out and always adds back up', () => {
  assert.deepEqual(allocate(100, [1, 1, 1]), [34, 33, 33]);
  const parts = splitOrder({ orderId: 'X', lines: [{ retailerId: 'A', amount: 333 }, { retailerId: 'B', amount: 667 }], gst: 180, shipping: 49, discount: 101 });
  assert.equal(parts.reduce((s, p) => s + p.total, 0), 1000 + 180 + 49 - 101);
});

test('per-retailer GST, shipping and discount are used when given', () => {
  const parts = splitOrder({ orderId: 'X', lines: [{ retailerId: 'A', amount: 100 }, { retailerId: 'B', amount: 100 }], gstByRetailer: { A: 18, B: 28 }, shippingByRetailer: { A: 0, B: 49 }, discountByRetailer: { A: 10 } });
  assert.deepEqual(parts.map((p) => p.total), [108, 177]);
});

test('category commission overrides the retailer rate, which overrides the default', () => {
  const r = { commission: { rate: 9, byCategory: { 'cpvc-fittings': 7 } } };
  assert.equal(commissionRate(r, 'cpvc-fittings'), 7);
  assert.equal(commissionRate(r, 'pvc-pipes'), 9);
  assert.equal(commissionRate({ commission: { rate: null } }, 'x', 12), 12);
});

test('a refund on one part comes out of that retailer’s share only', () => {
  assert.deepEqual(refundSplit(1000, 10), { commissionBack: 100, retailerPortion: 900 });
});

test('order status is the least advanced live part', () => {
  assert.equal(aggregateStatus([{ status: 'Delivered' }, { status: 'Shipped' }]), 'Shipped');
  assert.equal(aggregateStatus([{ status: 'Delivered' }, { status: 'Cancelled' }]), 'Delivered');
  assert.equal(aggregateStatus([{ status: 'Cancelled' }, { status: 'Cancelled' }]), 'Cancelled');
});

test('settlement: sales − commission − fee − refunds ± adjustments', () => {
  const s = settle({ parts: [{ total: 6000, commission: 600, status: 'Delivered' }, { total: 500, commission: 50, status: 'Cancelled' }], refunds: [{ amount: 1000, retailerPortion: 900 }], fee: 1499, adjustments: [{ amount: 200 }] });
  assert.deepEqual(s, { orders: 1, sales: 6000, commission: 600, fee: 1499, refunds: 900, adjustments: 200, net: 6000 - 600 - 1499 - 900 + 200 });
  assert.deepEqual(partMoney(4000, 10), { commission: 400, retailerShare: 3600 });
});

test('access matrix matches section 4 of the brief', () => {
  const p = defaultPresets();
  assert.equal(p.operations.retailerStatus, 'request');
  assert.equal(p.support.refunds, 'start');
  assert.equal(p.finance.refunds, 'approve');
  assert.equal(p.management.audit, 'view');
  assert.equal(p.operations.team, 'none');
  assert.ok(allows('approve', 'approve') && !allows('start', 'approve') && allows('approve', 'start'));
  assert.ok(!allows('view', 'edit') && allows('edit', 'request'));
});
