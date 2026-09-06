import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import { Badge, Button, Container, Divider } from '../components/ui';
import { categories, categoryName, products } from '../data/catalog';
import { cx, money } from '../lib/format';

const SORTS = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'rating', label: 'Top rated' },
  { key: 'eco', label: 'Best eco score' },
  { key: 'new', label: 'Newest' },
];

const ATTRIBUTES = ['Repairable', 'Farm direct', 'New', 'Deal'];
const PRICE_MAX = 9000;

function Group({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-line py-5 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between text-left"
      >
        <span className="text-[13px] font-bold uppercase tracking-[0.07em] text-ink-70">
          {title}
        </span>
        <Icon
          name="chevronDown"
          size={15}
          className={cx('text-ink-35 transition', open && 'rotate-180')}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="pt-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Check({ checked, onChange, label, count }) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 py-1.5">
      <span
        className={cx(
          'grid h-[18px] w-[18px] shrink-0 place-items-center rounded border transition',
          checked
            ? 'border-forest bg-forest text-white'
            : 'border-line bg-white group-hover:border-ink-35'
        )}
      >
        {checked && <Icon name="check" size={11} strokeWidth={3} />}
      </span>
      <input type="checkbox" checked={checked} onChange={onChange} className="sr-only" />
      <span className="flex-1 text-[13.5px] text-ink-70 group-hover:text-ink">{label}</span>
      {count != null && <span className="tnum text-[12px] text-ink-35">{count}</span>}
    </label>
  );
}

