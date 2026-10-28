import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Modal from '../../components/Modal';
import Icon from '../../components/Icon';
import { Button } from '../../components/ui';
import { AdminPageHead, EmptyNote, Kpi, LABEL_CLS, Panel, SELECT_CLS, StatusPill, Tabs } from '../../components/admin/AdminUI';
import { useAdminStore } from '../../context/AdminStore';
import { useToast } from '../../context/ToastContext';
import { useScopedProducts } from '../../lib/useScoped';
import { useSeller } from '../../layouts/SellerLayout';
import { categoryName, departmentName } from '../../data/catalog';
import { act } from '../../lib/act';
import { cx, money } from '../../lib/format';

/* ============================================================================
 * Seller › Discounts (client review 6, retailer items 7–8).
 *
 *   Discount codes        the store makes a code (SRISAI10…) and points it at
 *                         its products: all of them, a whole category, a
 *                         sub-category, or picked products. A shopper types it
 *                         at checkout — or it applies by itself.
 *   Automatic discounts   no code: "buy 10+, 5% off", on all or picked products.
 *
 * The server only ever applies them to this store's own lines (nasou-api
 * PricingEngine checks the retailer per line), and they are kept apart from
 * Nivora's own codes. `?apply=1` (Products › Apply discount) opens "Apply a
 * code to products".
 * ==========================================================================*/

const TARGETS = [
  ['all', 'All my products'],
  ['dept', 'A whole category'],
  ['sub', 'A sub-category'],
  ['picked', 'Picked products'],
];

/* scope → target fields, and back */
const targetOf = (c) => (c.productSkus?.length ? 'picked' : c.scope?.startsWith('dept:') ? 'dept' : c.scope ? 'sub' : 'all');
const describeTarget = (c) => {
  if (c.productSkus?.length) return `${c.productSkus.length} picked product${c.productSkus.length === 1 ? '' : 's'}`;
  if (c.scope?.startsWith('dept:')) return `All ${departmentName(c.scope.slice(5))}`;
  if (c.scope) return categoryName(c.scope);
  return 'All my products';
};
const valueText = (c) => (c.kind === 'percent' ? `${c.value}% off` : `${money(c.value)} off`);

