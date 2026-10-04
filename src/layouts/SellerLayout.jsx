import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../components/Icon';
import Logo from '../components/Logo';
import NotificationBell from '../components/NotificationBell';
import { Avatar } from '../components/admin/AdminUI';
import { useAuth } from '../context/AuthContext';
import { useIam } from '../context/IamStore';
import { useRetailer } from '../store/retailers';
import { useActor } from '../lib/useScoped';
import { staffRole } from '../lib/access';
import { cx } from '../lib/format';
import SellerStatus from '../pages/seller/Status';

/* Retailer admin view (requirement 14): a retailer manages only their own
   products, orders, payouts and store profile; their staff see the sections
   of their staff role (requirement 21). The Nasou Hive team reaches this
   console only through "View as retailer" — read-only, with a banner and a
   timeout (requirement 29). */

export const SELLER_NAV = [
  { to: '/seller', label: 'Dashboard', icon: 'gauge', section: 'dashboard', end: true },
  { to: '/seller/orders', label: 'Orders', icon: 'truck', section: 'orders' },
  { to: '/seller/products', label: 'Products', icon: 'package', section: 'products' },
  { to: '/seller/payouts', label: 'Payouts', icon: 'rupee', section: 'payouts' },
  { to: '/seller/profile', label: 'Store profile', icon: 'store', section: 'profile' },
  { to: '/seller/team', label: 'Team', icon: 'users', section: 'team' },
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

export default function SellerLayout() {
  const { user, view, logout, isAuthenticated } = useAuth();
  const { canSection } = useIam();
  const { retailer, readOnly } = useSeller();
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  useEffect(() => setMenu(false), [pathname]);

  if (!isAuthenticated) return <Navigate to={`/login?redirect=${encodeURIComponent(pathname)}`} replace />;
  if (user.role === 'ADMIN' && !view) return <Navigate to="/admin/retailers" replace />;
  if (user.role !== 'RETAILER' && user.role !== 'ADMIN') return <Navigate to="/unauthorized" replace />;

  const allowed = (n) => readOnly || canSection(n.section);
  const nav = SELLER_NAV.filter(allowed);
  const current = SELLER_NAV.find((n) => (n.end ? pathname === n.to : pathname.startsWith(n.to)));
  const live = retailer && (retailer.status === 'approved' || retailer.status === 'suspended');

  return (
    <div className="min-h-dvh overflow-x-hidden bg-canvas">
      {view && <ViewBanner />}
      <div className="min-h-dvh bg-[radial-gradient(circle_at_top_right,rgba(31,92,74,0.12),transparent_30%),linear-gradient(180deg,#efeae1_0%,#f5f1ea_50%,#efeae1_100%)]">
        <header className="sticky top-0 z-40 border-b border-white/70 bg-canvas/85 backdrop-blur-2xl">
          <div className="mx-auto flex min-h-[68px] max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Link to="/seller" className="flex min-w-0 items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[14px] bg-forest text-white shadow-btn"><Logo size={22} className="[&>span]:hidden" /></span>
              <span className="min-w-0">
                <span className="block truncate text-[15px] font-bold text-forest">{retailer?.name || 'Seller console'}</span>
                <span className="block text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-forest-800/70">Nivora seller · {readOnly ? 'view only' : staffRole(user.staffRole).label}</span>
              </span>
            </Link>
            {live && (
              <nav className="ml-6 hidden items-center gap-1 lg:flex" aria-label="Seller">
                {nav.map((n) => (
                  <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex h-10 items-center gap-2 rounded-full px-4 text-[13.5px] font-bold transition', isActive ? 'bg-forest text-white shadow-btn' : 'text-forest-800 hover:bg-white')}>
                    <Icon name={n.icon} size={16} /> {n.label}
                  </NavLink>
                ))}
              </nav>
            )}
            <div className="ml-auto flex items-center gap-2">
              {!readOnly && <NotificationBell />}
              <div className="relative">
                <button onClick={() => setMenu((v) => !v)} aria-label="Account menu" className="rounded-full ring-2 ring-white"><Avatar name={user.fullName} tone="dark" /></button>
                <AnimatePresence>
                  {menu && (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute right-0 top-full z-50 mt-2 w-60 rounded-[18px] border border-white/80 bg-white p-1.5 shadow-lift">
                      <div className="rounded-[12px] bg-forest px-3 py-3 text-white"><p className="truncate text-[13.5px] font-bold">{user.fullName}</p><p className="text-[11.5px] text-emerald-100">{readOnly ? 'Nasou Hive team · viewing' : `${staffRole(user.staffRole).label} · ${retailer?.name || ''}`}</p></div>
                      <Link to="/" className="mt-1 flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold text-ink-70 hover:bg-sunk/70"><Icon name="store" size={15} /> View storefront</Link>
                      {!readOnly && <button onClick={() => logout()} className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px] font-bold text-clay-600 hover:bg-clay-50"><Icon name="logout" size={15} /> Sign out</button>}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-[1500px] px-4 pb-[calc(100px+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:pb-12 lg:pt-7">
          {retailer?.status === 'suspended' && (
            <p className="mb-4 flex items-start gap-2 rounded-[16px] border border-clay/20 bg-clay-50 px-4 py-3 text-[13px] font-semibold text-clay-600"><Icon name="lock" size={15} className="mt-0.5 shrink-0" /> Your store is suspended — your products are hidden and new orders are paused. Finish open orders; Nivora support will be in touch.</p>
          )}
          {!retailer ? (
            <p className="text-ink-50">This account is not linked to a store.</p>
          ) : !live ? (
            <SellerStatus />
          ) : current && !allowed(current) ? (
            <div className="mx-auto mt-8 max-w-md rounded-[24px] bg-white p-8 text-center shadow-card">
              <Icon name="key" size={26} className="mx-auto text-forest" />
              <h2 className="mt-3 text-[19px] font-semibold">Not part of your role</h2>
              <p className="mt-1 text-[13.5px] text-ink-50">Ask your store owner to change your role under Team.</p>
            </div>
          ) : (
            <motion.div key={pathname} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}><Outlet /></motion.div>
          )}
        </main>

        {live && (
          <nav aria-label="Seller quick navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/70 bg-white/92 px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_34px_rgba(37,88,73,0.14)] backdrop-blur-2xl lg:hidden">
            <div className="mx-auto grid max-w-lg gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(5, nav.length)}, minmax(0,1fr))` }}>
              {nav.slice(0, 5).map((n) => (
                <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => cx('flex min-h-[54px] flex-col items-center justify-center gap-1 rounded-[14px] text-[10.5px] font-bold', isActive ? 'bg-forest text-white shadow-btn' : 'text-ink-50')}>
                  <Icon name={n.icon} size={18} /><span>{n.label.split(' ')[0]}</span>
                </NavLink>
              ))}
            </div>
          </nav>
        )}
      </div>
    </div>
  );
}
