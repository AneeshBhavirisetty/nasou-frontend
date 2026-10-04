import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ProductCard from '../components/ProductCard';
import Icon from '../components/Icon';
import { Button, Container, Breadcrumbs } from '../components/ui';
import { useWishlist } from '../context/WishlistContext';
import { useCart } from '../context/CartContext';
import { useToast } from '../context/ToastContext';
import { categoryName } from '../data/catalog';
import { DEPARTMENTS } from '../data/departments';
import { cx, money } from '../lib/format';

/* Wishlist with default filters, Myntra-style (customer review 4/5 item 6):
   the category chips are always there whether or not anything is saved in
   them, with quick filters, sorting, and "Move to cart" on every card. */

const QUICK = [
  { key: 'stock', label: 'In stock', icon: 'check', test: (p) => p.stock > 0 },
  { key: 'offer', label: 'On offer', icon: 'tag', test: (p) => p.discount >= 15 },
  { key: 'under500', label: 'Under ₹500', icon: 'rupee', test: (p) => p.price < 500 },
  { key: 'best', label: 'Bestsellers', icon: 'star', test: (p) => p.badges?.includes('Bestseller') },
  { key: 'new', label: 'New', icon: 'sparkle', test: (p) => p.badges?.includes('New') },
];
const SORTS = [
  ['recent', 'Recently saved'],
  ['priceAsc', 'Price: low to high'],
  ['priceDesc', 'Price: high to low'],
  ['discount', 'Biggest discount'],
  ['name', 'Name A–Z'],
];

function Chip({ on, onClick, children, muted }) {
  return (
    <button type="button" aria-pressed={on} onClick={onClick} className={cx('flex shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-[13px] font-semibold transition', on ? 'border-forest bg-forest text-white shadow-btn' : muted ? 'border-line/70 bg-white/60 text-ink-35 hover:text-forest' : 'border-line bg-white text-ink-70 hover:border-forest/40 hover:text-forest')}>
      {children}
    </button>
  );
}
const Count = ({ n, on }) => <span className={cx('tnum rounded-full px-1.5 text-[11px] font-bold', on ? 'bg-white/20 text-white' : 'bg-sunk text-ink-50')}>{n}</span>;

