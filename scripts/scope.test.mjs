/* Retailer data scoping (Super Admin requirement 1): automated tests try
   cross-retailer access and expect it to fail. Run: npm test */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { actorFor, assertCanWrite, assertInScope, scopeOrders, scopeRows, ScopeError } from '../src/lib/scope.js';

const products = [
  { id: 'p1', retailerId: 'r1', name: 'Elbow' },
  { id: 'p2', retailerId: 'r2', name: 'Tee' },
  { id: 'p3', retailerId: 'r1', name: 'Coupling' },
];
const orders = [
  {
    id: 'NV-1', userId: 'u_a', total: 300,
    lines: [{ id: 'p1', retailerId: 'r1' }, { id: 'p2', retailerId: 'r2' }],
    parts: [{ id: 'NV-1-1', retailerId: 'r1', total: 100 }, { id: 'NV-1-2', retailerId: 'r2', total: 200 }],
  },
  { id: 'NV-2', userId: 'u_b', total: 50, lines: [{ id: 'p2', retailerId: 'r2' }], parts: [{ id: 'NV-2-1', retailerId: 'r2', total: 50 }] },
];

const r1 = actorFor({ id: 'u_r1', role: 'RETAILER', retailerId: 'r1' });
const r2 = actorFor({ id: 'u_r2', role: 'RETAILER', retailerId: 'r2' });
const team = actorFor({ id: 'u_owner', role: 'ADMIN', teamRole: 'owner' });
const custA = actorFor({ id: 'u_a', role: 'CUSTOMER' });

test('a retailer lists only their own products', () => {
  assert.deepEqual(scopeRows(products, r1).map((p) => p.id), ['p1', 'p3']);
  assert.deepEqual(scopeRows(products, r2).map((p) => p.id), ['p2']);
});

test('a retailer cannot open another retailer’s product', () => {
  assert.throws(() => assertInScope(products[1], r1, { resource: 'product' }), ScopeError);
  assert.equal(assertInScope(products[0], r1).id, 'p1');
});

test('a multi-retailer order is cut down to the retailer’s own part', () => {
  const [o] = scopeOrders(orders, r1);
  assert.equal(o.id, 'NV-1');
  assert.deepEqual(o.parts.map((p) => p.id), ['NV-1-1']);
  assert.deepEqual(o.lines.map((l) => l.retailerId), ['r1']);
  assert.equal(o.total, 100, 'order total shown to a retailer is their part only');
  assert.equal(scopeOrders(orders, r1).length, 1, 'NV-2 has no r1 part and is hidden');
});

test('a retailer cannot read an order they have no part in', () => {
  assert.throws(() => assertInScope(orders[1], r1, { resource: 'order' }), ScopeError);
  assert.equal(assertInScope(orders[0], r2).id, 'NV-1');
});

test('a retailer account without a retailer id sees nothing (fail closed)', () => {
  const broken = actorFor({ id: 'x', role: 'RETAILER' });
  assert.throws(() => scopeRows(products, broken), ScopeError);
  assert.throws(() => scopeOrders(orders, broken), ScopeError);
});

test('customers see only their own orders', () => {
  assert.deepEqual(scopeOrders(orders, custA).map((o) => o.id), ['NV-1']);
  assert.throws(() => assertInScope(orders[1], custA), ScopeError);
});

test('guests see nothing', () => {
  assert.deepEqual(scopeRows(products, actorFor(null)), []);
  assert.deepEqual(scopeOrders(orders, actorFor(null)), []);
});

test('the Super Admin bypasses scoping on purpose and every bypass is reported', () => {
  const seen = [];
  const rows = scopeRows(products, team, { resource: 'products', onBypass: (b) => seen.push(b) });
  assert.equal(rows.length, 3);
  scopeOrders(orders, team, { onBypass: (b) => seen.push(b) });
  assert.deepEqual(seen.map((b) => b.resource), ['products', 'orders']);
  assert.equal(seen[0].actor.id, 'u_owner');
});

test('"view as retailer" is scoped to that retailer and read-only', () => {
  const viewing = actorFor({ id: 'u_ops', role: 'ADMIN', teamRole: 'operations' }, { retailerId: 'r2' });
  assert.deepEqual(scopeRows(products, viewing).map((p) => p.id), ['p2']);
  assert.throws(() => assertCanWrite(viewing), ScopeError);
  assert.doesNotThrow(() => assertCanWrite(r2));
});

test('a retailer cannot pass themselves off with a view overlay', () => {
  const sneaky = actorFor({ id: 'u_r1', role: 'RETAILER', retailerId: 'r1' }, { retailerId: 'r2' });
  assert.deepEqual(scopeRows(products, sneaky).map((p) => p.id), ['p1', 'p3']);
});
