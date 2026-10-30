import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Field } from '../../components/ui';
import Icon from '../../components/Icon';
import AuthCard from '../../components/auth/AuthCard';
import PasswordField, { scorePassword } from '../../components/auth/PasswordField';
import VerifyPhone from '../../components/auth/VerifyPhone';
import { landingFor } from '../../lib/auth';

/* Sign up (client review 6): one form. The mobile number has its own
   "Verify" button — a Twilio code checked inline — and the account can only be
   created once it shows Verified; the proof (phoneToken) goes with the sign-up
   so the server knows the number is the person's. */
export default function Register() {
  const { isAuthenticated, user, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const explicit = params.get('redirect');

  const [f, setF] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [phoneToken, setPhoneToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to={landingFor(user, explicit)} replace />;

  const create = async (e) => {
    e.preventDefault();
    setError('');
    if (!f.fullName.trim()) return setError('Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setError('Enter a valid email address.');
    if (!phoneToken) return setError('Verify your mobile number — tap Verify and enter the code we text you.');
    if (scorePassword(f.password) < 2) return setError('Choose a stronger password (8+ chars, mixed case, a number).');
    setLoading(true);
    try {
      const session = await register({
        phone: f.phone.trim(),
        email: f.email.trim(),
        fullName: f.fullName.trim(),
        password: f.password,
        phoneToken,
      });
      toast.success('Welcome to Nivorva!');
      navigate(landingFor(session, explicit), { replace: true });
    } catch (err) {
      setError(err.message || 'Could not create the account. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="Your details, then verify your mobile with a one-time code."
      footer={<>Already registered? <Link to="/login" className="font-bold text-forest hover:underline">Sign in</Link> · <Link to="/sell" className="font-bold text-forest hover:underline">Sell on Nivorva</Link></>}
    >
      <form onSubmit={create} noValidate className="space-y-4">
        <Field label="Full name" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} placeholder="Your name" autoComplete="name" required />
        <Field label="Email address" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@example.com" autoComplete="email" required />
        <VerifyPhone value={f.phone} onChange={(v) => setF({ ...f, phone: v })} token={phoneToken} onVerified={setPhoneToken} hint="Tap Verify — we’ll text you a one-time code." />
        <PasswordField label="Password" autoComplete="new-password" strength value={f.password} onChange={(v) => setF({ ...f, password: v })} />
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">
            {error}
            {error.includes('already has') && <> <Link to="/login" className="font-bold underline">Sign in</Link></>}
          </motion.p>
        )}
        <Button type="submit" full size="lg" loading={loading} disabled={!phoneToken} iconRight="arrowRight">
          {phoneToken ? 'Create account' : 'Verify your mobile to continue'}
        </Button>
      </form>

      <p className="mt-4 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-35">
        <Icon name="shieldCheck" size={13} className="mt-px shrink-0" />
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </AuthCard>
  );
}
