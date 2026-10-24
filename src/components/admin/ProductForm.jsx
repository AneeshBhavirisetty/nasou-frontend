import { useEffect, useMemo, useState } from 'react';
import Modal from '../Modal';
import ProductArt from '../ProductArt';
import Icon from '../Icon';
import MediaPicker from './MediaPicker';
import { Badge, Button, Field } from '../ui';
import { allProducts, brandForName, brandSlug, categoryName, typeKey } from '../../data/catalog';
import { DEPARTMENTS, DEFAULT_DEPARTMENT, slugifyCategory } from '../../data/departments';
import { useAdminStore } from '../../context/AdminStore';
import { useSettings } from '../../store/settings';
import { MAX_IMAGES_PER_PRODUCT, MIN_IMAGES_PER_PRODUCT } from '../../lib/mediaStore';
import { LIVE } from '../../lib/config';
import { get } from '../../lib/api';
import { getStoredSession } from '../../lib/auth';
import { discount as pctOff, money, cx } from '../../lib/format';

/* ============================================================================
 * Add / edit product — the master product sheet's columns, in its order
 * (client review 6, retailer items 4–5, super admin 8–9):
 *
 *   Item Code (made by the system) · Category · Sub category · Item type ·
 *   Item Subtype 1 · Item Subtype 2 · Item Name · Item Size · Item Color ·
 *   Item Description · Supplier Name · Unit Measurement Type · Unit Name ·
 *   Quantity · Price (MRP) · Discount · Selling price · photos
 *
 * Nobody types an item code: the server gives a new product the first two
 * letters of its category and the next number (PL02378, EL01464…), so a code
 * can never clash with a photo mapped to another product. The form shows the
 * code it will get. Sub-categories and item types are the ones that exist in
 * the chosen category, and change with it.
 * ==========================================================================*/

/* closed lists, as nasou-api Product.SALE_UNITS / PACK_UNITS */
const SALE_UNITS = [['piece', 'Pieces'], ['meter', 'Meters'], ['number', 'Numbers']];
const PACK_UNITS = [['piece', 'Pieces'], ['bag', 'Bags'], ['box', 'Boxes'], ['bundle', 'Bundles'], ['coil', 'Coils'], ['coil-or-box', 'Coils or boxes']];
/* the illustration shown until a photo loads, picked from the item type */
const ART_FROM_TYPE = ['elbow', 'tee', 'coupling', 'reducer', 'bush', 'adapter', 'bend', 'shoe', 'cap', 'union', 'valve', 'saddle', 'nipple', 'pipe'];
const artFor = (type) => ART_FROM_TYPE.find((a) => typeKey(type).includes(a)) || 'coupling';

const blank = {
  name: '', department: DEFAULT_DEPARTMENT, subName: '', kind: '', form: '', itemSubtype2: '', size: '', color: '',
  description: '', supplierName: '', saleUnit: 'piece', packUnit: 'piece', price: '', mrp: '', stock: '', images: [],
};

const EMPTY = [];
const SELECT = 'h-12 w-full rounded-md border border-line bg-white/80 px-4 text-[14px] text-ink outline-none transition focus:border-forest focus:shadow-[0_0_0_2px_rgba(9,81,67,0.18)] disabled:cursor-not-allowed disabled:bg-sunk/60 disabled:text-ink-50';
const LABEL = 'mb-1.5 flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-[0.16em] text-forest-800';

function Locked() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sunk px-2 py-0.5 text-[10px] font-bold normal-case tracking-normal text-ink-50">
      <Icon name="lock" size={10} /> Locked
    </span>
  );
}

function Section({ n, title, children }) {
  return (
    <fieldset className="rounded-[18px] border border-line p-4">
      <legend className="px-1.5 text-[12px] font-bold uppercase tracking-[0.14em] text-forest"><span className="text-ink-35">{n} ·</span> {title}</legend>
      {children}
    </fieldset>
  );
}

/* The code the next product in this category will get — from the server
   (not reserved until saved), or worked out from the catalogue in the demo. */
