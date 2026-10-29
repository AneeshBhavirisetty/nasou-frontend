import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import NotifyMe from '../components/NotifyMe';
import Icon from '../components/Icon';
import { Button, Container, Breadcrumbs } from '../components/ui';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { categoryName, departments } from '../data/catalog';
import { DEPARTMENTS } from '../data/departments';
import { cx, money } from '../lib/format';

/* Wishlist (client review 6, customer item 12): high-level dropdowns —
   Category, then its Sub-category, Brand and Availability — instead of rows of
   low-level chips. "Recently saved" stays the default order. Out-of-stock
   items offer "Notify me" in place of a dead "Move to cart". */

const AVAILABILITY = [
  ['', 'Any'],
  ['stock', 'In stock'],
  ['out', 'Out of stock'],
  ['offer', 'On offer (15%+ off)'],
];
const AVAIL_TEST = {
  stock: (p) => p.stock > 0,
  out: (p) => p.stock <= 0,
  offer: (p) => p.discount >= 15,
};
const SORTS = [
  ['recent', 'Recently saved'],
  ['priceAsc', 'Price: low to high'],
  ['priceDesc', 'Price: high to low'],
  ['discount', 'Biggest discount'],
  ['name', 'Name A–Z'],
];

/* A labelled dropdown that reads as a pill, with the number of matches per option.
   `options`: [value, label, count?, disabled?]; `groups` (optional): [[groupLabel, options]]. */
function Dropdown({ label, icon, value, onChange, options, groups, disabled }) {
  const all = groups ? [...options, ...groups.flatMap(([, o]) => o)] : options;
  const opt = ([v, l, n, off]) => <option key={v || 'all'} value={v} disabled={off}>{n != null ? `${l} (${n})` : l}</option>;
  const current = all.find((o) => o[0] === value) || options[0];
  return (
    <label className={cx('relative flex h-12 min-w-0 items-center gap-2.5 rounded-[16px] border bg-white pl-3.5 pr-8 transition', value ? 'border-forest shadow-btn' : 'border-line hover:border-forest/40', disabled && 'opacity-50')}>
      <span className={cx('hidden h-7 w-7 shrink-0 place-items-center rounded-full sm:grid', value ? 'bg-forest text-white' : 'bg-sunk text-forest')}><Icon name={icon} size={14} /></span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-ink-50">{label}</span>
        <span className="block truncate text-[13.5px] font-bold text-ink">{current[1]}</span>
      </span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={label}>
        {options.map(opt)}
        {groups?.map(([g, o]) => <optgroup key={g} label={g}>{o.map(opt)}</optgroup>)}
      </select>
      <Icon name="chevronDown" size={14} className="pointer-events-none absolute right-3 text-ink-50" />
    </label>
  );
}

