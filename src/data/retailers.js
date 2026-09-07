/* ============================================================================
 * retailers.js — every product belongs to exactly one retailer.
 *
 * Retailers get a stable, human-readable id (RTL-0001) that the product schema
 * carries as `retailerId`. That is the join key the backend can use to keep a
 * retailer and its products together as new retailers onboard.
 * ==========================================================================*/

import supplierList from './suppliers.json';

export const RETAILER_PREFIX = 'RTL';
const pad = (n) => String(n).padStart(4, '0');

/* Deterministic ids, ordered by catalogue weight so the biggest suppliers get
   the lowest numbers and the mapping never shifts between builds. */
const seeded = supplierList.map((s, i) => ({
  id: `${RETAILER_PREFIX}-${pad(i + 1)}`,
  slug: s.slug,
  name: s.name,
  tier: s.tier,
  productCount: s.count,
  status: 'Active',
  onboardedAt: null,
}));

const bySlug = new Map(seeded.map((r) => [r.slug, r]));

export const baseRetailers = seeded;

/** Look up a retailer id from a product's supplier slug. */
export const retailerIdForSupplier = (slug) => bySlug.get(slug)?.id ?? `${RETAILER_PREFIX}-0000`;

/* The retailer mapping is schema-only for now — there is no retailer UI. The
   admin types a brand name and we resolve the id behind the scenes; unknown
   brands stay unassigned for the backend to mint an id on onboarding. */
export const retailerForName = (name) => bySlug.get(slugifyRetailer(name)) ?? null;
export const retailerIdForName = (name) => retailerForName(name)?.id ?? '';

/** Mint the next free id given the retailers currently known. */
export function nextRetailerId(existing = seeded) {
  const max = existing.reduce((m, r) => {
    const n = Number(String(r.id).split('-')[1]);
    return Number.isFinite(n) ? Math.max(m, n) : m;
  }, 0);
  return `${RETAILER_PREFIX}-${pad(max + 1)}`;
}

export const slugifyRetailer = (name) =>
  String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'retailer';