function useNextCode(department, enabled) {
  const [code, setCode] = useState('');
  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    const name = DEPARTMENTS.find((d) => d.slug === department)?.name || '';
    const prefix = name.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
    if (LIVE) {
      const base = getStoredSession()?.role === 'ADMIN' ? '/admin' : '/seller';
      get(`${base}/products/next-code?department=${department}`).then((r) => live && setCode(r.sku)).catch(() => live && setCode(`${prefix}…`));
    } else {
      const max = allProducts.reduce((m, p) => {
        const hit = new RegExp(`^${prefix}(\\d+)$`).exec(p.sku || '');
        return hit ? Math.max(m, Number(hit[1])) : m;
      }, 0);
      setCode(`${prefix}${String(max + 1).padStart(5, '0')}`);
    }
    return () => { live = false; };
  }, [department, enabled]);
  return code;
}

/* retailerId: fixed seller (seller console). retailers: options for the Super
   Admin to pick who sells a new product. masterOnly: sellers pick a
   sub-category from the master catalogue instead of inventing one. */
export default function ProductForm({ open, product, onClose, onSave, retailerId: fixedRetailer, retailers = [], masterOnly = false }) {
  const { products: all } = useAdminStore();
  /* the API only sends the master list to the team — sellers draw from the catalogue */
  const masterSubs = useSettings((s) => s.catalog?.subs) || EMPTY;
  const [f, setF] = useState(() =>
    product
      ? {
          ...blank, ...product,
          department: product.department || DEFAULT_DEPARTMENT,
          subName: product.subcategoryName || categoryName(product.category),
          kind: product.kind || '', form: product.form || '', itemSubtype2: product.itemSubtype2 || '', color: product.color || '',
          description: product.description || '', saleUnit: product.saleUnit || 'piece', packUnit: product.packUnit || 'piece',
          price: String(product.price ?? ''), mrp: String(product.mrp ?? ''), stock: String(product.stock ?? ''),
          images: product.images ?? [],
          supplierName: product.supplierName || '',
        }
      : { ...blank, retailerId: fixedRetailer || retailers[0]?.id || '' }
  );
  const [err, setErr] = useState('');
  const [picking, setPicking] = useState(false);
  const isNew = !product;
  const set = (k) => (v) => setF((s) => ({ ...s, [k]: v }));
  const nextCode = useNextCode(f.department, isNew && open);

  /* the catalogue to draw choices from: everything we know about */
  const pool = useMemo(() => [...all, ...allProducts.filter((p) => !all.some((x) => x.id === p.id))], [all]);

  /* sub-categories that exist in the chosen category, biggest first */
  const subs = useMemo(() => {
    const m = new Map();
    pool.forEach((p) => {
      if ((p.department || DEFAULT_DEPARTMENT) !== f.department) return;
      const name = p.subcategoryName || categoryName(p.category);
      const k = name.toLowerCase();
      const cur = m.get(k) || { slug: p.category, name, n: 0 };
      cur.n += 1;
      m.set(k, cur);
    });
    masterSubs.filter((c) => c.department === f.department).forEach((c) => {
      if (!m.has(c.name.toLowerCase())) m.set(c.name.toLowerCase(), { slug: c.slug, name: c.name, n: 0 });
    });
    return [...m.values()].filter((s) => s.n > 0 || !masterOnly).sort((a, b) => b.n - a.n || a.name.localeCompare(b.name));
  }, [pool, f.department, masterSubs, masterOnly]);

  /* item types (and their subtypes) used in the chosen sub-category */
  const sub = subs.find((s) => s.name.toLowerCase() === f.subName.trim().toLowerCase());
  const inSub = useMemo(() => pool.filter((p) => sub && p.category === sub.slug), [pool, sub]);
  const distinct = (list, key) => {
    const m = new Map();
    list.forEach((p) => { const v = String(p[key] || '').trim(); if (v) { const k = v.toLowerCase(); m.set(k, { v, n: (m.get(k)?.n || 0) + 1 }); } });
    return [...m.values()].sort((a, b) => b.n - a.n).map((x) => x.v);
  };
  const types = useMemo(() => distinct(inSub, 'kind'), [inSub]);
  const subtypes1 = useMemo(() => distinct(inSub.filter((p) => !f.kind || typeKey(p.kind) === typeKey(f.kind)), 'form'), [inSub, f.kind]);
  const subtypes2 = useMemo(() => distinct(inSub.filter((p) => !f.kind || typeKey(p.kind) === typeKey(f.kind)), 'itemSubtype2'), [inSub, f.kind]);
  const names = useMemo(() => distinct(inSub.filter((p) => !f.kind || typeKey(p.kind) === typeKey(f.kind)), 'name'), [inSub, f.kind]);
  const brands = useMemo(() => distinct(pool.filter((p) => (p.department || DEFAULT_DEPARTMENT) === f.department), 'supplierName'), [pool, f.department]);

  const price = Number(f.price) || 0;
  const mrp = Number(f.mrp) || 0;
  const off = mrp > price && price > 0 ? pctOff(price, mrp) : 0;
  const brand = f.supplierName.trim();
  const knownBrand = brandForName(brand);

  const submit = (e) => {
    e.preventDefault();
    setErr('');
    if (isNew && !fixedRetailer && !f.retailerId) return setErr('Choose which retailer sells this product.');
    if (!f.subName.trim()) return setErr('Choose the sub-category.');
    if (masterOnly && !sub) return setErr('Pick a sub-category from the list — Nivora manages the master catalogue.');
    if (!f.kind.trim()) return setErr('Enter the item type (e.g. Elbows, Switches).');
    if (f.name.trim().length < 2) return setErr('Enter the item name.');
    if (price <= 0) return setErr('Enter the selling price.');
    if (mrp && mrp < price) return setErr('Price (MRP) cannot be lower than the selling price.');
    if (isNew && f.images.length < MIN_IMAGES_PER_PRODUCT) return setErr(`Add at least ${MIN_IMAGES_PER_PRODUCT} product photo.`);

    const subName = f.subName.trim();
    let category = sub?.slug || slugifyCategory(subName);
    if (!sub && all.some((p) => p.category === category && (p.department || DEFAULT_DEPARTMENT) !== f.department)) {
      category = `${f.department}-${category}`;
    }
    const finalMrp = mrp || Math.round(price * 1.15);
    const material = f.department === 'plumbing' ? (sub?.name || subName) : product?.material || null;

    onSave({
      id: product?.id || `NEW-${Date.now().toString(36)}`,
      /* the server assigns the code for new products; this is only the preview */
      sku: product?.sku || nextCode,
      row: product?.row ?? 99999,
      name: f.name.trim(),
      title: f.size ? `${f.name.trim()} · ${f.size.trim()}` : f.name.trim(),
      variantLabel: [material, f.size].filter(Boolean).join(' · '),
      description: f.description.trim() || `${f.name.trim()}${f.size ? ` ${f.size.trim()}` : ''}${brand ? `, from ${brand}` : ''}.`,
      material,
      kind: f.kind.trim(),
      form: f.form.trim() || null,
      itemSubtype2: f.itemSubtype2.trim() || null,
      color: f.color.trim() || null,
      saleUnit: f.saleUnit,
      packUnit: f.packUnit,
      art: artFor(f.kind),
      size: f.size.trim(),
      sizeRaw: f.size.trim(),
      supplier: knownBrand?.slug || brandSlug(brand),
      supplierName: knownBrand?.name || brand || 'Nivora',
      supplierTier: knownBrand?.tier || product?.supplierTier || 'value',
      department: product?.department || f.department,
      category,
      subcategoryName: sub?.name || subName,
      price: Math.round(price),
      mrp: Math.round(finalMrp),
      discount: pctOff(Math.round(price), Math.round(finalMrp)),
      stock: Math.max(0, Math.round(Number(f.stock) || 0)),
      images: f.images,
      rating: product?.rating ?? 4.2,
      reviewCount: product?.reviewCount ?? 0,
      badges: product?.badges ?? (isNew ? ['New'] : []),
      retailerId: product?.retailerId || fixedRetailer || f.retailerId,
    });
    onClose();
  };

  const cover = f.images[0];
  const list = (id, items) => <datalist id={id}>{items.map((v) => <option key={v} value={v} />)}</datalist>;

  return (
    <>
      <Modal open={open} onClose={onClose} title={isNew ? 'Add product' : `Edit · ${product.name}`} size="lg">
        <form onSubmit={submit} className="space-y-4">
          {/* preview + the item code */}
          <div className="flex items-center gap-4 rounded-[18px] border border-line bg-canvas p-3">
            <span className="photo-bed grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-md">
              {cover ? <img src={cover} alt="" className="h-full w-full object-cover" /> : <ProductArt kind={artFor(f.kind)} material={f.subName || 'PVC'} className="h-full w-full p-1.5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-bold">{f.name || 'New product'}{f.size ? ` · ${f.size}` : ''}</p>
              <p className="text-[12px] text-ink-50">{money(price)}{off ? ` · ${off}% off ${money(mrp)}` : ''} · {f.stock || 0} in stock</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-ink-50">Item code</p>
              <p className="tnum font-mono text-[16px] font-bold text-forest">{product?.sku || nextCode || '…'}</p>
              <p className="flex items-center justify-end gap-1 text-[10.5px] text-ink-35"><Icon name="lock" size={10} /> {isNew ? 'Made on save' : 'Fixed'}</p>
            </div>
          </div>

          <Section n="1" title="Where it sits">
            <div className="grid gap-3 sm:grid-cols-2">
              {isNew && !fixedRetailer && retailers.length > 0 && (
                <label className="block sm:col-span-2">
                  <span className={LABEL}>Sold by (retailer)</span>
                  <select value={f.retailerId} onChange={(e) => set('retailerId')(e.target.value)} className={SELECT}>
                    {retailers.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                  <span className="mt-1.5 block text-[11.5px] text-ink-35">Uploading for a retailer: the product is theirs and counts in their product total.</span>
                </label>
              )}
              <label className="block">
                <span className={LABEL}>Category {!isNew && <Locked />}</span>
                <select value={f.department} disabled={!isNew} onChange={(e) => setF((s) => ({ ...s, department: e.target.value, subName: '', kind: '', form: '', itemSubtype2: '' }))} className={SELECT}>
                  {DEPARTMENTS.map((d) => <option key={d.slug} value={d.slug}>{d.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={LABEL}>Sub category</span>
                {masterOnly ? (
                  <select value={sub?.name || ''} onChange={(e) => setF((s) => ({ ...s, subName: e.target.value, kind: '', form: '', itemSubtype2: '' }))} className={SELECT}>
                    <option value="">Choose…</option>
                    {subs.map((s) => <option key={s.slug} value={s.name}>{s.name}</option>)}
                  </select>
                ) : (
                  <>
                    <input list="pf-subs" value={f.subName} onChange={(e) => setF((s) => ({ ...s, subName: e.target.value, kind: '' }))} placeholder="Pick one, or type a new one" className={SELECT} />
                    {list('pf-subs', subs.map((s) => s.name))}
                  </>
                )}
                <span className="mt-1.5 block text-[11.5px] text-ink-35">
                  {f.subName.trim() && !sub ? `“${f.subName.trim()}” will be added as a new sub-category.` : `${subs.length} in ${DEPARTMENTS.find((d) => d.slug === f.department)?.name}`}
                </span>
              </label>
            </div>
          </Section>

          <Section n="2" title="What it is">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className={LABEL}>Item type</span>
                <input list="pf-types" value={f.kind} onChange={(e) => set('kind')(e.target.value)} placeholder={types[0] ? `e.g. ${types[0]}` : 'e.g. Elbows'} className={SELECT} />
                {list('pf-types', types)}
              </label>
              <label className="block">
                <span className={LABEL}>Item name</span>
                <input list="pf-names" value={f.name} onChange={(e) => set('name')(e.target.value)} placeholder={names[0] ? `e.g. ${names[0]}` : 'e.g. cPVC Elbow'} className={SELECT} />
                {list('pf-names', names)}
              </label>
              <label className="block">
                <span className={LABEL}>Item subtype 1</span>
                <input list="pf-st1" value={f.form} onChange={(e) => set('form')(e.target.value)} placeholder="Optional" className={SELECT} />
                {list('pf-st1', subtypes1)}
              </label>
              <label className="block">
                <span className={LABEL}>Item subtype 2</span>
                <input list="pf-st2" value={f.itemSubtype2} onChange={(e) => set('itemSubtype2')(e.target.value)} placeholder="Optional" className={SELECT} />
                {list('pf-st2', subtypes2)}
              </label>
              <Field label="Item size" value={f.size} onChange={(e) => set('size')(e.target.value)} placeholder="e.g. 3/4 inch" />
              <Field label="Item colour" value={f.color} onChange={(e) => set('color')(e.target.value)} placeholder="Optional" />
              <label className="block sm:col-span-2">
                <span className={LABEL}>Supplier name (brand)</span>
                <input list="pf-brands" value={f.supplierName} onChange={(e) => set('supplierName')(e.target.value)} placeholder="e.g. Astral" className={SELECT} />
                {list('pf-brands', brands)}
              </label>
              <label className="block sm:col-span-2">
                <span className={LABEL}>Item description</span>
                <textarea rows={2} value={f.description} onChange={(e) => set('description')(e.target.value)} placeholder="Optional — written for you if left empty" className="w-full rounded-md border border-line bg-white/80 px-4 py-3 text-[14px] text-ink outline-none focus:border-forest" />
              </label>
            </div>
          </Section>

          <Section n="3" title="Units, stock and price">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className={LABEL}>Unit measurement type</span>
                <select value={f.saleUnit} onChange={(e) => set('saleUnit')(e.target.value)} className={SELECT}>{SALE_UNITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </label>
              <label className="block">
                <span className={LABEL}>Unit name (packed in)</span>
                <select value={f.packUnit} onChange={(e) => set('packUnit')(e.target.value)} className={SELECT}>{PACK_UNITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </label>
              <Field label="Quantity (stock)" inputMode="numeric" value={f.stock} onChange={(e) => set('stock')(e.target.value.replace(/\D/g, ''))} placeholder="0" />
              <Field label="Price — MRP (₹)" inputMode="numeric" value={f.mrp} onChange={(e) => set('mrp')(e.target.value.replace(/\D/g, ''))} placeholder="auto (+15%)" hint="Blank = 15% above selling price" />
              <div>
                <span className={LABEL}>Discount</span>
                <p className={cx('flex h-12 items-center rounded-md border border-line px-4 text-[14px] font-bold', off ? 'bg-emerald-50 text-emerald-700' : 'bg-sunk/60 text-ink-50')}>{off ? `${off}% off` : '—'}</p>
              </div>
              <Field label="Selling price (₹)" inputMode="numeric" value={f.price} onChange={(e) => set('price')(e.target.value.replace(/\D/g, ''))} placeholder="0" required />
            </div>
          </Section>

          {/* photos */}
          <Section n="4" title={<>Photos {isNew && <span className="text-clay">*</span>}</>}>
            <div className="mb-2.5 text-[11.5px] text-ink-35">{f.images.length}/{MAX_IMAGES_PER_PRODUCT}{isNew ? ` · at least ${MIN_IMAGES_PER_PRODUCT}` : ''}, the first is the cover</div>
            <div className="flex flex-wrap gap-2.5">
              {f.images.map((url, i) => (
                <div key={url} className="group relative">
                  <span className="photo-bed block h-20 w-20 overflow-hidden rounded-md border border-line">
                    <img src={url} alt={`Product photo ${i + 1}`} className="h-full w-full object-cover" />
                  </span>
                  {i === 0 && <Badge tone="dark" className="absolute -top-1.5 left-1/2 -translate-x-1/2 !px-1.5 !py-0 !text-[9px]">Cover</Badge>}
                  <button type="button" onClick={() => set('images')(f.images.filter((u) => u !== url))} aria-label={`Remove photo ${i + 1}`} className="absolute -right-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full border border-line bg-white text-ink-35 shadow-card transition hover:text-clay">
                    <Icon name="close" size={10} strokeWidth={2.5} />
                  </button>
                </div>
              ))}
              {f.images.length < MAX_IMAGES_PER_PRODUCT && (
                <button type="button" onClick={() => setPicking(true)} className="grid h-20 w-20 place-items-center rounded-md border-2 border-dashed border-line text-ink-35 transition hover:border-emerald hover:text-emerald-600">
                  <span className="text-center"><Icon name="image" size={18} className="mx-auto" /><span className="mt-0.5 block text-[10.5px] font-semibold">Add</span></span>
                </button>
              )}
            </div>
          </Section>

          {err && <p role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{err}</p>}

          <div className="flex justify-end gap-3 border-t border-line pt-4">
            <button type="button" onClick={onClose} className="h-10 rounded-md border border-line px-5 text-[13.5px] font-semibold text-ink-70 transition hover:border-ink-35">Cancel</button>
            <Button type="submit" icon={isNew ? 'plus' : 'check'}>{isNew ? 'Add product' : 'Save changes'}</Button>
          </div>
        </form>
      </Modal>

      <MediaPicker open={picking} onClose={() => setPicking(false)} selected={f.images} onDone={(urls) => set('images')(urls)} />
    </>
  );
}
