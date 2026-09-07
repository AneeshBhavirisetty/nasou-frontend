import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon';
import ProductArt from '../../components/ProductArt';
import ExcelExportButton from '../../components/ExcelExportButton';
import ProductForm from '../../components/admin/ProductForm';
import BulkImportDialog from '../../components/admin/BulkImportDialog';
import { Badge, Button, Field } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAdminStore } from '../../context/AdminStore';
import { catalogBase as CATALOG, categories, categoryName } from '../../data/catalog';
import { baseRetailers } from '../../data/retailers';
import { money, cx } from '../../lib/format';

const PAGE = 20;

export default function AdminProducts() {
  const toast = useToast();
  const { products: rows, retailers: extraRetailers, dirty, setStock, saveProduct, deleteProduct, reset } = useAdminStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const [bulk, setBulk] = useState(false);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (n && !`${p.name} ${p.sku} ${p.supplierName}`.toLowerCase().includes(n)) return false;
      return true;
    });
  }, [rows, q, cat]);

  const shown = filtered.slice(0, page * PAGE);

  const onSave = (prod) => {
    const isNew = !rows.some((p) => p.id === prod.id);
    saveProduct(prod);
    toast.success(isNew ? `${prod.name} added` : `${prod.name} updated`);
  };
  const onBulk = (list) => list.forEach(saveProduct);
  const onDelete = (p) => {
    if (!window.confirm(`Delist "${p.name}"?`)) return;
    deleteProduct(p.id);
    toast.success('Product delisted');
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="display-serif text-[clamp(1.5rem,4vw,2rem)]">Products</h1>
          <p className="text-[13px] text-ink-50">
            {filtered.length.toLocaleString('en-IN')} of {rows.length.toLocaleString('en-IN')} SKUs
            {dirty && <span className="ml-2 text-emerald-600">· unsaved admin changes are stored locally</span>}
          </p>
        </div>
        <div className="flex gap-2">
          {dirty && (
            <Button size="sm" variant="ghost" icon="refresh" onClick={() => { if (window.confirm('Discard all admin changes and restore the shipped catalogue?')) { reset(); toast.info('Catalogue restored'); } }}>
              Reset
            </Button>
          )}
          <Button size="sm" variant="outline" icon="upload" onClick={() => setBulk(true)}>Bulk import</Button>
          <Button size="sm" icon="plus" onClick={() => setEditing(null)}>Add product</Button>
          <ExcelExportButton
            filename="nasou-products"
            label="Export"
            headers={['SKU', 'Name', 'Category', 'Material', 'Size', 'Brand', 'Price', 'MRP', 'Discount %', 'Stock']}
            rows={filtered.map((p) => [p.sku, p.name, categoryName(p.category), p.material, p.size, p.supplierName, p.price, p.mrp, p.discount, p.stock])}
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-3 rounded-lg border border-line bg-white p-3">
        <div className="min-w-[200px] flex-1">
          <Field placeholder="Search name, SKU or brand" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} className="h-11 rounded-md border border-line bg-white px-3 text-[13px] font-semibold outline-none">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-lg border border-line bg-white">
        <div className="hidden grid-cols-[1fr_92px_84px_132px_96px] gap-3 border-b border-line bg-canvas px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-35 sm:grid">
          <span>Product</span><span>Price</span><span>MRP</span><span>Stock</span><span className="text-right">Actions</span>
        </div>
        {shown.map((p, i) => {
          const isCustom = !CATALOG.some((c) => c.id === p.id);
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.02 }}
              className="grid grid-cols-1 gap-2 border-b border-line px-4 py-3 last:border-0 sm:grid-cols-[1fr_92px_84px_132px_96px] sm:items-center sm:gap-3"
            >
              <div className="flex items-center gap-3">
                <span className="photo-bed grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-md">
                  {p.images?.[0]
                    ? <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                    : <ProductArt kind={p.art} material={p.material} className="h-full w-full p-1" />}
                </span>
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 truncate text-[13px] font-bold">
                    {p.name}
                    {isCustom && <Badge tone="ok">Added</Badge>}
                  </p>
                  <p className="text-[11px] text-ink-50">{p.sku} · {categoryName(p.category)}</p>
                </div>
              </div>
              <span className="tnum text-[13px] font-semibold">{money(p.price)}</span>
              <span className="tnum text-[13px] text-ink-50">{money(p.mrp)}</span>
              <StockCell value={p.stock} onChange={(n) => setStock(p.id, n)} />
              <div className="flex justify-end gap-1.5">
                <button onClick={() => setEditing(p)} className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-50 transition hover:border-ink-35 hover:text-ink" aria-label={`Edit ${p.name}`}>
                  <Icon name="wrench" size={14} />
                </button>
                <button onClick={() => onDelete(p)} className="grid h-8 w-8 place-items-center rounded-md border border-line text-ink-50 transition hover:border-clay/40 hover:text-clay" aria-label={`Delete ${p.name}`}>
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </motion.div>
          );
        })}
        {shown.length === 0 && <p className="px-4 py-10 text-center text-[13px] text-ink-50">No products match.</p>}
      </div>

      {shown.length < filtered.length && (
        <div className="text-center">
          <Button variant="outline" onClick={() => setPage((p) => p + 1)}>Load more</Button>
        </div>
      )}

      <BulkImportDialog
        open={bulk}
        onClose={() => setBulk(false)}
        existingSkus={new Set(rows.map((p) => p.sku))}
        onImport={onBulk}
      />

      {editing !== undefined && (
        <ProductForm
          key={editing?.id ?? 'new'}
          open
          product={editing}
          retailers={[...extraRetailers, ...baseRetailers]}
          onClose={() => setEditing(undefined)}
          onSave={onSave}
        />
      )}
    </div>
  );
}

