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

function Group({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line-soft px-4 py-4 last:border-0">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-[14px] font-bold text-ink">{title}</span>
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

function Check({ checked, onChange, label, count }) {
  return (
    <label className="group flex cursor-pointer items-center gap-3 rounded-[10px] px-1 py-2 transition hover:bg-sunk/50">
      <span className={cx('grid h-5 w-5 shrink-0 place-items-center rounded-[6px] border transition', checked ? 'border-forest bg-forest text-white' : 'border-[#cad8d2] bg-white group-hover:border-forest/50')}>
        {checked && <Icon name="check" size={12} strokeWidth={3} />}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="flex-1 text-[14px] text-ink-70 group-hover:text-ink">{label}</span>
      {count != null && <span className="tnum text-[12px] text-ink-35">{count}</span>}
    </label>
  );
}

export default function Shop() {
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';

  const [cats, setCats] = useState(() => (params.get('category') ? [params.get('category')] : []));
  const [mats, setMats] = useState([]);
  const [sups, setSups] = useState([]);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [inStockOnly, setInStock] = useState(false);
  const [dealOnly, setDealOnly] = useState(params.get('deal') === '1');
  const [sort, setSort] = useState(params.get('sort') ?? 'relevance');
  const [drawer, setDrawer] = useState(false);
  const [page, setPage] = useState(1);
  const [booting, setBooting] = useState(true);

  useEffect(() => { const t = setTimeout(() => setBooting(false), 260); return () => clearTimeout(t); }, []);
  useEffect(() => { setPage(1); }, [q, cats, mats, sups, maxPrice, inStockOnly, dealOnly, sort]);

  useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (cats.length === 1) next.set('category', cats[0]);
    if (dealOnly) next.set('deal', '1');
    if (sort !== 'relevance') next.set('sort', sort);
    setParams(next, { replace: true });
  }, [q, cats, dealOnly, sort, setParams]);

  const toggle = (list, setList) => (v) => setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const terms = needle ? needle.split(/\s+/) : [];
    let out = products.filter((p) => {
      if (terms.length) {
        const hay = `${p.name} ${p.sku} ${p.supplierName} ${p.size} ${p.material} ${p.description}`.toLowerCase();
        if (!terms.every((t) => hay.includes(t))) return false;
      }
      if (cats.length && !cats.includes(p.category)) return false;
      if (mats.length && !mats.includes(p.material)) return false;
      if (sups.length && !sups.includes(p.supplier)) return false;
      if (p.price > maxPrice) return false;
      if (inStockOnly && p.stock <= 0) return false;
      if (dealOnly && p.discount < 15) return false;
      return true;
    });
    const by = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount,
      discount: (a, b) => b.discount - a.discount,
      new: (a, b) => Number(b.badges.includes('New')) - Number(a.badges.includes('New')) || b.row - a.row,
    };
    if (by[sort]) out = [...out].sort(by[sort]);
    return out;
  }, [q, cats, mats, sups, maxPrice, inStockOnly, dealOnly, sort]);

  const shown = results.slice(0, page * PAGE);
  const activeCount = cats.length + mats.length + sups.length + (maxPrice < PRICE_MAX ? 1 : 0) + (inStockOnly ? 1 : 0) + (dealOnly ? 1 : 0);
  const clearAll = () => { setCats([]); setMats([]); setSups([]); setMaxPrice(PRICE_MAX); setInStock(false); setDealOnly(false); };

  const topSuppliers = suppliers.slice(0, 12);

  const filters = (
    <>
      <Group title="Category">
        {categories.map((c) => (
          <Check key={c.slug} label={c.name} checked={cats.includes(c.slug)} onChange={() => toggle(cats, setCats)(c.slug)} count={c.count} />
        ))}
      </Group>
      <Group title="Material">
        {MATERIALS.map((m) => (
          <Check key={m} label={m} checked={mats.includes(m)} onChange={() => toggle(mats, setMats)(m)} count={products.filter((p) => p.material === m).length} />
        ))}
      </Group>
      <Group title="Price">
        <input type="range" min={50} max={PRICE_MAX} step={50} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-[#1f5c4a]" />
        <div className="mt-2 flex justify-between text-[12px] text-ink-50">
          <span className="tnum">{money(50)}</span>
          <span className="tnum font-semibold text-ink">up to {money(maxPrice)}{maxPrice === PRICE_MAX ? '+' : ''}</span>
        </div>
      </Group>
      <Group title="Brand" defaultOpen={false}>
        {topSuppliers.map((s) => (
          <Check key={s.slug} label={s.name} checked={sups.includes(s.slug)} onChange={() => toggle(sups, setSups)(s.slug)} count={s.count} />
        ))}
      </Group>
      <Group title="Availability">
        <Check label="In stock only" checked={inStockOnly} onChange={() => setInStock((v) => !v)} />
        <Check label="On offer" checked={dealOnly} onChange={() => setDealOnly((v) => !v)} />
      </Group>
    </>
  );

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
              Browse every family by size, material and supplier{q ? ' — showing matches for your search' : ''}.
            </p>
          </div>
          <button onClick={() => setDrawer(true)} className="flex h-11 items-center gap-2 rounded-md border border-line bg-white px-4 text-[13px] font-bold text-forest lg:hidden">
            <Icon name="filter" size={15} /> Filters
            {activeCount > 0 && <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-forest px-1 text-[11px] text-white">{activeCount}</span>}
          </button>
        </div>
      </div>

      {/* demo: smart filters row — our existing filters and sorts as chips */}
      <div className="mt-4 flex items-center gap-3 rounded-[18px] bg-white/40 px-3 py-2.5 sm:px-4">
        <span className="hidden shrink-0 text-[11px] font-bold uppercase tracking-[0.18em] text-ink sm:inline">Quick filters</span>
        <div className="no-bar -my-1 flex gap-2 overflow-x-auto py-1">
          {[
            { label: 'In stock', icon: 'check', on: inStockOnly, act: () => setInStock((v) => !v) },
            { label: 'On offer', icon: 'tag', on: dealOnly, act: () => setDealOnly((v) => !v) },
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
          {activeCount > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {[...cats.map((c) => ['cat', c, categoryName(c)]), ...mats.map((m) => ['mat', m, m]), ...sups.map((s) => ['sup', s, suppliers.find((x) => x.slug === s)?.name ?? s])].map(([type, val, label]) => (
                <button
                  key={type + val}
                  onClick={() => {
                    if (type === 'cat') toggle(cats, setCats)(val);
                    if (type === 'mat') toggle(mats, setMats)(val);
                    if (type === 'sup') toggle(sups, setSups)(val);
                  }}
                >
                  <Badge tone="neutral" className="cursor-pointer bg-white hover:text-forest">{label}<Icon name="close" size={11} strokeWidth={2.4} /></Badge>
                </button>
              ))}
              {dealOnly && <button onClick={() => setDealOnly(false)}><Badge tone="clay" className="cursor-pointer">On offer <Icon name="close" size={11} strokeWidth={2.4} /></Badge></button>}
              {inStockOnly && <button onClick={() => setInStock(false)}><Badge tone="ok" className="cursor-pointer">In stock <Icon name="close" size={11} strokeWidth={2.4} /></Badge></button>}
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
              className="fixed inset-x-0 bottom-0 z-[61] max-h-[86dvh] overflow-y-auto rounded-t-[24px] bg-white pb-[calc(1.25rem+env(safe-area-inset-bottom))] lg:hidden"
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line-soft bg-white px-5 py-4">
                <div>
                  <h2 className="text-[17px] font-bold text-ink">Filters</h2>
                  <p className="text-[12px] text-ink-50">{activeCount} active</p>
                </div>
                <button onClick={() => setDrawer(false)} aria-label="Close filters" className="grid h-10 w-10 place-items-center rounded-full bg-sunk text-forest"><Icon name="close" size={18} /></button>
              </div>
              {filters}
              <div className="mt-2 flex gap-3 px-5">
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
