import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { setStockAlert, useStockAlerts } from '../store/stockAlerts';
import { cx } from '../lib/format';

/* "Notify me" for an out-of-stock product. Signed-out shoppers are sent to
   sign in first (the alert belongs to an account so it can reach them).
   `compact` is the round icon used on product cards. */
export default function NotifyMe({ product, compact = false, className = '' }) {
  const { isAuthenticated } = useAuth();
  const waiting = useStockAlerts().includes(product.sku);
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  const toggle = async (e) => {
    e?.preventDefault();
    if (!isAuthenticated) {
      toast.info('Sign in and we’ll tell you the moment it’s back.');
      navigate(`/login?redirect=${encodeURIComponent(`/product/${product.id}`)}`);
      return;
    }
    setBusy(true);
    try {
      await setStockAlert(product.sku, !waiting);
      toast.success(waiting ? 'Alert removed.' : 'We’ll notify you when it’s back in stock.');
    } catch (x) {
      toast.error(x.message || 'Could not set the alert.');
    } finally {
      setBusy(false);
    }
  };

  if (compact) {
    return (
      <button
        onClick={toggle}
        disabled={busy}
        aria-pressed={waiting}
        aria-label={waiting ? `Stop alerts for ${product.name}` : `Notify me when ${product.name} is back`}
        title={waiting ? 'We’ll tell you when it’s back' : 'Notify me when back in stock'}
        className={cx('grid h-9 w-9 shrink-0 place-items-center rounded-md border transition sm:h-10 sm:w-10',
          waiting ? 'border-forest bg-forest text-white' : 'border-forest/30 bg-white text-forest hover:-translate-y-0.5 hover:border-forest', className)}
      >
        <Icon name={waiting ? 'check' : 'bell'} size={16} />
      </button>
    );
  }
  return (
    <button
      onClick={toggle}
      disabled={busy}
      aria-pressed={waiting}
      className={cx('flex h-12 w-full items-center justify-center gap-2 rounded-md border text-[14px] font-bold transition',
        waiting ? 'border-forest bg-emerald-50 text-forest' : 'border-forest bg-white text-forest hover:bg-forest hover:text-white', className)}
    >
      <Icon name={waiting ? 'check' : 'bell'} size={16} />
      {waiting ? 'We’ll notify you — tap to cancel' : 'Notify me when it’s back'}
    </button>
  );
}
