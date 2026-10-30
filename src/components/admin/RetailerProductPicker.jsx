import { useMemo, useState } from 'react';
import Icon from '../Icon';
import { typeKey, typeLabel } from '../../data/catalog';
import { cx, money, itemCode } from '../../lib/format';

/* Which of one retailer's products a discount covers (client review, Oct
   2026): all of them, or the ones ticked here. `products` are that retailer's
   products; `value` is the chosen SKUs, [] meaning all. */
export default function RetailerProductPicker({ products, value, onChange }) {
  const [mode, setMode] = useState(value.length ? 'some' : 'all');
  const [q, setQ] = useState('');
  const [brand, setBrand] = useState('');
  const [kind, setKind] = useState('');
  const chosen = useMemo(() => new Set(value), [value]);
  const hits = useMemo(() => {
    const n = q.trim().toLowerCase();
    return products.filter((p) => (!brand || p.supplier === brand) && (!kind || typeKey(p.kind) === kind)
      && (!n || `${p.name} ${p.sku} ${p.itemCode || ''}`.toLowerCase().includes(n))).slice(0, 150);
  }, [products, q, brand, kind]);
  const brands = useMemo(() => [...new Map(products.map((p) => [p.supplier, p.supplierName || p.supplier])).entries()].sort((a, b) => a[1].localeCompare(b[1])), [products]);
  const kinds = useMemo(() => [...new Set(products.map((p) => typeKey(p.kind)).filter(Boolean))].sort(), [products]);

  const toggle = (sku) => onChange(chosen.has(sku) ? value.filter((s) => s !== sku) : [...value, sku]);
  const pickShown = () => onChange([...new Set([...value, ...hits.map((p) => p.sku)])]);
  const pick = (m) => {
    setMode(m);
    if (m === 'all') onChange([]);
  };

  return (
    <div className="space-y-2.5">
      <div className="flex gap-2 rounded-md bg-sunk p-1">
        {[['all', `All ${products.length.toLocaleString('en-IN')} products`], ['some', 'Choose products']].map(([k, label]) => (
          <button key={k} type="button" onClick={() => pick(k)} className={cx('flex-1 rounded-sm py-2 text-[12.5px] font-bold transition', mode === k ? 'bg-forest text-white shadow-btn' : 'text-forest-800 hover:text-forest')}>
            {label}
          </button>
        ))}
      </div>

      {mode === 'some' && (
        <div className="rounded-[14px] border border-line bg-white">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <Icon name="search" size={15} className="shrink-0 text-ink-35" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or SKU" aria-label="Search this retailer's products" className="h-8 min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
            <button type="button" onClick={pickShown} disabled={!hits.length} className="shrink-0 text-[12px] font-bold text-forest hover:underline disabled:opacity-40">Tick shown</button>
            {value.length > 0 && <button type="button" onClick={() => onChange([])} className="shrink-0 text-[12px] font-bold text-clay-600 hover:underline">Clear</button>}
          </div>
          <div className="grid grid-cols-2 gap-2 border-b border-line p-2">
            <select value={brand} onChange={(e) => setBrand(e.target.value)} aria-label="Brand" className="h-9 min-w-0 rounded-[10px] border border-line bg-white px-2 text-[12.5px] font-semibold text-ink outline-none">
              <option value="">All brands</option>
              {brands.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
            <select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Item type" className="h-9 min-w-0 rounded-[10px] border border-line bg-white px-2 text-[12.5px] font-semibold text-ink outline-none">
              <option value="">All item types</option>
              {kinds.map((k) => <option key={k} value={k}>{typeLabel(k)}</option>)}
            </select>
          </div>
          <ul className="thin-bar max-h-60 overflow-y-auto">
            {hits.map((p) => (
              <li key={p.sku}>
                <label className="flex cursor-pointer items-center gap-2.5 px-3 py-2 text-[13px] hover:bg-canvas/60">
                  <input type="checkbox" checked={chosen.has(p.sku)} onChange={() => toggle(p.sku)} className="h-4 w-4 shrink-0 accent-[#1f5c4a]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-ink">{p.name}</span>
                    <span className="font-mono text-[11px] text-ink-50">{itemCode(p)}</span>
                  </span>
                  <span className="tnum shrink-0 text-[12.5px] text-ink-70">{p.price > 0 ? money(p.price) : 'On request'}</span>
                </label>
              </li>
            ))}
            {!hits.length && <li className="px-3 py-6 text-center text-[12.5px] text-ink-50">{products.length ? 'No product matches.' : 'This retailer has no products yet.'}</li>}
          </ul>
          <p className="border-t border-line px-3 py-2 text-[12px] text-ink-50">
            <b className="text-ink">{value.length.toLocaleString('en-IN')}</b> chosen{hits.length === 150 && ' · showing the first 150 matches, search to find more'}
          </p>
        </div>
      )}
    </div>
  );
}