export default function Wishlist() {
  const { ids, items, toggle } = useWishlist();
  const { add } = useCart();
  const toast = useToast();
  const [dept, setDept] = useState('');
  const [sub, setSub] = useState('');
  const [brand, setBrand] = useState('');
  const [avail, setAvail] = useState('');
  const [sort, setSort] = useState('recent');

  const order = useMemo(() => new Map(ids.map((id, i) => [id, i])), [ids]);
  const deptOf = (p) => p.department || 'plumbing';

  /* each dropdown counts what the others leave */
  const pass = (p, skip) =>
    (skip === 'dept' || !dept || deptOf(p) === dept)
    && (skip === 'sub' || !sub || p.category === sub)
    && (skip === 'brand' || !brand || p.supplier === brand)
    && (skip === 'avail' || !avail || AVAIL_TEST[avail](p));
  const tally = (skip, key) => {
    const m = new Map();
    items.filter((p) => pass(p, skip)).forEach((p) => m.set(key(p), (m.get(key(p)) || 0) + 1));
    return m;
  };

  const deptCounts = tally('dept', deptOf);
  const subCounts = tally('sub', (p) => p.category);
  /* every sub-category of the category (from the catalogue), with how many saved
     items it holds — empty ones stay visible but greyed, so the list is never
     blank (client: "sub category drop down is not coming") */
  const subOption = (c) => [c.slug, c.name || categoryName(c.slug), subCounts.get(c.slug) || 0, !subCounts.get(c.slug) && sub !== c.slug];
  const deptOfSub = (slug) => departments.find((d) => d.subs.some((c) => c.slug === slug))?.slug;
  const subGroups = dept
    ? null
    : departments.filter((d) => d.subs.some((c) => subCounts.get(c.slug))).map((d) => [d.name, d.subs.filter((c) => subCounts.get(c.slug)).map(subOption)]);
  const subList = dept ? (departments.find((d) => d.slug === dept)?.subs || []).map(subOption) : [];
  /* a saved item whose sub-category is not in the catalogue list any more */
  for (const k of subCounts.keys()) if (dept && !subList.some((o) => o[0] === k)) subList.push([k, categoryName(k), subCounts.get(k)]);
  const brandCounts = tally('brand', (p) => p.supplier);
  const brandNames = new Map(items.map((p) => [p.supplier, p.supplierName]));

  const shown = useMemo(() => {
    const by = {
      recent: (a, b) => order.get(b.id) - order.get(a.id),
      priceAsc: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price,
      discount: (a, b) => b.discount - a.discount,
      name: (a, b) => a.name.localeCompare(b.name),
    }[sort];
    return items.filter((p) => pass(p)).sort(by);
  }, [items, dept, sub, brand, avail, sort, order]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = shown.reduce((s, p) => s + (Number(p.price) || 0), 0);
  const filtered = dept || sub || brand || avail;

  const moveToCart = (p) => {
    if (!(Number(p.price) > 0)) return toast.error('No price yet — send an enquiry for a quote from the product page.');
    add(p, { qty: 1 });
    toggle(p.id);
  };
  const clearAll = () => { setDept(''); setSub(''); setBrand(''); setAvail(''); };

  return (
    <Container className="pb-12 pt-5">
      <Breadcrumbs className="mb-4" items={[{ label: 'Home', to: '/home' }, { label: 'Wishlist' }]} />

      <motion.section initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="mesh-cream grain relative overflow-hidden rounded-[28px] border border-white/70 p-6 shadow-card sm:p-9">
        <div className="field-dots pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="section-label">Your saved products</p>
            <h1 className="font-hero mt-3 text-[clamp(2rem,5vw,2.8rem)] font-semibold">My wishlist <span className="text-ink-35">· {items.length}</span></h1>
            <p className="mt-1 text-[14px] text-ink-50">Prices and stock update live from each seller.</p>
          </div>
          <Link to="/shop" className="w-fit rounded-full bg-forest px-5 py-3 text-sm font-bold text-white shadow-btn transition hover:-translate-y-0.5">Explore more products</Link>
        </div>
      </motion.section>

      {/* high-level filters */}
      <div className="mt-6 grid grid-cols-2 gap-2.5 rounded-[22px] border border-white/70 bg-white/55 p-3 shadow-[0_10px_30px_rgba(37,88,73,0.06)] backdrop-blur md:grid-cols-[repeat(4,minmax(0,1fr))_auto] md:items-center">
        <Dropdown
          label="Category" icon="layers" value={dept}
          onChange={(v) => { setDept(v); setSub(''); }}
          options={[['', 'All', items.length], ...DEPARTMENTS.filter((d) => deptCounts.get(d.slug) || dept === d.slug).map((d) => [d.slug, d.name, deptCounts.get(d.slug) || 0])]}
        />
        <Dropdown
          label="Sub-category" icon="grid" value={sub}
          onChange={(v) => { setSub(v); if (v && !dept) setDept(deptOfSub(v) || ''); }}
          options={[['', 'All'], ...subList]}
          groups={subGroups}
        />
        <Dropdown
          label="Brand" icon="shieldCheck" value={brand} onChange={setBrand}
          options={[['', 'All'], ...[...brandCounts.keys()].filter(Boolean).sort((a, b) => String(brandNames.get(a)).localeCompare(String(brandNames.get(b)))).map((b) => [b, brandNames.get(b) || b, brandCounts.get(b)])]}
        />
        <Dropdown
          label="Availability" icon="check" value={avail} onChange={setAvail}
          options={AVAILABILITY.map(([v, l]) => [v, l, v ? items.filter((p) => pass(p, 'avail') && AVAIL_TEST[v](p)).length : undefined])}
        />
        <label className="relative col-span-2 flex h-12 items-center justify-center gap-2 rounded-[16px] border border-line bg-white pl-4 pr-9 text-[13px] font-bold text-forest md:col-span-1">
          <Icon name="filter" size={14} /> {SORTS.find((s) => s[0] === sort)[1]}
          <select value={sort} onChange={(e) => setSort(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Sort wishlist">
            {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <Icon name="chevronDown" size={14} className="pointer-events-none absolute right-3" />
        </label>
      </div>

      <div className="mb-4 mt-5 flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-50">
        <span><b className="tnum text-ink">{shown.length}</b> of {items.length} saved{shown.length > 0 && <> · <span className="tnum">{money(total)}</span> together</>}</span>
        {filtered && <button onClick={clearAll} className="font-bold text-clay-600 hover:underline">Clear filters</button>}
      </div>

      {items.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[#cfe0d9] bg-[#f6f3ed] py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-forest shadow-card"><Icon name="heart" size={24} /></span>
          <p className="mt-4 text-[18px] font-semibold text-forest">Nothing saved yet</p>
          <p className="mt-1.5 text-[13px] text-ink-50">Tap the heart on any product to keep it here.</p>
          <div className="mt-5"><Button to="/shop" iconRight="arrowRight">Browse the catalogue</Button></div>
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-line bg-white py-12 text-center">
          <p className="text-[15px] font-semibold text-forest">Nothing saved matches these filters</p>
          <p className="mt-1.5 text-[13px] text-ink-50">Clear them to see all {items.length} saved products.</p>
          <div className="mt-4 flex justify-center gap-2">
            <button type="button" onClick={clearAll} className="rounded-full border border-line px-4 py-2 text-[13px] font-bold text-forest hover:border-forest">Clear filters</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          <AnimatePresence initial={false}>
            {shown.map((p) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col gap-2">
                <ProductCard product={p} />
                {p.stock > 0 ? (
                  <button onClick={() => moveToCart(p)} className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-forest/20 bg-white text-[12.5px] font-bold text-forest transition hover:bg-forest hover:text-white">
                    <Icon name="cart" size={14} /> Move to cart
                  </button>
                ) : (
                  <NotifyMe product={p} className="!h-10 rounded-full text-[12.5px]" />
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Container>
  );
}
