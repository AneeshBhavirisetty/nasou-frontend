import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import { Badge, Button, Container, Breadcrumbs, Skeleton } from '../components/ui';
import { categories, categoryName, products, suppliers } from '../data/catalog';
import { money, cx } from '../lib/format';
import { EASE } from '../lib/motion';

const SORTS = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'rating', label: 'Top rated' },
  { key: 'discount', label: 'Biggest discount' },
  { key: 'new', label: 'Newest' },
];
const MATERIALS = ['PVC', 'uPVC', 'cPVC'];
const PRICE_MAX = 2000;
const PAGE = 60;

const TIERS = [
  { key: 'value', label: 'Value', note: 'Best price for volume jobs' },
  { key: 'mid', label: 'Mid-range', note: 'Balanced price and finish' },
  { key: 'premium', label: 'Premium', note: 'Top-grade brands' },
];
const KIND_LABEL = {
  elbow: 'Elbow', tee: 'Tee', coupling: 'Coupling', reducer: 'Reducer', bush: 'Reducer bush',
  fta: 'Female threaded adapter (FTA)', mta: 'Male threaded adapter (MTA)', bend: 'Bend',
  cap: 'End cap', shoe: 'Shoe', pipe: 'Pipe', valve: 'Ball valve', union: 'Union',
  saddle: 'Service saddle', nipple: 'Tank nipple',
};
const DISCOUNTS = [10, 20, 30];
const RATINGS = [4.5, 4];
const BANDS = [
  { label: `Under ${money(50)}`, min: 0, max: 50 },
  { label: `${money(50)} – ${money(100)}`, min: 50, max: 100 },
  { label: `${money(100)} – ${money(250)}`, min: 100, max: 250 },
  { label: `${money(250)} – ${money(500)}`, min: 250, max: 500 },
  { label: `${money(500)} – ${money(1000)}`, min: 500, max: 1000 },
  { label: `${money(1000)}+`, min: 1000, max: PRICE_MAX },
];
const COLLECTIONS = ['Bestseller', 'New', 'Value'];

