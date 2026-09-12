import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { EASE } from '../lib/motion';

const ToastContext = createContext(null);
let _id = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const addToast = useCallback(
    ({ message, type = 'info', duration = 3600 }) => {
      const id = ++_id;
      setToasts((t) => [...t.slice(-3), { id, message, type, duration }]);
      if (duration) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (msg, o) => addToast({ message: msg, type: 'success', ...o }),
      error: (msg, o) => addToast({ message: msg, type: 'error', duration: 5200, ...o }),
      warning: (msg, o) => addToast({ message: msg, type: 'warning', ...o }),
      info: (msg, o) => addToast({ message: msg, type: 'info', ...o }),
    }),
    [addToast]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastStack toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}

const ICON = {
  success: 'm4 12 5 5L20 6',
  error: 'M18 6 6 18M6 6l12 12',
  warning: 'M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z',
  info: 'M12 16v-4m0-4h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z',
};
const STYLE = {
  success: 'border-emerald-100 text-emerald-600',
  error: 'border-clay/25 text-clay-600',
  warning: 'border-amber/25 text-amber',
  info: 'border-slate/20 text-slate',
};
const BAR = { success: 'bg-emerald', error: 'bg-clay', warning: 'bg-amber', info: 'bg-slate' };

function ToastStack({ toasts, dismiss }) {
  return (
    <div className="pointer-events-none fixed inset-x-4 bottom-[calc(var(--tabbar-h,0px)+1rem)] z-[200] flex flex-col items-center gap-2 sm:inset-x-auto sm:right-5 sm:items-end">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40, scale: 0.96 }}
            transition={{ duration: 0.26, ease: EASE }}
            role="alert"
            className={`pointer-events-auto relative w-full max-w-[380px] overflow-hidden rounded-lg border bg-white pl-4 pr-3 py-3 shadow-lift ${STYLE[t.type]}`}
          >
            <div className="flex items-start gap-3">
              <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="mt-px shrink-0" aria-hidden>
                <path d={ICON[t.type]} />
              </svg>
              <p className="flex-1 text-[13.5px] font-medium leading-snug text-ink">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="shrink-0 text-ink-35 transition hover:text-ink" aria-label="Dismiss">
                <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            {t.duration ? (
              <motion.span
                className={`absolute bottom-0 left-0 h-0.5 ${BAR[t.type]}`}
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: t.duration / 1000, ease: 'linear' }}
              />
            ) : null}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