/* Editable stock cell — type the new quantity directly (Enter / blur to commit),
   or ± / arrow keys for single-unit nudges (Shift+Arrow = ±10). */
function StockCell({ value, onChange }) {
  const [draft, setDraft] = useState(null);
  const editing = draft !== null;
  const nudge = (d) => onChange(Math.max(0, value + d));

  const commit = (raw) => {
    const n = parseInt(String(raw ?? '').replace(/\D/g, ''), 10);
    if (!Number.isNaN(n) && n !== value) onChange(Math.max(0, n));
    setDraft(null);
  };

  return (
    <div className="flex items-center gap-1">
      <button onClick={() => nudge(-1)} className="grid h-7 w-7 shrink-0 place-items-center rounded border border-line text-ink-50 hover:text-ink" aria-label="Decrease stock by 1">
        <Icon name="minus" size={12} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label="Stock quantity"
        value={editing ? draft : String(value)}
        onChange={(e) => setDraft(e.target.value.replace(/\D/g, ''))}
        onFocus={(e) => { setDraft(String(value)); e.target.select(); }}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { commit(e.currentTarget.value); e.currentTarget.blur(); }
          if (e.key === 'Escape') { setDraft(null); e.currentTarget.blur(); }
          if (e.key === 'ArrowUp') { e.preventDefault(); nudge(e.shiftKey ? 10 : 1); }
          if (e.key === 'ArrowDown') { e.preventDefault(); nudge(e.shiftKey ? -10 : -1); }
        }}
        className={cx(
          'tnum h-7 w-16 rounded border bg-white text-center text-[13px] font-bold outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/15',
          value === 0 && !editing ? 'border-clay/40 text-clay' : 'border-line'
        )}
      />
      <button onClick={() => nudge(1)} className="grid h-7 w-7 shrink-0 place-items-center rounded border border-line text-ink-50 hover:text-ink" aria-label="Increase stock by 1">
        <Icon name="plus" size={12} />
      </button>
    </div>
  );
}
