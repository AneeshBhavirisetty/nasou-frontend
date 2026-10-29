import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/Icon';
import ProductCard from '../components/ProductCard';
import FilterDropdown from '../components/FilterDropdown';
import { Button, Container, Breadcrumbs } from '../components/ui';
import { products, categoryName, departments, typeKey, typeLabel } from '../data/catalog';
import { money, cx } from '../lib/format';

/* Deals (client review 7, customer item 15): every in-stock product at least
   10% off, filtered by offer size, then Category › Sub-category › Item type and
   Brand — each dropdown counts what the other filters leave. Cards render
   plainly (no scroll-reveal), so a changed filter can never leave the grid
   blank. */

const TIERS = [
  { key: 'all', label: 'All offers', min: 10 },
  { key: '15', label: '15%+ off', min: 15 },
  { key: '25', label: '25%+ off', min: 25 },
  { key: '30', label: '30%+ off', min: 30 },
];
const PAGE = 48;

export default function Deals() {
  const [tier, setTier] = useState('all');
  const [dept, setDept] = useState('');
  const [sub, setSub] = useState('');
  const [kind, setKind] = useState('');
  const [brand, setBrand] = useState('');
  const [page, setPage] = useState(1);

  const min = TIERS.find((t) => t.key === tier).min;
  const all = useMemo(
    () => products
      .filter((p) => p.discount >= 10 && p.stock > 0 && Number(p.price) > 0)
      .sort((a, b) => b.discount - a.discount || (b.mrp - b.price) - (a.mrp - a.price)),
    []
  );

  /* each dropdown counts what the others leave */
  const pass = (p, skip) =>
    p.discount >= min
    && (skip === 'dept' || !dept || p.department === dept)
    && (skip === 'sub' || !sub || p.category === sub)
    && (skip === 'kind' || !kind || typeKey(p.kind) === kind)
    && (skip === 'brand' || !brand || p.supplier === brand);
  const tally = (skip, key) => {
    const m = new Map();
    all.filter((p) => pass(p, skip)).forEach((p) => { const k = key(p); if (k) m.set(k, (m.get(k) || 0) + 1); });
    return m;
  };
  const deptCounts = tally('dept', (p) => p.department);
  const subCounts = tally('sub', (p) => p.category);
  const kindCounts = tally('kind', (p) => typeKey(p.kind));
  const brandCounts = tally('brand', (p) => p.supplier);
  const brandNames = useMemo(() => new Map(all.map((p) => [p.supplier, p.supplierName])), [all]);

  const filtered = all.filter((p) => pass(p));
  const shown = filtered.slice(0, page * PAGE);
  const topSaving = all.reduce((m, p) => Math.max(m, p.mrp - p.price), 0);
  const maxOff = all[0]?.discount ?? 0;
  const anyFilter = tier !== 'all' || dept || sub || kind || brand;
  const reset = (fn) => (v) => { fn(v); setPage(1); };
  const clearAll = () => { setTier('all'); setDept(''); setSub(''); setKind(''); setBrand(''); setPage(1); };

  const subList = dept
    ? (departments.find((d) => d.slug === dept)?.subs || []).map((c) => [c.slug, c.name, subCounts.get(c.slug) || 0, !subCounts.get(c.slug)])
    : [...subCounts.keys()].sort((a, b) => categoryName(a).localeCompare(categoryName(b))).map((c) => [c, categoryName(c), subCounts.get(c)]);

  return (
    <>
      <Container className="pt-5">
        <section className="forest-band band-live relative overflow-hidden rounded-[24px] text-white shadow-pop">
          <div className="field-dots-dark pointer-events-none absolute inset-0 opacity-40" />
          <div className="relative px-6 py-9 sm:px-10 sm:py-12">
            <Breadcrumbs
              className="mb-4 [&_a]:!text-white/70 [&_a:hover]:!text-white [&_span]:text-white/50 [&_.font-semibold]:!text-white"
              items={[{ label: 'Home', to: '/home' }, { label: 'Deals' }]}
            />
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d3e8e3]">Live offers</p>
            <h1 className="font-hero mt-3 text-[clamp(2rem,6vw,3.4rem)] font-medium leading-[1.05] text-white">
              Up to {maxOff}% off<br className="hidden sm:block" /> across every category
            </h1>
            <p className="mt-3 max-w-lg text-[14px] leading-relaxed text-sunk">
              {all.length.toLocaleString('en-IN')} in-stock products on offer right now — verified prices,
              biggest saving <span className="tnum font-semibold text-white">{money(topSaving)}</span> per piece.
              GST invoice on every order.
            </p>
          </div>
        </section>
      </Container>

      <Container className="pb-12 pt-5">
        {/* offer size */}
        <div className="no-bar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {TIERS.map((t) => (
            <button
              key={t.key}
              onClick={() => { setTier(t.key); setPage(1); }}
              className={cx(
                'shrink-0 rounded-full border px-4 py-2 text-[13.5px] font-semibold transition',
                tier === t.key ? 'border-forest bg-forest text-white shadow-btn' : 'border-line bg-white text-ink-70 hover:border-forest/40 hover:text-forest'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* high-level filters */}
        <div className="mb-5 grid grid-cols-2 gap-2.5 rounded-[22px] border border-white/70 bg-white/55 p-3 shadow-[0_10px_30px_rgba(37,88,73,0.06)] backdrop-blur lg:grid-cols-4">
          <FilterDropdown
            label="Category" icon="layers" value={dept}
            onChange={(v) => { setDept(v); setSub(''); setKind(''); setPage(1); }}
            options={[['', 'All'], ...departments.filter((d) => deptCounts.get(d.slug) || dept === d.slug).map((d) => [d.slug, d.name, deptCounts.get(d.slug) || 0])]}
          />
          <FilterDropdown label="Sub-category" icon="grid" value={sub} onChange={(v) => { setSub(v); setKind(''); setPage(1); }} options={[['', 'All'], ...subList]} />
          <FilterDropdown
            label="Item type" icon="tag" value={kind} onChange={reset(setKind)}
            options={[['', 'All'], ...[...kindCounts.keys()].sort().map((k) => [k, typeLabel(k), kindCounts.get(k)])]}
          />
          <FilterDropdown
            label="Brand" icon="shieldCheck" value={brand} onChange={reset(setBrand)}
            options={[['', 'All'], ...[...brandCounts.keys()].sort((a, b) => String(brandNames.get(a)).localeCompare(String(brandNames.get(b)))).map((b) => [b, brandNames.get(b) || b, brandCounts.get(b)])]}
          />
        </div>

        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[13px] text-ink-50">
            <span className="tnum font-semibold text-ink">{filtered.length.toLocaleString('en-IN')}</span> deals
            {sub ? <> in {categoryName(sub)}</> : dept ? <> in {departments.find((d) => d.slug === dept)?.name}</> : null}
          </p>
          {anyFilter && <button onClick={clearAll} className="text-[13px] font-bold text-clay-600 hover:underline">Clear filters</button>}
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-line bg-white/60 py-16 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-forest shadow-card"><Icon name="tag" size={22} /></span>
            <p className="mt-4 text-[18px] font-semibold text-ink">No deals match those filters</p>
            <div className="mt-5"><Button onClick={clearAll} variant="outline">Show all offers</Button></div>
          </div>
        ) : (
          <>
            <motion.div key={`${tier}|${dept}|${sub}|${kind}|${brand}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {shown.map((p) => <ProductCard key={p.id} product={p} />)}
            </motion.div>
            {shown.length < filtered.length && (
              <div className="mt-8 text-center">
                <Button variant="outline" size="lg" onClick={() => setPage((n) => n + 1)}>
                  Load more ({(filtered.length - shown.length).toLocaleString('en-IN')} left)
                </Button>
              </div>
            )}
          </>
        )}

        <p className="mt-10 flex flex-wrap items-center gap-2 rounded-[16px] bg-white/60 p-4 text-[12px] text-ink-50">
          <Icon name="tag" size={13} /> Offers are set by each retailer; the discount shown is off the printed MRP.
          <Link to="/shop" className="ml-auto font-bold text-forest hover:underline">Browse the full catalogue →</Link>
        </p>
      </Container>
    </>
  );
}
