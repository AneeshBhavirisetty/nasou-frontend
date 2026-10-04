import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ProtectedRoute from '../components/ProtectedRoute';
import Icon from '../components/Icon';
import NotificationBell from '../components/NotificationBell';
import { AdminBottomNav, AdminSideRail, navAllowed, navFor } from '../components/admin/AdminSidebar';
import { Avatar } from '../components/admin/AdminUI';
import { useAuth } from '../context/AuthContext';
import { useIam } from '../context/IamStore';
import { userRoleLabel } from '../lib/roles';
import { cx } from '../lib/format';

/* Super Admin console shell: grouped sidebar, sticky header with the section
   title, the bell and the account menu; content on the linen wash. */

function AvatarMenu() {
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
        <Avatar name={user?.fullName} tone="dark" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-[18px] border border-white/80 bg-white p-1.5 shadow-lift"
          >
            <div className="rounded-[12px] bg-forest px-3 py-3 text-white">
              <p className="truncate text-[13.5px] font-bold">{user?.fullName}</p>
              <p className="text-[11.5px] text-emerald-100">{userRoleLabel(user)}</p>
              <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-100/80"><Icon name="shieldCheck" size={12} /> Two-factor sign-in on</p>
            </div>
            <Link to="/" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold text-ink-70 hover:bg-sunk/70 hover:text-forest">
              <Icon name="store" size={15} className="text-ink-35" /> View storefront
            </Link>
            <button onClick={() => { setOpen(false); logout(); navigate('/login'); }} className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px] font-bold text-clay-600 hover:bg-clay-50">
              <Icon name="logout" size={15} /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* Shown instead of a module the signed-in person has no permission for. */
export function NoAccess({ suspended }) {
  return (
    <div className="mx-auto mt-6 max-w-md rounded-[24px] border border-white/80 bg-white p-8 text-center shadow-card">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-sunk text-forest"><Icon name="key" size={24} /></span>
      <h2 className="mt-4 text-[20px] font-semibold">{suspended ? 'Your access is paused' : 'Not part of your role'}</h2>
      <p className="mt-2 text-[13.5px] leading-relaxed text-ink-50">
        {suspended
          ? 'The Owner has suspended this team account. Ask them to re-activate it in Team & customers.'
          : 'Your team role does not include this module. The Owner can change role presets in Team & customers › Roles.'}
      </p>
      <Link to="/admin/dashboard" className="mt-5 inline-flex rounded-md bg-forest px-4 py-2.5 text-[13px] font-bold text-white">Back to dashboard</Link>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const [rail, setRail] = useState(true);
  const { pathname } = useLocation();
  const { can, suspended } = useIam();
  const current = navFor(pathname);
  const title = current?.label ?? 'Super Admin';
  const allowed = navAllowed(can, current) && !suspended;

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-dvh overflow-x-hidden bg-canvas text-forest">
        <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,rgba(31,92,74,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(229,216,199,0.8),transparent_24%),linear-gradient(180deg,#efeae1_0%,#f5f1ea_48%,#efeae1_100%)]">
          <AdminSideRail open={rail} onClose={() => setRail(false)} />

          <div className={cx('min-w-0 transition-[margin] duration-200', rail ? 'lg:ml-[272px]' : 'lg:ml-0')}>
            <header className="sticky top-0 z-30 flex min-h-[68px] items-center justify-between gap-3 border-b border-white/64 bg-canvas/82 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur-2xl sm:px-6 lg:min-h-[78px] lg:px-10">
              <div className="flex min-w-0 items-center gap-3">
                {!rail && (
                  <button onClick={() => setRail(true)} aria-label="Show sidebar" className="hidden h-11 w-11 shrink-0 place-items-center rounded-full border border-white/72 bg-white/82 text-forest shadow-[0_10px_24px_rgba(37,88,73,0.08)] transition hover:-translate-y-px lg:grid">
                    <Icon name="menu" size={19} />
                  </button>
                )}
                <div className="min-w-0">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.22em] text-forest-800/80">Nivora · Super Admin</p>
                  <h1 className="truncate text-[clamp(1.25rem,3vw,1.55rem)] font-bold tracking-[-0.03em] text-forest">{title}</h1>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <NotificationBell />
                <AvatarMenu />
              </div>
            </header>

            <main className="mx-auto max-w-[1600px] px-4 pb-[calc(110px+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-10 lg:pb-12 lg:pt-7">
              <motion.div key={pathname} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                {allowed ? (children ?? <Outlet />) : <NoAccess suspended={suspended} />}
              </motion.div>
            </main>
          </div>

          <AdminBottomNav />
        </div>
      </div>
    </ProtectedRoute>
  );
}
