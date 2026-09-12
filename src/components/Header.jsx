import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';
import Logo from './Logo';
import ProductArt from './ProductArt';
import { Badge } from './ui';
import { categories, searchProducts } from '../data/catalog';
import { announcements } from '../data/site';
import { money, cx } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { EASE } from '../lib/motion';

/* Layout follows the NasouHive demo portal header: a tall row with the app
   tile, a wide white search field and round icon buttons, then a quiet tab
   row with the rotating announcement on the right. */

/* ── rotating announcement (sits at the end of the tab row) ─────────────── */
function Ticker({ className = '' }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % announcements.length), 4600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className={cx('relative h-5 overflow-hidden', className)}>
      <AnimatePresence mode="wait">
        <motion.p
          key={i}
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -10, opacity: 0 }}
          transition={{ duration: 0.32, ease: EASE }}
          className="truncate text-right text-[12px] font-semibold text-ink-50"
        >
          {announcements[i]}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/* ── search with live suggestions ──────────────────────────────────────── */
function SearchBox({ onDone }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const navigate = useNavigate();
  const boxRef = useRef(null);

  const results = q.trim().length >= 2 ? searchProducts(q, { limit: 6 }) : [];

  useEffect(() => {
    const onClick = (e) => { if (!boxRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (dest) => {
    setOpen(false); setQ(''); onDone?.();
    navigate(dest);
  };
  const submit = (e) => {
    e.preventDefault();
    if (hi >= 0 && results[hi]) return go(`/product/${results[hi].id}`);
    go(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop');
  };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setHi((h) => Math.max(h - 1, -1)); }
  };

  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={submit}>
        <label className="flex min-h-12 w-full items-center gap-3 rounded-[16px] border border-white/80 bg-white px-4 shadow-[0_10px_24px_rgba(37,88,73,0.07)] transition focus-within:border-forest/40 focus-within:shadow-[0_12px_28px_rgba(37,88,73,0.12)]">
          <Icon name="search" size={19} className="shrink-0 text-ink-50" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKey}
            placeholder="Search fittings, size, SKU or brand"
            aria-label="Search products"
            className="min-w-0 flex-1 bg-transparent text-[14px] font-semibold text-ink outline-none placeholder:font-medium placeholder:text-ink-35"
          />
        </label>
      </form>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[18px] border border-white/80 bg-white p-1.5 shadow-lift"
          >
            {results.map((p, i) => (
              <button
                key={p.id}
                onMouseEnter={() => setHi(i)}
                onClick={() => go(`/product/${p.id}`)}
                className={cx(
                  'flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left transition',
                  hi === i ? 'bg-sunk/70' : 'hover:bg-sunk/70'
                )}
              >
                <span className="photo-bed grid h-11 w-11 shrink-0 place-items-center rounded-[12px]">
                  <ProductArt kind={p.art} material={p.material} className="h-full w-full p-1" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13.5px] font-semibold text-ink">{p.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-50">{p.sku} · {p.size || 'standard'}</span>
                </span>
                <span className="tnum shrink-0 text-[13px] font-bold">{money(p.price)}</span>
              </button>
            ))}
            <button
              onClick={() => go(`/shop?q=${encodeURIComponent(q.trim())}`)}
              className="mt-1 flex w-full items-center justify-between rounded-[12px] px-2.5 py-2.5 text-[12.5px] font-bold text-forest hover:bg-sunk/70"
            >
              See all results for “{q.trim()}”
              <Icon name="arrowRight" size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── account menu (demo avatar circle) ─────────────────────────────────── */
function AccountMenu() {
  const { isAuthenticated, user, isAdmin, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  if (!isAuthenticated) {
    return (
      <Link
        to="/login"
        className="flex h-11 items-center gap-2 rounded-full bg-forest px-4 text-[13px] font-bold text-white shadow-btn transition hover:-translate-y-0.5 hover:bg-forest-800"
      >
        <Icon name="user" size={17} /> <span className="hidden sm:inline">Sign in</span>
      </Link>
    );
  }

  const name = user?.fullName || 'Account';
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'A';
  const items = [
    { label: 'Orders', to: '/orders', icon: 'package' },
    { label: 'Wishlist', to: '/wishlist', icon: 'heart' },
    { label: 'Addresses', to: '/checkout', icon: 'pin' },
    ...(isAdmin ? [{ label: 'Admin dashboard', to: '/admin/dashboard', icon: 'gauge' }] : []),
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="grid h-11 w-11 place-items-center rounded-full bg-forest text-[12px] font-black text-white shadow-btn transition hover:-translate-y-0.5"
      >
        {initials}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-[18px] border border-white/80 bg-white p-1.5 shadow-lift"
          >
            <div className="flex items-center gap-3 rounded-[12px] bg-forest px-3 py-3 text-white">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white text-[12px] font-black text-forest">{initials}</span>
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-bold">{user?.fullName || 'Your account'}</p>
                <p className="text-[11.5px] text-emerald-100">{isAdmin ? 'Administrator' : 'Customer'}</p>
              </div>
            </div>
            <div className="py-1">
              {items.map((it) => (
                <Link
                  key={it.label}
                  to={it.to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold text-ink-70 transition hover:bg-sunk/70 hover:text-forest"
                >
                  <Icon name={it.icon} size={15} className="text-ink-35" />
                  {it.label}
                </Link>
              ))}
            </div>
            <button
              onClick={() => { setOpen(false); logout(); navigate('/'); }}
              className="flex w-full items-center gap-2.5 rounded-[12px] border-t border-line px-3 py-2.5 text-[13px] font-bold text-clay-600 transition hover:bg-clay-50"
            >
              <Icon name="logout" size={15} /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── categories mega menu ──────────────────────────────────────────────── */
function MegaMenu({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute left-0 right-0 top-full z-40 px-4 pt-2 sm:px-6 lg:px-8"
      onMouseLeave={onClose}
    >
      <div className="mx-auto grid max-w-[1440px] gap-5 rounded-[24px] border border-white/80 bg-white p-5 shadow-lift sm:p-6 lg:grid-cols-[1fr_300px]">
        <div className="grid gap-1 sm:grid-cols-2">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/shop?category=${c.slug}`}
              onClick={onClose}
              className="group flex items-start gap-3 rounded-[14px] px-3 py-2.5 transition hover:bg-sunk/60"
            >
              <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[12px] bg-sunk text-forest transition group-hover:bg-forest group-hover:text-white">
                <Icon name="wrench" size={15} />
              </span>
              <span>
                <span className="flex items-center gap-1.5 text-[14px] font-bold text-ink">
                  {c.name}
                  <span className="tnum text-[11px] font-semibold text-ink-35">{c.count}</span>
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-50">{c.blurb}</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="forest-band relative overflow-hidden rounded-[18px] p-5 text-white">
          <Badge tone="dark" icon="tag" className="border-white/20 bg-white/10">This week</Badge>
          <p className="mt-3 text-[19px] font-semibold leading-tight">Up to 30% off fast-moving PVC fittings.</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-emerald-100">
            Verified prices, GST invoice, same-day dispatch on stock.
          </p>
          <Link to="/deals" onClick={onClose} className="mt-4 inline-flex items-center gap-1.5 rounded-[12px] bg-white px-4 py-2.5 text-[12.5px] font-bold text-forest transition hover:-translate-y-0.5">
            Shop the deals <Icon name="arrowRight" size={13} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/* ── round icon button with a count badge (demo) ───────────────────────── */
function CountBadge({ n }) {
  if (!n) return null;
  return (
    <span className="tnum absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-forest px-1 text-[10px] font-bold text-white ring-2 ring-canvas">
      {n}
    </span>
  );
}

const TAB = ({ isActive }) =>
  cx('relative py-3 text-[14px] font-bold transition hover:text-forest', isActive ? 'text-forest' : 'text-ink-70');

/* ── header ────────────────────────────────────────────────────────────── */
export default function Header() {
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const closeTimer = useRef();
  const { totals, setOpen } = useCart();
  const wishlist = useWishlist();
  const { isAuthenticated } = useAuth();
  const { pathname } = useLocation();

  useEffect(() => { setMobile(false); setMega(false); }, [pathname]);

  const openMega = () => { clearTimeout(closeTimer.current); setMega(true); };
  const closeMega = () => { closeTimer.current = setTimeout(() => setMega(false), 120); };

  return (
    <header className="sticky top-0 z-50 border-b border-white/70 bg-canvas/90 backdrop-blur-2xl">
      <div className="mx-auto flex min-h-[72px] max-w-[1440px] items-center gap-3 px-4 sm:min-h-[76px] sm:gap-4 sm:px-6 lg:px-8">
        <button
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-white text-forest shadow-[0_6px_16px_rgba(37,88,73,0.08)] lg:hidden"
          onClick={() => setMobile((v) => !v)}
          aria-label="Menu"
          aria-expanded={mobile}
        >
          <Icon name={mobile ? 'close' : 'menu'} size={20} />
        </button>

        <Link to="/" className="shrink-0" aria-label="Nasou Hive home">
          <Logo variant="tile" className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
        </Link>

        <div className="mx-auto hidden w-full max-w-2xl md:block">
          <SearchBox />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2 md:ml-0">
          <Link
            to="/wishlist"
            className="relative hidden h-11 w-11 place-items-center rounded-full bg-white text-forest transition hover:-translate-y-0.5 sm:grid"
            aria-label={`Wishlist, ${wishlist.count} items`}
          >
            <Icon name="heart" size={19} />
            <CountBadge n={wishlist.count} />
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="relative grid h-11 w-11 place-items-center rounded-full bg-white text-forest transition hover:-translate-y-0.5"
            aria-label={`Cart, ${totals.count} items`}
          >
            <Icon name="cart" size={19} />
            <CountBadge n={totals.count} />
          </button>
          <AccountMenu />
        </div>
      </div>

      {/* phone: search gets its own row, as in the demo's mobile header */}
      <div className="px-4 pb-3 sm:px-6 md:hidden">
        <SearchBox />
      </div>

      {/* tab row */}
      <nav className="relative hidden border-t border-white/60 bg-white/35 lg:block" aria-label="Primary">
        <div className="mx-auto flex max-w-[1440px] items-center gap-7 px-8">
          <NavLink to="/" end className={TAB}>Home</NavLink>
          <NavLink to="/shop" className={TAB}>Shop</NavLink>
          <button
            onMouseEnter={openMega}
            onMouseLeave={closeMega}
            onClick={() => setMega((v) => !v)}
            aria-expanded={mega}
            className={cx('flex items-center gap-1 py-3 text-[14px] font-bold transition hover:text-forest', mega ? 'text-forest' : 'text-ink-70')}
          >
            Categories
            <Icon name="chevronDown" size={14} className={cx('transition', mega && 'rotate-180')} />
          </button>
          <NavLink to="/deals" className={TAB}>Deals</NavLink>
          {isAuthenticated && <NavLink to="/orders" className={TAB}>Orders</NavLink>}
          <NavLink to="/wishlist" className={TAB}>Wishlist</NavLink>
          <NavLink to="/contact" className={TAB}>Contact us</NavLink>
          <NavLink to="/enquiry" className={({ isActive }) => cx('flex items-center gap-1.5 py-3 text-[14px] font-bold transition hover:text-forest', isActive ? 'text-forest' : 'text-ink-70')}>
            <Icon name="mail" size={14} /> Enquire now
          </NavLink>
          <Ticker className="ml-auto min-w-0 max-w-[420px] flex-1" />
        </div>

        <AnimatePresence>
          {mega && (
            <div onMouseEnter={openMega} onMouseLeave={closeMega}>
              <MegaMenu onClose={() => setMega(false)} />
            </div>
          )}
        </AnimatePresence>
      </nav>

      {/* mobile panel */}
      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="overflow-hidden border-t border-white/60 lg:hidden"
          >
            <div className="max-h-[70dvh] overflow-y-auto px-4 pb-5 pt-3 sm:px-6">
              <p className="eyebrow mb-2 px-1">Categories</p>
              <div className="grid gap-1.5 rounded-[18px] bg-white p-1.5 shadow-card">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/shop?category=${c.slug}`}
                    className="flex items-center justify-between rounded-[12px] px-3 py-2.5 text-[14px] font-semibold text-ink-70 hover:bg-sunk/70"
                  >
                    {c.name}
                    <span className="tnum text-[12px] text-ink-35">{c.count}</span>
                  </Link>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link to="/deals" className="rounded-[14px] bg-white px-3 py-3 text-center text-[13px] font-bold text-forest shadow-card">Deals</Link>
                <Link to="/contact" className="rounded-[14px] bg-white px-3 py-3 text-center text-[13px] font-bold text-forest shadow-card">Contact us</Link>
                {!isAuthenticated && <Link to="/login" className="rounded-[14px] bg-white px-3 py-3 text-center text-[13px] font-bold text-forest shadow-card">Sign in</Link>}
                <Link to="/enquiry" className={cx('rounded-[14px] bg-forest px-3 py-3 text-center text-[13px] font-bold text-white shadow-btn', isAuthenticated && 'col-span-2')}>Enquire now</Link>
              </div>
              <p className="mt-4 px-1 text-[12px] font-semibold text-ink-50">{announcements[0]}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
