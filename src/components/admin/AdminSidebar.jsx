import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../Icon';
import Logo from '../Logo';
import { useAuth } from '../../context/AuthContext';
import { cx } from '../../lib/format';

/* Admin navigation in the NasouHive demo dashboard shell: a full-height
   sidebar on desktop, a bottom bar with a "More" sheet on phones. */

export const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', short: 'Home', icon: 'gauge' },
  { to: '/admin/products', label: 'Products', short: 'Products', icon: 'package' },
  { to: '/admin/orders', label: 'Orders', short: 'Orders', icon: 'truck' },
  { to: '/admin/users', label: 'Users', short: 'Users', icon: 'user' },
  { to: '/admin/discounts', label: 'Discounts', short: 'Discounts', icon: 'tag' },
  { to: '/admin/catalog/import', label: 'Catalog import', short: 'Import', icon: 'layers' },
];

const link = ({ isActive }) =>
  cx(
    'flex min-h-12 items-center gap-3 rounded-[18px] px-4 text-[14.5px] font-bold transition',
    isActive ? 'bg-forest text-white shadow-[0_12px_28px_rgba(31,92,74,0.22)]' : 'text-forest-800 hover:bg-white hover:text-forest'
  );

export function AdminSideRail({ open, onClose }) {
  const { logout } = useAuth();
  return (
    <aside
      className={cx(
        'fixed inset-y-0 left-0 z-40 hidden w-[272px] flex-col gap-4 border-r border-white/70 bg-white/72 px-[18px] pb-16 pt-[calc(16px+env(safe-area-inset-top))] shadow-[18px_0_42px_rgba(37,88,73,0.08)] backdrop-blur-2xl transition-transform duration-200 lg:flex',
        !open && '-translate-x-[105%]'
      )}
      aria-label="Admin"
    >
      <button
        onClick={onClose}
        aria-label="Hide sidebar"
        className="grid h-8 w-8 shrink-0 place-items-center self-end rounded-full border border-forest/10 bg-white/76 text-forest transition hover:bg-white"
      >
        <Icon name="close" size={15} />
      </button>

      <Link to="/admin/dashboard" className="flex items-center gap-3.5 rounded-[22px] px-2 py-1">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] bg-forest text-white">
          <Logo size={26} className="[&>span]:hidden" />
        </span>
        <span className="grid min-w-0 gap-0.5">
          <span className="text-[16px] font-extrabold text-forest">Nasou Hive</span>
          <span className="truncate text-[10.5px] font-extrabold uppercase tracking-[0.06em] text-forest-800/70">Admin console</span>
        </span>
      </Link>

      <nav className="grid gap-2 overflow-y-auto pb-4">
        {ADMIN_NAV.map((n) => (
          <NavLink key={n.to} to={n.to} className={link}>
            <Icon name={n.icon} size={19} />
            <span className="truncate">{n.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto grid gap-2 border-t border-line pt-4">
        <Link to="/" className="flex min-h-11 items-center gap-3 rounded-[16px] px-4 text-[13.5px] font-bold text-forest-800 transition hover:bg-white hover:text-forest">
          <Icon name="store" size={17} /> View store
        </Link>
        <button onClick={logout} className="flex min-h-11 items-center gap-3 rounded-[16px] px-4 text-left text-[13.5px] font-bold text-clay-600 transition hover:bg-clay-50">
          <Icon name="logout" size={17} /> Sign out
        </button>
      </div>
    </aside>
  );
}

export function AdminBottomNav() {
  const [more, setMore] = useState(false);
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const primary = ADMIN_NAV.slice(0, 4);
  const rest = ADMIN_NAV.slice(4);
  const inRest = rest.some((n) => pathname.startsWith(n.to));

  useEffect(() => { setMore(false); }, [pathname]);
  useEffect(() => {
    document.documentElement.classList.add('has-tabbar');
    return () => document.documentElement.classList.remove('has-tabbar');
  }, []);

  const tab = (active) =>
    cx('flex min-h-[56px] flex-col items-center justify-center gap-1 rounded-[14px] text-[11px] font-bold transition', active ? 'bg-forest text-white shadow-btn' : 'text-ink-50');

  return (
    <>
      <AnimatePresence>
        {more && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMore(false)} className="fixed inset-0 z-40 bg-ink/30 lg:hidden" />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 34, stiffness: 320 }}
              className="fixed inset-x-0 bottom-0 z-40 rounded-t-[24px] bg-white px-4 pb-[calc(96px+env(safe-area-inset-bottom))] pt-4 shadow-pop lg:hidden"
            >
              <p className="mb-2 px-1 text-[11px] font-bold uppercase tracking-[0.18em] text-ink-50">More</p>
              <div className="grid gap-2">
                {rest.map((n) => (
                  <NavLink key={n.to} to={n.to} className={link}>
                    <Icon name={n.icon} size={19} /> {n.label}
                  </NavLink>
                ))}
                <Link to="/" className={link({ isActive: false })}><Icon name="store" size={19} /> View store</Link>
                <button onClick={logout} className="flex min-h-12 items-center gap-3 rounded-[18px] px-4 text-[14.5px] font-bold text-clay-600 hover:bg-clay-50">
                  <Icon name="logout" size={19} /> Sign out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <nav
        aria-label="Admin quick navigation"
        className="fixed inset-x-0 bottom-0 z-[45] border-t border-white/70 bg-white/92 px-3 pb-[calc(8px+env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_34px_rgba(37,88,73,0.14)] backdrop-blur-2xl lg:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {primary.map((n) => (
            <NavLink key={n.to} to={n.to} className={({ isActive }) => tab(isActive && !more)}>
              <Icon name={n.icon} size={19} /><span>{n.short}</span>
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

/* Back-compat default: the desktop rail (kept for any old import). */
export default AdminSideRail;
