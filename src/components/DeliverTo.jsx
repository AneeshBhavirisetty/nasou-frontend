import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { addressBook, formatAddress, locate, lookupPin } from '../lib/geo';
import { cx } from '../lib/format';

/* "Deliver to" in the header (customer review item 3): the default address,
   a switch between saved ones, "Locate me", or a PIN code for guests. The
   choice is remembered per browser and pre-fills checkout via the address
   book. */

const KEY = 'nivora_deliver_to';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch { return null; } };

export default function DeliverTo({ className = '' }) {
  const { isAuthenticated, profile, updateProfile, isCustomer } = useAuth();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [pin, setPin] = useState('');
  const [guess, setGuess] = useState(read);
  const ref = useRef(null);
  const book = isAuthenticated ? addressBook(profile) : [];
  const current = book.find((a) => a.isDefault) || book[0] || guess;

  useEffect(() => {
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const remember = (g) => { setGuess(g); try { localStorage.setItem(KEY, JSON.stringify(g)); } catch { /* ignore */ } };

  const useLocation = async () => {
    setBusy(true);
    try {
      const got = await locate();
      remember({ city: got.city || 'Your location', pin: got.pin, state: got.state });
      toast.success(`Delivering to ${got.city || 'your location'}${got.pin ? ` ${got.pin}` : ''}`);
      setOpen(false);
    } catch (x) {
      toast.error(x.message);
    } finally {
      setBusy(false);
    }
  };
  const usePin = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(pin)) return toast.error('Enter a 6-digit PIN code.');
    const hit = await lookupPin(pin);
    remember({ city: hit?.city || 'PIN', pin, state: hit?.state || '' });
    setOpen(false);
  };
  const choose = (a) => {
    updateProfile({ addresses: book.map((x) => ({ ...x, isDefault: x.id === a.id })) });
    setOpen(false);
  };

  return (
    <div ref={ref} className={cx('relative', className)}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex h-11 items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3.5 text-left transition hover:bg-white">
        <Icon name="pin" size={17} className="shrink-0 text-forest" />
        <span className="min-w-0 leading-tight">
          <span className="block text-[10.5px] font-semibold text-ink-50">Deliver to</span>
          <span className="block max-w-[150px] truncate text-[12.5px] font-bold text-forest">{current ? `${current.city || current.label}${current.pin ? ` ${current.pin}` : ''}` : 'Set location'}</span>
        </span>
        <Icon name="chevronDown" size={13} className="text-ink-35" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute left-0 top-full z-50 mt-2 w-[320px] rounded-[20px] border border-white/80 bg-white p-3 shadow-lift">
            <p className="px-1 text-[13px] font-bold text-forest">Choose your delivery location</p>
            <p className="px-1 text-[11.5px] text-ink-50">Delivery fees and dispatch times depend on it.</p>
            {book.length > 0 && (
              <ul className="mt-2 space-y-1.5">
                {book.map((a) => (
                  <li key={a.id}>
                    <button onClick={() => choose(a)} className={cx('w-full rounded-[14px] border px-3 py-2 text-left transition', current?.id === a.id ? 'border-forest bg-emerald-50/60' : 'border-line hover:border-forest/40')}>
                      <span className="block text-[12.5px] font-bold text-ink">{a.label}</span>
                      <span className="block truncate text-[11.5px] text-ink-50">{formatAddress(a)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button onClick={useLocation} disabled={busy} className="mt-2.5 flex w-full items-center gap-2 rounded-[14px] bg-forest px-3 py-2.5 text-[13px] font-bold text-white shadow-btn disabled:opacity-60">
              <Icon name={busy ? 'spinner' : 'pin'} size={15} className={busy ? 'animate-spin' : ''} /> {busy ? 'Finding you…' : 'Use my current location'}
            </button>
            <form onSubmit={usePin} className="mt-2 flex gap-2">
              <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="or enter a PIN code" className="h-10 min-w-0 flex-1 rounded-full border border-line px-3.5 text-[13px] outline-none focus:border-forest" />
              <button className="h-10 rounded-full bg-sunk px-4 text-[12.5px] font-bold text-forest">Apply</button>
            </form>
            {isCustomer && <Link to="/account#addresses" onClick={() => setOpen(false)} className="mt-2.5 block px-1 text-[12px] font-bold text-forest hover:underline">Manage addresses →</Link>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
