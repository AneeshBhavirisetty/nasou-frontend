import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon';
import Modal from '../../components/Modal';
import ExcelExportButton from '../../components/ExcelExportButton';
import { Badge, Button, Field } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAdminStore } from '../../context/AdminStore';
import { baseRetailers, nextRetailerId, slugifyRetailer } from '../../data/retailers';
import { money, cx } from '../../lib/format';

const TIERS = ['premium', 'mid', 'value'];
const TIER_TONE = { premium: 'dark', mid: 'slate', value: 'neutral' };

function RetailerForm({ open, onClose, onSave, nextId }) {
  const [f, setF] = useState({ name: '', tier: 'value', contact: '', phone: '' });
  const [err, setErr] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const submit = (e) => {
    e.preventDefault();
    if (!f.name.trim()) return setErr('Enter the retailer / brand name.');
    onSave({
      id: nextId,
      slug: slugifyRetailer(f.name),
      name: f.name.trim(),
      tier: f.tier,
      contact: f.contact.trim(),
      phone: f.phone.trim(),
      productCount: 0,
      status: 'Active',
      onboardedAt: Date.now(),
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Onboard a retailer" size="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3.5 py-3">
          <Icon name="store" size={18} className="shrink-0 text-emerald-600" />
          <p className="text-[13px] text-emerald-700">
            New retailer id <span className="font-mono font-bold">{nextId}</span> will be minted and mapped
            to every product this retailer supplies.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Retailer / brand name" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Prince Pipes" required />
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">Tier</span>
            <select value={f.tier} onChange={(e) => set('tier', e.target.value)} className="h-11 w-full rounded-md border border-line bg-white px-3 text-[14px] capitalize outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/15">
              {TIERS.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <Field label="Contact person" value={f.contact} onChange={(e) => set('contact', e.target.value)} placeholder="Optional" />
          <Field label="Phone" inputMode="numeric" maxLength={10} value={f.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10-digit" />
        </div>
        {err && <p role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{err}</p>}
        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-line px-5 text-[13.5px] font-semibold text-ink-70 transition hover:border-ink-35">Cancel</button>
          <Button type="submit" icon="plus">Create {nextId}</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function AdminRetailers() {
  const toast = useToast();
  const { products, retailers: extra, saveRetailer } = useAdminStore();
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);

  const all = useMemo(() => [...extra, ...baseRetailers], [extra]);

  /* Live counts and catalogue value, straight off the products that carry each id. */
  const rows = useMemo(() => {
    const byId = new Map();
    products.forEach((p) => {
      const k = p.retailerId || 'RTL-0000';
      const e = byId.get(k) || { count: 0, value: 0, outOfStock: 0 };
      e.count += 1;
      e.value += p.price * p.stock;
      if (p.stock === 0) e.outOfStock += 1;
      byId.set(k, e);
    });
    const needle = q.trim().toLowerCase();
    return all
      .map((r) => ({ ...r, ...(byId.get(r.id) || { count: 0, value: 0, outOfStock: 0 }) }))
      .filter((r) => !needle || `${r.id} ${r.name}`.toLowerCase().includes(needle))
      .sort((a, b) => b.count - a.count);
  }, [all, products, q]);

  const nextId = nextRetailerId(all);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display-serif text-[clamp(1.5rem,4vw,2rem)]">Retailers</h1>
          <p className="text-[13px] text-ink-50">
            {rows.length} retailers · every product carries a <span className="font-mono">retailerId</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" icon="plus" onClick={() => setAdding(true)}>Onboard retailer</Button>
          <ExcelExportButton
            filename="nasou-retailers"
            label="Export"
            headers={['Retailer ID', 'Name', 'Slug', 'Tier', 'Products', 'Out of stock', 'Stock value', 'Status']}
            rows={rows.map((r) => [r.id, r.name, r.slug, r.tier, r.count, r.outOfStock, r.value, r.status])}
          />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white p-3">
        <Field placeholder="Search retailer id or name" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="hidden grid-cols-[110px_1fr_90px_90px_120px_100px] gap-3 border-b border-line bg-canvas px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-35 lg:grid">
          <span>Retailer ID</span><span>Name</span><span>Tier</span><span>Products</span><span>Stock value</span><span className="text-right">Catalogue</span>
        </div>
        {rows.map((r, i) => (
          <motion.div
            key={r.id}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 14) * 0.02 }}
            className="grid grid-cols-1 gap-2 border-b border-line px-4 py-3 last:border-0 lg:grid-cols-[110px_1fr_90px_90px_120px_100px] lg:items-center lg:gap-3"
          >
            <span className="font-mono text-[12.5px] font-bold">{r.id}</span>
            <span className="flex items-center gap-2 text-[13px] font-semibold capitalize">
              {r.name}
              {r.onboardedAt && <Badge tone="ok">New</Badge>}
            </span>
            <span><Badge tone={TIER_TONE[r.tier] || 'neutral'}>{r.tier}</Badge></span>
            <span className="tnum text-[13px]">
              {r.count.toLocaleString('en-IN')}
              {r.outOfStock > 0 && <span className="ml-1 text-[11px] text-clay">({r.outOfStock} out)</span>}
            </span>
            <span className="tnum text-[13px] font-semibold">{money(r.value)}</span>
            <span className="lg:text-right">
              <Link
                to={`/shop?q=${encodeURIComponent(r.name)}`}
                className={cx('inline-flex items-center gap-1 rounded-md border border-line px-2.5 py-1.5 text-[12px] font-semibold text-ink-70 transition hover:border-ink-35 hover:text-ink', r.count === 0 && 'pointer-events-none opacity-40')}
              >
                <Icon name="store" size={13} /> View
              </Link>
            </span>
          </motion.div>
        ))}
        {rows.length === 0 && <p className="px-4 py-10 text-center text-[13px] text-ink-50">No retailers match.</p>}
      </div>

      <p className="flex items-center gap-2 text-[12px] text-ink-35">
        <Icon name="store" size={13} /> Next id to be issued: <span className="font-mono font-bold text-ink-50">{nextId}</span>
      </p>

      <RetailerForm
        key={nextId}
        open={adding}
        nextId={nextId}
        onClose={() => setAdding(false)}
        onSave={(r) => { saveRetailer(r); toast.success(`${r.name} onboarded as ${r.id}`); }}
      />
    </div>
  );
}
