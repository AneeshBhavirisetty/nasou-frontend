import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';
import Logo from './Logo';
import ProductArt from './ProductArt';
import { Badge } from './ui';
import { categories, searchProducts } from '../data/catalog';
import { announcements, primaryNav } from '../data/site';
import { money, cx } from '../lib/format';
import { useCart } from '../context/CartContext';
import { useWishlist } from '../context/WishlistContext';
import { useAuth } from '../context/AuthContext';
import { EASE } from '../lib/motion';

/* ── rotating announcement bar ─────────────────────────────────────────── */
function Ticker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % announcements.length), 4600);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative h-8 overflow-hidden bg-forest text-white">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-center px-4">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.32, ease: EASE }}
            className="flex items-center gap-2 truncate text-[11.5px] font-medium text-white/85 sm:text-[12.5px]"
          >
            <Icon name="sparkle" size={12} className="shrink-0 text-emerald-100" />
            <span className="truncate">{announcements[i]}</span>
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── search with live suggestions ──────────────────────────────────────── */
function SearchBox({ variant = 'bar', onDone }) {
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
    <div ref={boxRef} className={cx('relative', variant === 'bar' ? 'w-full max-w-[420px]' : 'w-full')}>
      <form onSubmit={submit}>
        <div className="relative">
          <Icon name="search" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-35" />
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKey}
            placeholder="Search fittings, size, SKU or brand"
            aria-label="Search products"
            className="h-11 w-full rounded-full border border-line bg-canvas pl-10 pr-4 text-[13.5px] outline-none transition placeholder:text-ink-35 focus:border-emerald focus:bg-white focus:ring-2 focus:ring-emerald/12"
          />
        </div>
      </form>

      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-line bg-white shadow-lift"
          >
            {results.map((p, i) => (
              <button
                key={p.id}
                onMouseEnter={() => setHi(i)}
                onClick={() => go(`/product/${p.id}`)}
                className={cx(
                  'flex w-full items-center gap-3 px-3 py-2.5 text-left transition',
                  hi === i ? 'bg-canvas' : 'hover:bg-canvas'
                )}
              >
                <span className="photo-bed grid h-10 w-10 shrink-0 place-items-center rounded-md">
                  <ProductArt kind={p.art} material={p.material} className="h-full w-full p-1" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-semibold">{p.name}</span>
                  <span className="block truncate text-[11.5px] text-ink-50">{p.sku} · {p.size || 'standard'}</span>
                </span>
                <span className="tnum shrink-0 text-[12.5px] font-bold">{money(p.price)}</span>
              </button>
            ))}
            <button
              onClick={() => go(`/shop?q=${encodeURIComponent(q.trim())}`)}
              className="flex w-full items-center justify-between border-t border-line px-3 py-2.5 text-[12.5px] font-semibold text-emerald-600 hover:bg-canvas"
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

/* ── account menu ──────────────────────────────────────────────────────── */
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
        className="hidden h-10 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-semibold text-ink-70 transition hover:bg-sunk hover:text-ink sm:inline-flex"
      >
        <Icon name="user" size={18} /> Sign in
      </Link>
    );
  }

  const first = (user?.fullName || 'Account').split(' ')[0];
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
        className="flex h-10 items-center gap-1.5 rounded-md px-2 text-[13px] font-semibold text-ink-70 transition hover:bg-sunk hover:text-ink"
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-emerald-50 text-[11px] font-bold text-emerald-600">
          {first[0]?.toUpperCase()}
        </span>
        <span className="hidden max-w-[90px] truncate sm:inline">{first}</span>
        <Icon name="chevronDown" size={13} className={cx('transition', open && 'rotate-180')} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.16, ease: EASE }}
            className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-lg border border-line bg-white shadow-lift"
          >
            <div className="border-b border-line px-4 py-3">
              <p className="text-[13px] font-bold">{user?.fullName || 'Your account'}</p>
              <p className="text-[11.5px] text-ink-50">{isAdmin ? 'Administrator' : 'Customer'}</p>
            </div>
            {items.map((it) => (
              <Link
                key={it.label}
                to={it.to}
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-[13px] font-medium text-ink-70 transition hover:bg-canvas hover:text-ink"
              >
                <Icon name={it.icon} size={15} className="text-ink-35" />
                {it.label}
              </Link>
            ))}
            <button
              onClick={() => { setOpen(false); logout(); navigate('/'); }}
              className="flex w-full items-center gap-2.5 border-t border-line px-4 py-2.5 text-[13px] font-semibold text-clay-600 transition hover:bg-clay-50"
            >
              <Icon name="logout" size={15} /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── mega menu ─────────────────────────────────────────────────────────── */
