import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../Icon';
import Modal from '../Modal';
import { Badge, Button, Field } from '../ui';
import { useAdminStore } from '../../context/AdminStore';
import { useToast } from '../../context/ToastContext';
import { categoryName, suppliers } from '../../data/catalog';
import { DEPARTMENTS, DEFAULT_DEPARTMENT, departmentMeta } from '../../data/departments';
import { BULK_SCOPES, applyBulkRules, describeBulk, ruleMatches } from '../../lib/pricing';
import { money, cx } from '../../lib/format';
import { EASE } from '../../lib/motion';

/* Bulk (quantity) pricing rules — client review 2, admin item 8.
   A rule: "N+ units of <category | sub-category | brand | product> → X% or
   ₹X per unit off". How rules combine is documented in lib/pricing.js. */

const SELECT = 'h-12 w-full rounded-md border border-line bg-white/80 px-4 text-[14px] text-ink outline-none transition focus:border-forest focus:shadow-[0_0_0_2px_rgba(31,92,74,0.18)]';
const LABEL = 'mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.16em] text-forest-800';

const blank = { name: '', scopeType: 'category', scopeValue: 'pvc-fittings', minQty: 50, kind: 'percent', value: 5, active: true };

/* Options for the "value" of each scope, live from the admin store. */
function useScopeOptions(products) {
  return useMemo(() => {
    const subs = new Map();
    const brands = new Map(suppliers.map((s) => [s.slug, s.name]));
    products.forEach((p) => {
      if (!subs.has(p.category)) subs.set(p.category, `${departmentMeta(p.department || DEFAULT_DEPARTMENT).name} › ${p.subcategoryName || categoryName(p.category)}`);
      if (p.supplier && !brands.has(p.supplier)) brands.set(p.supplier, p.supplierName);
    });
    return {
      department: DEPARTMENTS.map((d) => [d.slug, d.name]),
      category: [...subs.entries()].sort((a, b) => a[1].localeCompare(b[1])),
      brand: [...brands.entries()].sort((a, b) => a[1].localeCompare(b[1])),
    };
  }, [products]);
}

export function scopeText(rule, products) {
  const type = BULK_SCOPES.find((s) => s.key === rule.scopeType)?.label || rule.scopeType;
  let name = rule.scopeValue;
  if (rule.scopeType === 'department') name = departmentMeta(rule.scopeValue).name;
  if (rule.scopeType === 'category') name = categoryName(rule.scopeValue);
  if (rule.scopeType === 'brand') name = suppliers.find((s) => s.slug === rule.scopeValue)?.name || products.find((p) => p.supplier === rule.scopeValue)?.supplierName || rule.scopeValue;
  if (rule.scopeType === 'product') {
    const p = products.find((x) => x.id === rule.scopeValue || x.sku === rule.scopeValue);
    name = p ? `${p.name} (${p.sku})` : rule.scopeValue;
  }
  return { type, name };
}