/* Picks what a discount applies to, from this store's own products. */
function TargetPicker({ value, onChange, products }) {
  const [q, setQ] = useState('');
  const depts = useMemo(() => [...new Set(products.map((p) => p.department))], [products]);
  const subs = useMemo(() => {
    const m = new Map();
    products.forEach((p) => m.set(p.category, (m.get(p.category) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [products]);
  const picked = new Set(value.skus);
  const needle = q.trim().toLowerCase();
  const matches = products.filter((p) => !needle || `${p.name} ${p.sku} ${p.size || ''}`.toLowerCase().includes(needle)).slice(0, 40);
  const count = value.target === 'all' ? products.length
    : value.target === 'dept' ? products.filter((p) => p.department === value.dept).length
      : value.target === 'sub' ? products.filter((p) => p.category === value.sub).length
        : picked.size;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {TARGETS.map(([k, l]) => (
          <button key={k} type="button" onClick={() => onChange({ ...value, target: k })} className={cx('rounded-[14px] border px-3 py-2.5 text-left text-[12.5px] font-bold transition', value.target === k ? 'border-forest bg-forest text-white shadow-btn' : 'border-line bg-white text-ink-70 hover:border-forest/40')}>{l}</button>
        ))}
      </div>
      {value.target === 'dept' && (
        <select value={value.dept} onChange={(e) => onChange({ ...value, dept: e.target.value })} className={SELECT_CLS}>
          <option value="">Choose a category…</option>
          {depts.map((d) => <option key={d} value={d}>{departmentName(d)}</option>)}
        </select>
      )}
      {value.target === 'sub' && (
        <select value={value.sub} onChange={(e) => onChange({ ...value, sub: e.target.value })} className={SELECT_CLS}>
          <option value="">Choose a sub-category…</option>
          {subs.map(([s, n]) => <option key={s} value={s}>{categoryName(s)} ({n})</option>)}
        </select>
      )}
      {value.target === 'picked' && (
        <div className="rounded-[14px] border border-line">
          <label className="flex h-11 items-center gap-2 border-b border-line px-3"><Icon name="search" size={14} className="text-ink-50" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your products" className="min-w-0 flex-1 bg-transparent text-[13.5px] outline-none" /></label>
          <ul className="max-h-[220px] divide-y divide-line-soft overflow-y-auto">
            {matches.map((p) => (
              <li key={p.id}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-[13px] hover:bg-sunk/50">
                  <input type="checkbox" checked={picked.has(p.sku)} onChange={() => onChange({ ...value, skus: picked.has(p.sku) ? value.skus.filter((s) => s !== p.sku) : [...value.skus, p.sku] })} className="accent-[#1f5c4a]" />
                  <span className="min-w-0 flex-1 truncate"><b className="text-ink">{p.name}</b>{p.size ? ` · ${p.size}` : ''}</span>
                  <span className="font-mono text-[11px] text-ink-50">{p.sku}</span>
                </label>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="text-[12px] font-semibold text-emerald-700">Covers {count.toLocaleString('en-IN')} of your products</p>
    </div>
  );
}

const targetToScope = (t) => ({
  scope: t.target === 'dept' && t.dept ? `dept:${t.dept}` : t.target === 'sub' && t.sub ? t.sub : '',
  productSkus: t.target === 'picked' ? t.skus : [],
});
const scopeToTarget = (c) => ({
  target: targetOf(c),
  dept: c.scope?.startsWith('dept:') ? c.scope.slice(5) : '',
  sub: c.scope && !c.scope.startsWith('dept:') ? c.scope : '',
  skus: c.productSkus || [],
});

function CodeDialog({ coupon, onClose, products, prefix }) {
  const { saveCoupon } = useAdminStore();
  const toast = useToast();
  const isNew = !coupon?.id;
  const [f, setF] = useState(() => ({
    code: coupon?.code || `${prefix}${Math.floor(10 + Math.random() * 89)}`,
    kind: coupon?.kind || 'percent', value: coupon?.value ?? 10, minOrder: coupon?.minOrder || '', maxDiscount: coupon?.maxDiscount || '',
    usageLimit: coupon?.usageLimit ?? '', startsOn: coupon?.startsOn || '', expiry: coupon?.expiry || '',
    active: coupon?.active ?? true, autoApply: coupon?.autoApply ?? false,
  }));
  const [t, setT] = useState(() => scopeToTarget(coupon || {}));
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    if (t.target === 'dept' && !t.dept) return toast.error('Choose the category.');
    if (t.target === 'sub' && !t.sub) return toast.error('Choose the sub-category.');
    if (t.target === 'picked' && !t.skus.length) return toast.error('Pick at least one product.');
    setBusy(true);
    const ok = await act(toast, () => saveCoupon({
      ...coupon, ...f, code: f.code.trim().toUpperCase(), value: Number(f.value), minOrder: Number(f.minOrder) || 0,
      maxDiscount: Number(f.maxDiscount) || 0, usageLimit: f.usageLimit === '' ? null : Number(f.usageLimit), ...targetToScope(t),
    }), isNew ? `Code ${f.code.toUpperCase()} created` : 'Code saved');
    setBusy(false);
    if (ok) onClose();
  };

  return (
    <Modal open onClose={onClose} title={isNew ? 'New discount code' : `Edit ${coupon.code}`} size="lg">
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-3">
          <label><span className={LABEL_CLS}>Code</span><input value={f.code} disabled={!isNew} onChange={(e) => setF((s) => ({ ...s, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 32) }))} className={cx(SELECT_CLS, 'font-mono font-bold')} /></label>
          <label><span className={LABEL_CLS}>Type</span><select value={f.kind} onChange={set('kind')} className={SELECT_CLS}><option value="percent">% off</option><option value="flat">₹ off the order</option></select></label>
          <label><span className={LABEL_CLS}>{f.kind === 'percent' ? 'Percent' : 'Rupees'}</span><input inputMode="numeric" value={f.value} onChange={(e) => setF((s) => ({ ...s, value: e.target.value.replace(/[^\d.]/g, '') }))} className={SELECT_CLS} /></label>
          <label><span className={LABEL_CLS}>Minimum spend (₹)</span><input inputMode="numeric" value={f.minOrder} onChange={set('minOrder')} placeholder="None" className={SELECT_CLS} /></label>
          {f.kind === 'percent' && <label><span className={LABEL_CLS}>Cap (₹)</span><input inputMode="numeric" value={f.maxDiscount} onChange={set('maxDiscount')} placeholder="No cap" className={SELECT_CLS} /></label>}
          <label><span className={LABEL_CLS}>Uses allowed</span><input inputMode="numeric" value={f.usageLimit} onChange={set('usageLimit')} placeholder="Unlimited" className={SELECT_CLS} /></label>
          <label><span className={LABEL_CLS}>Starts</span><input type="date" value={f.startsOn} onChange={set('startsOn')} className={SELECT_CLS} /></label>
          <label><span className={LABEL_CLS}>Last day</span><input type="date" value={f.expiry} onChange={set('expiry')} className={SELECT_CLS} /></label>
        </div>
        <div>
          <span className={LABEL_CLS}>Applies to</span>
          <TargetPicker value={t} onChange={setT} products={products} />
        </div>
        <div className="flex flex-wrap gap-4 text-[13px] text-ink-70">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.active} onChange={set('active')} className="accent-[#1f5c4a]" /> Active</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.autoApply} onChange={set('autoApply')} className="accent-[#1f5c4a]" /> Apply by itself in the cart (no typing)</label>
        </div>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy} icon="check">{isNew ? 'Create code' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}

/* "Apply a code to products": take an existing code and point it at a category, sub-category or products. */
function ApplyDialog({ coupons, onClose, products }) {
  const { saveCoupon } = useAdminStore();
  const toast = useToast();
  const [id, setId] = useState(coupons[0]?.id || '');
  const c = coupons.find((x) => x.id === id);
  const [t, setT] = useState(() => scopeToTarget(c || {}));
  useEffect(() => { if (c) setT(scopeToTarget(c)); }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [busy, setBusy] = useState(false);
  const apply = async () => {
    if (!c) return;
    setBusy(true);
    const ok = await act(toast, () => saveCoupon({ ...c, ...targetToScope(t) }), `${c.code} now applies to ${describeTarget({ ...c, ...targetToScope(t) })}`);
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Modal open onClose={onClose} title="Apply a discount code to products" size="lg">
      {coupons.length === 0 ? (
        <EmptyNote icon="tag" title="No codes yet" body="Create a discount code first, then apply it here." />
      ) : (
        <div className="space-y-5">
          <label className="block"><span className={LABEL_CLS}>Code</span>
            <select value={id} onChange={(e) => setId(e.target.value)} className={SELECT_CLS}>
              {coupons.map((x) => <option key={x.id} value={x.id}>{x.code} — {valueText(x)}</option>)}
            </select>
          </label>
          <div><span className={LABEL_CLS}>Apply it to</span><TargetPicker value={t} onChange={setT} products={products} /></div>
          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={apply} loading={busy} icon="check">Apply</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

function RuleDialog({ rule, onClose, products }) {
  const { saveBulkRule } = useAdminStore();
  const toast = useToast();
  const [f, setF] = useState(() => ({ name: rule?.name || 'Buy more, save more', minQty: rule?.minQty ?? 10, kind: rule?.kind || 'percent', value: rule?.value ?? 5, active: rule?.active ?? true }));
  const [t, setT] = useState(() => ({ target: rule?.productSkus?.length ? 'picked' : 'all', dept: '', sub: '', skus: rule?.productSkus || [] }));
  const [busy, setBusy] = useState(false);
  const save = async (e) => {
    e.preventDefault();
    if (t.target === 'picked' && !t.skus.length) return toast.error('Pick at least one product.');
    /* an automatic discount is "all products" or picked ones; a category or sub-category is turned into its products */
    const skus = t.target === 'picked' ? t.skus : t.target === 'dept' ? products.filter((p) => p.department === t.dept).map((p) => p.sku)
      : t.target === 'sub' ? products.filter((p) => p.category === t.sub).map((p) => p.sku) : [];
    setBusy(true);
    const ok = await act(toast, () => saveBulkRule({ ...rule, ...f, scopeType: 'retailer', minQty: Number(f.minQty), value: Number(f.value), productSkus: skus }), 'Automatic discount saved');
    setBusy(false);
    if (ok) onClose();
  };
  return (
    <Modal open onClose={onClose} title={rule?.id ? 'Edit automatic discount' : 'New automatic discount'} size="lg">
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="sm:col-span-2"><span className={LABEL_CLS}>Name shoppers see</span><input value={f.name} onChange={(e) => setF((s) => ({ ...s, name: e.target.value }))} className={SELECT_CLS} /></label>
          <label><span className={LABEL_CLS}>From quantity</span><input inputMode="numeric" value={f.minQty} onChange={(e) => setF((s) => ({ ...s, minQty: e.target.value.replace(/\D/g, '') }))} className={SELECT_CLS} /></label>
          <label><span className={LABEL_CLS}>{f.kind === 'percent' ? '% off' : '₹ off each'}</span>
            <div className="flex gap-1.5"><select value={f.kind} onChange={(e) => setF((s) => ({ ...s, kind: e.target.value }))} className={cx(SELECT_CLS, 'w-20 px-2')}><option value="percent">%</option><option value="flat">₹</option></select><input inputMode="numeric" value={f.value} onChange={(e) => setF((s) => ({ ...s, value: e.target.value.replace(/[^\d.]/g, '') }))} className={SELECT_CLS} /></div>
          </label>
        </div>
        <div><span className={LABEL_CLS}>Applies to</span><TargetPicker value={t} onChange={setT} products={products} /></div>
        <label className="flex items-center gap-2 text-[13px] text-ink-70"><input type="checkbox" checked={f.active} onChange={(e) => setF((s) => ({ ...s, active: e.target.checked }))} className="accent-[#1f5c4a]" /> Active</label>
        <div className="flex justify-end gap-2 border-t border-line pt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={busy} icon="check">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function SellerDiscounts() {
  const { coupons, bulkRules, saveCoupon, deleteCoupon, deleteBulkRule } = useAdminStore();
  const { retailer, retailerId, readOnly } = useSeller();
  const products = useScopedProducts();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState('codes');
  const [dialog, setDialog] = useState(null);
  const mine = coupons.filter((c) => c.retailerId === retailerId || (!c.retailerId && c.mine));
  const rules = bulkRules.filter((r) => r.scopeType === 'retailer' && r.scopeValue === retailerId);
  const prefix = (retailer?.name || 'STORE').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6);

  useEffect(() => {
    if (params.get('apply')) { setDialog({ type: 'apply' }); setParams({}, { replace: true }); }
  }, [params, setParams]);

  const used = mine.reduce((n, c) => n + (c.timesUsed || 0), 0);

  return (
    <div className="space-y-5">
      <AdminPageHead title="Discounts" note="Your own codes and automatic discounts — they only ever apply to your products, and stay separate from Nivora’s offers.">
        {!readOnly && <Button size="sm" variant="outline" icon="tag" onClick={() => setDialog({ type: 'apply' })}>Apply a code to products</Button>}
        {!readOnly && <Button size="sm" icon="plus" onClick={() => setDialog({ type: tab === 'codes' ? 'code' : 'rule' })}>{tab === 'codes' ? 'New discount code' : 'New automatic discount'}</Button>}
      </AdminPageHead>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Live codes" value={mine.filter((c) => c.active).length} note={`${mine.length} in total`} icon="tag" />
        <Kpi label="Times used" value={used} note="Across all your codes" icon="cart" />
        <Kpi label="Automatic discounts" value={rules.filter((r) => r.active).length} note="Applied in the cart by quantity" icon="percent" />
        <Kpi label="Products" value={products.length} note="That your discounts can cover" icon="package" />
      </div>

      <Tabs value={tab} onChange={setTab} options={[
        { value: 'codes', label: 'Discount codes', icon: 'tag', count: mine.length },
        { value: 'rules', label: 'Automatic discounts', icon: 'percent', count: rules.length },
      ]} />

      {tab === 'codes' && (
        <Panel pad={false}>
          {mine.length === 0 ? (
            <div className="p-6"><EmptyNote icon="tag" title="No discount codes yet" body="Create a code like SRISAI10 and point it at a category, a sub-category or picked products." /></div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {mine.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                  <span className="rounded-[10px] border border-dashed border-forest/40 bg-emerald-50/60 px-3 py-1.5 font-mono text-[14px] font-bold text-forest">{c.code}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold text-ink">{valueText(c)}{c.maxDiscount ? ` · up to ${money(c.maxDiscount)}` : ''}{c.minOrder ? ` · on ${money(c.minOrder)}+` : ''}</p>
                    <p className="text-[12px] text-ink-50">{describeTarget(c)} · used {c.timesUsed || 0}{c.usageLimit ? ` of ${c.usageLimit}` : ''}{c.expiry ? ` · until ${c.expiry}` : ''}{c.autoApply ? ' · applies by itself' : ''}</p>
                  </div>
                  <StatusPill status={c.active ? 'active' : 'inactive'} label={c.active ? 'Active' : 'Paused'} />
                  {!readOnly && (
                    <span className="flex gap-1.5">
                      <button onClick={() => act(toast, () => saveCoupon({ ...c, active: !c.active }), c.active ? 'Paused' : 'Active again')} className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-50 hover:text-forest" aria-label={c.active ? 'Pause' : 'Resume'}><Icon name={c.active ? 'lock' : 'check'} size={14} /></button>
                      <button onClick={() => setDialog({ type: 'code', item: c })} className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-50 hover:text-forest" aria-label="Edit"><Icon name="pencil" size={14} /></button>
                      <button onClick={() => window.confirm(`Delete ${c.code}?`) && act(toast, () => deleteCoupon(c.id), 'Code deleted')} className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-50 hover:text-clay" aria-label="Delete"><Icon name="trash" size={14} /></button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {tab === 'rules' && (
        <Panel pad={false}>
          {rules.length === 0 ? (
            <div className="p-6"><EmptyNote icon="percent" title="No automatic discounts yet" body="e.g. “Buy 10 or more, 5% off” on all or picked products — no code needed." /></div>
          ) : (
            <ul className="divide-y divide-line-soft">
              {rules.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:px-5">
                  <span className="grid h-10 w-10 place-items-center rounded-[12px] bg-gold-50 text-forest"><Icon name="percent" size={16} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold text-ink">{r.name}</p>
                    <p className="text-[12px] text-ink-50">{r.kind === 'percent' ? `${r.value}% off` : `${money(r.value)} off each`} from {r.minQty} units · {r.productSkus?.length ? `${r.productSkus.length} products` : 'all your products'}</p>
                  </div>
                  <StatusPill status={r.active ? 'active' : 'inactive'} label={r.active ? 'Active' : 'Paused'} />
                  {!readOnly && (
                    <span className="flex gap-1.5">
                      <button onClick={() => setDialog({ type: 'rule', item: r })} className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-50 hover:text-forest" aria-label="Edit"><Icon name="pencil" size={14} /></button>
                      <button onClick={() => window.confirm(`Delete “${r.name}”?`) && act(toast, () => deleteBulkRule(r.id), 'Deleted')} className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-50 hover:text-clay" aria-label="Delete"><Icon name="trash" size={14} /></button>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {dialog?.type === 'code' && <CodeDialog coupon={dialog.item} onClose={() => setDialog(null)} products={products} prefix={prefix} />}
      {dialog?.type === 'apply' && <ApplyDialog coupons={mine} onClose={() => setDialog(null)} products={products} />}
      {dialog?.type === 'rule' && <RuleDialog rule={dialog.item} onClose={() => setDialog(null)} products={products} />}
    </div>
  );
}
