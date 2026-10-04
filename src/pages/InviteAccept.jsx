import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import AuthCard from '../components/auth/AuthCard';
import { Button, Field } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { acceptInvite, findInvite } from '../store/accounts';
import { getRetailer } from '../store/retailers';
import { staffRole } from '../lib/access';
import { isMobile10 } from '../lib/format';

/* Invite acceptance page (requirement 21): a retailer's staff member sets
   their name, mobile and password, then lands in the seller console. */
export default function InviteAccept() {
  const { token } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { signInAccount } = useAuth();
  const inv = findInvite(token);
  const store = inv && getRetailer(inv.retailerId);
  const [f, setF] = useState({ fullName: '', phone: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  if (!inv || inv.status !== 'pending') {
    return (
      <AuthCard title="This invite has expired" subtitle="Ask your store owner to send a new one.">
        <Button to="/login" full>Go to sign in</Button>
      </AuthCard>
    );
  }

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (f.fullName.trim().length < 2) return setErr('Enter your name.');
    if (!isMobile10(f.phone)) return setErr('Enter a 10-digit mobile number.');
    if (f.password.length < 8) return setErr('Password needs at least 8 characters.');
    setBusy(true);
    try {
      const a = await acceptInvite(token, f);
      signInAccount(a);
      toast.success(`Welcome to ${store?.name}`);
      navigate('/seller', { replace: true });
    } catch (x) {
      setErr(x.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthCard title={`Join ${store?.name || 'your store'}`} subtitle={`${inv.invitedBy} invited ${inv.email} as ${staffRole(inv.staffRole).label}.`} footer={<>Wrong person? <Link to="/" className="font-bold text-forest">Go to the shop</Link></>}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Your name" value={f.fullName} onChange={(e) => setF((s) => ({ ...s, fullName: e.target.value }))} autoComplete="name" />
        <Field label="Mobile" inputMode="numeric" value={f.phone} onChange={(e) => setF((s) => ({ ...s, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))} />
        <Field label="Choose a password" type="password" value={f.password} onChange={(e) => setF((s) => ({ ...s, password: e.target.value }))} autoComplete="new-password" hint="At least 8 characters — this login is yours alone" />
        {err && <p role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{err}</p>}
        <Button type="submit" full size="lg" loading={busy}>Accept invite</Button>
      </form>
    </AuthCard>
  );
}
