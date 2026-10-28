import { useMemo, useState } from 'react';
import Icon from '../Icon';
import Modal from '../Modal';
import { Button, Field } from '../ui';
import RetailerProductPicker from './RetailerProductPicker';
import { useAdminStore } from '../../context/AdminStore';
import { useRetailers } from '../../store/retailers';
import { useToast } from '../../context/ToastContext';
import { categoryName } from '../../data/catalog';
import { DEPARTMENTS, DEFAULT_DEPARTMENT, departmentMeta } from '../../data/departments';
import { ruleMatches } from '../../lib/pricing';
import { money, cx } from '../../lib/format';
import { act } from '../../lib/act';

/* ============================================================================
 * CategoryDiscountDialog — "apply a discount to this category" from the
 * inventory tab (client review 3, admin item 9).
 *
 * It writes an ordinary bulk-pricing rule (lib/pricing.js), so the discount
 * applies itself everywhere that engine already runs — product page, cart and
 * checkout — with no coupon code for the shopper to type. Leaving the minimum
 * quantity at 1 makes it apply to every unit; raising it turns the same rule
 * into a trade / bulk offer. Manage or end them under Discounts › Bulk pricing.
 *
 * Review 5, admin item 2: the same dialog can instead apply an existing
 * discount *code* from the Discounts module to the category. The code is
 * scoped to that category and set to auto-apply at checkout; shoppers can
 * still type it.
 *
 * Oct 2026: it can also target one retailer, on all of that retailer's
 * products or only the ones ticked (a "retailer" bulk rule). Codes cannot be
 * limited to a retailer, so that choice is for "Set a discount here" only.
 * ==========================================================================*/

const SELECT = 'h-12 w-full rounded-md border border-line bg-white/80 px-4 text-[14px] text-ink outline-none transition focus:border-forest focus:shadow-[0_0_0_2px_rgba(37,88,73,0.18)]';
const LABEL = 'mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.16em] text-forest-800';

