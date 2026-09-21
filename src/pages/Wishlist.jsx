import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import Icon from '../components/Icon';
import { Button, Container, Breadcrumbs } from '../components/ui';
import { useWishlist } from '../context/WishlistContext';
import { categoryName } from '../data/catalog';
import { cx } from '../lib/format';

/* Wishlist: forest banner, filter chips, saved grid.
   (Client review 2: the KPI stat cards were removed; filter by category added.
   Review 3: the standard In stock / On offer filters sit alongside the
   categories, so the row is useful before anything is saved too.) */
export default function Wishlist() {
  const { items } = useWishlist();
  const [cat, setCat] = useState('');
  const [inStockOnly, setInStock] = useState(false);
  const [dealOnly, setDealOnly] = useState(false);

  /* tabs come from the categories actually present in the wishlist */
  const tabs = useMemo(() => {
    const m = new Map();
    items.forEach((p) => m.set(p.category, (m.get(p.category) || 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([slug, n]) => ({ slug, n, name: categoryName(slug) }));
  }, [items]);

  const active = cat && tabs.some((t) => t.slug === cat) ? cat : '';
  const inCategory = active ? items.filter((p) => p.category === active) : items;
  /* Same rules as Shop, so the two pages agree on what "on offer" means. */
  const shown = inCategory.filter((p) => (!inStockOnly || p.stock > 0) && (!dealOnly || p.discount >= 15));
  const quick = [
    { key: 'stock', label: 'In stock', on: inStockOnly, toggle: () => setInStock((v) => !v),
      n: inCategory.filter((p) => p.stock > 0 && (!dealOnly || p.discount >= 15)).length },
    { key: 'offer', label: 'On offer', on: dealOnly, toggle: () => setDealOnly((v) => !v),
      n: inCategory.filter((p) => p.discount >= 15 && (!inStockOnly || p.stock > 0)).length },
  ];

  return (
    <Container className="pb-12 pt-5">
      <Breadcrumbs className="mb-4" items={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]} />

      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="forest-band relative overflow-hidden rounded-[24px] p-6 text-white shadow-pop sm:p-8"
      >
        <div className="field-dots-dark pointer-events-none absolute inset-0 opacity-40" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d5e5df]">Your saved fittings</p>
            <h1 className="mt-2 text-[clamp(1.8rem,5vw,2.4rem)] font-semibold text-white">My wishlist</h1>
            <p className="mt-1 text-[14px] text-sunk">Products you&rsquo;ve saved for later.</p>
          </div>
          <Link to="/shop" className="w-fit rounded-md bg-white px-5 py-3 text-sm font-bold text-forest shadow-lg transition hover:-translate-y-0.5">
            Explore more products
          </Link>
        </div>
      </motion.section>

      <div className="mb-4 mt-8 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[clamp(1.3rem,3vw,1.6rem)] font-semibold">Saved products</h2>
          <p className="mt-1 text-[14px] text-ink-50">Prices and stock come straight from the catalogue.</p>
        </div>
        <span className="tnum shrink-0 rounded-full bg-sunk px-3 py-1 text-[12px] font-bold text-forest">{items.length} saved</span>
      </div>

      {tabs.length > 0 && (
        <div className="mb-5 space-y-2">
          <div className="no-bar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
            {quick.map((q) => (
              <button
                key={q.key}
                type="button"
                aria-pressed={q.on}
                onClick={q.toggle}
                className={cx(
                  'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13.5px] font-semibold transition',
                  q.on ? 'border-forest bg-forest text-white shadow-btn' : 'border-line bg-white text-ink-70 hover:border-forest/40 hover:text-forest'
                )}
              >
                <Icon name={q.key === 'stock' ? 'check' : 'tag'} size={14} />
                {q.label}
                <span className={cx('tnum rounded-full px-1.5 text-[11px] font-bold', q.on ? 'bg-white/20 text-white' : 'bg-sunk text-ink-50')}>{q.n}</span>
              </button>
            ))}
          </div>

          <div role="tablist" aria-label="Filter by category" className="no-bar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
            {[{ slug: '', name: 'All', n: items.length }, ...tabs].map((t) => {
              const on = active === t.slug;
              return (
                <button
                  key={t.slug || 'all'}
                  role="tab"
                  aria-selected={on}
                  onClick={() => setCat(t.slug)}
                  className={cx(
                    'flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13.5px] font-semibold transition',
                    on ? 'border-forest bg-forest text-white shadow-btn' : 'border-line bg-white text-ink-70 hover:border-forest/40 hover:text-forest'
                  )}
                >
                  {t.name}
                  <span className={cx('tnum rounded-full px-1.5 text-[11px] font-bold', on ? 'bg-white/20 text-white' : 'bg-sunk text-ink-50')}>{t.n}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[#cad8d2] bg-[#f4f7f5] py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-forest shadow-card"><Icon name="heart" size={24} /></span>
          <p className="mt-4 text-[18px] font-semibold text-forest">Nothing saved yet</p>
          <p className="mt-1.5 text-[13px] text-ink-50">Tap the heart on any product to keep it here.</p>
          <div className="mt-5"><Button to="/shop" iconRight="arrowRight">Browse the catalogue</Button></div>
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-line bg-white py-12 text-center">
          <p className="text-[15px] font-semibold text-forest">Nothing saved matches these filters</p>
          <p className="mt-1.5 text-[13px] text-ink-50">Clear them to see all {items.length} saved product{items.length !== 1 && 's'}.</p>
          <button
            type="button"
            onClick={() => { setCat(''); setInStock(false); setDealOnly(false); }}
            className="mt-4 rounded-full border border-line px-4 py-2 text-[13px] font-bold text-forest transition hover:border-forest"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {shown.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </Container>
  );
}
