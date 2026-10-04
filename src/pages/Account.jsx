import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import PhoneField from '../components/auth/PhoneField';
import AddressForm, { addressProblem, blankAddress } from '../components/AddressForm';
import { Button, Container, Breadcrumbs, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useNotifications } from '../context/NotificationStore';
import { addressBook, formatAddress } from '../lib/geo';
import { userRoleLabel } from '../lib/roles';
import { cx, isMobile10 } from '../lib/format';

/* My profile (customer review items 1, 3 and 5): details, an address book
   with "Use my current location", password, sign out (here or everywhere),
   and deactivate or delete the account. */

const TABS = [
  ['details', 'Details', 'user'],
  ['addresses', 'Addresses', 'pin'],
  ['security', 'Sign-in & security', 'lock'],
  ['account', 'Account', 'shield'],
];

function Section({ title, note, children }) {
  return (
    <section className="rounded-[22px] bg-white p-4 shadow-card sm:p-6">
      <h2 className="text-[18px] font-semibold">{title}</h2>
      {note && <p className="mt-0.5 text-[13px] text-ink-50">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Account() {
  const { user, profile, updateProfile, logout, changePassword, deactivateAccount, deleteAccount } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { push } = useNotifications();
  const [tab, setTab] = useState(() => (window.location.hash === '#addresses' ? 'addresses' : 'details'));
  const [f, setF] = useState(() => ({ fullName: user?.fullName || '', email: profile.email || user?.email || '', phone: profile.phone || user?.phone || '' }));
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // address being edited / added
  const [pw, setPw] = useState({ current: '', next: '', again: '' });
  const [danger, setDanger] = useState(null); // 'deactivate' | 'delete'
  const [reason, setReason] = useState('');
  const [typed, setTyped] = useState('');
  const { hash } = useLocation();
  useEffect(() => { if (hash === '#addresses') setTab('addresses'); }, [hash]);
  const book = addressBook(profile);
  const initials = (f.fullName || 'A').split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');

  const saveDetails = async (e) => {
    e.preventDefault();
    setErr('');
    if (!f.fullName.trim()) return setErr('Enter your name.');
    if (f.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setErr('Enter a valid email address.');
    if (f.phone && !isMobile10(f.phone)) return setErr('Enter a valid 10-digit mobile number.');
    setSaving(true);
    try {
      await updateProfile({ fullName: f.fullName.trim(), email: f.email.trim(), phone: f.phone });
      toast.success('Profile saved');
      push({ icon: 'user', kind: 'account', title: 'Profile updated', body: 'Your name and contact details were saved', to: '/account' });
    } catch (x) {
      setErr(x.message || 'Could not save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const saveAddress = async () => {
    const problem = addressProblem(editing);
    if (problem) return toast.error(problem);
    const isNew = !editing.id;
    const entry = { ...editing, id: editing.id || `ad_${Date.now().toString(36)}` };
    let list = isNew ? [...book, entry] : book.map((a) => (a.id === entry.id ? entry : a));
    if (entry.isDefault || list.length === 1) list = list.map((a) => ({ ...a, isDefault: a.id === entry.id }));
    await updateProfile({ addresses: list });
    push({ icon: 'pin', kind: 'account', title: isNew ? `${entry.label} address added` : `${entry.label} address updated`, body: formatAddress(entry), to: '/account#addresses' });
    toast.success(isNew ? 'Address added' : 'Address updated');
    setEditing(null);
  };
  const removeAddress = async (a) => {
    let list = book.filter((x) => x.id !== a.id);
    if (a.isDefault && list.length) list = list.map((x, i) => ({ ...x, isDefault: i === 0 }));
    await updateProfile({ addresses: list });
    push({ icon: 'trash', kind: 'account', title: `${a.label} address removed`, body: formatAddress(a), to: '/account#addresses' });
  };
  const makeDefault = (a) => updateProfile({ addresses: book.map((x) => ({ ...x, isDefault: x.id === a.id })) }).then(() => toast.success(`${a.label} is now your default address`));

  const savePassword = async (e) => {
    e.preventDefault();
    if (pw.next.length < 8) return toast.error('New password needs at least 8 characters.');
    if (pw.next !== pw.again) return toast.error('The new passwords do not match.');
    try {
      await changePassword(pw.current, pw.next);
      setPw({ current: '', next: '', again: '' });
      toast.success('Password changed');
    } catch (x) {
      toast.error(x.message);
    }
  };

  return (
    <Container className="pb-12 pt-5">
      <Breadcrumbs className="mb-4" items={[{ label: 'Home', to: '/' }, { label: 'My profile' }]} />

      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mesh-forest grain relative flex items-center gap-4 overflow-hidden rounded-[28px] p-5 text-white shadow-pop sm:p-8">
        <span className="font-hero grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white text-xl font-semibold text-forest sm:h-20 sm:w-20 sm:text-2xl">{initials}</span>
        <div className="min-w-0">
          <h1 className="font-hero truncate text-[clamp(1.5rem,5vw,2.2rem)] font-semibold text-white">{f.fullName || 'Your profile'}</h1>
          <p className="mt-1 text-[13px] text-emerald-100">{userRoleLabel(user)} account{f.email ? ` · ${f.email}` : ''}</p>
        </div>
      </motion.section>

      <div className="no-bar mt-5 flex gap-1.5 overflow-x-auto pb-1">
        {TABS.map(([k, label, ic]) => (
          <button key={k} onClick={() => setTab(k)} className={cx('flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-[13.5px] font-bold transition', tab === k ? 'border-forest bg-forest text-white shadow-btn' : 'border-line bg-white text-ink-70 hover:border-forest/40')}>
            <Icon name={ic} size={15} /> {label}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-5">
          {tab === 'details' && (
            <Section title="Your details" note="Used on invoices and for delivery updates.">
              <form onSubmit={saveDetails} noValidate>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Full name" value={f.fullName} onChange={(e) => setF((s) => ({ ...s, fullName: e.target.value }))} autoComplete="name" />
                  <Field label="Email" type="email" value={f.email} onChange={(e) => setF((s) => ({ ...s, email: e.target.value }))} placeholder="you@example.com" autoComplete="email" />
                  <PhoneField value={f.phone} onChange={(v) => setF((s) => ({ ...s, phone: v }))} hint="Used for delivery updates" />
                </div>
                {err && <p role="alert" className="mt-4 rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{err}</p>}
                <div className="mt-6 border-t border-line-soft pt-5"><Button type="submit" size="lg" icon="check" loading={saving}>Save changes</Button></div>
              </form>
            </Section>
          )}

          {tab === 'addresses' && (
            <Section title="Address book" note="Pick one at checkout. “Use my current location” fills most of a new address.">
              <div className="grid gap-3 sm:grid-cols-2">
                {book.map((a) => (
                  <div key={a.id} className={cx('flex flex-col rounded-[18px] border p-4', a.isDefault ? 'border-forest bg-emerald-50/40' : 'border-line')}>
                    <p className="flex items-center gap-2 text-[14px] font-bold text-ink"><Icon name="pin" size={15} className="text-forest" /> {a.label}{a.isDefault && <span className="rounded-full bg-forest px-2 py-0.5 text-[10.5px] text-white">Default</span>}</p>
                    <p className="mt-1.5 flex-1 text-[13px] leading-relaxed text-ink-70">{a.name} · +91 {a.phone}<br />{formatAddress(a)}</p>
                    <div className="mt-3 flex flex-wrap gap-3 text-[12.5px] font-bold">
                      <button onClick={() => setEditing({ ...blankAddress, ...a })} className="text-forest hover:underline">Edit</button>
                      {!a.isDefault && <button onClick={() => makeDefault(a)} className="text-forest hover:underline">Make default</button>}
                      <button onClick={() => removeAddress(a)} className="text-clay-600 hover:underline">Remove</button>
                    </div>
                  </div>
                ))}
                <button onClick={() => setEditing({ ...blankAddress, name: f.fullName, phone: f.phone })} className="grid min-h-[150px] place-items-center rounded-[18px] border-2 border-dashed border-line text-center text-forest transition hover:border-forest hover:bg-emerald-50/40">
                  <span><Icon name="plus" size={22} className="mx-auto" /><span className="mt-1 block text-[13.5px] font-bold">Add an address</span></span>
                </button>
              </div>
            </Section>
          )}

          {tab === 'security' && (
            <>
              <Section title="Change password" note="Changing it signs you out on your other devices.">
                <form onSubmit={savePassword} className="grid gap-3 sm:grid-cols-3">
                  <Field label="Current password" type="password" value={pw.current} onChange={(e) => setPw((s) => ({ ...s, current: e.target.value }))} autoComplete="current-password" />
                  <Field label="New password" type="password" value={pw.next} onChange={(e) => setPw((s) => ({ ...s, next: e.target.value }))} autoComplete="new-password" />
                  <Field label="Repeat new password" type="password" value={pw.again} onChange={(e) => setPw((s) => ({ ...s, again: e.target.value }))} autoComplete="new-password" />
                  <div className="sm:col-span-3"><Button type="submit" icon="lock">Update password</Button></div>
                </form>
              </Section>
              <Section title="Sign out" note="End this session, or every session on every device.">
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" icon="logout" onClick={() => { logout(); navigate('/'); }}>Sign out</Button>
                  <Button variant="outline" icon="shield" onClick={() => { logout({ everywhere: true }); toast.success('Signed out of every device'); navigate('/'); }}>Sign out of all devices</Button>
                </div>
              </Section>
            </>
          )}

          {tab === 'account' && (
            <>
              <Section title="Deactivate account" note="Take a break. Your orders, addresses and wishlist are kept; sign in again any time to switch it back on.">
                <Button variant="outline" icon="clock" onClick={() => { setDanger('deactivate'); setReason(''); }}>Deactivate my account</Button>
              </Section>
              <section className="rounded-[22px] border border-clay/20 bg-clay-50/40 p-4 sm:p-6">
                <h2 className="text-[18px] font-semibold text-clay-600">Delete account</h2>
                <p className="mt-1 text-[13px] text-ink-70">Permanently removes your profile, saved addresses, wishlist and cart, and you cannot sign in again. Invoices for past orders are kept for 8 years because tax law requires it; your name on them is anonymised in our systems.</p>
                <button onClick={() => { setDanger('delete'); setReason(''); setTyped(''); }} className="mt-4 inline-flex h-11 items-center gap-2 rounded-md bg-clay px-5 text-[14px] font-bold text-white hover:bg-clay-600"><Icon name="trash" size={16} /> Delete my account</button>
              </section>
            </>
          )}
        </div>

        <aside className="space-y-3">
          {[
            ['package', 'Your orders', 'Track every seller’s part, invoices', '/orders'],
            ['heart', 'Wishlist', 'Products you saved for later', '/wishlist'],
            ['headset', 'Help & enquiries', 'Bulk quotes and support', '/enquiry'],
          ].map(([ic, t, d, to]) => (
            <Link key={t} to={to} className="flex items-center gap-3 rounded-[18px] bg-white p-4 shadow-card transition hover:-translate-y-0.5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-[12px] bg-sunk text-forest"><Icon name={ic} size={18} /></span>
              <span className="min-w-0 flex-1"><span className="block text-[14px] font-bold text-ink">{t}</span><span className="block text-[12.5px] text-ink-50">{d}</span></span>
              <Icon name="chevronRight" size={16} className="text-ink-35" />
            </Link>
          ))}
          <button onClick={() => { logout(); navigate('/'); }} className="flex w-full items-center justify-center gap-2 rounded-[18px] border border-clay/20 bg-white p-3.5 text-[14px] font-bold text-clay-600 transition hover:bg-clay-50">
            <Icon name="logout" size={16} /> Sign out
          </button>
        </aside>
      </div>

      {editing && (
        <Modal open onClose={() => setEditing(null)} title={editing.id ? `Edit ${editing.label} address` : 'Add an address'} size="lg">
          <AddressForm value={editing} onChange={setEditing} />
          <label className="mt-4 flex items-center gap-2 text-[13px] font-semibold text-ink-70"><input type="checkbox" checked={!!editing.isDefault} onChange={(e) => setEditing((s) => ({ ...s, isDefault: e.target.checked }))} className="accent-[#1f5c4a]" /> Use as my default address</label>
          <div className="mt-5 flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button icon="check" onClick={saveAddress}>Save address</Button>
          </div>
        </Modal>
      )}

      {danger && (
        <Modal open onClose={() => setDanger(null)} title={danger === 'delete' ? 'Delete your account?' : 'Deactivate your account?'} size="sm">
          <p className="text-[13.5px] text-ink-70">{danger === 'delete' ? 'This cannot be undone. Open orders still arrive; refunds go to your original payment method.' : 'You will be signed out. Signing in again re-activates the account straight away.'}</p>
          <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-4 h-11 w-full rounded-md border border-line px-3 text-[14px]">
            <option value="">Tell us why (optional)</option>
            {['I have finished my project', 'Too many notifications', 'Prices or delivery did not work for me', 'Privacy concerns', 'Something else'].map((r) => <option key={r}>{r}</option>)}
          </select>
          {danger === 'delete' && (
            <label className="mt-3 block"><span className="mb-1.5 block text-[12px] font-semibold text-ink-70">Type DELETE to confirm</span><input value={typed} onChange={(e) => setTyped(e.target.value)} className="h-11 w-full rounded-md border border-line px-3 font-mono text-[14px] uppercase" /></label>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDanger(null)}>Keep my account</Button>
            {danger === 'delete'
              ? <Button size="sm" className="!border-clay !bg-clay" disabled={typed.trim().toUpperCase() !== 'DELETE'} onClick={() => { deleteAccount(reason); toast.success('Your account was deleted'); navigate('/'); }}>Delete forever</Button>
              : <Button size="sm" onClick={() => { deactivateAccount(reason); toast.success('Account deactivated — sign in any time to come back'); navigate('/'); }}>Deactivate</Button>}
          </div>
        </Modal>
      )}
    </Container>
  );
}
