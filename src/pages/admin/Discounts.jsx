import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import { Badge, Button, Field } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAdminStore, couponDiscount } from '../../context/AdminStore';
import { categories } from '../../data/catalog';
import { money, cx } from '../../lib/format';
import { EASE } from '../../lib/motion';

const blank = { code: '', kind: 'percent', value: 10, minOrder: 0, maxDiscount: 0, scope: '', expiry: '', active: true };

function CouponForm({ open, coupon, onClose, onSave }) {
  const [c, setC] = useState(() => ({ ...blank, ...(coupon || {}) }));
  const [err, setErr] = useState('');
  const isNew = !coupon;
  const set = (k, v) => setC((s) => ({ ...s, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    const code = c.code.trim().toUpperCase();
    if (!/^[A-Z0-9]{3,16}$/.test(code)) return setErr('Code must be 3–16 letters or digits.');
    if (!(Number(c.value) > 0)) return setErr('Enter a discount value above 0.');
    if (c.kind === 'percent' && Number(c.value) > 90) return setErr('Percentage discount cannot exceed 90%.');
    onSave({
      id: coupon?.id || `c_${Date.now().toString(36)}`,
      code,
      kind: c.kind,
      value: Math.round(Number(c.value)),
      minOrder: Math.max(0, Math.round(Number(c.minOrder) || 0)),
      maxDiscount: Math.max(0, Math.round(Number(c.maxDiscount) || 0)),
      scope: c.scope,
      expiry: c.expiry,
      active: !!c.active,
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={isNew ? 'New discount code' : `Edit · ${coupon.code}`} size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Code" value={c.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} placeholder="MONSOON10" required />
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">Type</span>
            <select value={c.kind} onChange={(e) => set('kind', e.target.value)} className="h-11 w-full rounded-md border border-line bg-white px-3 text-[14px] outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/15">
              <option value="percent">Percent off (%)</option>
              <option value="flat">Flat amount off (₹)</option>
            </select>
          </label>
          <Field label={c.kind === 'percent' ? 'Percent off' : 'Amount off (₹)'} type="text" inputMode="numeric" value={String(c.value)} onChange={(e) => set('value', e.target.value.replace(/\D/g, ''))} required />
          <Field label="Min order value (₹)" type="text" inputMode="numeric" value={String(c.minOrder)} onChange={(e) => set('minOrder', e.target.value.replace(/\D/g, ''))} hint="0 = no minimum" />
          {c.kind === 'percent' && (
            <Field label="Max discount cap (₹)" type="text" inputMode="numeric" value={String(c.maxDiscount)} onChange={(e) => set('maxDiscount', e.target.value.replace(/\D/g, ''))} hint="0 = uncapped" />
          )}
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">Applies to</span>
            <select value={c.scope} onChange={(e) => set('scope', e.target.value)} className="h-11 w-full rounded-md border border-line bg-white px-3 text-[14px] outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/15">
              <option value="">Whole cart</option>
              {categories.map((cat) => <option key={cat.slug} value={cat.slug}>{cat.name} only</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">Expiry (optional)</span>
            <input type="date" value={c.expiry} onChange={(e) => set('expiry', e.target.value)} className="h-11 w-full rounded-md border border-line bg-white px-3 text-[14px] outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/15" />
          </label>
        </div>

        <label className="flex cursor-pointer items-center gap-2.5">
          <input type="checkbox" checked={c.active} onChange={(e) => set('active', e.target.checked)} className="sr-only" />
          <span className={cx('grid h-5 w-9 items-center rounded-full border p-0.5 transition', c.active ? 'border-forest bg-forest' : 'border-line bg-sunk')}>
            <span className={cx('h-4 w-4 rounded-full bg-white transition-transform', c.active && 'translate-x-4')} />
          </span>
          <span className="text-[13px] font-semibold">{c.active ? 'Active — customers can use it' : 'Inactive'}</span>
        </label>

        {err && <p role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{err}</p>}
        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-line px-5 text-[13.5px] font-semibold text-ink-70 transition hover:border-ink-35">Cancel</button>
          <Button type="submit" icon={isNew ? 'plus' : 'check'}>{isNew ? 'Create code' : 'Save'}</Button>
        </div>
      </form>
    </Modal>
  );
}

const SAMPLE = 2000;

export default function AdminDiscounts() {
  const toast = useToast();
  const { coupons, saveCoupon, deleteCoupon } = useAdminStore();
  const [editing, setEditing] = useState(undefined);

  const active = coupons.filter((c) => c.active).length;

  const preview = useMemo(
    () => (c) => couponDiscount(c, { subtotal: SAMPLE, categories: c.scope ? [c.scope] : ['pvc-fittings'] }),
    []
  );

  const scopeLabel = (slug) => categories.find((c) => c.slug === slug)?.name || 'Whole cart';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display-serif text-[clamp(1.5rem,4vw,2rem)]">Discounts</h1>
          <p className="text-[13px] text-ink-50">
            {coupons.length} code{coupons.length !== 1 && 's'} · <span className="text-emerald-600">{active} active</span> · customers enter these at checkout
          </p>
        </div>
        <Button size="sm" icon="plus" onClick={() => setEditing(null)}>New discount code</Button>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="hidden grid-cols-[130px_1fr_160px_120px_90px] gap-3 border-b border-line bg-canvas px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-35 lg:grid">
          <span>Code</span><span>Discount</span><span>Conditions</span><span>On ₹2,000</span><span className="text-right">Actions</span>
        </div>
        <AnimatePresence initial={false}>
          {coupons.map((c) => {
            const p = preview(c);
            return (
              <motion.div
                key={c.id}
                layout
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2, ease: EASE }}
                className="grid grid-cols-1 gap-2 border-b border-line px-4 py-3 last:border-0 lg:grid-cols-[130px_1fr_160px_120px_90px] lg:items-center lg:gap-3"
              >
                <div className="flex items-center gap-2">
                  <span className={cx('font-mono text-[13px] font-bold', !c.active && 'text-ink-35 line-through')}>{c.code}</span>
                  {!c.active && <Badge tone="neutral">Off</Badge>}
                </div>
                <div className="text-[13px]">
                  <span className="font-semibold">
                    {c.kind === 'percent' ? `${c.value}% off` : `${money(c.value)} off`}
                  </span>
                  <span className="text-ink-50"> · {scopeLabel(c.scope)}</span>
                  {c.kind === 'percent' && c.maxDiscount > 0 && <span className="text-ink-35"> · max {money(c.maxDiscount)}</span>}
                </div>
                <div className="text-[12px] text-ink-50">
                  {c.minOrder > 0 ? `Min ${money(c.minOrder)}` : 'No minimum'}
                  {c.expiry && <> · till {c.expiry}</>}
                </div>
                <div className="text-[13px] font-bold">
                  {p.ok ? <span className="text-emerald-600">− {money(p.amount)}</span> : <span className="text-ink-35">{p.reason}</span>}
                </div>
                <div className="flex gap-1.5 lg:justify-end">
                  <button
                    onClick={() => { saveCoupon({ ...c, active: !c.active }); }}
                    className={cx('grid h-8 w-8 place-items-center rounded-md border transition', c.active ? 'border-line text-emerald-600 hover:border-emerald' : 'border-line text-ink-35 hover:text-ink')}
                    aria-label={c.active ? 'Deactivate' : 'Activate'}
                    title={c.active ? 'Deactivate' : 'Activate'}
                  >
                    <Icon name={c.active ? 'check' : 'clock'} size={14} />
                  </button>
                  <button onClick={() => setEditing(c)} className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-50 transition hover:border-ink-35 hover:text-ink" aria-label="Edit">
                    <Icon name="wrench" size={14} />
                  </button>
                  <button
                    onClick={() => { if (window.confirm(`Delete code ${c.code}?`)) { deleteCoupon(c.id); toast.success('Code deleted'); } }}
                    className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-50 transition hover:border-clay/40 hover:text-clay"
                    aria-label="Delete"
                  >
                    <Icon name="trash" size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {coupons.length === 0 && (
          <div className="px-4 py-12 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sunk text-ink-35"><Icon name="tag" size={22} /></span>
            <p className="mt-3 text-[13px] text-ink-50">No discount codes yet.</p>
            <div className="mt-4"><Button size="sm" icon="plus" onClick={() => setEditing(null)}>Create your first code</Button></div>
          </div>
        )}
      </div>

      <p className="flex items-center gap-2 text-[12px] text-ink-35">
        <Icon name="tag" size={13} /> The “On ₹2,000” column previews the discount for a sample cart. Codes apply on the cart subtotal at checkout.
      </p>

      {editing !== undefined && (
        <CouponForm
          key={editing?.id ?? 'new'}
          open
          coupon={editing}
          onClose={() => setEditing(undefined)}
          onSave={(c) => { saveCoupon(c); toast.success(coupons.some((x) => x.id === c.id) ? 'Code updated' : `${c.code} created`); }}
        />
      )}
    </div>
  );
}