export default function Wishlist() {
  const { ids, items, toggle } = useWishlist();
  const { add } = useCart();
  const toast = useToast();
  const [dept, setDept] = useState('');
  const [sub, setSub] = useState('');
  const [quick, setQuick] = useState([]);
  const [sort, setSort] = useState('recent');

  const order = useMemo(() => new Map(ids.map((id, i) => [id, i])), [ids]);
  const inDept = dept ? items.filter((p) => (p.department || 'plumbing') === dept) : items;
  const subs = useMemo(() => {
    const m = new Map();
    inDept.forEach((p) => m.set(p.category, (m.get(p.category) || 0) + 1));
    return [...m.entries()];
  }, [inDept]);
  const scoped = sub ? inDept.filter((p) => p.category === sub) : inDept;
  const passQuick = (p, except) => quick.every((k) => k === except || QUICK.find((q) => q.key === k).test(p));
  const shown = useMemo(() => {
    const list = scoped.filter((p) => passQuick(p));
    const by = {
      recent: (a, b) => order.get(b.id) - order.get(a.id),
      priceAsc: (a, b) => a.price - b.price,
      priceDesc: (a, b) => b.price - a.price,
      discount: (a, b) => b.discount - a.discount,
      name: (a, b) => a.name.localeCompare(b.name),
    }[sort];
    return [...list].sort(by);
  }, [scoped, quick, sort, order]); // eslint-disable-line react-hooks/exhaustive-deps
  const total = shown.reduce((s, p) => s + p.price, 0);

  const moveToCart = (p) => {
    if (p.stock <= 0) return toast.error('Out of stock — we kept it in your wishlist.');
    add(p, { qty: 1 });
    toggle(p.id);
  };
  const clearAll = () => { setDept(''); setSub(''); setQuick([]); };
  const deptName = DEPARTMENTS.find((d) => d.slug === dept)?.name;

  return (
    <Container className="pb-12 pt-5">
      <Breadcrumbs className="mb-4" items={[{ label: 'Home', to: '/' }, { label: 'Wishlist' }]} />

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

      {/* default filters — always shown */}
      <div className="mt-6 space-y-2.5 rounded-[22px] border border-white/70 bg-white/55 p-3 shadow-[0_10px_30px_rgba(37,88,73,0.06)] backdrop-blur">
        <div role="tablist" aria-label="Category" className="no-bar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
          <Chip on={!dept} onClick={() => { setDept(''); setSub(''); }}>All <Count n={items.length} on={!dept} /></Chip>
          {DEPARTMENTS.map((d) => {
            const n = items.filter((p) => (p.department || 'plumbing') === d.slug).length;
            return (
              <Chip key={d.slug} on={dept === d.slug} muted={!n} onClick={() => { setDept(dept === d.slug ? '' : d.slug); setSub(''); }}>
                <Icon name={d.icon} size={14} /> {d.name} <Count n={n} on={dept === d.slug} />
              </Chip>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="no-bar -mx-1 flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-0.5">
            {QUICK.map((q) => {
              const on = quick.includes(q.key);
              const n = scoped.filter((p) => q.test(p) && passQuick(p, q.key)).length;
              return (
                <Chip key={q.key} on={on} onClick={() => setQuick((l) => (on ? l.filter((k) => k !== q.key) : [...l, q.key]))}>
                  <Icon name={q.icon} size={13} /> {q.label} <Count n={n} on={on} />
                </Chip>
              );
            })}
          </div>
          <label className="relative flex h-10 shrink-0 items-center rounded-full border border-line bg-white pl-4 pr-9 text-[13px] font-bold text-forest">
            <Icon name="filter" size={14} className="mr-2" /> {SORTS.find((s) => s[0] === sort)[1]}
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label="Sort wishlist">
              {SORTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <Icon name="chevronDown" size={14} className="pointer-events-none absolute right-3" />
          </label>
        </div>
        {dept && subs.length > 1 && (
          <div className="no-bar -mx-1 flex gap-1.5 overflow-x-auto px-1">
            {subs.map(([slug, n]) => (
              <button key={slug} onClick={() => setSub(sub === slug ? '' : slug)} className={cx('shrink-0 rounded-full px-3 py-1 text-[12px] font-bold transition', sub === slug ? 'bg-forest-800 text-white' : 'bg-sunk text-forest hover:bg-emerald-100')}>{categoryName(slug)} · {n}</button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-4 mt-5 flex flex-wrap items-center justify-between gap-2 text-[13px] text-ink-50">
        <span><b className="tnum text-ink">{shown.length}</b> of {items.length} saved{shown.length > 0 && <> · <span className="tnum">{money(total)}</span> together</>}</span>
        {(dept || quick.length > 0) && <button onClick={clearAll} className="font-bold text-clay-600 hover:underline">Clear filters</button>}
      </div>

      {items.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-[#cad8d2] bg-[#f6f3ed] py-16 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-white text-forest shadow-card"><Icon name="heart" size={24} /></span>
          <p className="mt-4 text-[18px] font-semibold text-forest">Nothing saved yet</p>
          <p className="mt-1.5 text-[13px] text-ink-50">Tap the heart on any product to keep it here.</p>
          <div className="mt-5"><Button to="/shop" iconRight="arrowRight">Browse the catalogue</Button></div>
        </div>
      ) : shown.length === 0 ? (
        <div className="rounded-[24px] border border-dashed border-line bg-white py-12 text-center">
          <p className="text-[15px] font-semibold text-forest">{dept && !inDept.length ? `Nothing saved in ${deptName} yet` : 'Nothing saved matches these filters'}</p>
          <p className="mt-1.5 text-[13px] text-ink-50">{dept && !inDept.length ? 'Save products from this category and they will show up here.' : `Clear them to see all ${items.length} saved products.`}</p>
          <div className="mt-4 flex justify-center gap-2">
            {dept && !inDept.length && <Button size="sm" to={`/shop?dept=${dept}`} iconRight="arrowRight">Browse {deptName}</Button>}
            <button type="button" onClick={clearAll} className="rounded-full border border-line px-4 py-2 text-[13px] font-bold text-forest hover:border-forest">Clear filters</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          <AnimatePresence initial={false}>
            {shown.map((p) => (
              <motion.div key={p.id} layout initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col gap-2">
                <ProductCard product={p} />
                <button onClick={() => moveToCart(p)} disabled={p.stock <= 0} className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-forest/20 bg-white text-[12.5px] font-bold text-forest transition hover:bg-forest hover:text-white disabled:cursor-not-allowed disabled:opacity-50">
                  <Icon name="cart" size={14} /> {p.stock > 0 ? 'Move to cart' : 'Out of stock'}
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </Container>
  );
}