export default function CategoryDiscountDialog({ open, onClose, products, department = '', category = '', retailer = '' }) {
  const { saveBulkRule, coupons, saveCoupon } = useAdminStore();
  const retailers = useRetailers().filter((r) => r.status === 'approved' || r.status === 'suspended');
  const [mode, setMode] = useState('rule');
  const [code, setCode] = useState('');
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
    scopeType: retailer ? 'retailer' : category ? 'category' : 'department',
    scopeValue: retailer || category || department || DEFAULT_DEPARTMENT,
    productSkus: [],
    kind: 'percent',
    value: '10',
    minQty: '1',
    name: '',
  }));
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const pct = f.kind === 'percent';
  const value = Math.max(0, Number(String(f.value).replace(/[^\d.]/g, '')) || 0);
  const minQty = Math.max(1, Math.round(Number(String(f.minQty).replace(/\D/g, '')) || 1));
  const theirs = useMemo(() => (f.scopeType === 'retailer' ? products.filter((p) => p.retailerId === f.scopeValue) : []), [products, f.scopeType, f.scopeValue]);
  const scopeLabel = f.scopeType === 'retailer'
    ? `${retailers.find((r) => r.id === f.scopeValue)?.name || 'this retailer'}${f.productSkus.length ? ` (${f.productSkus.length} chosen)` : ''}`
    : f.scopeType === 'department'
      ? departmentMeta(f.scopeValue).name
      : subs.find((s) => s.slug === f.scopeValue)?.label ?? categoryName(f.scopeValue);

  /* What the rule would touch, and what a shopper saves on an average unit. */
  const preview = useMemo(() => {
    const rule = { scopeType: f.scopeType, scopeValue: f.scopeValue, productSkus: f.productSkus };
    const hit = products.filter((p) => ruleMatches(rule, p));
    const each = hit.length
      ? Math.round(hit.reduce((sum, p) => sum + (pct ? (p.price * value) / 100 : Math.min(value, p.price)), 0) / hit.length)
      : 0;
    return { count: hit.length, each };
  }, [products, f.scopeType, f.scopeValue, f.productSkus, pct, value]);

  const coupon = coupons.find((c) => c.code === code.trim().toUpperCase());
  const couponScope = f.scopeType === 'department' ? `dept:${f.scopeValue}` : f.scopeValue;

  const submit = (e) => {
    e.preventDefault();
    if (mode === 'code') {
      if (f.scopeType === 'retailer') return toast.error('A discount code cannot be limited to one retailer — use “Set a discount here”.');
      if (!coupon) return toast.error('No discount code with that name — create it under Discounts first.');
      if (!preview.count) return toast.error('No products in that selection yet.');
      act(toast, () => saveCoupon({ ...coupon, scope: couponScope, autoApply: true, active: true }), `${coupon.code} now applies itself to ${scopeLabel}`);
      return onClose();
    }
    if (value <= 0) return toast.error('Enter a discount greater than zero.');
    if (pct && value > 100) return toast.error('A percentage discount cannot be more than 100%.');
    if (!preview.count) return toast.error('No products in that selection yet.');

    act(toast, () => saveBulkRule({
      id: `b${Date.now().toString(36)}`,
      name: f.name.trim() || `${pct ? `${value}% off` : `${money(value)} off`} ${scopeLabel}`,
      scopeType: f.scopeType,
      scopeValue: f.scopeValue,
      productSkus: f.scopeType === 'retailer' ? f.productSkus : [],
      minQty,
      kind: f.kind,
      value,
      active: true,
    }), `Discount applied to ${preview.count} product${preview.count === 1 ? '' : 's'}`);
    return onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Apply a discount" size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex gap-2 rounded-md bg-sunk p-1">
          {[['rule', 'Set a discount here', 'tag'], ['code', 'Use a discount code', 'key']].map(([k, label, ic]) => (
            <button key={k} type="button" onClick={() => { setMode(k); if (k === 'code' && f.scopeType === 'retailer') setF((s) => ({ ...s, scopeType: 'department', scopeValue: department || DEFAULT_DEPARTMENT, productSkus: [] })); }} className={cx('flex flex-1 items-center justify-center gap-1.5 rounded-sm py-2.5 text-[13px] font-bold transition', mode === k ? 'bg-forest text-white shadow-btn' : 'text-forest-800 hover:text-forest')}>
              <Icon name={ic} size={14} /> {label}
            </button>
          ))}
        </div>
        <p className="rounded-md bg-sunk/60 px-3.5 py-2.5 text-[12.5px] leading-relaxed text-ink-70">
          {mode === 'rule'
            ? 'The discount applies itself on the product page, in the cart and at checkout — shoppers type nothing. End it any time under Discounts › Bulk pricing.'
            : 'Pick a code made in the Discounts module. It is limited to this category and applied automatically at checkout; shoppers can also type it.'}
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
                  productSkus: [],
                  scopeValue: scopeType === 'retailer'
                    ? (retailer || retailers[0]?.id || '')
                    : scopeType === 'department'
                      ? (department || DEFAULT_DEPARTMENT)
                      : (category || subs[0]?.slug || ''),
                }));
              }}
              className={SELECT}
            >
              <option value="department">A whole category</option>
              <option value="category">One sub-category</option>
              {mode === 'rule' && <option value="retailer">One retailer’s products</option>}
            </select>
          </div>

          <div>
            <span className={LABEL}>{f.scopeType === 'retailer' ? 'Retailer' : f.scopeType === 'department' ? 'Category' : 'Sub-category'}</span>
            <select value={f.scopeValue} onChange={(e) => setF((s) => ({ ...s, scopeValue: e.target.value, productSkus: [] }))} className={SELECT}>
              {f.scopeType === 'retailer'
                ? retailers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)
                : f.scopeType === 'department'
                  ? DEPARTMENTS.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)
                  : subs.map((s) => <option key={s.slug} value={s.slug}>{s.label}</option>)}
            </select>
          </div>

          {f.scopeType === 'retailer' && f.scopeValue && (
            <div className="sm:col-span-2">
              <span className={LABEL}>Products</span>
              <RetailerProductPicker key={f.scopeValue} products={theirs} value={f.productSkus} onChange={(v) => set('productSkus')(v)} />
            </div>
          )}

          {mode === 'code' ? (
            <div className="sm:col-span-2">
              <span className={LABEL}>Discount code</span>
              <input list="discount-codes" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="e.g. MONSOON10" className={SELECT} />
              <datalist id="discount-codes">{coupons.map((c) => <option key={c.id} value={c.code}>{c.kind === 'percent' ? `${c.value}% off` : `₹${c.value} off`}</option>)}</datalist>
              <span className="mt-1.5 block text-[12px] text-ink-50">
                {coupon
                  ? <>{coupon.kind === 'percent' ? `${coupon.value}% off` : `${money(coupon.value)} off`}{coupon.minOrder ? ` · min order ${money(coupon.minOrder)}` : ''}{coupon.maxDiscount ? ` · capped at ${money(coupon.maxDiscount)}` : ''}{!coupon.active && ' · currently inactive (will be switched on)'}</>
                  : code ? 'No code with that name yet.' : `${coupons.length} codes in the Discounts module`}
              </span>
            </div>
          ) : (<>
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
          </>)}
        </div>

        <div className="flex items-center gap-2.5 rounded-md border border-line bg-white/70 px-3.5 py-3 text-[13px]">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <Icon name="tag" size={15} />
          </span>
          <p className="min-w-0 text-ink-70">
            <span className="font-bold text-ink">{preview.count.toLocaleString('en-IN')}</span> product{preview.count === 1 ? '' : 's'} in {scopeLabel}
            {mode === 'rule' && preview.count > 0 && value > 0 && <> · about <span className="tnum font-bold text-emerald-700">{money(preview.each)}</span> off each unit</>}
            {mode === 'rule' && minQty > 1 && <> · from {minQty} units</>}
            {mode === 'code' && coupon && <> · code <b>{coupon.code}</b> applies itself at checkout</>}
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
          <Button type="submit" icon="tag">{mode === 'code' ? 'Apply code to category' : 'Apply discount'}</Button>
        </div>
      </form>
    </Modal>
  );
}
