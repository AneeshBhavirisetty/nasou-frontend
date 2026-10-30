import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../components/Icon';
import NotificationBell from '../components/NotificationBell';
import { Avatar } from '../components/admin/AdminUI';
import { BottomNav, SideRail } from '../components/admin/AdminSidebar';
import { OPEN_CHAT } from '../components/chat/ChatWidget';
import { useAuth } from '../context/AuthContext';
import { useIam } from '../context/IamStore';
import { useRetailer } from '../store/retailers';
import { useActor, useScopedOrders, useScopedProducts } from '../lib/useScoped';
import { useOrders } from '../store/orders';
import { useTickets } from '../store/support';
import { staffRole } from '../lib/access';
import { cx, itemCode } from '../lib/format';
import SellerStatus from '../pages/seller/Status';

/* Retailer console — "Retailer commerce hub" (client review 6). Follows the
   approved reference: the module list on the left (Dashboard, Orders,
   Products, Discounts, Customers, Payouts, Billing, Reports, Store, Users &
   access, Support), and a header that keeps search, the AI assistant, the bell
   and the profile — plus Orders / Products / Payouts as tabs across the top.
   Header and page share one background. Everything is scoped to this
   retailer; staff see the sections of their staff role (requirement 21). */

export const SELLER_NAV = [
  { group: 'Overview', to: '/seller', label: 'Dashboard', short: 'Home', icon: 'gauge', section: 'dashboard', exact: true },
  { group: 'Selling', to: '/seller/orders', label: 'Orders', short: 'Orders', icon: 'truck', section: 'orders', badge: 'toPack', top: true },
  { group: 'Selling', to: '/seller/products', label: 'Products', short: 'Products', icon: 'package', section: 'products', top: true },
  { group: 'Selling', to: '/seller/discounts', label: 'Discounts', short: 'Discounts', icon: 'tag', section: 'discounts' },
  { group: 'Selling', to: '/seller/customers', label: 'Customers', short: 'Customers', icon: 'users', section: 'customers' },
  { group: 'Selling', to: '/seller/enquiries', label: 'Enquiries', short: 'Enquiries', icon: 'inbox', section: 'products' },
  { group: 'Money', to: '/seller/payouts', label: 'Payouts', short: 'Payouts', icon: 'rupee', section: 'payouts', top: true },
  { group: 'Money', to: '/seller/billing', label: 'Billing & payments', short: 'Billing', icon: 'receipt', section: 'billing' },
  { group: 'Insights', to: '/seller/reports', label: 'Reports & analytics', short: 'Reports', icon: 'barChart', section: 'reports' },
  { group: 'Your store', to: '/seller/profile', label: 'Store profile', short: 'Profile', icon: 'store', section: 'profile' },
  { group: 'Your store', to: '/seller/team', label: 'Users & access', short: 'Users', icon: 'key', section: 'team' },
  { group: 'Your store', to: '/seller/support', label: 'Support', short: 'Support', icon: 'ticket', section: 'support', badge: 'tickets' },
];

/* the retailer this console is showing, and whether it may change anything */
export function useSeller() {
  const actor = useActor();
  const retailer = useRetailer(actor.retailerId);
  return { actor, retailer, retailerId: actor.retailerId, readOnly: !!actor.readOnly };
}

function ViewBanner() {
  const { view, endView } = useAuth();
  const navigate = useNavigate();
  const [left, setLeft] = useState(() => view.expiresAt - Date.now());
  useEffect(() => {
    const t = setInterval(() => setLeft(view.expiresAt - Date.now()), 1000);
    return () => clearInterval(t);
  }, [view.expiresAt]);
  const m = Math.max(0, Math.floor(left / 60000));
  const s = Math.max(0, Math.floor((left % 60000) / 1000));
  return (
    <div className="sticky top-0 z-[60] flex flex-wrap items-center justify-center gap-x-4 gap-y-1 bg-amber px-4 py-2 text-center text-[12.5px] font-bold text-white">
      <span className="flex items-center gap-1.5"><Icon name="eye" size={14} /> Viewing as {view.retailerName} — read-only · recorded in the audit log</span>
      <span className="tnum rounded-full bg-white/20 px-2 py-0.5">{m}:{String(s).padStart(2, '0')} left</span>
      <button onClick={() => { endView('ended by user'); navigate(`/admin/retailers/${view.retailerId}`); }} className="rounded-full bg-white px-3 py-0.5 text-amber">Exit</button>
    </div>
  );
}