function BulkRuleForm({ rule, onClose, onSave }) {
  const { products } = useAdminStore();
  const opts = useScopeOptions(products);
  const [r, setR] = useState(() => ({ ...blank, ...(rule || {}) }));
  const [productQ, setProductQ] = useState(() => {
    if (rule?.scopeType !== 'product') return '';
    const p = products.find((x) => x.id === rule.scopeValue);
    return p ? `${p.sku} — ${p.name}` : rule.scopeValue;
  });
  const [err, setErr] = useState('');
  const set = (k, v) => setR((s) => ({ ...s, [k]: v }));

  const changeScope = (t) => {
    const first = t === 'product' ? '' : opts[t]?.[0]?.[0] || '';
    setR((s) => ({ ...s, scopeType: t, scopeValue: first }));
    setProductQ('');
  };

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    let scopeValue = r.scopeValue;
    if (r.scopeType === 'product') {
      const sku = productQ.split('—')[0].trim().toUpperCase();
      const p = products.find((x) => x.sku === sku || x.id === productQ.trim());
      if (!p) return setErr('Pick a product from the list (type its SKU or name).');
      scopeValue = p.id;
    }
    if (!scopeValue) return setErr('Choose what this rule applies to.');
    if (!(Number(r.minQty) >= 2)) return setErr('Minimum quantity should be 2 or more.');
    if (!(Number(r.value) > 0)) return setErr('Enter a discount above 0.');
    if (r.kind === 'percent' && Number(r.value) > 60) return setErr('Bulk % discount cannot exceed 60%.');
    const scope = scopeText({ ...r, scopeValue }, products);
    onSave({
      ...r,
      id: rule?.id || `b_${Date.now().toString(36)}`,
      name: r.name.trim() || `${scope.name} ${r.minQty}+`,
      scopeValue,
      minQty: Math.round(Number(r.minQty)),
      value: Math.round(Number(r.value) * 100) / 100,
    });
    onClose();
  };

  return (
    <Modal open onClose={onClose} title={rule ? `Edit · ${rule.name}` : 'New bulk pricing rule'} size="md">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Rule name" value={r.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. PVC fittings trade pack" hint="Shown to shoppers in the cart" />
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={LABEL}>Applies to</span>
            <select value={r.scopeType} onChange={(e) => changeScope(e.target.value)} className={SELECT}>
              {BULK_SCOPES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </label>
          {r.scopeType === 'product' ? (
            <label className="block">
              <span className={LABEL}>Product</span>
              <input list="bulk-products" value={productQ} onChange={(e) => setProductQ(e.target.value)} placeholder="Type SKU or name" className={SELECT} />
              <datalist id="bulk-products">
                {products.slice(0, 2000).map((p) => <option key={p.id} value={`${p.sku} — ${p.name}`} />)}
              </datalist>
            </label>
          ) : (
            <label className="block">
              <span className={LABEL}>{BULK_SCOPES.find((s) => s.key === r.scopeType)?.label}</span>
              <select value={r.scopeValue} onChange={(e) => set('scopeValue', e.target.value)} className={SELECT}>
                {(opts[r.scopeType] || []).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
              </select>
            </label>
          )}
          <Field label="Minimum quantity" inputMode="numeric" value={String(r.minQty)} onChange={(e) => set('minQty', e.target.value.replace(/\D/g, ''))} hint={r.scopeType === 'product' ? 'Units of this product' : 'Units across the scope, mixed items count'} />
          <label className="block">
            <span className={LABEL}>Discount type</span>
            <select value={r.kind} onChange={(e) => set('kind', e.target.value)} className={SELECT}>
              <option value="percent">Percent off (%)</option>
              <option value="flat">Amount off per unit (₹)</option>
            </select>
          </label>
          <Field label={r.kind === 'percent' ? 'Percent off' : '₹ off per unit'} inputMode="decimal" value={String(r.value)} onChange={(e) => set('value', e.target.value.replace(/[^\d.]/g, ''))} />
        </div>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input type="checkbox" checked={r.active} onChange={(e) => set('active', e.target.checked)} className="sr-only" />
          <span className={cx('grid h-5 w-9 items-center rounded-full border p-0.5 transition', r.active ? 'border-forest bg-forest' : 'border-line bg-sunk')}>
            <span className={cx('h-4 w-4 rounded-full bg-white transition-transform', r.active && 'translate-x-4')} />
          </span>
          <span className="text-[13px] font-semibold">{r.active ? 'Active — applied automatically in carts' : 'Inactive'}</span>
        </label>

        {err && <p role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{err}</p>}
        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-line px-5 text-[13.5px] font-semibold text-ink-70 transition hover:border-ink-35">Cancel</button>
          <Button type="submit" icon={rule ? 'check' : 'plus'}>{rule ? 'Save rule' : 'Create rule'}</Button>
        </div>
      </form>
    </Modal>
  );
}

/* Rules list + editor. `creating` is lifted so the page header button can open it. */
export default function BulkPricingPanel({ creating, setCreating, canEdit = true }) {
  const toast = useToast();
  const { products, bulkRules, saveBulkRule, deleteBulkRule } = useAdminStore();
  const [editing, setEditing] = useState(null);

  /* what the rule saves at exactly its minimum quantity on a typical item */
  const example = (rule) => {
    const p = products.find((x) => ruleMatches(rule, x) && x.price > 0);
    if (!p) return null;
    const { total } = applyBulkRules([{ product: p, qty: rule.minQty, price: p.price }], [{ ...rule, active: true }]);
    return { p, total };
  };

  return (
    <>
      <p className="flex items-start gap-2 rounded-[16px] bg-white/70 p-3.5 text-[12.5px] leading-relaxed text-ink-50">
        <Icon name="percent" size={14} className="mt-0.5 shrink-0 text-forest" />
        Bulk rules apply automatically in the cart once the quantity is reached. Category, sub-category and brand
        rules count mixed items together; if several rules match an item the shopper gets the better one (they never stack).
      </p>

      {bulkRules.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          <AnimatePresence initial={false}>
            {bulkRules.map((r) => {
              const scope = scopeText(r, products);
              const ex = example(r);
              return (
                <motion.article
                  key={r.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2, ease: EASE }}
                  className={cx('relative flex overflow-hidden rounded-lg border border-line bg-white shadow-card transition hover:shadow-lift', !r.active && 'opacity-75')}
                >
                  <div className={cx('flex w-[104px] shrink-0 flex-col items-center justify-center px-2 py-5 text-center sm:w-[120px]', r.active ? 'forest-band text-white' : 'bg-sunk text-ink-35')}>
                    <p className="text-[clamp(1.2rem,4vw,1.5rem)] font-semibold leading-none">{r.kind === 'percent' ? `${r.value}%` : `₹${r.value}`}</p>
                    <p className={cx('mt-1 text-[10.5px] font-bold uppercase tracking-[0.12em]', r.active ? 'text-emerald-100' : 'text-ink-35')}>{r.kind === 'percent' ? 'off' : 'off / unit'}</p>
                    <p className={cx('tnum mt-2 rounded-full px-2 py-0.5 text-[11px] font-bold', r.active ? 'bg-white/15' : 'bg-white')}>{r.minQty}+ units</p>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col border-l border-dashed border-line p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-[14px] font-bold text-ink">{r.name}</p>
                      {canEdit && (
                        <div className="flex shrink-0 gap-1.5">
                          <button onClick={() => saveBulkRule({ ...r, active: !r.active })} className={cx('grid h-8 w-8 place-items-center rounded-md border transition', r.active ? 'border-line text-emerald-600 hover:border-emerald' : 'border-line text-ink-35 hover:text-ink')} aria-label={r.active ? 'Deactivate' : 'Activate'} title={r.active ? 'Deactivate' : 'Activate'}>
                            <Icon name={r.active ? 'check' : 'clock'} size={14} />
                          </button>
                          <button onClick={() => setEditing(r)} className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-50 transition hover:border-ink-35 hover:text-ink" aria-label="Edit rule">
                            <Icon name="pencil" size={14} />
                          </button>
                          <button onClick={() => { if (window.confirm(`Delete rule “${r.name}”?`)) { deleteBulkRule(r.id); toast.success('Rule deleted'); } }} className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-50 transition hover:border-clay/40 hover:text-clay" aria-label="Delete rule">
                            <Icon name="trash" size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className="mt-1.5 text-[12.5px] text-ink-50"><Badge tone="neutral" className="mr-1.5 !py-0.5">{scope.type}</Badge>{scope.name}</p>
                    {!r.active && <p className="mt-1.5"><Badge tone="neutral">Inactive</Badge></p>}
                    <div className="mt-auto pt-3 text-[12px]">
                      {ex ? (
                        <span className="text-ink-50">
                          {r.minQty} × {ex.p.name} ({money(ex.p.price)}) → <span className="tnum font-bold text-emerald-700">save {money(ex.total)}</span>
                        </span>
                      ) : <span className="text-ink-35">No matching products yet</span>}
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white/60 px-4 py-12 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sunk text-ink-35"><Icon name="percent" size={22} /></span>
          <p className="mt-3 text-[13px] text-ink-50">No bulk pricing rules yet.</p>
          {canEdit && <div className="mt-4"><Button size="sm" icon="plus" onClick={() => setCreating(true)}>Create the first rule</Button></div>}
        </div>
      )}

      {(creating || editing) && (
        <BulkRuleForm
          key={editing?.id ?? 'new'}
          rule={editing}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(rule) => { saveBulkRule(rule); toast.success(editing ? 'Rule updated' : `${rule.name} created`); }}
        />
      )}
    </>
  );
}