export default function Shop() {
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const [cats, setCats] = useState(() => (params.get('category') ? [params.get('category')] : []));
  const [attrs, setAttrs] = useState(() => (params.get('deal') ? ['Deal'] : []));
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [minEco, setMinEco] = useState(0);
  const [inStockOnly, setInStock] = useState(false);
  const [sameDayOnly, setSameDay] = useState(false);
  const [sort, setSort] = useState(params.get('sort') ?? 'relevance');
  const [drawer, setDrawer] = useState(false);

  /* Keep the URL honest — a filtered view should be shareable. */
  useEffect(() => {
    const next = new URLSearchParams();
    if (q) next.set('q', q);
    if (cats.length === 1) next.set('category', cats[0]);
    if (attrs.includes('Deal')) next.set('deal', '1');
    if (sort !== 'relevance') next.set('sort', sort);
    setParams(next, { replace: true });
  }, [q, cats, attrs, sort, setParams]);

  const toggle = (list, setList) => (v) =>
    setList(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const results = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = products.filter((p) => {
      if (needle) {
        const hay = `${p.name} ${p.maker} ${p.origin} ${p.blurb} ${categoryName(p.category)}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (cats.length && !cats.includes(p.category)) return false;
      if (attrs.length && !attrs.every((a) => p.tags.includes(a))) return false;
      if (p.price > maxPrice) return false;
      if (p.ecoScore < minEco) return false;
      if (inStockOnly && p.stock === 0) return false;
      if (sameDayOnly && !p.sameDay) return false;
      return true;
    });

    const by = {
      'price-asc': (a, b) => a.price - b.price,
      'price-desc': (a, b) => b.price - a.price,
      rating: (a, b) => b.rating - a.rating,
      eco: (a, b) => b.ecoScore - a.ecoScore,
      new: (a, b) => Number(b.tags.includes('New')) - Number(a.tags.includes('New')),
    };
    if (by[sort]) out = [...out].sort(by[sort]);
    return out;
  }, [q, cats, attrs, maxPrice, minEco, inStockOnly, sameDayOnly, sort]);

  const activeCount =
    cats.length + attrs.length + (maxPrice < PRICE_MAX ? 1 : 0) +
    (minEco > 0 ? 1 : 0) + (inStockOnly ? 1 : 0) + (sameDayOnly ? 1 : 0);

  const clearAll = () => {
    setCats([]); setAttrs([]); setMaxPrice(PRICE_MAX);
    setMinEco(0); setInStock(false); setSameDay(false);
  };

  const filters = (
    <>
      <Group title="Category">
        {categories.map((c) => (
          <Check
            key={c.slug}
            label={c.name}
            checked={cats.includes(c.slug)}
            onChange={() => toggle(cats, setCats)(c.slug)}
            count={products.filter((p) => p.category === c.slug).length}
          />
        ))}
      </Group>

      <Group title="Price">
        <input
          type="range"
          min={200}
          max={PRICE_MAX}
          step={100}
          value={maxPrice}
          onChange={(e) => setMaxPrice(Number(e.target.value))}
          className="w-full accent-[#12805c]"
        />
        <div className="mt-2 flex justify-between text-[12.5px] text-ink-50">
          <span className="tnum">{money(200)}</span>
          <span className="tnum font-semibold text-ink">up to {money(maxPrice)}</span>
        </div>
      </Group>

      <Group title="Eco score">
        <div className="flex gap-1.5">
          {[0, 80, 85, 90].map((v) => (
            <button
              key={v}
              onClick={() => setMinEco(v)}
              className={cx(
                'tnum flex-1 rounded-md border px-2 py-2 text-[12.5px] font-semibold transition',
                minEco === v
                  ? 'border-forest bg-forest text-white'
                  : 'border-line bg-white text-ink-70 hover:border-ink-35'
              )}
            >
              {v === 0 ? 'Any' : `${v}+`}
            </button>
          ))}
        </div>
      </Group>

      <Group title="Attributes">
        {ATTRIBUTES.map((a) => (
          <Check
            key={a}
            label={a}
            checked={attrs.includes(a)}
            onChange={() => toggle(attrs, setAttrs)(a)}
            count={products.filter((p) => p.tags.includes(a)).length}
          />
        ))}
      </Group>

      <Group title="Delivery">
        <Check label="In stock only" checked={inStockOnly} onChange={() => setInStock((v) => !v)} />
        <Check label="Same-day available" checked={sameDayOnly} onChange={() => setSameDay((v) => !v)} />
      </Group>
    </>
  );

  return (
    <Container className="py-10">
      <nav className="mb-6 flex items-center gap-1.5 text-[12.5px] text-ink-50">
        <Link to="/" className="transition hover:text-ink">Home</Link>
        <Icon name="chevronRight" size={13} className="text-ink-35" />
        <span className="font-semibold text-ink">
          {cats.length === 1 ? categoryName(cats[0]) : 'All products'}
        </span>
      </nav>

      <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
        <div>
          <h1 className="text-[clamp(1.9rem,3.5vw,2.6rem)]">
            {q ? `“${q}”` : cats.length === 1 ? categoryName(cats[0]) : 'Every traced listing'}
          </h1>
          <p className="mt-2.5 text-[14px] text-ink-50">
            <span className="tnum font-semibold text-ink">{results.length}</span> products
            {q ? ' matched' : ' available'} · each with a published origin record
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setDrawer(true)}
            className="flex h-10 items-center gap-2 rounded-md border border-line bg-white px-4 text-[13.5px] font-semibold lg:hidden"
          >
            <Icon name="filter" size={15} />
            Filters
            {activeCount > 0 && (
              <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-forest px-1 text-[11px] text-white">
                {activeCount}
              </span>
            )}
          </button>

          <label className="relative flex h-10 items-center rounded-md border border-line bg-white pl-3.5 pr-9">
            <span className="mr-2 text-[12.5px] text-ink-35">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="cursor-pointer appearance-none bg-transparent text-[13.5px] font-semibold outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.key} value={s.key}>{s.label}</option>
              ))}
            </select>
            <Icon
              name="chevronDown"
              size={14}
              className="pointer-events-none absolute right-3 text-ink-35"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[248px_1fr]">
        <aside className="hidden lg:block">
          <div className="sticky top-[126px]">
            <div className="mb-1 flex items-center justify-between">
              <h2 className="text-[13px] font-bold uppercase tracking-[0.07em]">Filters</h2>
              {activeCount > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[12.5px] font-semibold text-clay transition hover:text-clay-600"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="max-h-[calc(100vh-190px)] overflow-y-auto pr-1">{filters}</div>
          </div>
        </aside>

        <div>
          {activeCount > 0 && (
            <div className="mb-5 flex flex-wrap items-center gap-2">
              {cats.map((c) => (
                <button key={c} onClick={() => toggle(cats, setCats)(c)}>
                  <Badge tone="neutral" className="cursor-pointer hover:border-ink-35">
                    {categoryName(c)}
                    <Icon name="close" size={11} strokeWidth={2.4} />
                  </Badge>
                </button>
              ))}
              {attrs.map((a) => (
                <button key={a} onClick={() => toggle(attrs, setAttrs)(a)}>
                  <Badge tone="neutral" className="cursor-pointer hover:border-ink-35">
                    {a}
                    <Icon name="close" size={11} strokeWidth={2.4} />
                  </Badge>
                </button>
              ))}
              {minEco > 0 && (
                <button onClick={() => setMinEco(0)}>
                  <Badge tone="ok" className="cursor-pointer">Eco {minEco}+ <Icon name="close" size={11} strokeWidth={2.4} /></Badge>
                </button>
              )}
              {sameDayOnly && (
                <button onClick={() => setSameDay(false)}>
                  <Badge tone="ok" className="cursor-pointer">Same day <Icon name="close" size={11} strokeWidth={2.4} /></Badge>
                </button>
              )}
            </div>
          )}

          {results.length === 0 ? (
            <div className="rounded-lg border border-dashed border-line bg-white py-24 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sunk text-ink-35">
                <Icon name="search" size={22} />
              </span>
              <p className="mt-4 font-display text-[18px] font-bold">No products match those filters</p>
              <p className="mt-1.5 text-[13.5px] text-ink-50">
                Try widening the price range or clearing a filter.
              </p>
              <div className="mt-6">
                <Button onClick={clearAll} variant="outline">Clear all filters</Button>
              </div>
            </div>
          ) : (
            <motion.div
              layout
              className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              {results.map((p) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                >
                  <ProductCard product={p} />
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile filter sheet */}
      <AnimatePresence>
        {drawer && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setDrawer(false)}
              className="fixed inset-0 z-[60] bg-ink/35 lg:hidden"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 34, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[61] max-h-[85vh] overflow-y-auto rounded-t-xl bg-white p-5 lg:hidden"
            >
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-[17px]">Filters</h2>
                <button onClick={() => setDrawer(false)} className="text-ink-50">
                  <Icon name="close" size={20} />
                </button>
              </div>
              {filters}
              <Divider className="my-5" />
              <div className="flex gap-3">
                <Button variant="outline" onClick={clearAll} full>Clear</Button>
                <Button onClick={() => setDrawer(false)} full>
                  Show {results.length} results
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Container>
  );
}
