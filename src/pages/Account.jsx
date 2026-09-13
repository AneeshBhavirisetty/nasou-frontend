import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/Icon';
import PhoneField from '../components/auth/PhoneField';
import { Button, Container, Breadcrumbs, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationStore';
import { roleLabel } from '../lib/roles';
import { isMobile10 } from '../lib/format';

/* My profile (client review 2, item 1): edit name, email, mobile and a default
   delivery address. The address pre-fills checkout. Saved through
   AuthContext.updateProfile (PATCH /users/me once the backend is live). */
export default function Account() {
  const { user, profile, updateProfile, logout } = useAuth();
  const toast = useToast();
  const { push } = useNotifications();
  const [f, setF] = useState(() => ({
    fullName: user?.fullName || '',
    email: profile.email || user?.email || '',
    phone: profile.phone || '',
    address: profile.address || '',
    city: profile.city || '',
    pin: profile.pin || '',
  }));
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const initials = (f.fullName || 'A').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  const save = async (e) => {
    e.preventDefault();
    setErr('');
    if (!f.fullName.trim()) return setErr('Enter your name.');
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setErr('Enter a valid email address.');
    if (f.phone && !isMobile10(f.phone)) return setErr('Enter a valid 10-digit mobile number.');
    if (f.pin && !/^\d{6}$/.test(f.pin)) return setErr('PIN code must be 6 digits.');
    setSaving(true);
    try {
      await updateProfile({ ...f, fullName: f.fullName.trim(), email: f.email.trim(), address: f.address.trim(), city: f.city.trim() });
      toast.success('Profile saved');
      push({ icon: 'user', title: 'Profile updated', body: 'Your details and default address were saved', to: '/account' });
    } catch (x) {
      setErr(x.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Container className="pb-12 pt-5">
      <Breadcrumbs className="mb-4" items={[{ label: 'Home', to: '/' }, { label: 'My profile' }]} />

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="forest-band relative flex items-center gap-4 overflow-hidden rounded-[24px] p-5 text-white shadow-pop sm:p-7"
      >
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-xl font-black text-forest sm:h-20 sm:w-20">{initials}</span>
        <div className="min-w-0">
          <h1 className="truncate text-[clamp(1.4rem,5vw,1.9rem)] font-semibold text-white">{f.fullName || 'Your profile'}</h1>
          <p className="mt-1 text-[13px] text-emerald-100">{roleLabel(user?.role)} account{f.email ? ` · ${f.email}` : ''}</p>
        </div>
      </motion.section>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <form onSubmit={save} noValidate className="min-w-0 rounded-[20px] bg-white p-4 shadow-card sm:p-6">
          <h2 className="text-[18px] font-semibold">Your details</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Full name" value={f.fullName} onChange={set('fullName')} autoComplete="name" />
            <Field label="Email" type="email" value={f.email} onChange={set('email')} placeholder="you@example.com" autoComplete="email" />
            <PhoneField value={f.phone} onChange={(v) => setF((s) => ({ ...s, phone: v }))} hint="Used for delivery updates" />
          </div>

          <h2 className="mt-7 text-[18px] font-semibold">Default delivery address</h2>
          <p className="mt-0.5 text-[13px] text-ink-50">Filled in for you at checkout — you can still change it per order.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Address" className="sm:col-span-2" value={f.address} onChange={set('address')} placeholder="Flat, building, street, area" autoComplete="street-address" />
            <Field label="City" value={f.city} onChange={set('city')} autoComplete="address-level2" />
            <Field label="PIN code" inputMode="numeric" maxLength={6} value={f.pin} onChange={(e) => setF((s) => ({ ...s, pin: e.target.value.replace(/\D/g, '').slice(0, 6) }))} autoComplete="postal-code" />
          </div>

          {err && <p role="alert" className="mt-4 rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{err}</p>}
          <div className="mt-6 flex flex-wrap gap-3 border-t border-line-soft pt-5">
            <Button type="submit" size="lg" icon="check" loading={saving}>Save changes</Button>
          </div>
        </form>

        <aside className="space-y-3">
          {[
            ['package', 'Your orders', 'Track, reorder and download invoices', '/orders'],
            ['heart', 'Wishlist', 'Products you saved for later', '/wishlist'],
            ['headset', 'Help & enquiries', 'Bulk quotes and support', '/enquiry'],
          ].map(([ic, t, d, to]) => (
            <Link key={t} to={to} className="flex items-center gap-3 rounded-[18px] bg-white p-4 shadow-card transition hover:-translate-y-0.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-sunk text-forest"><Icon name={ic} size={18} /></span>
              <span className="min-w-0 flex-1">
                <span className="block text-[14px] font-bold text-ink">{t}</span>
                <span className="block text-[12.5px] text-ink-50">{d}</span>
              </span>
              <Icon name="chevronRight" size={16} className="text-ink-35" />
            </Link>
          ))}
          <button onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-clay/20 bg-white p-3.5 text-[14px] font-bold text-clay-600 transition hover:bg-clay-50">
            <Icon name="logout" size={16} /> Sign out
          </button>
        </aside>
      </div>
    </Container>
  );
}
