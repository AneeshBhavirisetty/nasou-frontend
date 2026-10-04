/* ============================================================================
 * scope.js — retailer data scoping in ONE place (Super Admin requirement 1).
 *
 * Every product, order and related list a screen shows goes through
 * scopeRows / scopeOrders below — never a hand-written filter per page. The
 * rules:
 *   platform (Nasou Hive team)  sees everything, on purpose. Each bypass is
 *                               reported through `onBypass` so it is logged.
 *   retailer                    sees only rows whose retailerId is theirs;
 *                               a multi-retailer order is cut down to their
 *                               own sub-order. A retailer actor without a
 *                               retailerId is refused (fail closed).
 *   customer                    sees only rows they own (userId).
 *   anyone else                 sees nothing.
 *
 * assertInScope() guards single-record reads and writes the same way.
 * scripts/scope.test.mjs tries cross-retailer access and expects it to fail.
 *
 * Pure module: no React, no storage — the backend mirrors it in its shared
 * repository filter.
 * ==========================================================================*/

export class ScopeError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ScopeError';
  }
}

/* Actor from the signed-in session. `view` (log in as retailer) wins. */
export function actorFor(user, view) {
  if (!user) return { kind: 'guest' };
  if (view?.retailerId && user.role === 'ADMIN') {
    return { kind: 'retailer', id: user.id, retailerId: view.retailerId, impersonatedBy: user.id, readOnly: true };
  }
  if (user.role === 'ADMIN') return { kind: 'platform', id: user.id, teamRole: user.teamRole };
  if (user.role === 'RETAILER') return { kind: 'retailer', id: user.id, retailerId: user.retailerId || null };
  if (user.role === 'CUSTOMER') return { kind: 'customer', id: user.id };
  return { kind: 'guest' };
}

const byRetailer = (r) => r?.retailerId;
const byOwner = (r) => r?.userId;

function requireRetailer(actor) {
  if (!actor.retailerId) throw new ScopeError('This account is not linked to a retailer.');
}

/* rows visible to `actor`. Options:
     resource   name used in the bypass log ("products", "orders" …)
     retailerOf row → retailerId   (default row.retailerId)
     ownerOf    row → userId       (default row.userId)
     onBypass   ({ actor, resource, count }) → void   platform reads only */
export function scopeRows(rows, actor, { resource = 'records', retailerOf = byRetailer, ownerOf = byOwner, onBypass } = {}) {
  if (!Array.isArray(rows)) return [];
  switch (actor?.kind) {
    case 'platform':
      onBypass?.({ actor, resource, count: rows.length });
      return rows;
    case 'retailer':
      requireRetailer(actor);
      return rows.filter((r) => retailerOf(r) === actor.retailerId);
    case 'customer':
      return rows.filter((r) => ownerOf(r) === actor.id);
    default:
      return [];
  }
}

/* Orders hold one sub-order (part) per retailer. A retailer gets each order
   that has their part, reduced to just that part and its lines. */
export function scopeOrders(orders, actor, { onBypass } = {}) {
  if (!Array.isArray(orders)) return [];
  if (actor?.kind === 'platform') {
    onBypass?.({ actor, resource: 'orders', count: orders.length });
    return orders;
  }
  if (actor?.kind === 'customer') return orders.filter((o) => o.userId === actor.id);
  if (actor?.kind !== 'retailer') return [];
  requireRetailer(actor);
  const out = [];
  for (const o of orders) {
    const parts = (o.parts || []).filter((p) => p.retailerId === actor.retailerId);
    if (!parts.length) continue;
    out.push({
      ...o,
      parts,
      lines: (o.lines || []).filter((l) => l.retailerId === actor.retailerId),
      /* order-level money belongs to the platform view; the retailer works
         from their part totals */
      total: parts.reduce((s, p) => s + (p.total || 0), 0),
    });
  }
  return out;
}

/* Throws unless `row` is visible to `actor`. Use before any single-record
   read or write (open a detail page, update stock, change a status). */
export function assertInScope(row, actor, { resource = 'record', retailerOf = byRetailer, ownerOf = byOwner } = {}) {
  if (!row) throw new ScopeError(`That ${resource} does not exist.`);
  switch (actor?.kind) {
    case 'platform':
      return row;
    case 'retailer': {
      requireRetailer(actor);
      const owners = Array.isArray(row.parts) ? row.parts.map((p) => p.retailerId) : [retailerOf(row)];
      if (owners.includes(actor.retailerId)) return row;
      throw new ScopeError(`That ${resource} belongs to another retailer.`);
    }
    case 'customer':
      if (ownerOf(row) === actor.id) return row;
      throw new ScopeError(`That ${resource} is not yours.`);
    default:
      throw new ScopeError('Sign in to continue.');
  }
}

/* Writes from a "log in as retailer" session are refused (view-only). */
export function assertCanWrite(actor) {
  if (actor?.readOnly) throw new ScopeError('View-only session — changes are disabled while viewing as a retailer.');
}
