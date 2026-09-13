/* ============================================================================
 * departments.js — the top level of the catalogue (client review 2, item 3).
 *
 *   Department (fixed list below)  →  Sub-category (product.category slug)
 *
 * Every product carries `department` and `category`. The shipped catalogue is
 * all plumbing, so its seven generated categories (PVC fittings, cPVC pipes …)
 * are Plumbing's sub-categories. Other departments start empty; admins create
 * their sub-categories when they add the first product (ProductForm). A
 * product's SKU and department are locked once saved; the sub-category stays
 * editable.
 * ==========================================================================*/

export const DEPARTMENTS = [
  { slug: 'plumbing', name: 'Plumbing', icon: 'droplet', blurb: 'PVC, uPVC and cPVC fittings, pipes and valves' },
  { slug: 'electrical', name: 'Electrical', icon: 'bolt', blurb: 'Wiring, switches, protection and lighting' },
  { slug: 'agriculture', name: 'Agriculture', icon: 'leaf', blurb: 'Irrigation, sprinklers, hoses and farm supplies' },
  { slug: 'hardware', name: 'Hardware', icon: 'hammer', blurb: 'Fasteners, tools, locks and fixings' },
  { slug: 'paints', name: 'Paints', icon: 'roller', blurb: 'Interior, exterior, primers and painting tools' },
  { slug: 'electronics', name: 'Electronics', icon: 'cpu', blurb: 'Appliances, fans and electronic accessories' },
  { slug: 'other', name: 'Other', icon: 'boxes', blurb: 'Everything else for the site' },
];

export const DEFAULT_DEPARTMENT = 'plumbing';
const _dept = new Map(DEPARTMENTS.map((d) => [d.slug, d]));
export const departmentMeta = (slug) => _dept.get(slug) ?? _dept.get('other');

/* Sub-category slug from a free-text name ("LED lights" → "led-lights"). */
export const slugifyCategory = (name) =>
  String(name || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