function MegaMenu({ onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="absolute left-0 right-0 top-full z-40 border-b border-line bg-white shadow-lift"
      onMouseLeave={onClose}
    >
      <div className="mx-auto grid max-w-[1280px] gap-6 px-5 py-7 sm:px-8 lg:grid-cols-[1fr_280px]">
        <div className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/shop?category=${c.slug}`}
              onClick={onClose}
              className="group flex items-start gap-3 rounded-md px-3 py-2.5 transition hover:bg-canvas"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-600">
                <Icon name="wrench" size={15} />
              </span>
              <span>
                <span className="flex items-center gap-1.5 text-[14px] font-semibold">
                  {c.name}
                  <span className="tnum text-[11px] font-normal text-ink-35">{c.count}</span>
                </span>
                <span className="mt-0.5 block text-[12px] leading-snug text-ink-50">{c.blurb}</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="rounded-lg border border-line bg-canvas p-5">
          <Badge tone="ok" icon="tag">This week</Badge>
          <p className="mt-3 display-serif text-[18px] leading-tight">Up to 30% off fast-moving PVC fittings.</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-50">
            Verified prices, GST invoice, same-day dispatch on stock.
          </p>
          <Link to="/deals" onClick={onClose} className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-emerald-600">
            Shop the deals <Icon name="arrowRight" size={13} />
          </Link>
        </div>
      </div>
    </motion.div>
  );
}

/* ── header ────────────────────────────────────────────────────────────── */
export default function Header() {
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const closeTimer = useRef();
  const { totals, setOpen } = useCart();
  const wishlist = useWishlist();
  const { pathname } = useLocation();

  useEffect(() => { setMobile(false); setMega(false); }, [pathname]);

  const openMega = () => { clearTimeout(closeTimer.current); setMega(true); };
  const closeMega = () => { closeTimer.current = setTimeout(() => setMega(false), 120); };

  return (
    <header className="sticky top-0 z-50">
      <Ticker />
      <div className="relative border-b border-line bg-white/92 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center gap-3 px-4 sm:px-6 lg:h-[68px] lg:px-8">
          <button
            className="grid h-10 w-10 place-items-center rounded-md text-ink-70 lg:hidden"
            onClick={() => setMobile((v) => !v)}
            aria-label="Menu"
            aria-expanded={mobile}
          >
            <Icon name={mobile ? 'close' : 'menu'} size={20} />
          </button>

          <Link to="/" className="shrink-0 text-forest">
            <Logo />
          </Link>

          <nav className="ml-3 hidden items-center gap-0.5 lg:flex">
            <button
              onMouseEnter={openMega}
              onMouseLeave={closeMega}
              onClick={() => setMega((v) => !v)}
              className={cx(
                'flex h-9 items-center gap-1.5 rounded-md px-3 text-[14px] font-semibold transition',
                mega ? 'bg-sunk text-ink' : 'text-ink-70 hover:text-ink'
              )}
            >
              Categories
              <Icon name="chevronDown" size={14} className={cx('transition', mega && 'rotate-180')} />
            </button>
            {primaryNav.slice(1, 4).map((n) => (
              <Link key={n.label} to={n.to} className="flex h-9 items-center rounded-md px-3 text-[14px] font-medium text-ink-70 transition hover:text-ink">
                {n.label}
              </Link>
            ))}
            <Link to="/deals" className="flex h-9 items-center gap-1.5 rounded-md px-3 text-[14px] font-semibold text-clay-600 transition hover:text-clay">
              <Icon name="tag" size={14} /> Deals
            </Link>
          </nav>

          <div className="ml-auto hidden md:block md:flex-1 md:max-w-[420px]">
            <SearchBox />
          </div>

          <div className="ml-auto flex items-center gap-0.5 md:ml-2">
            <AccountMenu />
            <Link
              to="/wishlist"
              className="relative grid h-10 w-10 place-items-center rounded-md text-ink-70 transition hover:bg-sunk hover:text-ink"
              aria-label={`Wishlist, ${wishlist.count} items`}
            >
              <Icon name="heart" size={19} />
              {wishlist.count > 0 && (
                <span className="tnum absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-clay px-1 text-[10.5px] font-bold text-white">
                  {wishlist.count}
                </span>
              )}
            </Link>
            <button
              onClick={() => setOpen(true)}
              className="relative grid h-10 w-10 place-items-center rounded-md text-ink-70 transition hover:bg-sunk hover:text-ink"
              aria-label={`Cart, ${totals.count} items`}
            >
              <Icon name="cart" size={19} />
              {totals.count > 0 && (
                <span className="tnum absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-clay px-1 text-[10.5px] font-bold text-white">
                  {totals.count}
                </span>
              )}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mega && (
            <div onMouseEnter={openMega} onMouseLeave={closeMega}>
              <MegaMenu onClose={() => setMega(false)} />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* mobile panel */}
      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="overflow-hidden border-b border-line bg-white lg:hidden"
          >
            <div className="px-4 py-4">
              <div className="mb-4">
                <SearchBox variant="full" onDone={() => setMobile(false)} />
              </div>
              <p className="eyebrow mb-2">Categories</p>
              <div className="grid gap-1">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/shop?category=${c.slug}`}
                    className="flex items-center justify-between rounded-md px-3 py-2.5 text-[14px] font-medium text-ink-70 hover:bg-canvas"
                  >
                    {c.name}
                    <span className="tnum text-[12px] text-ink-35">{c.count}</span>
                  </Link>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Link to="/deals" className="rounded-md border border-line px-3 py-2.5 text-center text-[13px] font-semibold text-clay-600">Deals</Link>
                <Link to="/login" className="rounded-md border border-line px-3 py-2.5 text-center text-[13px] font-semibold text-ink-70">Sign in</Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
