import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';
import { useNotifications, timeAgo } from '../context/NotificationStore';
import { cx } from '../lib/format';
import { EASE } from '../lib/motion';

/* Header bell: unread count, and a panel listing recent actions. Opening the
   panel marks everything read (the ones that were new stay highlighted until
   it closes). Full-width sheet on phones, dropdown on larger screens. */
export default function NotificationBell() {
  const { list, unread, markAllRead, clear } = useNotifications();
  const [open, setOpen] = useState(false);
  const [fresh, setFresh] = useState(() => new Set());
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const onClick = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onKey); };
  }, []);

  const toggle = () => {
    if (!open) {
      setFresh(new Set(list.filter((n) => !n.read).map((n) => n.id)));
      if (unread) markAllRead();
    }
    setOpen((v) => !v);
  };

  const go = (n) => {
    setOpen(false);
    if (n.to) navigate(n.to);
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={toggle}
        aria-label={unread ? `Notifications, ${unread} new` : 'Notifications'}
        aria-expanded={open}
        className="relative grid h-11 w-11 place-items-center rounded-full bg-white text-forest transition hover:-translate-y-0.5"
      >
        <Icon name="bell" size={19} />
        {unread > 0 && (
          <span className="tnum absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-forest px-1 text-[10px] font-bold text-white ring-2 ring-canvas">
            {unread > 9 ? '9+' : unread}
          </span>
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
            className="fixed inset-x-3 top-[76px] z-50 overflow-hidden rounded-[18px] border border-white/80 bg-white shadow-lift sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-[360px]"
          >
            <div className="flex items-center justify-between gap-3 bg-forest px-4 py-3 text-white">
              <p className="text-[14px] font-bold">Notifications</p>
              {list.length > 0 && (
                <button onClick={clear} className="text-[12px] font-semibold text-emerald-100 hover:text-white">Clear all</button>
              )}
            </div>
            {list.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-sunk text-forest"><Icon name="bell" size={20} /></span>
                <p className="mt-3 text-[13.5px] font-bold text-forest">You’re all caught up</p>
                <p className="mt-1 text-[12.5px] text-ink-50">Cart, wishlist and order updates will show here.</p>
              </div>
            ) : (
              <ul className="max-h-[min(60dvh,420px)] divide-y divide-line-soft overflow-y-auto">
                {list.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => go(n)}
                      className={cx('flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-[#f4f7f5]', fresh.has(n.id) && 'bg-emerald-50/70')}
                    >
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-sunk text-forest">
                        <Icon name={n.icon || 'bell'} size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13.5px] font-bold leading-snug text-ink">{n.title}</span>
                        {n.body && <span className="mt-0.5 block truncate text-[12.5px] text-ink-50">{n.body}</span>}
                        <span className="mt-1 block text-[11px] text-ink-35">{timeAgo(n.at)}</span>
                      </span>
                      {fresh.has(n.id) && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-forest" aria-label="new" />}
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
