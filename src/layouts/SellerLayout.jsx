import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../components/Icon';
import NotificationBell from '../components/NotificationBell';
import { Avatar } from '../components/admin/AdminUI';
import { BottomNav, SideRail } from '../components/admin/AdminSidebar';
import { useAuth } from '../context/AuthContext';
import { useIam } from '../context/IamStore';
import { useRetailer } from '../store/retailers';
import { useActor } from '../lib/useScoped';
import { useOrders } from '../store/orders';
import { staffRole } from '../lib/access';
import { cx } from '../lib/format';
import SellerStatus from '../pages/seller/Status';

/* Retailer admin view (requirement 14): a retailer manages only their own
   products, orders, payouts and store profile; their staff see the sections
   of their staff role (requirement 21), and the store owner adds employees
   on Team. Same shell as the Super Admin console (client review, Oct 2026):
   the menu in a sidebar on the left, the page title in the header, every
   section in a card; phones get the bottom bar with "More". */

export const SELLER_NAV = [
  { group: 'Overview', to: '/seller', label: 'Dashboard', short: 'Home', icon: 'gauge', section: 'dashboard', exact: true },
  { group: 'Selling', to: '/seller/orders', label: 'Orders', short: 'Orders', icon: 'truck', section: 'orders', badge: 'toPack' },
  { group: 'Selling', to: '/seller/products', label: 'Products', short: 'Products', icon: 'package', section: 'products' },
  { group: 'Selling', to: '/seller/payouts', label: 'Payouts', short: 'Payouts', icon: 'rupee', section: 'payouts' },
  { group: 'Your store', to: '/seller/profile', label: 'Store profile', short: 'Profile', icon: 'store', section: 'profile' },
  { group: 'Your store', to: '/seller/team', label: 'Team', short: 'Team', icon: 'users', section: 'team' },
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
              <p className="truncate text-[11.5px] text-emerald-100">{readOnly ? 'Nasou Hive team · viewing' : `${staffRole(user.staffRole).label} · ${storeName || ''}`}</p>
            </div>
            <Link to="/" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold text-ink-70 hover:bg-sunk/70 hover:text-forest">
              <Icon name="store" size={15} className="text-ink-35" /> View storefront
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

export default function SellerLayout() {
  const { user, view, isAuthenticated, signedOut } = useAuth();
  const { canSection } = useIam();
  const { retailer, retailerId, readOnly } = useSeller();
  const orders = useOrders();
  const { pathname } = useLocation();
  const [rail, setRail] = useState(true);

  if (!isAuthenticated) return <Navigate to={signedOut ? '/login' : `/login?redirect=${encodeURIComponent(pathname)}`} replace />;
  if (user.role === 'ADMIN' && !view) return <Navigate to="/admin/retailers" replace />;
  if (user.role !== 'RETAILER' && user.role !== 'ADMIN') return <Navigate to="/unauthorized" replace />;

  const allowed = (n) => readOnly || canSection(n.section);
  const live = retailer && (retailer.status === 'approved' || retailer.status === 'suspended');
  const nav = live ? SELLER_NAV.filter(allowed) : [];
  const current = SELLER_NAV.find((n) => (n.exact ? pathname === n.to : pathname.startsWith(n.to)));
  /* this store's orders still to pack (counted from the raw list: scoping
     here would run before the role checks above) */
  const toPack = (p) => p.retailerId === retailerId && (p.status === 'Pending' || p.status === 'Processing');
  const badges = { toPack: live ? orders.filter((o) => (o.parts || []).some(toPack)).length : 0 };
  const title = retailer && !live ? 'Your application' : current?.label ?? 'Seller console';

  return (
    <div className="min-h-dvh overflow-x-hidden bg-canvas text-forest">
      {view && <ViewBanner />}
      <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,rgba(9,81,67,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(229,216,199,0.8),transparent_24%),linear-gradient(180deg,#efeae1_0%,#f5f1ea_48%,#efeae1_100%)]">
        <SideRail open={rail} onClose={() => setRail(false)} nav={nav} badges={badges} home="/seller" subtitle={retailer?.name || 'Seller console'} label="Seller" />

        <div className={cx('min-w-0 transition-[margin] duration-200', rail ? 'lg:ml-[272px]' : 'lg:ml-0')}>
          <header className="sticky top-0 z-30 flex min-h-[68px] items-center justify-between gap-3 border-b border-white/64 bg-canvas/82 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur-2xl sm:px-6 lg:min-h-[78px] lg:px-10">
            <div className="flex min-w-0 items-center gap-3">
              {!rail && (
                <button onClick={() => setRail(true)} aria-label="Show sidebar" className="hidden h-11 w-11 shrink-0 place-items-center rounded-full border border-white/72 bg-white/82 text-forest shadow-[0_10px_24px_rgba(9,81,67,0.08)] transition hover:-translate-y-px lg:grid">
                  <Icon name="menu" size={19} />
                </button>
              )}
              <div className="min-w-0">
                <p className="truncate text-[10.5px] font-bold uppercase tracking-[0.22em] text-forest-800/80">Nivora · Seller</p>
                <h1 className="truncate text-[clamp(1.25rem,3vw,1.55rem)] font-bold tracking-[-0.03em] text-forest">{title}</h1>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!readOnly && <NotificationBell />}
              <AvatarMenu readOnly={readOnly} storeName={retailer?.name} />
            </div>
          </header>

          <main className="mx-auto max-w-[1600px] px-4 pb-[calc(110px+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-7">
            {retailer?.status === 'suspended' && (
              <p className="mb-4 flex items-start gap-2 rounded-[16px] border border-clay/20 bg-clay-50 px-4 py-3 text-[13px] font-semibold text-clay-600"><Icon name="lock" size={15} className="mt-0.5 shrink-0" /> Your store is suspended — your products are hidden and new orders are paused. Finish open orders; Nivora support will be in touch.</p>
            )}
            {!retailer ? (
              <p className="text-ink-50">This account is not linked to a store.</p>
            ) : !live ? (
              <SellerStatus />
            ) : current && !allowed(current) && nav.length ? (
              /* e.g. the owner signed out on Team and an employee signed in on the
                 same device: take them to the first page their role has */
              <Navigate to={nav[0].to} replace />
            ) : current && !allowed(current) ? (
              <div className="mx-auto mt-8 max-w-md rounded-[24px] border border-white/80 bg-white p-8 text-center shadow-card">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sunk text-forest"><Icon name="key" size={24} /></span>
                <h2 className="mt-4 text-[20px] font-semibold">Not part of your role</h2>
                <p className="mt-2 text-[13.5px] text-ink-50">Ask your store owner to change your role under Team.</p>
              </div>
            ) : (
              <motion.div key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}><Outlet /></motion.div>
            )}
          </main>
        </div>

        {nav.length > 0 && <BottomNav nav={nav} badges={badges} label="Seller quick navigation" />}
      </div>
    </div>
  );
}
