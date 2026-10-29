/* ============================================================================
 * departments.js — the top level of the catalogue.
 *
 *   Department (fixed list below)  →  Sub-category (product.category slug)
 *
 * The departments are the six Categories of the client's master product sheet
 * (October 2026 — see lib/masterSheet.js; nasou-api migration V9 has the same
 * list). The sheet's Sub category is the sub-category. A product's SKU and
 * department are locked once saved; the sub-category stays editable.
 * ==========================================================================*/

export const DEPARTMENTS = [
  { slug: 'plumbing', name: 'Plumbing', icon: 'droplet', blurb: 'PVC, CPVC and UPVC pipes, fittings and valves' },
  { slug: 'electrical', name: 'Electrical', icon: 'bolt', blurb: 'Wires, switches, sockets, protection and lighting' },
  { slug: 'interior-designing', name: 'Interior Designing', icon: 'roller', blurb: 'Paints, home interior and decor improvement' },
  { slug: 'hardware', name: 'Hardware', icon: 'hammer', blurb: 'Fasteners, tools and fabrication supplies' },
  { slug: 'bath-kitchen', name: 'Bath & Kitchen Essentials', icon: 'sparkle', blurb: 'Taps, showers, sinks and kitchen fittings' },
  { slug: 'sanitary', name: 'Sanitary', icon: 'layers', blurb: 'Closets, basins and sanitaryware' },
];

export const DEFAULT_DEPARTMENT = 'plumbing';
const _dept = new Map(DEPARTMENTS.map((d) => [d.slug, d]));
export const departmentMeta = (slug) => _dept.get(slug) ?? _dept.get(DEFAULT_DEPARTMENT);

/* Sub-category slug from a free-text name ("LED lights" → "led-lights"). */
export const slugifyCategory = (name) =>
  String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
