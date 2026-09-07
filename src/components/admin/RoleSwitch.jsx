import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../Icon';
import { useAuth } from '../../context/AuthContext';
import { cx } from '../../lib/format';

const MOCK = import.meta.env.VITE_API_BASE_URL === undefined || import.meta.env.VITE_MOCK_API === 'true';

/* Demo-only floating control to preview the app as different roles without
   real JWTs. Renders nothing when not in mock mode. */
export default function RoleSwitch() {
  const { role, devSetRole, logout } = useAuth();
  const [open, setOpen] = useState(false);
  if (!MOCK) return null;

  const roles = ['CUSTOMER', 'RETAILER', 'ADMIN'];

  return (
    <div className="fixed bottom-4 left-4 z-[150]">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="mb-2 w-44 rounded-lg border border-line bg-white p-2 shadow-lift"
          >
            <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-ink-35">Preview as</p>
            {roles.map((r) => (
              <button
                key={r}
                onClick={() => { devSetRole(r); setOpen(false); }}
                className={cx('flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] font-semibold transition', role === r ? 'bg-forest text-white' : 'text-ink-70 hover:bg-sunk')}
              >
                <Icon name={r === 'ADMIN' ? 'gauge' : 'user'} size={13} /> {r}
              </button>
            ))}
            {role && (
              <button onClick={() => { logout(); setOpen(false); }} className="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[12.5px] font-semibold text-clay-600 hover:bg-clay-50">
                <Icon name="logout" size={13} /> Sign out
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[11.5px] font-bold text-ink-70 shadow-lift"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-emerald" />
        DEMO · {role || 'guest'}
      </button>
    </div>
  );
}
