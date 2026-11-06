import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Field } from '../../components/ui';
import Icon from '../../components/Icon';
import AuthCard from '../../components/auth/AuthCard';
import PasswordField, { scorePassword } from '../../components/auth/PasswordField';
import VerifyEmail from '../../components/auth/VerifyEmail';
import PhoneField from '../../components/auth/PhoneField';
import { isMobile10 } from '../../lib/format';
import { landingFor } from '../../lib/auth';

/* Sign up: one form. The email has its own "Verify" button — a 6-digit code
   emailed and checked inline (client, 6 Nov 2026: email verification instead
   of mobile OTP) — and the account can only be created once it shows
   Verified; the proof (emailToken) goes with the sign-up so the server knows
   the address is the person's. The mobile is a contact number. */
export default function Register() {
  const { isAuthenticated, user, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const explicit = params.get('redirect');

  const [f, setF] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [emailToken, setEmailToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to={landingFor(user, explicit)} replace />;

  const create = async (e) => {
    e.preventDefault();
    setError('');
    if (!f.fullName.trim()) return setError('Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setError('Enter a valid email address.');
    if (!emailToken) return setError('Verify your email — tap Verify and enter the code we email you.');
    if (f.phone && !isMobile10(f.phone)) return setError('Enter a valid 10-digit mobile number, or leave it empty.');
    if (scorePassword(f.password) < 2) return setError('Choose a stronger password (8+ chars, mixed case, a number).');
    setLoading(true);
    try {
      const session = await register({
        phone: f.phone.trim(),
        email: f.email.trim().toLowerCase(),
        fullName: f.fullName.trim(),
        password: f.password,
        emailToken,
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
      subtitle="Your details, then verify your email with a 6-digit code."
      footer={<>Already registered? <Link to="/login" className="font-bold text-forest hover:underline">Sign in</Link> · <Link to="/sell" className="font-bold text-forest hover:underline">Sell on Nivorva</Link></>}
    >
      <form onSubmit={create} noValidate className="space-y-4">
        <Field label="Full name" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} placeholder="Your name" autoComplete="name" required />
        <VerifyEmail value={f.email} onChange={(v) => setF({ ...f, email: v })} token={emailToken} onVerified={setEmailToken} hint="Tap Verify — we’ll email you a 6-digit code." />
        <PhoneField label="Mobile number (optional)" value={f.phone} onChange={(v) => setF({ ...f, phone: v })} hint="For delivery updates from the seller." />
        <PasswordField label="Password" autoComplete="new-password" strength value={f.password} onChange={(v) => setF({ ...f, password: v })} />
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">
            {error}
            {error.includes('already has') && <> <Link to="/login" className="font-bold underline">Sign in</Link></>}
          </motion.p>
        )}
        <Button type="submit" full size="lg" loading={loading} disabled={!emailToken} iconRight="arrowRight">
          {emailToken ? 'Create account' : 'Verify your email to continue'}
        </Button>
      </form>

      <p className="mt-4 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-35">
        <Icon name="shieldCheck" size={13} className="mt-px shrink-0" />
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </AuthCard>
  );
}