/* size strings sort by their first number ("3/4 × 1/2″" → 0.75) */
const sizeValue = (s = '') => {
  const first = String(s).split('×')[0].replace(/[″"]/g, '').trim();
  return first.split('-').reduce((sum, part) => {
    const [a, b] = part.split('/').map(Number);
    return sum + (b ? a / b : a || 0);
  }, 0);
};
const ALL_SIZES = [...new Set(products.map((p) => p.size).filter(Boolean))].sort((a, b) => sizeValue(a) - sizeValue(b) || a.localeCompare(b));
/* fixed order (most common first) so options never jump while you click */
const KIND_TOTALS = products.reduce((m, p) => (p.kind ? m.set(p.kind, (m.get(p.kind) || 0) + 1) : m), new Map());
const ALL_KINDS = [...KIND_TOTALS.keys()].sort((a, b) => KIND_TOTALS.get(b) - KIND_TOTALS.get(a));
const BRANDS_BY_SIZE = [...suppliers].sort((a, b) => (b.count || 0) - (a.count || 0) || a.name.localeCompare(b.name));

function Group({ title, children, defaultOpen = true, active = 0 }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line-soft px-4 py-4 last:border-0">
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex w-full items-center justify-between text-left">
        <span className="flex items-center gap-2 text-[14px] font-bold text-ink">
          {title}
          {active > 0 && <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-forest px-1 text-[10.5px] text-white">{active}</span>}
        </span>
        <Icon name="chevronDown" size={16} className={cx('text-ink-50 transition', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22, ease: EASE }} className="overflow-hidden">
            <div className="pt-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* multi-select row */
function Check({ checked, onChange, label, count, note }) {
  const empty = count === 0 && !checked;
  return (
    <label className={cx('group flex cursor-pointer items-center gap-3 rounded-[10px] px-1 py-2 transition hover:bg-sunk/50', empty && 'opacity-45')}>
      <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border transition', checked ? 'border-forest bg-forest text-white' : 'border-[#cad8d2] bg-white group-hover:border-forest/50')}>
        {checked && <Icon name="check" size={12} strokeWidth={3} />}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] text-ink-70 group-hover:text-ink">{label}</span>
        {note && <span className="block text-[11.5px] text-ink-35">{note}</span>}
      </span>
      {count != null && <span className="tnum text-[12px] text-ink-35">{count}</span>}
    </label>
  );
}

/* single-select row (click the active one again to clear) */
function Pick({ checked, onChange, label, count }) {
  const empty = count === 0 && !checked;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onChange}
      className={cx('group flex w-full items-center gap-3 rounded-[10px] px-1 py-2 text-left transition hover:bg-sunk/50', empty && 'opacity-45')}
    >
      <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-full border-2 transition', checked ? 'border-forest' : 'border-[#cad8d2] group-hover:border-forest/50')}>
        {checked && <span className="h-2.5 w-2.5 rounded-full bg-forest" />}
      </span>
      <span className="flex-1 text-[14px] text-ink-70 group-hover:text-ink">{label}</span>
      {count != null && <span className="tnum text-[12px] text-ink-35">{count}</span>}
    </button>
  );
}

function Stars({ value }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="font-semibold text-ink">{value}</span>
      <Icon name="star" size={13} fill="currentColor" className="text-amber-400" />
      <span>&amp; up</span>
    </span>
  );
}

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';

  const [cats, setCats] = useState(() => (params.get('category') ? [params.get('category')] : []));
  const [mats, setMats] = useState([]);
  const [sups, setSups] = useState(() => (params.get('brand') ? [params.get('brand')] : []));
  const [tiers, setTiers] = useState([]);
  const [kinds, setKinds] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [cols, setCols] = useState([]);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [minOff, setMinOff] = useState(0);
  const [minRating, setMinRating] = useState(0);
  const [inStockOnly, setInStock] = useState(false);
  const [dealOnly, setDealOnly] = useState(params.get('deal') === '1');
  const [sort, setSort] = useState(params.get('sort') ?? 'relevance');
  const [drawer, setDrawer] = useState(false);
  const [page, setPage] = useState(1);
  const [booting, setBooting] = useState(true);
  const [brandQ, setBrandQ] = useState('');
  const [allSizes, setAllSizes] = useState(false);

  useEffect(() => { const t = setTimeout(() => setBooting(false), 260); return () => clearTimeout(t); }, []);
  useEffect(() => { setPage(1); }, [q, cats, mats, sups, tiers, kinds, sizes, cols, minPrice, maxPrice, minOff, minRating, inStockOnly, dealOnly, sort]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (cats.length === 1) next.set('category', cats[0]);
    if (sups.length === 1) next.set('brand', sups[0]);
    if (dealOnly) next.set('deal', '1');
    if (sort !== 'relevance') next.set('sort', sort);
    setParams(next, { replace: true });
  }, [q, cats, sups, dealOnly, sort, setParams]);

  const toggle = (list, setList) => (v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  /* Search narrows first; every filter group is then applied on top. `skip`
     leaves one group out so its option counts reflect the other choices. */
  const searched = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return products;
    const terms = needle.split(/\s+/);
    return products.filter((p) => {
      const hay = `${p.name} ${p.sku} ${p.supplierName} ${p.size} ${p.material} ${p.description}`.toLowerCase();
      return terms.every((t) => hay.includes(t));
    });
  }, [q]);

  const matches = (p, skip) => {
    if (skip !== 'cat' && cats.length && !cats.includes(p.category)) return false;
    if (skip !== 'mat' && mats.length && !mats.includes(p.material)) return false;
    if (skip !== 'sup' && sups.length && !sups.includes(p.supplier)) return false;
    if (skip !== 'tier' && tiers.length && !tiers.includes(p.supplierTier)) return false;
    if (skip !== 'kind' && kinds.length && !kinds.includes(p.kind)) return false;
    if (skip !== 'size' && sizes.length && !sizes.includes(p.size)) return false;
    if (skip !== 'col' && cols.length && !cols.some((c) => p.badges.includes(c))) return false;
    if (skip !== 'price' && (p.price < minPrice || (maxPrice < PRICE_MAX && p.price > maxPrice))) return false;
    if (skip !== 'off' && minOff && p.discount < minOff) return false;
    if (skip !== 'rating' && minRating && p.rating < minRating) return false;
    if (skip !== 'avail' && inStockOnly && p.stock <= 0) return false;
    if (skip !== 'avail' && dealOnly && p.discount < 15) return false;
    return true;
  };

  const facet = (skip, key) => {
    const m = new Map();
    for (const p of searched) {
      if (!matches(p, skip)) continue;
      const k = key(p);
      for (const v of Array.isArray(k) ? k : [k]) m.set(v, (m.get(v) || 0) + 1);
    }
    return m;
  };

  const results = useMemo(() => {
    let out = searched.filter((p) => matches(p));
    const by = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
      discount: (a, b) => b.discount - a.discount,
      new: (a, b) => Number(b.badges.includes('New')) - Number(a.badges.includes('New')) || b.row - a.row,
    };
    if (by[sort]) out = [...out].sort(by[sort]);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searched, cats, mats, sups, tiers, kinds, sizes, cols, minPrice, maxPrice, minOff, minRating, inStockOnly, dealOnly, sort]);

  const counts = useMemo(() => ({
    cat: facet('cat', (p) => p.category),
    mat: facet('mat', (p) => p.material),
    sup: facet('sup', (p) => p.supplier),
    tier: facet('tier', (p) => p.supplierTier),
    kind: facet('kind', (p) => p.kind),
    size: facet('size', (p) => p.size),
    col: facet('col', (p) => p.badges),
    offBase: searched.filter((p) => matches(p, 'off')),
    ratingBase: searched.filter((p) => matches(p, 'rating')),
    priceBase: searched.filter((p) => matches(p, 'price')),
    avail: searched.filter((p) => matches(p, 'avail')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [searched, cats, mats, sups, tiers, kinds, sizes, cols, minPrice, maxPrice, minOff, minRating, inStockOnly, dealOnly]);

  const shown = results.slice(0, page * PAGE);
  const priceActive = minPrice > 0 || maxPrice < PRICE_MAX;
  const activeCount = cats.length + mats.length + sups.length + tiers.length + kinds.length + sizes.length + cols.length
    + (priceActive ? 1 : 0) + (minOff ? 1 : 0) + (minRating ? 1 : 0) + (inStockOnly ? 1 : 0) + (dealOnly ? 1 : 0);
  const clearAll = () => {
    setCats([]); setMats([]); setSups([]); setTiers([]); setKinds([]); setSizes([]); setCols([]);
    setMinPrice(0); setMaxPrice(PRICE_MAX); setMinOff(0); setMinRating(0); setInStock(false); setDealOnly(false);
  };

  const brandList = useMemo(() => {
    const n = brandQ.trim().toLowerCase();
    return BRANDS_BY_SIZE.filter((s) => !n || s.name.toLowerCase().includes(n));
  }, [brandQ]);

  const sizeList = allSizes ? ALL_SIZES : ALL_SIZES.filter((s) => sizes.includes(s) || (counts.size.get(s) || 0) >= 15).slice(0, 14);

  const setBand = (b) => {
    const on = minPrice === b.min && maxPrice === b.max;
    setMinPrice(on ? 0 : b.min);
    setMaxPrice(on ? PRICE_MAX : b.max);
  };
  const priceInput = (v, fallback) => {
    const n = parseInt(String(v).replace(/\D/g, ''), 10);
    return Number.isNaN(n) ? fallback : Math.max(0, Math.min(PRICE_MAX, n));
  };

  const filters = (
    <>
      <Group title="Category" active={cats.length}>
        {categories.map((c) => (
          <Check key={c.slug} label={c.name} checked={cats.includes(c.slug)} onChange={() => toggle(cats, setCats)(c.slug)} count={counts.cat.get(c.slug) || 0} />
        ))}
      </Group>

      <Group title="Brand" active={sups.length}>
        <label className="relative mb-2 block">
          <Icon name="search" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-35" />
          <input
            type="search"
            value={brandQ}
            onChange={(e) => setBrandQ(e.target.value)}
            placeholder={`Search ${suppliers.length} brands`}
            aria-label="Search brands"
            className="h-10 w-full rounded-[12px] border border-line bg-white pl-9 pr-3 text-[13px] outline-none transition placeholder:text-ink-35 focus:border-forest/40"
          />
        </label>
        <div className="max-h-[260px] overflow-y-auto pr-1">
          {brandList.map((s) => (
            <Check key={s.slug} label={s.name} checked={sups.includes(s.slug)} onChange={() => toggle(sups, setSups)(s.slug)} count={counts.sup.get(s.slug) || 0} />
          ))}
          {brandList.length === 0 && <p className="px-1 py-2 text-[12.5px] text-ink-35">No brand matches “{brandQ}”.</p>}
        </div>
      </Group>

      <Group title="Price" active={priceActive ? 1 : 0}>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-50">Min ₹</span>
            <input inputMode="numeric" value={minPrice || ''} placeholder="0" onChange={(e) => setMinPrice(priceInput(e.target.value, 0))} aria-label="Minimum price" className="tnum h-10 w-full rounded-[12px] border border-line bg-white px-3 text-[13px] font-semibold outline-none focus:border-forest/40" />
          </label>
          <label className="block">
            <span className="mb-1 block text-[10.5px] font-bold uppercase tracking-[0.12em] text-ink-50">Max ₹</span>
            <input inputMode="numeric" value={maxPrice < PRICE_MAX ? maxPrice : ''} placeholder="Any" onChange={(e) => setMaxPrice(priceInput(e.target.value, PRICE_MAX) || PRICE_MAX)} aria-label="Maximum price" className="tnum h-10 w-full rounded-[12px] border border-line bg-white px-3 text-[13px] font-semibold outline-none focus:border-forest/40" />
          </label>
        </div>
        <input type="range" min={50} max={PRICE_MAX} step={50} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} aria-label="Maximum price slider" className="mt-3 w-full accent-[#1f5c4a]" />
        <div className="mt-1 flex justify-between text-[12px] text-ink-50">
          <span className="tnum">{money(minPrice)}</span>
          <span className="tnum font-semibold text-ink">up to {money(maxPrice)}{maxPrice === PRICE_MAX ? '+' : ''}</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {BANDS.map((b) => {
            const on = minPrice === b.min && maxPrice === b.max;
            const n = counts.priceBase.filter((p) => p.price >= b.min && (b.max === PRICE_MAX || p.price <= b.max)).length;
            return (
              <button key={b.label} type="button" onClick={() => setBand(b)} aria-pressed={on} className={cx('rounded-full border px-2.5 py-1 text-[12px] font-semibold transition', on ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink-70 hover:border-forest/40', n === 0 && !on && 'opacity-45')}>
                {b.label} <span className={cx('tnum', on ? 'text-white/70' : 'text-ink-35')}>{n}</span>
              </button>
            );
          })}
        </div>
      </Group>

      <Group title="Discount" active={minOff ? 1 : 0}>
        <div role="radiogroup" aria-label="Discount">
          {DISCOUNTS.map((d) => (
            <Pick key={d} label={`${d}% off or more`} checked={minOff === d} onChange={() => setMinOff(minOff === d ? 0 : d)} count={counts.offBase.filter((p) => p.discount >= d).length} />
          ))}
        </div>
      </Group>

      <Group title="Customer rating" active={minRating ? 1 : 0}>
        <div role="radiogroup" aria-label="Customer rating">
          {RATINGS.map((r) => (
            <Pick key={r} label={<Stars value={r} />} checked={minRating === r} onChange={() => setMinRating(minRating === r ? 0 : r)} count={counts.ratingBase.filter((p) => p.rating >= r).length} />
          ))}
        </div>
      </Group>

      <Group title="Product type" active={kinds.length} defaultOpen={false}>
        {ALL_KINDS.map((k) => (
          <Check key={k} label={KIND_LABEL[k] || k} checked={kinds.includes(k)} onChange={() => toggle(kinds, setKinds)(k)} count={counts.kind.get(k) || 0} />
        ))}
      </Group>

      <Group title="Size" active={sizes.length} defaultOpen={false}>
        <div className="flex flex-wrap gap-1.5">
          {sizeList.map((s) => {
            const on = sizes.includes(s);
            const n = counts.size.get(s) || 0;
            return (
              <button key={s} type="button" onClick={() => toggle(sizes, setSizes)(s)} aria-pressed={on} className={cx('tnum rounded-full border px-2.5 py-1 text-[12px] font-semibold transition', on ? 'border-forest bg-forest text-white' : 'border-line bg-white text-ink-70 hover:border-forest/40', n === 0 && !on && 'opacity-45')}>
                {s}
              </button>
            );
          })}
        </div>
        <button type="button" onClick={() => setAllSizes((v) => !v)} className="mt-2 text-[12.5px] font-bold text-forest hover:underline">
          {allSizes ? 'Show common sizes' : `Show all ${ALL_SIZES.length} sizes`}
        </button>
      </Group>

      <Group title="Material" active={mats.length}>
        {MATERIALS.map((m) => (
          <Check key={m} label={m} checked={mats.includes(m)} onChange={() => toggle(mats, setMats)(m)} count={counts.mat.get(m) || 0} />
        ))}
      </Group>

      <Group title="Brand tier" active={tiers.length} defaultOpen={false}>
        {TIERS.map((t) => (
          <Check key={t.key} label={t.label} note={t.note} checked={tiers.includes(t.key)} onChange={() => toggle(tiers, setTiers)(t.key)} count={counts.tier.get(t.key) || 0} />
        ))}
      </Group>

      <Group title="Collections" active={cols.length} defaultOpen={false}>
        {COLLECTIONS.map((c) => (
          <Check key={c} label={c === 'Value' ? 'Value picks' : c === 'New' ? 'New arrivals' : 'Bestsellers'} checked={cols.includes(c)} onChange={() => toggle(cols, setCols)(c)} count={counts.col.get(c) || 0} />
        ))}
      </Group>

      <Group title="Availability" active={(inStockOnly ? 1 : 0) + (dealOnly ? 1 : 0)}>
        <Check label="In stock only" checked={inStockOnly} onChange={() => setInStock((v) => !v)} count={counts.avail.filter((p) => p.stock > 0 && (!dealOnly || p.discount >= 15)).length} />
        <Check label="On offer (15%+ off)" checked={dealOnly} onChange={() => setDealOnly((v) => !v)} count={counts.avail.filter((p) => p.discount >= 15 && (!inStockOnly || p.stock > 0)).length} />
      </Group>
    </>
  );

  /* chips for every active choice, each removable */
  const chips = [
    ...cats.map((c) => [categoryName(c), () => toggle(cats, setCats)(c)]),
    ...sups.map((s) => [suppliers.find((x) => x.slug === s)?.name ?? s, () => toggle(sups, setSups)(s)]),
    ...(priceActive ? [[`${money(minPrice)} – ${maxPrice < PRICE_MAX ? money(maxPrice) : 'any'}`, () => { setMinPrice(0); setMaxPrice(PRICE_MAX); }]] : []),
    ...(minOff ? [[`${minOff}%+ off`, () => setMinOff(0)]] : []),
    ...(minRating ? [[`${minRating}★ & up`, () => setMinRating(0)]] : []),
    ...kinds.map((k) => [KIND_LABEL[k] || k, () => toggle(kinds, setKinds)(k)]),
    ...sizes.map((s) => [`Size ${s}`, () => toggle(sizes, setSizes)(s)]),
    ...mats.map((m) => [m, () => toggle(mats, setMats)(m)]),
    ...tiers.map((t) => [`${TIERS.find((x) => x.key === t)?.label ?? t} brands`, () => toggle(tiers, setTiers)(t)]),
    ...cols.map((c) => [c, () => toggle(cols, setCols)(c)]),
    ...(dealOnly ? [['On offer', () => setDealOnly(false)]] : []),
    ...(inStockOnly ? [['In stock', () => setInStock(false)]] : []),
  ];

  return (
    <Container className="pb-12 pt-5">
      {/* demo: page header card */}
      <div className="rounded-[24px] border border-white/80 bg-white/70 p-5 shadow-card backdrop-blur sm:p-6">
        <Breadcrumbs
          items={[{ label: 'Home', to: '/' }, { label: cats.length === 1 ? categoryName(cats[0]) : 'All products' }]}
        />
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-baseline gap-x-2 text-[clamp(1.6rem,4vw,2.1rem)] font-semibold text-ink">
              {q ? `“${q}”` : cats.length === 1 ? categoryName(cats[0]) : 'Every fitting we stock'}
              <span className="tnum text-[14px] font-semibold text-ink-50">— {results.length.toLocaleString('en-IN')} products</span>
            </h1>
            <p className="mt-1.5 text-[14px] text-ink-50">
              Filter by brand, size, type, price, discount and rating{q ? ' — showing matches for your search' : ''}.
            </p>
          </div>
          <button onClick={() => setDrawer(true)} className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-[13px] font-bold text-forest lg:hidden">
            <Icon name="filter" size={15} /> Filters
            {activeCount > 0 && <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-forest px-1 text-[11px] text-white">{activeCount}</span>}
          </button>
        </div>
      </div>

      {/* demo: smart filters row — quick toggles over the same filter state */}
      <div className="mt-4 flex items-center gap-3 rounded-[18px] bg-white/40 px-3 py-2.5 sm:px-4">
        <span className="hidden shrink-0 text-[11px] font-bold uppercase tracking-[0.18em] text-ink sm:inline">Quick filters</span>
        <div className="no-bar -my-1 flex gap-2 overflow-x-auto py-1">
          {[
            { label: 'In stock', icon: 'check', on: inStockOnly, act: () => setInStock((v) => !v) },
            { label: 'On offer', icon: 'tag', on: dealOnly, act: () => setDealOnly((v) => !v) },
            { label: '20%+ off', icon: 'sparkle', on: minOff === 20, act: () => setMinOff(minOff === 20 ? 0 : 20) },
            { label: '4.5★ & up', icon: 'star', on: minRating === 4.5, act: () => setMinRating(minRating === 4.5 ? 0 : 4.5) },
            { label: 'Bestsellers', icon: 'layers', on: cols.includes('Bestseller'), act: () => toggle(cols, setCols)('Bestseller') },
            { label: 'Premium brands', icon: 'shieldCheck', on: tiers.includes('premium'), act: () => toggle(tiers, setTiers)('premium') },
            ...MATERIALS.map((m) => ({ label: m, icon: 'droplet', on: mats.includes(m), act: () => toggle(mats, setMats)(m) })),
            { label: 'Top rated', icon: 'star', on: sort === 'rating', act: () => setSort(sort === 'rating' ? 'relevance' : 'rating') },
            { label: 'Biggest discount', icon: 'sparkle', on: sort === 'discount', act: () => setSort(sort === 'discount' ? 'relevance' : 'discount') },
            { label: 'Newest', icon: 'clock', on: sort === 'new', act: () => setSort(sort === 'new' ? 'relevance' : 'new') },
          ].map((c) => (
            <button
              key={c.label}
              onClick={c.act}
              aria-pressed={c.on}
              className={cx(
                'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13.5px] font-semibold transition',
                c.on ? 'border-forest bg-forest text-white shadow-btn' : 'border-line bg-white text-ink-70 hover:border-forest/40 hover:text-forest'
              )}
            >
              <Icon name={c.icon} size={14} /> {c.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[136px] overflow-hidden rounded-[24px] border border-white/80 bg-white shadow-card">
            <div className="flex items-center justify-between border-b border-line-soft px-4 py-4">
              <div>
                <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-ink">Filters</h2>
                <p className="mt-0.5 text-[12px] text-ink-50">{activeCount} active filter{activeCount === 1 ? '' : 's'}</p>
              </div>
              {activeCount > 0 && <button onClick={clearAll} className="text-[12px] font-bold text-clay transition hover:text-clay-600">Clear all</button>}
            </div>
            <div className="max-h-[calc(100vh-240px)] overflow-y-auto">{filters}</div>
          </div>
        </aside>

        <div className="min-w-0 rounded-[24px] border border-white/80 bg-white/50 p-3 sm:p-4">
          {/* demo: results toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[16px] bg-white/70 px-3 py-2.5">
            <div>
              <p className="tnum text-[14px] font-bold text-ink">{results.length.toLocaleString('en-IN')} products</p>
              <p className="tnum text-[12px] text-ink-50">Showing {Math.min(shown.length, results.length).toLocaleString('en-IN')} · prices and stock from the catalogue</p>
            </div>
            <label className="relative flex h-11 items-center rounded-[12px] border border-line bg-white pl-3.5 pr-9">
              <span className="mr-2 text-[10.5px] font-bold uppercase tracking-[0.1em] text-ink-35">Sort</span>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className="cursor-pointer appearance-none bg-transparent text-[14px] font-semibold text-ink outline-none">
                {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <Icon name="chevronDown" size={14} className="pointer-events-none absolute right-3 text-ink-50" />
            </label>
          </div>

          {chips.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {chips.map(([label, remove], i) => (
                <button key={`${i}-${label}`} onClick={remove} aria-label={`Remove filter ${label}`}>
                  <Badge tone="neutral" className="cursor-pointer bg-white hover:text-forest">{label}<Icon name="close" size={11} strokeWidth={2.4} /></Badge>
                </button>
              ))}
              <button onClick={clearAll} className="px-1 text-[12.5px] font-bold text-clay transition hover:text-clay-600">Clear all</button>
            </div>
          )}

          {booting ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-[18px] bg-white"><Skeleton className="aspect-[4/3] w-full rounded-none" /><div className="p-4"><Skeleton className="h-3 w-1/3" /><Skeleton className="mt-2 h-4 w-3/4" /><Skeleton className="mt-3 h-5 w-1/2" /></div></div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-[18px] border border-dashed border-[#cad8d2] bg-[#f4f7f5] py-20 text-center">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-forest shadow-card"><Icon name="search" size={22} /></span>
              <p className="mt-4 text-[18px] font-semibold text-ink">Nothing matches those filters</p>
              <p className="mt-1.5 text-[13px] text-ink-50">Try widening the price range or clearing a filter.</p>
              <div className="mt-5"><Button onClick={clearAll} variant="outline">Clear all filters</Button></div>
            </div>
          ) : (
            <>
              <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 2xl:grid-cols-4">
                {shown.map((p) => (
                  <motion.div key={p.id} layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28, ease: EASE }}>
                    <ProductCard product={p} />
                  </motion.div>
                ))}
              </motion.div>
              {shown.length < results.length && (
                <div className="mt-8 text-center">
                  <Button onClick={() => setPage((p) => p + 1)} variant="outline" size="lg">
                    Load more ({(results.length - shown.length).toLocaleString('en-IN')} left)
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* mobile filter sheet */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} className="fixed inset-0 z-[60] bg-ink/35 lg:hidden" />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 34, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-[61] flex max-h-[88dvh] flex-col rounded-t-[24px] bg-white lg:hidden"
            >
              <div className="flex items-center justify-between border-b border-line-soft px-5 py-4">
                <div>
                  <h2 className="text-[17px] font-bold text-ink">Filters</h2>
                  <p className="text-[12px] text-ink-50">{activeCount} active</p>
                </div>
                <button onClick={() => setDrawer(false)} aria-label="Close filters" className="grid h-10 w-10 place-items-center rounded-full bg-sunk text-forest"><Icon name="close" size={18} /></button>
              </div>
              <div className="flex-1 overflow-y-auto">{filters}</div>
              <div className="flex gap-3 border-t border-line-soft px-5 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
                <Button variant="outline" onClick={clearAll} full>Clear</Button>
                <Button onClick={() => setDrawer(false)} full>Show {results.length.toLocaleString('en-IN')}</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Container>
  );
}
