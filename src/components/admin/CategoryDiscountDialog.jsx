import { useMemo, useState } from 'react';
import Icon from '../Icon';
import Modal from '../Modal';
import { Button, Field } from '../ui';
import { useAdminStore } from '../../context/AdminStore';
import { useToast } from '../../context/ToastContext';
import { categoryName } from '../../data/catalog';
import { DEPARTMENTS, DEFAULT_DEPARTMENT, departmentMeta } from '../../data/departments';
import { ruleMatches } from '../../lib/pricing';
import { money, cx } from '../../lib/format';

/* ============================================================================
 * CategoryDiscountDialog — "apply a discount to this category" from the
 * inventory tab (client review 3, admin item 9).
 *
 * It writes an ordinary bulk-pricing rule (lib/pricing.js), so the discount
 * applies itself everywhere that engine already runs — product page, cart and
 * checkout — with no coupon code for the shopper to type. Leaving the minimum
 * quantity at 1 makes it apply to every unit; raising it turns the same rule
 * into a trade / bulk offer. Manage or end them under Discounts › Bulk pricing.
 * ==========================================================================*/

const SELECT = 'h-12 w-full rounded-md border border-line bg-white/80 px-4 text-[14px] text-ink outline-none transition focus:border-forest focus:shadow-[0_0_0_2px_rgba(31,92,74,0.18)]';
const LABEL = 'mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.16em] text-forest-800';

export default function CategoryDiscountDialog({ open, onClose, products, department = '', category = '' }) {
  const { saveBulkRule } = useAdminStore();
  const toast = useToast();

  /* Sub-categories actually present in the catalogue, labelled with their category. */
  const subs = useMemo(() => {
    const m = new Map();
    products.forEach((p) => {
      const dept = p.department || DEFAULT_DEPARTMENT;
      if (!m.has(p.category)) {
        m.set(p.category, {
          slug: p.category,
          label: `${departmentMeta(dept).name} › ${p.subcategoryName || categoryName(p.category)}`,
        });
      }
    });
    return [...m.values()].sort((a, b) => a.label.localeCompare(b.label));
  }, [products]);

  /* Pre-filled from whatever the product list is filtered by. */
  const [f, setF] = useState(() => ({
    scopeType: category ? 'category' : 'department',
    scopeValue: category || department || DEFAULT_DEPARTMENT,
    kind: 'percent',
    value: '10',
    minQty: '1',
    name: '',
  }));
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const pct = f.kind === 'percent';
  const value = Math.max(0, Number(String(f.value).replace(/[^\d.]/g, '')) || 0);
  const minQty = Math.max(1, Math.round(Number(String(f.minQty).replace(/\D/g, '')) || 1));
  const scopeLabel = f.scopeType === 'department'
    ? departmentMeta(f.scopeValue).name
    : subs.find((s) => s.slug === f.scopeValue)?.label ?? categoryName(f.scopeValue);

  /* What the rule would touch, and what a shopper saves on an average unit. */
  const preview = useMemo(() => {
    const rule = { scopeType: f.scopeType, scopeValue: f.scopeValue };
    const hit = products.filter((p) => ruleMatches(rule, p));
    const each = hit.length
      ? Math.round(hit.reduce((sum, p) => sum + (pct ? (p.price * value) / 100 : Math.min(value, p.price)), 0) / hit.length)
      : 0;
    return { count: hit.length, each };
  }, [products, f.scopeType, f.scopeValue, pct, value]);

  const submit = (e) => {
    e.preventDefault();
    if (value <= 0) return toast.error('Enter a discount greater than zero.');
    if (pct && value > 100) return toast.error('A percentage discount cannot be more than 100%.');
    if (!preview.count) return toast.error('No products in that selection yet.');

    saveBulkRule({
      id: `b${Date.now().toString(36)}`,
      name: f.name.trim() || `${pct ? `${value}% off` : `${money(value)} off`} ${scopeLabel}`,
      scopeType: f.scopeType,
      scopeValue: f.scopeValue,
      minQty,
      kind: f.kind,
      value,
      active: true,
    });
    toast.success(`Discount applied to ${preview.count} product${preview.count === 1 ? '' : 's'}`);
    return onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Apply discount to a category" size="md">
      <form onSubmit={submit} className="space-y-4">
        <p className="rounded-md bg-sunk px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-70">
          The discount applies itself on the product page, in the cart and at checkout — shoppers type nothing.
          End it any time under Discounts › Bulk pricing.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <span className={LABEL}>Apply to</span>
            <select
              value={f.scopeType}
              onChange={(e) => {
                const scopeType = e.target.value;
                setF((s) => ({
                  ...s,
                  scopeType,
                  scopeValue: scopeType === 'department'
                    ? (department || DEFAULT_DEPARTMENT)
                    : (category || subs[0]?.slug || ''),
                }));
              }}
              className={SELECT}
            >
              <option value="department">A whole category</option>
              <option value="category">One sub-category</option>
            </select>
          </div>

          <div>
            <span className={LABEL}>{f.scopeType === 'department' ? 'Category' : 'Sub-category'}</span>
            <select value={f.scopeValue} onChange={(e) => set('scopeValue')(e.target.value)} className={SELECT}>
              {f.scopeType === 'department'
                ? DEPARTMENTS.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)
                : subs.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
            </select>
          </div>

          <div>
            <span className={LABEL}>Discount type</span>
            <div className="flex gap-2">
              {[['percent', '% off'], ['flat', '₹ off per unit']].map(([k, label]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set('kind')(k)}
                  className={cx(
                    'h-12 flex-1 rounded-md border text-[13.5px] font-semibold transition',
                    f.kind === k ? 'border-forest bg-forest text-white' : 'border-line bg-white/80 text-ink-70 hover:border-forest/40'
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Field
            label={pct ? 'Discount (%)' : 'Discount (₹ per unit)'}
            type="text"
            inputMode="numeric"
            value={f.value}
            onChange={(e) => set('value')(e.target.value.replace(/[^\d.]/g, ''))}
          />

          <Field
            label="Minimum quantity"
            type="text"
            inputMode="numeric"
            value={f.minQty}
            onChange={(e) => set('minQty')(e.target.value.replace(/\D/g, ''))}
            hint="1 = every order. Higher makes it a bulk offer."
          />

          <Field
            label="Name (optional)"
            value={f.name}
            onChange={(e) => set('name')(e.target.value)}
            placeholder={`${pct ? `${value || 0}% off` : `${money(value || 0)} off`} ${scopeLabel}`}
          />
        </div>

        <div className="flex items-center gap-2.5 rounded-md border border-line bg-white/70 px-3.5 py-3 text-[13px]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <Icon name="tag" size={15} />
          </span>
          <p className="min-w-0 text-ink-70">
            <span className="font-bold text-ink">{preview.count.toLocaleString('en-IN')}</span> product{preview.count === 1 ? '' : 's'} in {scopeLabel}
            {preview.count > 0 && value > 0 && <> · about <span className="tnum font-bold text-emerald-700">{money(preview.each)}</span> off each unit</>}
            {minQty > 1 && <> · from {minQty} units</>}
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-md border border-line px-5 text-[13.5px] font-semibold text-ink-70 transition hover:border-ink-35"
          >
            Cancel
          </button>
          <Button type="submit" icon="tag">Apply discount</Button>
        </div>
      </form>
    </Modal>
  );
}
