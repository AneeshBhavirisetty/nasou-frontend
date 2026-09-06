import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import Reveal from '../components/Reveal';
import { Button, Container, Breadcrumbs } from '../components/ui';
import { products, categories, categoryName } from '../data/catalog';
import { money, cx } from '../lib/format';

const TIERS = [
  { key: 'all', label: 'All offers', min: 10 },
  { key: '15', label: '15%+ off', min: 15 },
  { key: '25', label: '25%+ off', min: 25 },
  { key: '30', label: '30%+ off', min: 30 },
];
const PAGE = 48;

export default function Deals() {
  const [tier, setTier] = useState('all');
  const [cat, setCat] = useState('');
  const [page, setPage] = useState(1);

  const min = TIERS.find((t) => t.key === tier).min;

  const all = useMemo(
    () =>
      products
        .filter((p) => p.discount >= 10 && p.stock > 0)
        .sort((a, b) => b.discount - a.discount || (b.mrp - b.price) - (a.mrp - a.price)),
    []
  );

  const filtered = useMemo(
    () => all.filter((p) => p.discount >= min && (!cat || p.category === cat)),
    [all, min, cat]
  );
  const shown = filtered.slice(0, page * PAGE);

  const topSaving = all[0] ? all[0].mrp - all[0].price : 0;
  const maxOff = all[0]?.discount ?? 0;
  const catCounts = categories
    .map((c) => ({ ...c, n: all.filter((p) => p.category === c.slug).length }))
    .filter((c) => c.n > 0);

  return (
    <>
      <section className="border-b border-line bg-forest text-white">
        <div className="field-dots-dark">
          <Container className="py-10 sm:py-14">
            <Breadcrumbs
              className="mb-4 [&_a]:text-white/60 [&_a:hover]:text-white [&_span]:text-white/50 [&_.font-semibold]:!text-white"
              items={[{ label: 'Home', to: '/' }, { label: 'Deals' }]}
            />
            <p className="eyebrow mb-2 text-emerald-100/80">Live offers</p>
            <h1 className="display-serif text-[clamp(1.9rem,6vw,3.4rem)] text-white">
              Up to {maxOff}% off<br className="hidden sm:block" /> plumbing fittings
            </h1>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-white/60">
              {all.length.toLocaleString('en-IN')} in-stock SKUs on offer right now — verified prices,
              biggest saving <span className="tnum font-semibold text-white">{money(topSaving)}</span> per piece.
              GST invoice on every order.
            </p>
          </Container>
        </div>
      </section>

      <Container className="py-8 sm:py-10">
        {/* filters */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          {TIERS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTier(t.key); setPage(1); }}
              className={cx(
                'rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition',
                tier === t.key ? 'border-forest bg-forest text-white' : 'border-line text-ink-70 hover:border-ink-35'
              )}
            >
              {t.label}
            </button>
          ))}
          <span className="mx-1 hidden h-4 w-px bg-line sm:block" />
          <select
            value={cat}
            onChange={(e) => { setCat(e.target.value); setPage(1); }}
            className="h-9 rounded-full border border-line bg-white px-3 text-[12.5px] font-semibold outline-none"
          >
            <option value="">All categories</option>
            {catCounts.map((c) => <option key={c.slug} value={c.slug}>{c.name} ({c.n})</option>)}
          </select>
        </div>

        <p className="mb-4 text-[13px] text-ink-50">
          <span className="tnum font-semibold text-ink">{filtered.length.toLocaleString('en-IN')}</span> deals
          {cat && <> in {categoryName(cat)}</>}
        </p>

        {filtered.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line bg-white py-16 text-center">
            <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sunk text-ink-35"><Icon name="tag" size={22} /></span>
            <p className="mt-4 font-serif text-[18px] font-semibold">No deals match that filter</p>
            <div className="mt-5"><Button onClick={() => { setTier('all'); setCat(''); }} variant="outline">Show all offers</Button></div>
          </div>
        ) : (
          <>
            <Reveal stagger={0.04} className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {shown.map((p) => <Reveal.Item key={p.id}><ProductCard product={p} /></Reveal.Item>)}
            </Reveal>
            {shown.length < filtered.length && (
              <div className="mt-8 text-center">
                <Button variant="outline" size="lg" onClick={() => setPage((p) => p + 1)}>
                  Load more ({(filtered.length - shown.length).toLocaleString('en-IN')} left)
                </Button>
              </div>
            )}
          </>
        )}

        <p className="mt-10 flex items-center gap-2 border-t border-line pt-5 text-[12px] text-ink-35">
          <Icon name="clock" size={13} /> Offer prices are illustrative in this demo and change when the catalogue is regenerated.
          <Link to="/shop" className="ml-auto font-semibold text-emerald-600">Browse the full catalogue →</Link>
        </p>
      </Container>
    </>
  );
}
