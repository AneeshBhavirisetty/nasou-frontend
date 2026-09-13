/* ============================================================================
 * pricing.js — bulk (quantity) pricing rules (client review 2, admin item 8).
 *
 * A rule gives a % or a flat ₹-per-unit discount once the cart holds at least
 * `minQty` units in its scope:
 *
 *   scopeType   scopeValue            quantity counted across…
 *   department  'plumbing'            every cart line in that category
 *   category    'pvc-fittings'        every line in that sub-category
 *   brand       'astral' (supplier)   every line from that brand
 *   product     product id            that one product
 *
 * Category / brand rules therefore reward mixed baskets ("50 PVC fittings of
 * any size"). When several rules match a line the shopper gets the best one;
 * rules never stack. Used by the cart, checkout, product page and the admin
 * preview so every surface computes the same number.
 * ==========================================================================*/

export const BULK_SCOPES = [
  { key: 'department', label: 'Category' },
  { key: 'category', label: 'Sub-category' },
  { key: 'brand', label: 'Brand' },
  { key: 'product', label: 'Specific product' },
];

export function ruleMatches(rule, product) {
  if (!rule || !product) return false;
  switch (rule.scopeType) {
    case 'department': return (product.department || 'plumbing') === rule.scopeValue;
    case 'category': return product.category === rule.scopeValue;
    case 'brand': return product.supplier === rule.scopeValue;
    case 'product': return product.id === rule.scopeValue || product.sku === rule.scopeValue;
    default: return false;
  }
}

const lineAmount = (rule, price, qty) =>
  rule.kind === 'percent'
    ? Math.round((price * qty * rule.value) / 100)
    : Math.min(rule.value, price) * qty;

/* lines: [{ product, qty, price }] → { perLine: [{ amount, rule } | null], total } */
export function applyBulkRules(lines, rules = []) {
  const live = rules.filter((r) => r.active && r.value > 0 && r.minQty > 0);
  const eligible = live.filter((r) => {
    const units = lines.reduce((n, l) => n + (ruleMatches(r, l.product) ? l.qty : 0), 0);
    return units >= r.minQty;
  });
  const perLine = lines.map((l) => {
    let best = null;
    for (const r of eligible) {
      if (!ruleMatches(r, l.product)) continue;
      const amount = lineAmount(r, l.price, l.qty);
      if (!best || amount > best.amount) best = { amount, rule: r };
    }
    return best;
  });
  return { perLine, total: perLine.reduce((s, b) => s + (b?.amount || 0), 0) };
}

/* Active rules that could apply to a product (for the product page). */
export const bulkOffersFor = (product, rules = []) =>
  rules.filter((r) => r.active && r.value > 0 && ruleMatches(r, product)).sort((a, b) => a.minQty - b.minQty);

export const describeBulk = (rule) =>
  rule.kind === 'percent' ? `${rule.value}% off` : `₹${rule.value} off per unit`;
