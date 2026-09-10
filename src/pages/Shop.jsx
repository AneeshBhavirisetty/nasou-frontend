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
    <div className="border-b border-line py-4 last:border-0">
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-left">
        <span className="text-[12px] font-bold uppercase tracking-[0.07em] text-ink-70">{title}</span>
        <Icon name="chevronDown" size={15} className={cx('text-ink-35 transition', open && 'rotate-180')} />
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
    <label className="group flex cursor-pointer items-center gap-2.5 py-1.5">
      <span className={cx('grid h-[18px] w-[18px] shrink-0 place-items-center rounded border transition', checked ? 'border-forest bg-forest text-white' : 'border-line bg-white group-hover:border-ink-35')}>
        {checked && <Icon name="check" size={11} strokeWidth={3} />}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="flex-1 text-[13px] text-ink-70 group-hover:text-ink">{label}</span>
      {count != null && <span className="tnum text-[11.5px] text-ink-35">{count}</span>}
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
        <input type="range" min={50} max={PRICE_MAX} step={50} value={maxPrice} onChange={(e) => setMaxPrice(Number(e.target.value))} className="w-full accent-[#287052]" />
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
    <Container className="py-8 sm:py-10">
      <Breadcrumbs
        className="mb-5"
        items={[{ label: 'Home', to: '/' }, { label: cats.length === 1 ? categoryName(cats[0]) : 'All products' }]}
      />

      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display-serif text-[clamp(1.7rem,4.5vw,2.6rem)]">
            {q ? `“${q}”` : cats.length === 1 ? categoryName(cats[0]) : 'Every fitting we stock'}
          </h1>
          <p className="mt-2 text-[13.5px] text-ink-50">
            <span className="tnum font-semibold text-ink">{results.length.toLocaleString('en-IN')}</span> products{q ? ' matched' : ' available'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setDrawer(true)} className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3.5 text-[13px] font-semibold lg:hidden">
            <Icon name="filter" size={15} /> Filters
            {activeCount > 0 && <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-forest px-1 text-[11px] text-white">{activeCount}</span>}
          </button>
          <label className="relative flex h-10 items-center rounded-md border border-line bg-white pl-3.5 pr-9">
            <span className="mr-2 hidden text-[12px] text-ink-35 sm:inline">Sort</span>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="cursor-pointer appearance-none bg-transparent text-[13px] font-semibold outline-none">
              {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
            <Icon name="chevronDown" size={14} className="pointer-events-none absolute right-3 text-ink-35" />
          </label>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[120px]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[12px] font-bold uppercase tracking-[0.07em]">Filters</h2>
              {activeCount > 0 && <button onClick={clearAll} className="text-[12px] font-semibold text-clay transition hover:text-clay-600">Clear all</button>}
            </div>
            <div className="max-h-[calc(100vh-180px)] overflow-y-auto pr-1">{filters}</div>
          </div>
        </aside>

        <div>
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
                  <Badge tone="neutral" className="cursor-pointer hover:border-ink-35">{label}<Icon name="close" size={11} strokeWidth={2.4} /></Badge>
                </button>
              ))}
              {dealOnly && <button onClick={() => setDealOnly(false)}><Badge tone="clay" className="cursor-pointer">On offer <Icon name="close" size={11} strokeWidth={2.4} /></Badge></button>}
              {inStockOnly && <button onClick={() => setInStock(false)}><Badge tone="ok" className="cursor-pointer">In stock <Icon name="close" size={11} strokeWidth={2.4} /></Badge></button>}
            </div>
          )}

          {booting ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i}><Skeleton className="aspect-[5/4] w-full" /><Skeleton className="mt-2 h-4 w-3/4" /><Skeleton className="mt-1.5 h-3 w-1/2" /></div>
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-white py-20 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sunk text-ink-35"><Icon name="search" size={22} /></span>
              <p className="mt-4 font-serif text-[18px] font-semibold">Nothing matches those filters</p>
              <p className="mt-1.5 text-[13px] text-ink-50">Try widening the price range or clearing a filter.</p>
              <div className="mt-5"><Button onClick={clearAll} variant="outline">Clear all filters</Button></div>
            </div>
          ) : (
            <>
              <motion.div layout className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
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
              className="fixed inset-x-0 bottom-0 z-[61] max-h-[86dvh] overflow-y-auto rounded-t-xl bg-white p-5 lg:hidden"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[17px] font-bold">Filters</h2>
                <button onClick={() => setDrawer(false)} className="text-ink-50"><Icon name="close" size={20} /></button>
              </div>
              {filters}
              <div className="mt-5 flex gap-3">
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
