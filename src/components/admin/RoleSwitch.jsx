import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../Icon';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { DEMO_ACCOUNTS } from '../../lib/api';
import { SHOW_DEMO } from '../../lib/config';
import { landingFor } from '../../lib/auth';
import { userRoleLabel } from '../../lib/roles';
import { cx } from '../../lib/format';

/* Demo-only: switch between the seeded accounts (every portal and role) in
   one click. In the browser demo it skips the password and 2FA steps; on a
   dev/staging server (config.js demo: true) it signs in with the seeded
   password and the dev 2FA code. Never rendered in production. */
export default function DemoSwitch() {
  const { user, quickLogin, logout } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!SHOW_DEMO) return null;
  const groups = [...new Set(DEMO_ACCOUNTS.map((a) => a.group))];

  const go = async (email) => {
    try {
      logout();
      const a = await quickLogin(email);
      setOpen(false);
      navigate(landingFor(a));
      toast.info(`Signed in as ${a.fullName}`);
    } catch (x) {
      toast.error(x.message);
    }
  };

  return (
    <div className="fixed bottom-[calc(var(--tabbar-h,0px)+1rem)] left-4 z-[150]">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }}
            className="thin-bar mb-2 max-h-[70dvh] w-[290px] overflow-y-auto rounded-[18px] border border-line bg-white p-2 shadow-pop"
          >
            <p className="px-2 pb-1 pt-1 text-[10.5px] font-extrabold uppercase tracking-[0.16em] text-ink-35">Demo — switch account</p>
            {groups.map((g) => (
              <div key={g} className="mt-1.5">
                <p className="px-2 text-[10px] font-bold uppercase tracking-[0.12em] text-forest-800/70">{g}</p>
                {DEMO_ACCOUNTS.filter((a) => a.group === g).map((a) => (
                  <button key={a.email} onClick={() => go(a.email)} className={cx('flex w-full items-center justify-between gap-2 rounded-[10px] px-2 py-1.5 text-left text-[12.5px] font-semibold transition', user?.email === a.email ? 'bg-forest text-white' : 'text-ink-70 hover:bg-sunk')}>
                    <span className="truncate">{a.label}</span>
                    <Icon name="arrowRight" size={12} className="shrink-0 opacity-60" />
                  </button>
                ))}
              </div>
            ))}
            {user && (
              <button onClick={() => { logout(); setOpen(false); navigate('/'); }} className="mt-2 flex w-full items-center gap-2 rounded-[10px] border-t border-line-soft px-2 py-2 text-[12.5px] font-bold text-clay-600 hover:bg-clay-50">
                <Icon name="logout" size={13} /> Sign out
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      <button onClick={() => setOpen((v) => !v)} className="flex h-9 max-w-[230px] items-center gap-1.5 rounded-full border border-line bg-white px-3.5 text-[11.5px] font-bold text-ink-70 shadow-lift">
        <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald" />
        <span className="truncate">DEMO · {user ? userRoleLabel(user) : 'guest'}</span>
      </button>
    </div>
  );
}
