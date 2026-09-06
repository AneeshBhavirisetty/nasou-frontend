import { useEffect, useRef } from 'react';
import { cx } from '../lib/format';
import Icon from './Icon';

/* ─────────────────────────────────────────────────────────────
   Modal — accessible, focus-trapped modal dialog.

   Props:
     open      bool        Whether the modal is visible
     onClose   function    Called when backdrop / Escape pressed
     title     string      Modal heading (aria-labelledby)
     size      'sm'|'md'|'lg'
     children  ReactNode
   ───────────────────────────────────────────────────────────── */
const SIZE = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-2xl',
};

export default function Modal({ open, onClose, title, size = 'md', children }) {
  const panelRef = useRef(null);

  /* Close on Escape */
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  /* Prevent body scroll while open */
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  /* Basic focus trap — move focus into panel on open */
  useEffect(() => {
    if (open && panelRef.current) {
      const focusable = panelRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cx(
          'relative w-full rounded-xl border border-line bg-white shadow-pop',
          'animate-[rise_.26s_cubic-bezier(.22,1,.36,1)_both]',
          SIZE[size]
        )}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <h2 id="modal-title" className="text-[17px] font-bold">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="grid h-8 w-8 place-items-center rounded-md text-ink-35 transition hover:bg-sunk hover:text-ink"
              aria-label="Close"
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}

        {!title && (
          <button
            onClick={onClose}
            className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-md text-ink-35 transition hover:bg-sunk hover:text-ink"
            aria-label="Close"
          >
            <Icon name="close" size={16} />
          </button>
        )}

        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   ConfirmDialog — wraps Modal for destructive actions.
   ───────────────────────────────────────────────────────────── */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  variant = 'danger', // 'danger' | 'neutral'
  loading = false,
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      {message && (
        <p className="text-[14px] leading-relaxed text-ink-50">{message}</p>
      )}
      <div className="mt-6 flex justify-end gap-3">
        <button
          onClick={onClose}
          className="h-10 rounded-md border border-line px-5 text-[13.5px] font-semibold text-ink-70 transition hover:border-ink-35 hover:text-ink"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cx(
            'h-10 rounded-md px-5 text-[13.5px] font-semibold text-white transition',
            'disabled:opacity-50',
            variant === 'danger'
              ? 'bg-clay hover:bg-clay-600'
              : 'bg-forest hover:bg-forest-800'
          )}
        >
          {loading ? 'Please wait…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}

/* ─────────────────────────────────────────────────────────────
   SessionExpiredDialog — shown when a 401 fires globally.
   ───────────────────────────────────────────────────────────── */
export function SessionExpiredDialog({ open, onLogin }) {
  return (
    <Modal open={open} onClose={() => {}} title="Session expired" size="sm">
      <p className="text-[14px] leading-relaxed text-ink-50">
        Your session has expired. Please log in again to continue.
      </p>
      <div className="mt-6">
        <button
          onClick={onLogin}
          className="w-full rounded-md bg-forest py-2.5 text-[14px] font-semibold text-white transition hover:bg-forest-800"
        >
          Log in
        </button>
      </div>
    </Modal>
  );
}
