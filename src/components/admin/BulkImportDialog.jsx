import { useState } from 'react';
import Modal from '../Modal';
import Icon from '../Icon';
import { Badge, Button } from '../ui';
import { useToast } from '../../context/ToastContext';
import { categories } from '../../data/catalog';
import { retailerForName, retailerIdForName } from '../../data/retailers';
import { downloadSheet } from '../../lib/exportSheet';
import { discount as pctOff, cx } from '../../lib/format';

/* ============================================================================
 * BulkImportDialog — add many products at once from a spreadsheet.
 *
 * .csv is parsed in-house; .xlsx is handled by lazily importing SheetJS (an
 * optional dependency) so the customer bundle never carries it. If that module
 * is unavailable the dialog says so and asks for a CSV instead.
 * ==========================================================================*/

const SCHEMA = [
  { key: 'sku', label: 'sku', required: true, hint: 'Unique product code' },
  { key: 'name', label: 'name', required: true, hint: 'Product name' },
  { key: 'category', label: 'category', required: true, hint: categories.map((c) => c.slug).join(' | ') },
  { key: 'material', label: 'material', required: true, hint: 'PVC | uPVC | cPVC' },
  { key: 'size', label: 'size', required: false, hint: 'e.g. 3/4 inch' },
  { key: 'brand', label: 'brand', required: false, hint: 'Supplier / brand name' },
  { key: 'price', label: 'price', required: true, hint: 'Selling price, number' },
  { key: 'mrp', label: 'mrp', required: false, hint: 'Blank = price + 15%' },
  { key: 'stock', label: 'stock', required: false, hint: 'Opening quantity' },
  { key: 'art', label: 'art', required: false, hint: 'elbow | tee | coupling | pipe | valve …' },
  { key: 'imageUrl', label: 'imageUrl', required: false, hint: 'Optional https:// image' },
];

const MATERIALS = { pvc: 'PVC', upvc: 'uPVC', cpvc: 'cPVC' };
const CAT_SLUGS = new Set(categories.map((c) => c.slug));

/* RFC-4180-ish CSV parser: quotes, escaped quotes, embedded newlines. */
function parseCsv(text) {
  const rows = [];
  let row = [], cell = '', q = false;
  const src = text.replace(/^﻿/, '');
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"') { if (src[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => String(v).trim() !== ''));
}

async function readSheet(file) {
  const isCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv';
  if (isCsv) return parseCsv(await file.text());

  let XLSX;
  try {
    XLSX = await import('xlsx');
  } catch {
    throw new Error('Excel parsing is unavailable in this build — please save the sheet as CSV and upload that.');
  }
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }).map((r) => r.map((v) => (v == null ? '' : String(v))));
}

function validate(raw, existingSkus) {
  const seen = new Set();
  return raw.map((r, i) => {
    const errors = [];
    const sku = String(r.sku || '').trim().toUpperCase();
    const name = String(r.name || '').trim();
    const category = String(r.category || '').trim();
    const material = MATERIALS[String(r.material || '').trim().toLowerCase()] || '';
    const brand = String(r.brand || '').trim();
    const retailer = retailerForName(brand);
    const price = Math.round(Number(String(r.price || '').replace(/[^\d.]/g, '')) || 0);
    const mrpRaw = Math.round(Number(String(r.mrp || '').replace(/[^\d.]/g, '')) || 0);
    const stock = Math.max(0, Math.round(Number(String(r.stock || '').replace(/\D/g, '')) || 0));

    if (!sku) errors.push('sku missing');
    else if (seen.has(sku)) errors.push('duplicate sku in file');
    else if (existingSkus.has(sku)) errors.push('sku already in catalogue');
    if (sku) seen.add(sku);
    if (!name) errors.push('name missing');
    if (!CAT_SLUGS.has(category)) errors.push('unknown category');
    if (!material) errors.push('material must be PVC / uPVC / cPVC');
    if (price <= 0) errors.push('price must be > 0');
    if (mrpRaw && mrpRaw < price) errors.push('mrp below price');

    const mrp = mrpRaw || Math.round(price * 1.15);
    const image = String(r.imageUrl || '').trim();

    return {
      line: i + 2, errors,
      product: {
        id: `BULK-${sku}-${Date.now().toString(36)}${i}`,
        sku, name,
        title: r.size ? `${name} · ${String(r.size).trim()}` : name,
        variantLabel: [material, String(r.size || '').trim()].filter(Boolean).join(' · '),
        description: `${material} ${name.toLowerCase()} imported in bulk.`,
        material,
        form: /pipe/.test(category) ? 'Pipes' : category === 'plumbing-accessories' ? 'Accessories' : 'Fittings',
        kind: String(r.art || 'coupling').trim().toLowerCase(),
        art: String(r.art || 'coupling').trim().toLowerCase(),
        size: String(r.size || '').trim(),
        sizeRaw: String(r.size || '').trim(),
        /* Schema-only: resolved from the brand, never entered by hand. */
        retailerId: retailer?.id || retailerIdForName(brand),
        supplier: retailer?.slug || (brand ? brand.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'nasou'),
        supplierName: retailer?.name || brand || 'Nasou',
        supplierTier: retailer?.tier || 'value',
        category, price, mrp,
        discount: pctOff(price, mrp),
        stock,
        images: image ? [image] : [],
        rating: 4.2, reviewCount: 0, badges: ['New'], row: 99999,
      },
    };
  });
}

