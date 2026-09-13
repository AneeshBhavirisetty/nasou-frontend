import { useMemo, useState } from 'react';
import Modal from '../Modal';
import ProductArt from '../ProductArt';
import Icon from '../Icon';
import MediaPicker from './MediaPicker';
import { Badge, Button, Field } from '../ui';
import { categoryName } from '../../data/catalog';
import { DEPARTMENTS, DEFAULT_DEPARTMENT, slugifyCategory } from '../../data/departments';
import { useAdminStore } from '../../context/AdminStore';
import { retailerForName, retailerIdForName } from '../../data/retailers';
import { MAX_IMAGES_PER_PRODUCT, MIN_IMAGES_PER_PRODUCT } from '../../lib/mediaStore';
import { discount as pctOff, money, cx } from '../../lib/format';

const ART_KINDS = ['elbow', 'tee', 'coupling', 'reducer', 'bush', 'adapter', 'bend', 'shoe', 'cap', 'union', 'valve', 'saddle', 'nipple', 'pipe'];
const MATERIALS = ['PVC', 'uPVC', 'cPVC', 'Other'];

const blank = {
  name: '', sku: '', department: DEFAULT_DEPARTMENT, subName: 'PVC fittings', material: 'PVC', art: 'coupling',
  size: '', supplierName: '', price: '', mrp: '', stock: '', images: [],
};

const SELECT = 'h-12 w-full rounded-md border border-line bg-white/80 px-4 text-[14px] text-ink outline-none transition focus:border-forest focus:shadow-[0_0_0_2px_rgba(31,92,74,0.18)] disabled:cursor-not-allowed disabled:bg-sunk/60 disabled:text-ink-50';
const LABEL = 'mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-forest-800';

function Locked() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sunk px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-ink-50">
      <Icon name="lock" size={10} /> Locked
    </span>
  );
}

/* Product code (SKU) and category (department) are fixed once a product
   exists (client review 2, admin item 2); the sub-category stays editable
   and a new one can be typed in to create it. */
