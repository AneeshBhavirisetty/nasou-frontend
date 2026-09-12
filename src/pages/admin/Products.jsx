import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../../components/Icon';
import ProductArt from '../../components/ProductArt';
import ExcelExportButton from '../../components/ExcelExportButton';
import ProductForm from '../../components/admin/ProductForm';
import BulkImportDialog from '../../components/admin/BulkImportDialog';
import { AdminPageHead, SearchInput } from '../../components/admin/AdminUI';
import { Badge, Button } from '../../components/ui';
import { useToast } from '../../context/ToastContext';
import { useAdminStore } from '../../context/AdminStore';
import { catalogBase as CATALOG, categories, categoryName, suppliers } from '../../data/catalog';
import { money, cx } from '../../lib/format';

const PAGE = 20;

export default function AdminProducts() {
  const toast = useToast();
  const { products: rows, dirty, setStock, saveProduct, deleteProduct, reset } = useAdminStore();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [brand, setBrand] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, object = edit
  const [bulk, setBulk] = useState(false);
  const [params, setParams] = useSearchParams();

  /* /admin/products?new=1 (the dashboard's "Add product") opens the form. */
  useEffect(() => {
    if (params.get('new')) {
      setEditing(null);
      setParams({}, { replace: true });
    }
  }, [params, setParams]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((p) => {
      if (cat && p.category !== cat) return false;
      if (brand && p.supplier !== brand) return false;
      if (n && !`${p.name} ${p.sku} ${p.supplierName}`.toLowerCase().includes(n)) return false;
      return true;
    });
  }, [rows, q, cat, brand]);

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
      <AdminPageHead
        title="Products"
        note={<>
          {filtered.length.toLocaleString('en-IN')} of {rows.length.toLocaleString('en-IN')} SKUs
          {dirty && <span className="ml-2 text-emerald-600">· unsaved admin changes are stored locally</span>}
        </>}
      >
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
      </AdminPageHead>

      <div className="flex flex-wrap gap-3 rounded-[20px] border border-line bg-white/86 p-3 shadow-[0_18px_40px_rgba(37,88,73,0.08)]">
        <SearchInput placeholder="Search name, SKU or brand" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        <select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} aria-label="Category" className="h-12 rounded-[18px] border border-line bg-white px-4 text-[13px] font-semibold text-forest outline-none transition focus:border-forest/40">
          <option value="">All categories</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={brand} onChange={(e) => { setBrand(e.target.value); setPage(1); }} aria-label="Brand" className="h-12 rounded-[18px] border border-line bg-white px-4 text-[13px] font-semibold text-forest outline-none transition focus:border-forest/40">
          <option value="">All brands</option>
          {suppliers.map((s) => <option key={s.slug} value={s.slug}>{s.name}</option>)}
        </select>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-line bg-white/86 shadow-[0_18px_40px_rgba(37,88,73,0.08)]">
        <div className="hidden grid-cols-[1fr_92px_84px_132px_96px] gap-3 border-b border-line bg-canvas px-4 py-3 text-[13px] font-medium text-forest-800 sm:grid">
          <span>Product</span><span>Price</span><span>MRP</span><span>Stock</span><span className="text-right">Actions</span>
        </div>
        {shown.map((p, i) => {
          const isCustom = !CATALOG.some((c) => c.id === p.id);
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i, 12) * 0.02 }}
              className="grid grid-cols-2 items-center gap-x-3 gap-y-2.5 border-b border-line px-4 py-3 transition-colors last:border-0 hover:bg-canvas/40 sm:grid-cols-[1fr_92px_84px_132px_96px] sm:gap-3"
            >
              <div className="col-span-2 flex items-center gap-3 sm:col-span-1">
                <span className="photo-bed grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-md border border-line">
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
              <span className="tnum text-right text-[13px] text-ink-50 sm:text-left"><span className="sm:hidden">MRP </span>{money(p.mrp)}</span>
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
        {shown.length === 0 && (
          <div className="px-4 py-14 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sunk text-ink-35"><Icon name="search" size={20} /></span>
            <p className="mt-3 text-[13px] text-ink-50">No products match.</p>
          </div>
        )}
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
      <button onClick={() => nudge(-1)} className="grid h-9 w-9 shrink-0 place-items-center rounded border border-line text-ink-50 transition hover:text-ink sm:h-7 sm:w-7" aria-label="Decrease stock by 1">
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
          'tnum h-9 w-16 rounded border bg-white text-center text-[13px] font-bold outline-none transition focus:border-emerald focus:ring-2 focus:ring-emerald/15 sm:h-7',
          value === 0 && !editing ? 'border-clay/40 text-clay' : 'border-line'
        )}
      />
      <button onClick={() => nudge(1)} className="grid h-9 w-9 shrink-0 place-items-center rounded border border-line text-ink-50 transition hover:text-ink sm:h-7 sm:w-7" aria-label="Increase stock by 1">
        <Icon name="plus" size={12} />
      </button>
    </div>
  );
}