function AvatarMenu({ readOnly, storeName }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} aria-label="Account menu" aria-expanded={open} className="rounded-full ring-2 ring-white transition hover:-translate-y-px">
        <Avatar name={user.fullName} tone="dark" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-[18px] border border-white/80 bg-white p-1.5 shadow-lift"
          >
            <div className="rounded-[12px] bg-forest px-3 py-3 text-white">
              <p className="truncate text-[13.5px] font-bold">{user.fullName}</p>
              <p className="truncate text-[11.5px] text-emerald-100">{readOnly ? 'Nivorva team · viewing' : `${staffRole(user.staffRole).label} · ${storeName || ''}`}</p>
            </div>
            <Link to="/seller/profile" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold text-ink-70 hover:bg-sunk/70 hover:text-forest">
              <Icon name="store" size={15} className="text-ink-35" /> Store profile
            </Link>
            <Link to="/home" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold text-ink-70 hover:bg-sunk/70 hover:text-forest">
              <Icon name="external" size={15} className="text-ink-35" /> View storefront
            </Link>
            {!readOnly && (
              <button onClick={() => { setOpen(false); logout(); navigate('/login', { replace: true }); }} className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px] font-bold text-clay-600 hover:bg-clay-50">
                <Icon name="logout" size={15} /> Sign out
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Header search across this store's products and orders. */
function ConsoleSearch() {
  const products = useScopedProducts();
  const orders = useScopedOrders();
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);
  const needle = q.trim().toLowerCase();
  const hits = useMemo(() => {
    if (needle.length < 2) return [];
    const ps = products.filter((p) => `${p.name} ${p.sku} ${p.itemCode || ''} ${p.size || ''}`.toLowerCase().includes(needle)).slice(0, 5)
      .map((p) => ({ key: `p${p.id}`, icon: 'package', title: p.name, sub: `${itemCode(p)}${p.size ? ` · ${p.size}` : ''} · ${p.stock} in stock`, to: `/seller/products?q=${encodeURIComponent(itemCode(p))}` }));
    const os = orders.filter((o) => `${o.id} ${o.customer} ${o.parts.map((x) => x.id).join(' ')}`.toLowerCase().includes(needle)).slice(0, 4)
      .map((o) => ({ key: `o${o.id}`, icon: 'truck', title: o.parts[0]?.id || o.id, sub: `${o.customer} · ${o.parts[0]?.status || ''}`, to: `/seller/orders/${o.id}` }));
    return [...os, ...ps];
  }, [needle, products, orders]);
  const go = (to) => { setOpen(false); setQ(''); navigate(to); };

  return (
    <div ref={ref} className="relative hidden w-full max-w-md md:block">
      <label className="flex h-11 items-center gap-2.5 rounded-full border border-white/80 bg-white px-4 shadow-[0_8px_20px_rgba(37,88,73,0.06)] transition focus-within:border-forest/30">
        <Icon name="search" size={16} className="text-ink-50" />
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => { if (e.key === 'Enter' && hits[0]) go(hits[0].to); }}
          placeholder="Search products, orders, customers…"
          aria-label="Search your store"
          className="min-w-0 flex-1 bg-transparent text-[13.5px] font-semibold text-ink outline-none placeholder:font-medium placeholder:text-ink-35"
        />
      </label>
      <AnimatePresence>
        {open && hits.length > 0 && (
          <motion.ul initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-[18px] border border-white/80 bg-white p-1.5 shadow-lift">
            {hits.map((h) => (
              <li key={h.key}>
                <button onClick={() => go(h.to)} className="flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left hover:bg-sunk/70">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[10px] bg-sunk text-forest"><Icon name={h.icon} size={14} /></span>
                  <span className="min-w-0"><span className="block truncate text-[13px] font-bold text-ink">{h.title}</span><span className="block truncate text-[11.5px] text-ink-50">{h.sub}</span></span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* round icon button, like the reference header */
const roundBtn = 'grid h-11 w-11 shrink-0 place-items-center rounded-full border border-white/80 bg-white text-forest shadow-[0_8px_20px_rgba(37,88,73,0.06)] transition hover:-translate-y-0.5';

export default function SellerLayout() {
  const { user, view, isAuthenticated, signedOut } = useAuth();
  const { canSection } = useIam();
  const { retailer, retailerId, readOnly } = useSeller();
  const orders = useOrders();
  const tickets = useTickets();
  const { pathname } = useLocation();
  const [rail, setRail] = useState(true);

  if (!isAuthenticated) return <Navigate to={signedOut ? '/login' : `/login?redirect=${encodeURIComponent(pathname)}`} replace />;
  if (user.role === 'ADMIN' && !view) return <Navigate to="/admin/retailers" replace />;
  if (user.role !== 'RETAILER' && user.role !== 'ADMIN') return <Navigate to="/unauthorized" replace />;

  const allowed = (n) => readOnly || canSection(n.section);
  const live = retailer && (retailer.status === 'approved' || retailer.status === 'suspended');
  const nav = live ? SELLER_NAV.filter(allowed) : [];
  const current = [...SELLER_NAV].sort((a, b) => b.to.length - a.to.length).find((n) => (n.exact ? pathname === n.to : pathname === n.to || pathname.startsWith(`${n.to}/`)));
  /* this store's orders still to pack (counted from the raw list: scoping
     here would run before the role checks above) */
  const toPack = (p) => p.retailerId === retailerId && (p.status === 'Pending' || p.status === 'Processing');
  const badges = {
    toPack: live ? orders.filter((o) => (o.parts || []).some(toPack)).length : 0,
    tickets: tickets.reduce((n, t) => n + (t.unreadStore || 0), 0),
  };
  const title = retailer && !live ? 'Your application' : current?.label ?? 'Seller console';
  const tabs = nav.filter((n) => n.top);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-canvas text-forest">
      {view && <ViewBanner />}
      <SideRail open={rail} onClose={() => setRail(false)} nav={nav} badges={badges} home="/seller" subtitle={retailer?.name || 'Retailer commerce hub'} label="Seller" />

      <div className={cx('min-w-0 transition-[margin] duration-200', rail ? 'lg:ml-[272px]' : 'lg:ml-0')}>
        {/* one background with the page (review 6) — no separate header colour */}
        <header className="sticky top-0 z-30 bg-canvas px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] sm:px-6 lg:px-10">
          <div className="flex min-h-[56px] items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              {!rail && (
                <button onClick={() => setRail(true)} aria-label="Show sidebar" className={cx(roundBtn, 'hidden lg:grid')}>
                  <Icon name="menu" size={19} />
                </button>
              )}
              <div className="min-w-0">
                <p className="truncate text-[10.5px] font-bold uppercase tracking-[0.22em] text-forest-800/80">Retailer commerce hub</p>
                <h1 className="truncate text-[clamp(1.25rem,3vw,1.55rem)] font-bold tracking-[-0.03em] text-forest">{title}</h1>
              </div>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
              {live && <ConsoleSearch />}
              {live && !readOnly && (
                <button onClick={() => window.dispatchEvent(new Event(OPEN_CHAT))} aria-label="Ask the Nivorva AI assistant" title="AI assistant" className={cx(roundBtn, 'relative')}>
                  <Icon name="sparkle" size={18} />
                  <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full bg-gold ring-2 ring-canvas" />
                </button>
              )}
              {live && canSection('support') && !readOnly && (
                <Link to="/seller/support" aria-label="Support tickets" title="Support" className={cx(roundBtn, 'hidden sm:grid')}><Icon name="headset" size={18} /></Link>
              )}
              {!readOnly && <NotificationBell />}
              <AvatarMenu readOnly={readOnly} storeName={retailer?.name} />
            </div>
          </div>
          {/* Orders, Products and Payouts across the top (review 6, retailer item 1) */}
          {tabs.length > 0 && (
            <nav aria-label="Quick sections" className="no-bar mt-3 flex gap-1.5 overflow-x-auto">
              {tabs.map((n) => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  className={({ isActive }) => cx('relative flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-[13px] font-bold transition',
                    isActive ? 'bg-forest text-white shadow-btn' : 'bg-white/70 text-forest-800 hover:bg-white hover:text-forest')}
                >
                  <Icon name={n.icon} size={15} /> {n.label}
                  {n.badge && badges[n.badge] > 0 && <span className="tnum grid h-5 min-w-5 place-items-center rounded-full bg-clay px-1 text-[10px] text-white">{badges[n.badge]}</span>}
                </NavLink>
              ))}
            </nav>
          )}
        </header>

        <main className="mx-auto max-w-[1600px] px-4 pb-[calc(110px+env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:px-10 lg:pb-12 lg:pt-4">
          {retailer?.status === 'suspended' && (
            <p className="mb-4 flex items-start gap-2 rounded-[16px] border border-clay/20 bg-clay-50 px-4 py-3 text-[13px] font-semibold text-clay-600"><Icon name="lock" size={15} className="mt-0.5 shrink-0" /> Your store is suspended — your products are hidden and new orders are paused. Finish open orders; Nivorva support will be in touch.</p>
          )}
          {!retailer ? (
            <p className="text-ink-50">This account is not linked to a store.</p>
          ) : !live ? (
            <SellerStatus />
          ) : current && !allowed(current) && nav.length ? (
            /* e.g. the owner signed out and an employee signed in on the same
               device: take them to the first page their role has */
            <Navigate to={nav[0].to} replace />
          ) : current && !allowed(current) ? (
            <div className="mx-auto mt-8 max-w-md rounded-[24px] border border-white/80 bg-white p-8 text-center shadow-card">
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sunk text-forest"><Icon name="key" size={24} /></span>
              <h2 className="mt-4 text-[20px] font-semibold">Not part of your role</h2>
              <p className="mt-2 text-[13.5px] text-ink-50">Ask your store owner to change your role under Users &amp; access.</p>
            </div>
          ) : (
            <motion.div key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><Outlet /></motion.div>
          )}
        </main>
      </div>

      {nav.length > 0 && <BottomNav nav={nav} badges={badges} label="Seller quick navigation" />}
    </div>
  );
}