export default function ProductForm({ open, product, onClose, onSave }) {
  const { products: all } = useAdminStore();
  const [f, setF] = useState(() =>
    product
      ? {
          ...blank, ...product,
          department: product.department || DEFAULT_DEPARTMENT,
          subName: product.subcategoryName || categoryName(product.category),
          price: String(product.price ?? ''), mrp: String(product.mrp ?? ''), stock: String(product.stock ?? ''),
          images: product.images ?? [],
          supplierName: product.supplierName || '',
        }
      : blank
  );
  const [err, setErr] = useState('');
  const [picking, setPicking] = useState(false);
  const isNew = !product;
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));

  /* sub-categories already used in the chosen department (live from the admin store) */
  const subs = useMemo(() => {
    const m = new Map();
    all.forEach((p) => {
      if ((p.department || DEFAULT_DEPARTMENT) !== f.department) return;
      const name = p.subcategoryName || categoryName(p.category);
      if (!m.has(name.toLowerCase())) m.set(name.toLowerCase(), { slug: p.category, name });
    });
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [all, f.department]);

  const price = Number(f.price) || 0;
  const mrp = Number(f.mrp) || 0;
  /* Retailer is schema-only — resolved from the brand name, never picked in the UI.
     Unknown brands stay unassigned for the backend to mint an id on onboarding. */
  const brand = f.supplierName.trim();
  const retailer = retailerForName(brand);

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    if (!f.name.trim()) return setErr('Enter a product name.');
    if (!f.sku.trim()) return setErr('Enter a product code (SKU).');
    if (isNew && all.some((p) => p.sku === f.sku.trim().toUpperCase())) return setErr('That product code (SKU) is already in the catalogue.');
    if (!f.subName.trim()) return setErr('Choose or type a sub-category.');
    if (price <= 0) return setErr('Enter a selling price.');
    if (mrp && mrp < price) return setErr('MRP cannot be lower than the selling price.');
    /* Mandatory on new products; legacy catalogue rows without images stay editable
       (they fall back to the generated illustration). */
    if (isNew && f.images.length < MIN_IMAGES_PER_PRODUCT) return setErr(`Attach at least ${MIN_IMAGES_PER_PRODUCT} product image.`);

    /* existing sub-category (case-insensitive) or a new slug; a slug taken by
       another department is prefixed so the two never merge */
    const subName = f.subName.trim();
    const known = subs.find((s) => s.name.toLowerCase() === subName.toLowerCase());
    let category = known?.slug || slugifyCategory(subName);
    if (!known && all.some((p) => p.category === category && (p.department || DEFAULT_DEPARTMENT) !== f.department)) {
      category = `${f.department}-${category}`;
    }
    const isPipe = /pipe/.test(category) || f.art === 'pipe';
    const isAcc = category === 'plumbing-accessories';
    const finalMrp = mrp || Math.round(price * 1.15);

    onSave({
      id: product?.id || `NEW-${f.sku.trim().toUpperCase()}-${Date.now().toString(36)}`,
      sku: f.sku.trim().toUpperCase(),
      row: product?.row ?? 99999,
      name: f.name.trim(),
      title: f.size ? `${f.name.trim()} · ${f.size.trim()}` : f.name.trim(),
      variantLabel: [f.material, f.size].filter(Boolean).join(' · '),
      description: product?.description || `${f.material} ${f.name.trim().toLowerCase()}${f.size ? ` in ${f.size.trim()}` : ''}, from ${brand || 'Nasou'}.`,
      material: f.material,
      form: isPipe ? 'Pipes' : isAcc ? 'Accessories' : 'Fittings',
      kind: f.art,
      art: f.art,
      size: f.size.trim(),
      sizeRaw: f.size.trim(),
      retailerId: retailer?.id || product?.retailerId || retailerIdForName(brand),
      supplier: retailer?.slug || (brand ? brand.toLowerCase().replace(/[^a-z0-9]+/g, '-') : 'nasou'),
      supplierName: brand || 'Nasou',
      supplierTier: retailer?.tier || product?.supplierTier || 'value',
      department: product?.department || f.department,
      category,
      subcategoryName: known?.name || subName,
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
              {brand && <p className="mt-0.5 text-[11px] text-ink-35">{brand}</p>}
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
            <div>
              <Field
                label={<>Product code (SKU) {!isNew && <Locked />}</>}
                value={f.sku}
                onChange={(e) => set('sku')(e.target.value.toUpperCase())}
                placeholder="e.g. PL009999"
                disabled={!isNew}
                required
              />
              {!isNew && <p className="mt-1.5 text-[11.5px] text-ink-35">Product codes can’t change once created.</p>}
            </div>

            <label className="block">
              <span className={LABEL}>Category {!isNew && <Locked />}</span>
              <select
                value={f.department}
                disabled={!isNew}
                onChange={(e) => setF((s) => ({ ...s, department: e.target.value, subName: '' }))}
                className={SELECT}
              >
                {DEPARTMENTS.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
              </select>
              {!isNew && <span className="mt-1.5 block text-[11.5px] text-ink-35">Category is fixed once created; the sub-category can change.</span>}
            </label>

            <label className="block">
              <span className={LABEL}>Sub-category</span>
              <input
                list="subcategory-options"
                value={f.subName}
                onChange={(e) => set('subName')(e.target.value)}
                placeholder={subs.length ? 'Pick one or type a new name' : 'Type a new sub-category'}
                className={SELECT}
              />
              <datalist id="subcategory-options">
                {subs.map((s) => <option key={s.slug} value={s.name} />)}
              </datalist>
              <span className="mt-1.5 block text-[11.5px] text-ink-35">
                {f.subName.trim() && !subs.some((s) => s.name.toLowerCase() === f.subName.trim().toLowerCase())
                  ? `“${f.subName.trim()}” will be added as a new sub-category.`
                  : `${subs.length} existing in this category`}
              </span>
            </label>

            <label className="block">
              <span className={LABEL}>Material</span>
              <select value={f.material} onChange={(e) => set('material')(e.target.value)} className={SELECT}>
                {MATERIALS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </label>

            <Field label="Size" value={f.size} onChange={(e) => set('size')(e.target.value)} placeholder="e.g. 3/4 inch" />
            <Field label="Brand / supplier" value={f.supplierName} onChange={(e) => set('supplierName')(e.target.value)} placeholder="e.g. Astral" />

            <label className="block">
              <span className={LABEL}>Fallback illustration</span>
              <select value={f.art} onChange={(e) => set('art')(e.target.value)} className={`${SELECT} capitalize`}>
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
