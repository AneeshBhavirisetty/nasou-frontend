import { useState } from 'react';
import Modal from '../Modal';
import ProductArt from '../ProductArt';
import Icon from '../Icon';
import MediaPicker from './MediaPicker';
import { Badge, Button, Field } from '../ui';
import { categories } from '../../data/catalog';
import { baseRetailers } from '../../data/retailers';
import { MAX_IMAGES_PER_PRODUCT, MIN_IMAGES_PER_PRODUCT } from '../../lib/mediaStore';
import { discount as pctOff, money, cx } from '../../lib/format';

const ART_KINDS = ['elbow', 'tee', 'coupling', 'reducer', 'bush', 'adapter', 'bend', 'shoe', 'cap', 'union', 'valve', 'saddle', 'nipple', 'pipe'];
const MATERIALS = ['PVC', 'uPVC', 'cPVC'];

const blank = {
  name: '', sku: '', category: 'pvc-fittings', material: 'PVC', art: 'coupling',
  size: '', retailerId: baseRetailers[0]?.id || '', price: '', mrp: '', stock: '', images: [],
};

export default function ProductForm({ open, product, onClose, onSave, retailers = baseRetailers }) {
  const [f, setF] = useState(() =>
    product
      ? {
          ...blank, ...product,
          price: String(product.price ?? ''), mrp: String(product.mrp ?? ''), stock: String(product.stock ?? ''),
          images: product.images ?? [],
          retailerId: product.retailerId || blank.retailerId,
        }
      : blank
  );
  const [err, setErr] = useState('');
  const [picking, setPicking] = useState(false);
  const isNew = !product;
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  const price = Number(f.price) || 0;
  const mrp = Number(f.mrp) || 0;
  const retailer = retailers.find((r) => r.id === f.retailerId) || retailers[0];

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    if (!f.name.trim()) return setErr('Enter a product name.');
    if (!f.sku.trim()) return setErr('Enter a product code (SKU).');
    if (price <= 0) return setErr('Enter a selling price.');
    if (mrp && mrp < price) return setErr('MRP cannot be lower than the selling price.');
    /* Mandatory on new products; legacy catalogue rows without images stay editable
       (they fall back to the generated illustration). */
    if (isNew && f.images.length < MIN_IMAGES_PER_PRODUCT) return setErr(`Attach at least ${MIN_IMAGES_PER_PRODUCT} product image.`);
    if (!f.retailerId) return setErr('Pick the retailer this product belongs to.');

    const isPipe = /pipe/.test(f.category) || f.art === 'pipe';
    const isAcc = f.category === 'plumbing-accessories';
    const finalMrp = mrp || Math.round(price * 1.15);

    onSave({
      id: product?.id || `NEW-${f.sku.trim().toUpperCase()}-${Date.now().toString(36)}`,
      sku: f.sku.trim().toUpperCase(),
      row: product?.row ?? 99999,
      name: f.name.trim(),
      title: f.size ? `${f.name.trim()} · ${f.size.trim()}` : f.name.trim(),
      variantLabel: [f.material, f.size].filter(Boolean).join(' · '),
      description: product?.description || `${f.material} ${f.name.trim().toLowerCase()}${f.size ? ` in ${f.size.trim()}` : ''}, from ${retailer?.name || 'Nasou'}.`,
      material: f.material,
      form: isPipe ? 'Pipes' : isAcc ? 'Accessories' : 'Fittings',
      kind: f.art,
      art: f.art,
      size: f.size.trim(),
      sizeRaw: f.size.trim(),
      retailerId: f.retailerId,
      supplier: retailer?.slug || 'nasou',
      supplierName: retailer?.name || 'Nasou',
      supplierTier: retailer?.tier || 'value',
      category: f.category,
      price: Math.round(price),
      mrp: Math.round(finalMrp),
      discount: pctOff(Math.round(price), Math.round(finalMrp)),
      stock: Math.max(0, Math.round(Number(f.stock) || 0)),
      images: f.images,
      rating: product?.rating ?? 4.2,
      reviewCount: product?.reviewCount ?? 0,
      badges: product?.badges ?? (isNew ? ['New'] : []),
    });
    onClose();
  };

  const cover = f.images[0];

  return (
    <>
      <Modal open={open} onClose={onClose} title={isNew ? 'Add product' : `Edit · ${product.name}`} size="lg">
        <form onSubmit={submit} className="space-y-4">
          {/* preview */}
          <div className="flex items-center gap-4 rounded-lg border border-line bg-canvas p-3">
            <span className="photo-bed grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-md">
              {cover
                ? <img src={cover} alt="" className="h-full w-full object-cover" />
                : <ProductArt kind={f.art} material={f.material} className="h-full w-full p-1.5" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-bold">{f.name || 'New product'}</p>
              <p className="text-[12px] text-ink-50">
                {money(price)}{mrp > price ? ` · ${pctOff(price, mrp)}% off` : ''} · {f.stock || 0} in stock
              </p>
              {f.retailerId && <p className="mt-0.5 font-mono text-[11px] text-ink-35">{f.retailerId} · {retailer?.name}</p>}
            </div>
          </div>

          {/* images */}
          <div className="rounded-lg border border-line p-3">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
              <span className="text-[12.5px] font-bold uppercase tracking-wider text-ink-35">
                Images {isNew && <span className="text-clay">*</span>}
              </span>
              <span className="text-[11.5px] text-ink-35">
                {f.images.length}/{MAX_IMAGES_PER_PRODUCT}{isNew ? ` · min ${MIN_IMAGES_PER_PRODUCT}` : ''}, first is the cover
              </span>
            </div>
            <div className="flex flex-wrap gap-2.5">
              {f.images.map((url, i) => (
                <div key={url} className="group relative">
                  <span className="photo-bed block h-20 w-20 overflow-hidden rounded-md border border-line">
                    <img src={url} alt={`Product image ${i + 1}`} className="h-full w-full object-cover" />
                  </span>
                  {i === 0 && <Badge tone="dark" className="absolute -top-1.5 left-1/2 -translate-x-1/2 !px-1.5 !py-0 !text-[9px]">Cover</Badge>}
                  <button
                    type="button"
                    onClick={() => set('images')(f.images.filter((u) => u !== url))}
                    aria-label={`Remove image ${i + 1}`}
                    className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-line bg-white text-ink-35 shadow-card transition hover:text-clay"
                  >
                    <Icon name="close" size={10} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
              {f.images.length < MAX_IMAGES_PER_PRODUCT && (
                <button
                  type="button"
                  onClick={() => setPicking(true)}
                  className="grid h-20 w-20 place-items-center rounded-md border-2 border-dashed border-line text-ink-35 transition hover:border-emerald hover:text-emerald-600"
                >
                  <span className="text-center">
                    <Icon name="image" size={18} className="mx-auto" />
                    <span className="mt-0.5 block text-[10.5px] font-semibold">Add</span>
                  </span>
                </button>
              )}
            </div>
            <button type="button" onClick={() => setPicking(true)} className="mt-2.5 inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-600">
              <Icon name="upload" size={12} /> Upload or pick from storage
            </button>
          </div>

          {/* fields */}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Product name" value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder="e.g. cPVC Elbow" required />
            <Field label="Product code (SKU)" value={f.sku} onChange={(e) => set('sku')(e.target.value.toUpperCase())} placeholder="e.g. PL009999" required />

            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">
                Retailer <span className="font-mono text-[11px] text-ink-35">({f.retailerId || 'unassigned'})</span>
              </span>
              <select value={f.retailerId} onChange={(e) => set('retailerId')(e.target.value)} className="h-11 w-full rounded-md border border-line bg-white px-3 text-[14px] outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/15">
                {retailers.map((r) => <option key={r.id} value={r.id}>{r.id} — {r.name}</option>)}
              </select>
            </label>

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

            <Field label="Size" value={f.size} onChange={(e) => set('size')(e.target.value)} placeholder="e.g. 3/4 inch" />

            <label className="block">
              <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">Fallback illustration</span>
              <select value={f.art} onChange={(e) => set('art')(e.target.value)} className="h-11 w-full rounded-md border border-line bg-white px-3 text-[14px] capitalize outline-none focus:border-emerald focus:ring-2 focus:ring-emerald/15">
                {ART_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </label>

            <Field label="Selling price (₹)" inputMode="numeric" value={f.price} onChange={(e) => set('price')(e.target.value.replace(/\D/g, ''))} placeholder="0" required />
            <Field label="MRP (₹)" inputMode="numeric" value={f.mrp} onChange={(e) => set('mrp')(e.target.value.replace(/\D/g, ''))} placeholder="auto (+15%)" hint="Blank = 15% above price" />
            <Field label="Opening stock" inputMode="numeric" value={f.stock} onChange={(e) => set('stock')(e.target.value.replace(/\D/g, ''))} placeholder="0" />
          </div>

          {err && <p role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{err}</p>}

          <div className="flex justify-end gap-3 border-t border-line pt-4">
            <button type="button" onClick={onClose} className="h-10 rounded-md border border-line px-5 text-[13.5px] font-semibold text-ink-70 transition hover:border-ink-35">Cancel</button>
            <Button type="submit" icon={isNew ? 'plus' : 'check'}>{isNew ? 'Add product' : 'Save changes'}</Button>
          </div>
        </form>
      </Modal>

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        selected={f.images}
        onDone={(urls) => set('images')(urls)}
      />
    </>
  );
}
