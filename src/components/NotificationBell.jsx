import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';
import { useNotifications, timeAgo } from '../context/NotificationStore';
import { useAuth } from '../context/AuthContext';
import { cx } from '../lib/format';
import { EASE } from '../lib/motion';

/* The bell in every portal (customer review item 4). Customers get tabs for
   orders / account / offers; consoles get one list. Unread items stay
   highlighted until opened or "Mark all read". Full-width sheet on phones,
   dropdown from sm up. */

const TABS = [
  { key: '', label: 'All' },
  { key: 'orders', label: 'Orders' },
  { key: 'account', label: 'Account' },
  { key: 'activity', label: 'Activity' },
];

export default function NotificationBell({ tone = 'light' }) {
  const { list, unread, markAllRead, markOne, clear, dismiss } = useNotifications();
  const { isCustomer } = useAuth();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('');
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, []);

  const shown = useMemo(() => (tab ? list.filter((n) => n.kind === tab) : list), [list, tab]);
  const unreadIn = (k) => list.filter((n) => !n.read && (!k || n.kind === k)).length;

  const go = (n) => {
    markOne(n.id);
    setOpen(false);
    if (n.to) navigate(n.to);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
        aria-expanded={open}
        className={cx('relative grid h-11 w-11 place-items-center rounded-full transition hover:-translate-y-0.5', tone === 'dark' ? 'bg-white/10 text-white' : 'border border-white/72 bg-white text-forest shadow-[0_8px_20px_rgba(37,88,73,0.08)]')}
      >
        <Icon name="bell" size={19} />
        {unread > 0 && (
          <>
            <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 animate-ping rounded-full bg-clay/60" />
            <span className="tnum absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-clay px-1 text-[10px] font-bold text-white ring-2 ring-canvas">
              {unread > 9 ? '9+' : unread}
            </span>
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: EASE }}
            role="dialog"
            aria-label="Notifications"
            className="fixed inset-x-3 top-[76px] z-50 overflow-hidden rounded-[22px] border border-white/80 bg-white shadow-pop sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[380px]"
          >
            <div className="relative overflow-hidden bg-forest px-4 pb-3 pt-3.5 text-white">
              <div className="field-dots-dark pointer-events-none absolute inset-0 opacity-30" />
              <div className="relative flex items-center justify-between gap-3">
                <p className="text-[14.5px] font-bold">Notifications{unread > 0 && <span className="ml-2 rounded-full bg-white/15 px-2 py-0.5 text-[11px]">{unread} new</span>}</p>
                <div className="flex gap-3 text-[12px] font-semibold text-emerald-100">
                  {unread > 0 && <button onClick={markAllRead} className="hover:text-white">Mark all read</button>}
                  {list.length > 0 && <button onClick={clear} className="hover:text-white">Clear</button>}
                </div>
              </div>
              {isCustomer && (
                <div className="no-bar relative mt-3 flex gap-1.5 overflow-x-auto">
                  {TABS.map((t) => (
                    <button key={t.key || 'all'} onClick={() => setTab(t.key)} className={cx('flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-[11.5px] font-bold transition', tab === t.key ? 'bg-white text-forest' : 'bg-white/10 text-white hover:bg-white/20')}>
                      {t.label}{unreadIn(t.key) > 0 && <span className="tnum">· {unreadIn(t.key)}</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {shown.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sunk text-forest"><Icon name="bell" size={20} /></span>
                <p className="mt-3 text-[13.5px] font-bold text-forest">You’re all caught up</p>
                <p className="mt-1 text-[12.5px] text-ink-50">Orders, account changes and updates from the team show up here.</p>
              </div>
            ) : (
              <ul className="thin-bar max-h-[min(62dvh,440px)] divide-y divide-line-soft overflow-y-auto">
                {shown.map((n) => (
                  <li key={n.id} className="group relative">
                    <button onClick={() => go(n)} className={cx('flex w-full items-start gap-3 px-4 py-3 pr-9 text-left transition hover:bg-[#f6f3ed]', !n.read && 'bg-emerald-50/60')}>
                      <span className={cx('mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full', !n.read ? 'bg-forest text-white' : 'bg-sunk text-forest')}>
                        <Icon name={n.icon || 'bell'} size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-bold leading-snug text-ink">{n.title}</span>
                        {n.body && <span className="mt-0.5 line-clamp-2 block text-[12.5px] text-ink-50">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-ink-35">{timeAgo(n.at)}</span>
                      </span>
                      {!n.read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-clay" aria-label="unread" />}
                    </button>
                    <button onClick={() => dismiss(n.id)} aria-label="Dismiss" className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-ink-35 opacity-0 transition hover:bg-sunk hover:text-ink group-hover:opacity-100 focus:opacity-100">
                      <Icon name="close" size={13} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
