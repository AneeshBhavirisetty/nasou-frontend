import { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import ProtectedRoute from '../components/ProtectedRoute';
import Icon from '../components/Icon';
import { AdminBottomNav, AdminSideRail, ADMIN_NAV } from '../components/admin/AdminSidebar';
import { useAuth } from '../context/AuthContext';
import { cx } from '../lib/format';

/* Admin console in the NasouHive demo dashboard shell: sidebar on the left,
   a sticky header with the section title, content on a soft linen wash. */

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
  const name = user?.fullName || 'Admin';
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || 'A';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        className="grid h-12 w-12 place-items-center rounded-full bg-forest text-[14px] font-black text-white shadow-[0_12px_28px_rgba(31,92,74,0.28)] transition hover:-translate-y-px"
      >
        {initials}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute right-0 top-full z-50 mt-2 w-60 overflow-hidden rounded-[18px] border border-white/80 bg-white p-1.5 shadow-lift"
          >
            <div className="rounded-[12px] bg-forest px-3 py-3 text-white">
              <p className="truncate text-[13.5px] font-bold">{name}</p>
              <p className="text-[11.5px] text-emerald-100">Administrator</p>
            </div>
            <Link to="/" onClick={() => setOpen(false)} className="mt-1 flex items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px] font-semibold text-ink-70 hover:bg-sunk/70 hover:text-forest">
              <Icon name="store" size={15} className="text-ink-35" /> View store
            </Link>
            <button
              onClick={() => { setOpen(false); logout(); navigate('/'); }}
              className="flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-[13px] font-bold text-clay-600 hover:bg-clay-50"
            >
              <Icon name="logout" size={15} /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function AdminLayout({ children }) {
  const [rail, setRail] = useState(true);
  const { pathname } = useLocation();
  const current = ADMIN_NAV.find((n) => pathname.startsWith(n.to));
  const title = current?.label ?? 'Admin';

  return (
    <ProtectedRoute allowedRoles={['ADMIN']}>
      <div className="min-h-dvh overflow-x-hidden bg-canvas text-forest">
        <div className="min-h-dvh bg-[radial-gradient(circle_at_top_left,rgba(31,92,74,0.16),transparent_28%),radial-gradient(circle_at_top_right,rgba(229,216,199,0.8),transparent_24%),linear-gradient(180deg,#efeae1_0%,#f5f1ea_48%,#efeae1_100%)]">
          <AdminSideRail open={rail} onClose={() => setRail(false)} />

          <div className={cx('min-w-0 transition-[margin] duration-200', rail ? 'lg:ml-[272px]' : 'lg:ml-0')}>
            <header className="sticky top-0 z-30 flex min-h-[72px] items-center justify-between gap-4 border-b border-white/64 bg-canvas/82 px-4 pb-3 pt-[calc(12px+env(safe-area-inset-top))] backdrop-blur-2xl sm:px-6 lg:min-h-[86px] lg:px-10">
              <div className="flex min-w-0 items-center gap-4">
                <button
                  onClick={() => setRail((v) => !v)}
                  aria-label={rail ? 'Hide sidebar' : 'Show sidebar'}
                  className="hidden h-12 w-12 shrink-0 place-items-center rounded-full border border-white/72 bg-white/82 text-forest shadow-[0_10px_24px_rgba(37,88,73,0.08)] transition hover:-translate-y-px lg:grid"
                >
                  <Icon name={rail ? 'close' : 'menu'} size={19} />
                </button>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-forest-800/80">Admin console</p>
                  <h1 className="truncate text-[clamp(1.35rem,3vw,1.65rem)] font-bold tracking-[-0.03em] text-forest">{title}</h1>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-2.5">
                <Link
                  to="/"
                  aria-label="View store"
                  title="View store"
                  className="grid h-12 w-12 place-items-center rounded-full border border-white/72 bg-white/82 text-forest shadow-[0_10px_24px_rgba(37,88,73,0.08)] transition hover:-translate-y-px"
                >
                  <Icon name="store" size={19} />
                </Link>
                <AvatarMenu />
              </div>
            </header>

            <main className="mx-auto max-w-[1600px] px-4 pb-[calc(110px+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-10 lg:pb-10 lg:pt-8">
              <motion.div key={pathname} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}>
                {children ?? <Outlet />}
              </motion.div>
            </main>
          </div>

          <AdminBottomNav />
        </div>
      </div>
    </ProtectedRoute>
  );
}
