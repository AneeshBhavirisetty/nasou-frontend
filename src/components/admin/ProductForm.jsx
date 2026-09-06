import { useState } from 'react';
import Modal from '../Modal';
import ProductArt from '../ProductArt';
import Icon from '../Icon';
import { Button, Field } from '../ui';
import { categories } from '../../data/catalog';
import { discount as pctOff, money, cx } from '../../lib/format';

const ART_KINDS = ['elbow', 'tee', 'coupling', 'reducer', 'bush', 'adapter', 'bend', 'shoe', 'cap', 'union', 'valve', 'saddle', 'nipple', 'pipe'];
const MATERIALS = ['PVC', 'uPVC', 'cPVC'];

const blank = {
  name: '', sku: '', category: 'pvc-fittings', material: 'PVC', art: 'coupling',
  size: '', supplierName: 'Nasou', price: '', mrp: '', stock: '',
};

/* Add / edit a product. `product` = null for a new one. onSave gets a full
   product object ready for the AdminStore. */
export default function ProductForm({ open, product, onClose, onSave }) {
  const [f, setF] = useState(() => (product ? { ...blank, ...product, price: String(product.price ?? ''), mrp: String(product.mrp ?? ''), stock: String(product.stock ?? '') } : blank));
  const [err, setErr] = useState('');
  const isNew = !product;
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const price = Number(f.price) || 0;
  const mrp = Number(f.mrp) || 0;

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    if (!f.name.trim()) return setErr('Enter a product name.');
    if (!f.sku.trim()) return setErr('Enter a product code (SKU).');
    if (price <= 0) return setErr('Enter a selling price.');
    if (mrp && mrp < price) return setErr('MRP cannot be lower than the selling price.');

    const isPipe = /pipe/.test(f.category) || f.art === 'pipe';
    const isAcc = f.category === 'plumbing-accessories';
    const finalMrp = mrp || Math.round(price * 1.15);

    const saved = {
      id: product?.id || `NEW-${f.sku.trim().toUpperCase()}-${Date.now().toString(36)}`,
      sku: f.sku.trim().toUpperCase(),
      row: product?.row ?? 99999,
      name: f.name.trim(),
      title: f.size ? `${f.name.trim()} · ${f.size.trim()}` : f.name.trim(),
      variantLabel: [f.material, f.size].filter(Boolean).join(' · '),
      description: product?.description || `${f.material} ${f.name.trim().toLowerCase()}${f.size ? ` in ${f.size.trim()}` : ''}, from ${f.supplierName.trim() || 'Nasou'}.`,
      material: f.material,
      form: isPipe ? 'Pipes' : isAcc ? 'Accessories' : 'Fittings',
      kind: f.art,
      art: f.art,
      size: f.size.trim(),
      sizeRaw: f.size.trim(),
      supplier: (f.supplierName.trim() || 'nasou').toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      supplierName: f.supplierName.trim() || 'Nasou',
      supplierTier: product?.supplierTier || 'value',
      category: f.category,
      price: Math.round(price),
      mrp: Math.round(finalMrp),
      discount: pctOff(Math.round(price), Math.round(finalMrp)),
      stock: Math.max(0, Math.round(Number(f.stock) || 0)),
      rating: product?.rating ?? 4.2,
      reviewCount: product?.reviewCount ?? 0,
      badges: product?.badges ?? (isNew ? ['New'] : []),
    };
    onSave(saved);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title={isNew ? 'Add product' : `Edit · ${product.name}`} size="lg">
      <form onSubmit={submit} className="space-y-4">
        <div className="flex items-center gap-4 rounded-lg border border-line bg-canvas p-3">
          <span className="photo-bed grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-md">
            <ProductArt kind={f.art} material={f.material} className="h-full w-full p-1.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-bold">{f.name || 'New product'}</p>
            <p className="text-[12px] text-ink-50">
              {money(price)}{mrp > price ? ` · ${pctOff(price, mrp)}% off` : ''} · {f.stock || 0} in stock
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Product name" value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder="e.g. cPVC Elbow" required />
          <Field label="Product code (SKU)" value={f.sku} onChange={(e) => set('sku')(e.target.value.toUpperCase())} placeholder="e.g. PL009999" required />

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">Category</span>
            <select value={f.category} onChange={(e) => set('category')(e.target.value)} className="h-11 w-full rounded-md border border-line bg-white px-3 text-[14px] outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/15">
              {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">Material</span>
            <select value={f.material} onChange={(e) => set('material')(e.target.value)} className="h-11 w-full rounded-md border border-line bg-white px-3 text-[14px] outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/15">
              {MATERIALS.map((m) => <option key={m}>{m}</option>)}
            </select>
          </label>

          <Field label="Size" value={f.size} onChange={(e) => set('size')(e.target.value)} placeholder='e.g. 3/4″' />
          <Field label="Brand / supplier" value={f.supplierName} onChange={(e) => set('supplierName')(e.target.value)} placeholder="e.g. Astral" />

          <Field label="Selling price (₹)" type="text" inputMode="numeric" value={f.price} onChange={(e) => set('price')(e.target.value.replace(/[^\d]/g, ''))} placeholder="0" required />
          <Field label="MRP (₹)" type="text" inputMode="numeric" value={f.mrp} onChange={(e) => set('mrp')(e.target.value.replace(/[^\d]/g, ''))} placeholder="auto (+15%)" hint="Leave blank to set MRP 15% above price" />
          <Field label="Opening stock" type="text" inputMode="numeric" value={f.stock} onChange={(e) => set('stock')(e.target.value.replace(/[^\d]/g, ''))} placeholder="0" />

          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">Illustration</span>
            <select value={f.art} onChange={(e) => set('art')(e.target.value)} className="h-11 w-full rounded-md border border-line bg-white px-3 text-[14px] capitalize outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/15">
              {ART_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
          </label>
        </div>

        {err && <p role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{err}</p>}

        <div className="flex justify-end gap-3 border-t border-line pt-4">
          <button type="button" onClick={onClose} className="h-10 rounded-md border border-line px-5 text-[13.5px] font-semibold text-ink-70 transition hover:border-ink-35">Cancel</button>
          <Button type="submit" icon={isNew ? 'plus' : 'check'}>{isNew ? 'Add product' : 'Save changes'}</Button>
        </div>
      </form>
    </Modal>
  );
}