export default function BulkImportDialog({ open, onClose, existingSkus = new Set(), onImport }) {
  const toast = useToast();
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState(null); // { rows, headerMissing }

  const reset = () => { setFile(null); setParsed(null); };

  const template = () => {
    downloadSheet(
      'nasou-product-import-template.csv',
      SCHEMA.map((c) => c.label),
      [
        ['PL900001', 'cPVC Elbow', 'cpvc-fittings', 'cPVC', '3/4 inch', 'Astral', '92', '120', '250', 'elbow', ''],
        ['PL900002', 'PVC Ball Valve', 'plumbing-accessories', 'PVC', '1 inch', 'Star', '340', '430', '60', 'valve', ''],
      ]
    );
    toast.success('Template downloaded — fill it in and upload');
  };

  const take = async (f) => {
    if (!f) return;
    if (!/\.(csv|xlsx|xls)$/i.test(f.name)) return toast.error('Upload a .csv or .xlsx file.');
    setFile(f); setBusy(true); setParsed(null);
    try {
      const grid = await readSheet(f);
      if (grid.length < 2) throw new Error('That sheet has no data rows.');
      const header = grid[0].map((h) => String(h).trim().toLowerCase().replace(/\s+/g, ''));
      const idx = {};
      SCHEMA.forEach((c) => { idx[c.key] = header.indexOf(c.label.toLowerCase()); });
      const missing = SCHEMA.filter((c) => c.required && idx[c.key] === -1).map((c) => c.label);
      if (missing.length) throw new Error(`Missing required column(s): ${missing.join(', ')}`);

      const objects = grid.slice(1).map((r) => {
        const o = {};
        SCHEMA.forEach((c) => { o[c.key] = idx[c.key] === -1 ? '' : r[idx[c.key]] ?? ''; });
        return o;
      });
      setParsed({ rows: validate(objects, existingSkus) });
    } catch (e) {
      toast.error(e.message);
      reset();
    } finally {
      setBusy(false);
    }
  };

  const ok = parsed?.rows.filter((r) => r.errors.length === 0) ?? [];
  const bad = parsed?.rows.filter((r) => r.errors.length > 0) ?? [];

  const run = () => {
    onImport(ok.map((r) => r.product));
    toast.success(`${ok.length} product${ok.length === 1 ? '' : 's'} imported`);
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Bulk import products" size="lg">
      {!parsed ? (
        <div className="space-y-4">
          <label
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); take(e.dataTransfer.files?.[0]); }}
            className={cx(
              'flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-6 py-10 text-center transition',
              drag ? 'border-emerald bg-emerald-50/50' : 'border-line hover:border-ink-35'
            )}
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
              <Icon name={busy ? 'spinner' : 'upload'} size={22} className={busy ? 'animate-spin' : ''} />
            </span>
            <p className="mt-3 text-[14px] font-bold">{busy ? 'Reading…' : file ? file.name : 'Drop your product sheet here'}</p>
            <p className="mt-1 text-[12px] text-ink-50">.xlsx or .csv · first row must be the column headers</p>
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { take(e.target.files?.[0]); e.target.value = ''; }} />
          </label>

          <div className="rounded-lg border border-line bg-canvas p-4">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12.5px] font-bold uppercase tracking-wider text-ink-35">Expected columns</p>
              <Button size="sm" variant="outline" icon="external" onClick={template}>Download template</Button>
            </div>
            <div className="grid gap-x-4 gap-y-1.5 sm:grid-cols-2">
              {SCHEMA.map((c) => (
                <p key={c.key} className="flex min-w-0 items-baseline gap-2 text-[12px]">
                  <span className="shrink-0 font-mono font-bold text-ink-70">{c.label}</span>
                  {c.required && <span className="shrink-0 text-clay">*</span>}
                  <span className="min-w-0 flex-1 break-words text-ink-35">{c.hint}</span>
                </p>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone="ok">{ok.length} ready</Badge>
            {bad.length > 0 && <Badge tone="clay">{bad.length} with problems</Badge>}
            <span className="text-[12px] text-ink-35">{file?.name}</span>
            <button onClick={reset} className="ml-auto text-[12.5px] font-semibold text-emerald-600">Choose another file</button>
          </div>

          <div className="max-h-[42dvh] overflow-y-auto rounded-lg border border-line">
            {parsed.rows.map((r) => (
              <div
                key={r.line}
                className={cx(
                  'flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-line px-3 py-2 last:border-0',
                  r.errors.length && 'bg-clay-50/60'
                )}
              >
                <span className="tnum w-8 shrink-0 text-[11px] text-ink-35">#{r.line}</span>
                <span className="font-mono text-[12px] font-bold">{r.product.sku || '—'}</span>
                <span className="min-w-0 flex-1 truncate text-[13px]">{r.product.name || '—'}</span>
                <span className="text-[11.5px] text-ink-35">{r.product.supplierName || '—'}</span>
                <span className="tnum text-[12.5px] font-semibold">₹{r.product.price || 0}</span>
                {r.errors.length === 0
                  ? <Icon name="check" size={14} className="text-emerald-600" />
                  : <span className="w-full text-[11.5px] font-medium text-clay-600 sm:w-auto">{r.errors.join(' · ')}</span>}
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 border-t border-line pt-4">
            <button onClick={onClose} className="h-10 rounded-md border border-line px-5 text-[13.5px] font-semibold text-ink-70 transition hover:border-ink-35">Cancel</button>
            <Button onClick={run} disabled={ok.length === 0} icon="plus">
              Import {ok.length} product{ok.length === 1 ? '' : 's'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
