import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Field } from '../../components/ui';
import Icon from '../../components/Icon';
import AuthCard from '../../components/auth/AuthCard';
import PasswordField, { scorePassword } from '../../components/auth/PasswordField';
import PhoneField from '../../components/auth/PhoneField';
import { isMobile10 } from '../../lib/format';

export default function Register() {
  const { isAuthenticated, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/';

  const [f, setF] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to={redirect} replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!f.fullName.trim()) return setError('Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setError('Enter a valid email address.');
    if (!isMobile10(f.phone)) return setError('Enter a valid 10-digit mobile number.');
    if (scorePassword(f.password) < 2) return setError('Choose a stronger password (8+ chars, mixed case, a number).');

    setLoading(true);
    try {
      await register({ phone: f.phone.trim(), email: f.email.trim(), fullName: f.fullName.trim(), password: f.password });
      toast.success('Account created — welcome to Nasou!');
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not create your account. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Create your account"
      subtitle="One account for the cart, wishlist, orders and GST invoices."
      footer={<>Already registered? <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">Sign in</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field label="Full name" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} placeholder="Your name" autoComplete="name" required />
        <Field label="Email address" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@example.com" autoComplete="email" required />
        <PhoneField value={f.phone} onChange={(v) => setF({ ...f, phone: v })} />
        <PasswordField label="Password" autoComplete="new-password" strength value={f.password} onChange={(v) => setF({ ...f, password: v })} />

        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{error}</motion.p>
        )}

        <Button type="submit" full size="lg" loading={loading}>Create account</Button>
      </form>

      <p className="mt-4 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-35">
        <Icon name="shieldCheck" size={13} className="mt-px shrink-0" />
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </AuthCard>
  );
}
