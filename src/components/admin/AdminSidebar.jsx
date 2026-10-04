import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../Icon';
import Logo from '../Logo';
import { useAuth } from '../../context/AuthContext';
import { useIam } from '../../context/IamStore';
import { useRetailers, useRequests } from '../../store/retailers';
import { useRefunds } from '../../store/orders';
import { cx } from '../../lib/format';

/* Super Admin navigation: a grouped full-height sidebar on desktop, a bottom
   bar with a "More" sheet on phones. `module` ties each entry to the access
   matrix (lib/access.js); an array means "any of these". Hidden entries only
   name detail pages for the header title and the access check. */

export const ADMIN_NAV = [
  { group: 'Overview', to: '/admin/dashboard', label: 'Dashboard', short: 'Home', icon: 'gauge', module: 'dashboards' },
  { group: 'Marketplace', to: '/admin/retailers', label: 'Retailers', short: 'Retailers', icon: 'store', module: 'retailers' },
  { group: 'Marketplace', to: '/admin/approvals', label: 'Approvals', short: 'Approvals', icon: 'shieldCheck', module: ['retailers', 'retailerStatus'], badge: 'approvals' },
  { group: 'Marketplace', to: '/admin/commission', label: 'Commission & plans', short: 'Commission', icon: 'percent', module: 'commission' },
  { group: 'Commerce', to: '/admin/orders', label: 'Orders', short: 'Orders', icon: 'truck', module: 'orders' },
  { group: 'Commerce', to: '/admin/refunds', label: 'Refunds', short: 'Refunds', icon: 'refresh', module: 'refunds', badge: 'refunds' },
  { group: 'Commerce', to: '/admin/products', label: 'Products', short: 'Products', icon: 'package', module: 'catalog' },
  { group: 'Commerce', to: '/admin/catalog', label: 'Master catalog', short: 'Catalog', icon: 'layers', module: 'catalog', exact: true },
  { group: 'Commerce', to: '/admin/discounts', label: 'Discounts', short: 'Discounts', icon: 'tag', module: 'catalog' },
  { group: 'Finance', to: '/admin/payouts', label: 'Payouts', short: 'Payouts', icon: 'rupee', module: 'payouts' },
  { group: 'Finance', to: '/admin/reconciliation', label: 'Reconciliation', short: 'Recon', icon: 'check', module: 'payouts' },
  { group: 'Finance', to: '/admin/billing', label: 'Billing & payments', short: 'Billing', icon: 'card', module: 'payouts' },
  { group: 'Finance', to: '/admin/reports', label: 'Reports & analytics', short: 'Reports', icon: 'barChart', module: 'dashboards' },
  { group: 'People & settings', to: '/admin/users', label: 'Team & customers', short: 'Users', icon: 'users', module: ['team', 'customers'] },
  { group: 'People & settings', to: '/admin/audit', label: 'Audit log', short: 'Audit', icon: 'fileText', module: 'audit' },
  { group: 'People & settings', to: '/admin/settings', label: 'Content & settings', short: 'Settings', icon: 'wrench', module: 'content' },
  { group: 'People & settings', to: '/admin/catalog/import', label: 'Catalog import / export', short: 'Import', icon: 'upload', module: 'catalog' },
  { to: '/admin/customers', label: 'Customer', icon: 'user', module: 'customers', hidden: true },
];

const allowed = (can, m) => (Array.isArray(m) ? m.some((x) => can(x)) : can(m));

/* the nav entry for a path — the longest matching prefix wins */
export function navFor(pathname) {
  return [...ADMIN_NAV].sort((a, b) => b.to.length - a.to.length).find((n) => pathname === n.to || pathname.startsWith(`${n.to}/`)) || null;
}
export const navAllowed = (can, n) => !n || allowed(can, n.module);

/* entries the signed-in person may open */
export function useAdminNav() {
  const { can } = useIam();
  return ADMIN_NAV.filter((n) => !n.hidden && allowed(can, n.module));
}

/* counts that want attention */
function useBadges() {
  const retailers = useRetailers();
  const requests = useRequests();
  const refunds = useRefunds();
  const { can, isOwner } = useIam();
  return {
    approvals: retailers.filter((r) => r.status === 'pending' || r.pendingChanges).length + (isOwner ? requests.filter((q) => q.status === 'open').length : 0),
    refunds: can('refunds', 'approve') ? refunds.filter((r) => r.status === 'requested').length : 0,
  };
}

const link = ({ isActive }) =>
  cx(
    'flex min-h-[42px] items-center gap-3 rounded-[14px] px-3.5 text-[13.5px] font-bold transition',
    isActive ? 'bg-forest text-white shadow-[0_12px_28px_rgba(31,92,74,0.22)]' : 'text-forest-800 hover:bg-white hover:text-forest'
  );

