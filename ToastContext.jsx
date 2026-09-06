import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const ToastContext = createContext(null);

let _toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  const addToast = useCallback(
    ({ message, type = 'info', duration = 3500 }) => {
      const id = ++_toastId;
      setToasts((t) => [...t, { id, message, type }]);
      setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (msg, opts) => addToast({ message: msg, type: 'success', ...opts }),
      error: (msg, opts) => addToast({ message: msg, type: 'error', duration: 5000, ...opts }),
      warning: (msg, opts) => addToast({ message: msg, type: 'warning', ...opts }),
      info: (msg, opts) => addToast({ message: msg, type: 'info', ...opts }),
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

/* ─────────────────────────────────────────────────────────────
   ToastStack — the actual rendered toasts
   ───────────────────────────────────────────────────────────── */
const ICON = {
  success: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m4 12 5 5L20 6" />
    </svg>
  ),
  error: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  ),
  warning: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
    </svg>
  ),
  info: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 16v-4m0-4h.01M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20Z" />
    </svg>
  ),
};

const STYLE = {
  success: 'bg-emerald-50 border-emerald-100 text-emerald-600',
  error:   'bg-clay-50 border-clay/25 text-clay-600',
  warning: 'bg-amber-50 border-amber/25 text-amber',
  info:    'bg-slate-50 border-slate/20 text-slate',
};

function ToastStack({ toasts, dismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div
      className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2.5"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`flex max-w-[360px] animate-[rise_.3s_cubic-bezier(.22,1,.36,1)_both] items-start gap-3 rounded-lg border px-4 py-3 shadow-lift ${STYLE[t.type]}`}
        >
          <span className="mt-px shrink-0">{ICON[t.type]}</span>
          <p className="flex-1 text-[13.5px] font-medium leading-snug">{t.message}</p>
          <button
            onClick={() => dismiss(t.id)}
            className="shrink-0 opacity-50 transition hover:opacity-100"
            aria-label="Dismiss"
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden>
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
