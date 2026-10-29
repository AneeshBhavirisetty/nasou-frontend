/* ============================================================================
 * access.js — who may do what (Super Admin requirements, item 3 + section 4).
 *
 * Three kinds of user:
 *   ADMIN     the Nasou Hive team, using the Super Admin console (/admin)
 *   RETAILER  an onboarded retailer (or one of their staff), using /seller
 *   CUSTOMER  a buyer
 *
 * Team members carry one of three role presets — Owner, Operations (which
 * also covers support and finance work) and Management. Levels per module:
 *   none · view · request · start · approve · edit
 * "request" (Operations on retailer suspend/delete) files a request the Owner
 * approves; "start" opens a refund and "approve" passes it. Presets are
 * editable by the Owner in Team & access › Roles, so no code change is
 * needed. The server must check the same matrix on every action (migration
 * V8 in nasou-api) — this file is the UI half of that contract.
 * ==========================================================================*/

export const ADMIN_MODULES = [
  { key: 'dashboards', label: 'Dashboards', note: 'Executive, retailer, operations, finance and catalog views' },
  { key: 'retailers', label: 'Retailers', note: 'Retailer list, onboarding queue, profile change approvals' },
  { key: 'retailerStatus', label: 'Retailer suspend / delete', note: 'Suspend, deactivate or delete a retailer' },
  { key: 'customers', label: 'Customers', note: 'Customer details, block / unblock, password reset, notes' },
  { key: 'orders', label: 'Orders', note: 'Status, cancel, flag, notes on every sub-order' },
  { key: 'catalog', label: 'Catalog', note: 'Products, master categories, item schema, discounts, import' },
  { key: 'commission', label: 'Commission and subscriptions', note: 'Commission rates, plans, assignments' },
  { key: 'payouts', label: 'Payouts', note: 'Settlements, approvals, mark paid, reconciliation' },
  { key: 'refunds', label: 'Refunds', note: 'Start, approve and process refunds' },
  { key: 'audit', label: 'Audit logs', note: 'Read-only trail of every action' },
  { key: 'content', label: 'Content and settings', note: 'Banners, tax, shipping, message templates' },
  { key: 'sitePhotos', label: 'Category photos', note: 'Photos on the home page category cards' },
  { key: 'team', label: 'Admin users and roles', note: 'Team members, role presets, 2FA' },
];

export const LEVELS = ['none', 'view', 'request', 'start', 'approve', 'edit'];
export const LEVEL_LABEL = { none: 'No access', view: 'View', request: 'Request', start: 'Start', approve: 'Approve', edit: 'Edit' };
/* which special levels make sense where — the role editor only offers these */
export const LEVEL_OPTIONS = {
  retailerStatus: ['none', 'view', 'request', 'edit'],
  refunds: ['none', 'view', 'start', 'approve', 'edit'],
};
export const levelOptions = (module) => LEVEL_OPTIONS[module] || ['none', 'view', 'edit'];

const row = (owner, operations, management) => ({ owner, operations, management });

/* Final roles (October 2026): Support and Finance were folded into
   Operations, which holds the higher level of the three on every module. */
const MATRIX = {
  retailers: row('edit', 'edit', 'view'),
  retailerStatus: row('edit', 'request', 'none'),
  customers: row('edit', 'edit', 'view'),
  orders: row('edit', 'edit', 'view'),
  catalog: row('edit', 'edit', 'view'),
  commission: row('edit', 'edit', 'view'),
  payouts: row('edit', 'edit', 'view'),
  refunds: row('edit', 'approve', 'view'),
  dashboards: row('view', 'view', 'view'),
  audit: row('view', 'view', 'view'),
  content: row('edit', 'edit', 'none'),
  /* client, 29 Oct 2026: the whole team, Management included, keeps these photos current */
  sitePhotos: row('edit', 'edit', 'edit'),
  team: row('edit', 'none', 'none'),
};

export const TEAM_ROLES = [
  { key: 'owner', label: 'Owner', blurb: 'IAM admin — full control. There is exactly one.' },
  { key: 'operations', label: 'Operations', blurb: 'Retailers, customers, orders, catalog, content, commission, payouts and refunds' },
  { key: 'management', label: 'Management', blurb: 'Read-only view across the business' },
];
export const teamRoleLabel = (k) => TEAM_ROLES.find((r) => r.key === k)?.label || 'Team member';

export function defaultPresets() {
  const out = {};
  for (const r of TEAM_ROLES) {
    out[r.key] = Object.fromEntries(ADMIN_MODULES.map((m) => [m.key, MATRIX[m.key]?.[r.key] || 'none']));
  }
  return out;
}

/* does `have` satisfy `need`? */
export function allows(have = 'none', need = 'view') {
  if (have === 'none') return false;
  if (need === 'view') return true;
  if (have === 'edit') return true;
  if (need === 'approve') return have === 'approve';
  if (need === 'start') return have === 'start' || have === 'approve';
  if (need === 'request') return have === 'request';
  return false; // need === 'edit'
}

/* ── retailer staff (requirement 21) ─────────────────────────────────────── */
export const SELLER_SECTIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'products', label: 'Products' },
  { key: 'orders', label: 'Orders' },
  { key: 'discounts', label: 'Discounts' },
  { key: 'customers', label: 'Customers' },
  { key: 'payouts', label: 'Payouts' },
  { key: 'billing', label: 'Billing & payments' },
  { key: 'reports', label: 'Reports & analytics' },
  { key: 'profile', label: 'Store profile' },
  { key: 'team', label: 'Users & access' },
  { key: 'support', label: 'Support' },
];
/* Keep in step with nasou-api MarketScope.STAFF_SECTIONS (review 6 added
   discounts, customers, reports, billing and support). */
export const STAFF_ROLES = [
  { key: 'owner', label: 'Store owner', sections: ['dashboard', 'products', 'orders', 'payouts', 'profile', 'team', 'discounts', 'customers', 'reports', 'billing', 'support'] },
  { key: 'manager', label: 'Manager', sections: ['dashboard', 'products', 'orders', 'payouts', 'profile', 'discounts', 'customers', 'reports', 'billing', 'support'] },
  { key: 'catalog', label: 'Catalog', sections: ['dashboard', 'products', 'discounts', 'reports', 'support'] },
  { key: 'fulfilment', label: 'Fulfilment', sections: ['dashboard', 'orders', 'customers', 'support'] },
];
export const staffRole = (k) => STAFF_ROLES.find((r) => r.key === k) || STAFF_ROLES[0];