function NavItem({ n, badges }) {
  const count = n.badge ? badges[n.badge] : 0;
  return (
    <NavLink to={n.to} end={n.exact} className={link}>
      {({ isActive }) => (
        <>
          <Icon name={n.icon} size={17} />
          <span className="min-w-0 flex-1 truncate">{n.label}</span>
          {count > 0 && <span className={cx('tnum grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[10.5px] font-black', isActive ? 'bg-white text-forest' : 'bg-clay text-white')}>{count}</span>}
        </>
      )}
    </NavLink>
  );
}

export function AdminSideRail({ open, onClose }) {
  const { logout } = useAuth();
  const nav = useAdminNav();
  const badges = useBadges();
  const groups = [...new Set(nav.map((n) => n.group))];
  return (
    <aside
      className={cx(
        'fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col gap-3 border-r border-white/70 bg-white/72 px-4 pb-6 pt-[calc(14px+env(safe-area-inset-top))] shadow-[18px_0_42px_rgba(37,88,73,0.08)] backdrop-blur-2xl transition-transform duration-200 lg:flex',
        !open && '-translate-x-[105%]'
      )}
      aria-label="Super Admin"
    >
      <div className="flex items-center justify-between gap-2">
        <Link to="/admin/dashboard" className="flex min-w-0 items-center gap-3 rounded-[20px] px-1 py-1">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-[16px] bg-forest text-white shadow-btn">
            <Logo size={24} className="[&>span]:hidden" />
          </span>
          <span className="grid min-w-0 gap-0.5">
            <span className="font-hero text-[17px] font-semibold text-forest">Nivora</span>
            <span className="truncate text-[10px] font-extrabold uppercase tracking-[0.12em] text-forest-800/70">Super Admin</span>
          </span>
        </Link>
        <button onClick={onClose} aria-label="Hide sidebar" className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-forest/10 bg-white/76 text-forest transition hover:bg-white">
          <Icon name="chevronLeft" size={15} />
        </button>
      </div>

      <nav className="thin-bar -mr-2 grid content-start gap-4 overflow-y-auto pr-2">
        {groups.map((g) => (
          <div key={g}>
            <p className="mb-1.5 px-3.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-ink-35">{g}</p>
            <div className="grid gap-1">
              {nav.filter((n) => n.group === g).map((n) => <NavItem key={n.to} n={n} badges={badges} />)}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto grid gap-1 border-t border-line pt-3">
        <Link to="/" className="flex min-h-10 items-center gap-3 rounded-[14px] px-3.5 text-[13px] font-bold text-forest-800 transition hover:bg-white hover:text-forest">
          <Icon name="store" size={16} /> View storefront
        </Link>
        <button onClick={() => logout()} className="flex min-h-10 items-center gap-3 rounded-[14px] px-3.5 text-left text-[13px] font-bold text-clay-600 transition hover:bg-clay-50">
          <Icon name="logout" size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}

export function AdminBottomNav() {
  const [more, setMore] = useState(false);
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const nav = useAdminNav();
  const badges = useBadges();
  const primary = nav.slice(0, 4);
  const rest = nav.slice(4);
  const inRest = rest.some((n) => pathname.startsWith(n.to));

  useEffect(() => { setMore(false); }, [pathname]);
  useEffect(() => {
    document.documentElement.classList.add('has-tabbar');
    return () => document.documentElement.classList.remove('has-tabbar');
  }, []);

  const tab = (active) =>
    cx('relative flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[14px] text-[11px] font-bold transition', active ? 'bg-forest text-white shadow-btn' : 'text-ink-50');

  return (
    <>
      <AnimatePresence>
        {more && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMore(false)} className="fixed inset-0 z-40 bg-ink/30 lg:hidden" />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 34, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-40 max-h-[80dvh] overflow-y-auto rounded-t-[24px] bg-white px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-4 shadow-pop lg:hidden"
            >
              <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-50">More</p>
              <div className="grid grid-cols-2 gap-1.5">
                {rest.map((n) => <NavItem key={n.to} n={n} badges={badges} />)}
                <Link to="/" className={link({ isActive: false })}><Icon name="store" size={17} /> Storefront</Link>
                <button onClick={() => logout()} className="flex min-h-[42px] items-center gap-3 rounded-[14px] px-3.5 text-[13.5px] font-bold text-clay-600 hover:bg-clay-50">
                  <Icon name="logout" size={17} /> Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav aria-label="Admin quick navigation" className="fixed inset-x-0 bottom-0 z-[45] border-t border-white/70 bg-white/92 px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_34px_rgba(37,88,73,0.14)] backdrop-blur-2xl lg:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {primary.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.exact} className={({ isActive }) => tab(isActive && !more)}>
              <Icon name={n.icon} size={19} /><span>{n.short}</span>
              {n.badge && badges[n.badge] > 0 && <span className="absolute right-[18%] top-1.5 h-2 w-2 rounded-full bg-clay" />}
            </NavLink>
          ))}
          <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className={tab(more || inRest)}>
            <Icon name="grid" size={19} /><span>More</span>
          </button>
        </div>
      </nav>
    </>
  );
}

export default AdminSideRail;
