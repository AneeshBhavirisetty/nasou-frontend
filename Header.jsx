import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';
import Logo from './Logo';
import { Badge } from './ui';
import { categories } from '../data/catalog';
import { announcements, primaryNav } from '../data/site';
import { useCart } from '../context/CartContext';
import { cx } from '../lib/format';

function Ticker() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % announcements.length), 4200);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="relative h-[34px] overflow-hidden bg-forest text-white">
      <div className="mx-auto flex h-full max-w-[1280px] items-center justify-center px-5">
        <AnimatePresence mode="wait">
          <motion.p
            key={i}
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -12, opacity: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="flex items-center gap-2 text-[12.5px] font-medium text-white/85"
          >
            <Icon name="sparkle" size={13} className="text-emerald-100" />
            {announcements[i]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}

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
      <div className="mx-auto grid max-w-[1280px] gap-8 px-5 py-8 sm:px-8 lg:grid-cols-[1fr_300px]">
        <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <Link
              key={c.slug}
              to={`/shop?category=${c.slug}`}
              onClick={onClose}
              className="group flex items-start gap-3 rounded-md px-3 py-3 transition hover:bg-canvas"
            >
              <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-md bg-emerald-50 text-emerald-600">
                <Icon name="package" size={15} />
              </span>
              <span>
                <span className="flex items-center gap-1.5 text-[14px] font-semibold">
                  {c.name}
                  <Icon
                    name="arrowRight"
                    size={13}
                    className="-translate-x-1 opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                  />
                </span>
                <span className="mt-0.5 block text-[12.5px] leading-snug text-ink-50">{c.blurb}</span>
              </span>
            </Link>
          ))}
        </div>
        <div className="rounded-lg border border-line bg-canvas p-6">
          <Badge tone="ok" icon="route">Every listing</Badge>
          <p className="mt-4 font-display text-[19px] font-bold leading-tight">
            Open the trace on anything you add to the cart.
          </p>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-50">
            Origin, maker, batch and carbon are attached to the product — not to a
            marketing page.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function Header() {
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [params] = useSearchParams();
  const [q, setQ] = useState(params.get('q') ?? '');
  const navigate = useNavigate();
  const { totals, setOpen } = useCart();
  const closeTimer = useRef();

  const openMega = () => {
    clearTimeout(closeTimer.current);
    setMega(true);
  };
  const closeMega = () => {
    closeTimer.current = setTimeout(() => setMega(false), 120);
  };

  const submit = (e) => {
    e.preventDefault();
    navigate(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : '/shop');
    setMobile(false);
  };

  return (
    <header className="sticky top-0 z-50">
      <Ticker />
      <div className="relative border-b border-line bg-white/92 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-[1280px] items-center gap-4 px-5 sm:px-8">
          <button
            className="grid h-10 w-10 place-items-center rounded-md text-ink-70 lg:hidden"
            onClick={() => setMobile((v) => !v)}
            aria-label="Menu"
          >
            <Icon name={mobile ? 'close' : 'menu'} size={20} />
          </button>

          <Link to="/" className="shrink-0 text-forest">
            <Logo />
          </Link>

          <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
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
            {primaryNav.slice(1).map((n) => (
              <Link
                key={n.label}
                to={n.to}
                className="flex h-9 items-center rounded-md px-3 text-[14px] font-medium text-ink-70 transition hover:text-ink"
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <form onSubmit={submit} className="ml-auto hidden max-w-[380px] flex-1 md:block">
            <div className="group relative">
              <Icon
                name="search"
                size={16}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-35"
              />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search products, makers or origins"
                className="h-10 w-full rounded-full border border-line bg-canvas pl-10 pr-4 text-[13.5px]
                           outline-none transition placeholder:text-ink-35
                           focus:border-emerald focus:bg-white focus:ring-2 focus:ring-emerald/12"
              />
            </div>
          </form>

          <div className="ml-auto flex items-center gap-1 md:ml-0">
            <Link
              to="/shop"
              className="hidden h-10 w-10 place-items-center rounded-md text-ink-70 transition hover:bg-sunk hover:text-ink sm:grid"
              aria-label="Wishlist"
            >
              <Icon name="heart" size={19} />
            </Link>
            <Link
              to="/login"
              className="hidden h-10 w-10 place-items-center rounded-md text-ink-70 transition hover:bg-sunk hover:text-ink sm:grid"
              aria-label="Account"
            >
              <Icon name="user" size={19} />
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

      {/* Mobile panel */}
      <AnimatePresence>
        {mobile && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-b border-line bg-white lg:hidden"
          >
            <div className="px-5 py-5">
              <form onSubmit={submit} className="relative mb-4">
                <Icon name="search" size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-35" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search products"
                  className="h-11 w-full rounded-full border border-line bg-canvas pl-10 pr-4 text-[14px] outline-none focus:border-emerald"
                />
              </form>
              <div className="grid grid-cols-2 gap-1">
                {categories.map((c) => (
                  <Link
                    key={c.slug}
                    to={`/shop?category=${c.slug}`}
                    onClick={() => setMobile(false)}
                    className="rounded-md px-3 py-2.5 text-[14px] font-medium text-ink-70 hover:bg-canvas"
                  >
                    {c.name}
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
