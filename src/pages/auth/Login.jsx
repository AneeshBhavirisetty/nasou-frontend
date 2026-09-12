import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Field } from '../../components/ui';
import Icon from '../../components/Icon';
import AuthCard from '../../components/auth/AuthCard';
import PasswordField from '../../components/auth/PasswordField';
import { DEMO_ACCOUNTS } from '../../lib/api';
import { landingFor } from '../../lib/auth';

const MOCK = import.meta.env.VITE_API_BASE_URL === undefined || import.meta.env.VITE_MOCK_API === 'true';

function detectType(v) {
  const t = v.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return t.length === 10 ? 'mobile' : 'mobile-partial';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return 'email';
  return 'invalid';
}

export default function Login() {
  const { isAuthenticated, user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const explicit = params.get('redirect');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to={landingFor(user, explicit)} replace />;

  const type = detectType(identifier);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmed = identifier.trim();
    if (!trimmed) return setError('Enter your mobile number or email.');
    if (type === 'invalid') return setError('That doesn’t look like a mobile number or email.');
    if (type === 'mobile-partial') return setError('Mobile number must be exactly 10 digits.');
    if (!password) return setError('Enter your password.');

    setLoading(true);
    try {
      const session = await login(trimmed, password);
      toast.success('Welcome back!');
      navigate(landingFor(session, explicit), { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard
      title="Sign in"
      subtitle="Welcome back — your cart and wishlist are waiting."
      footer={<>New to Nasou? <Link to="/login/otp" className="font-bold text-forest hover:underline">Create an account</Link></>}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <Field
          label={type?.startsWith('mobile') ? 'Mobile number' : type === 'email' ? 'Email address' : 'Mobile number or email'}
          type="text"
          inputMode={type?.startsWith('mobile') ? 'numeric' : 'email'}
          autoComplete="username"
          value={identifier}
          onChange={(e) => {
            const v = e.target.value;
            // pure-digit entry is a mobile number → cap at 10 digits
            setIdentifier(/^\d*$/.test(v) ? v.slice(0, 10) : v.trim());
          }}
          placeholder="you@example.com or 98765 43210"
          required
        />

        <PasswordField
          value={password}
          onChange={setPassword}
          rightLink={<Link to="/forgot-password" className="font-semibold text-forest hover:underline">Forgot password?</Link>}
        />

        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">
            {error}
          </motion.p>
        )}

        <Button type="submit" full size="lg" loading={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
      </form>

      <div className="mt-5">
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-line" /></div>
          <div className="relative flex justify-center text-xs uppercase tracking-[0.16em] text-forest-800">
            <span className="bg-white px-3">Or continue with</span>
          </div>
        </div>
        <Link
          to="/login/otp"
          className="mt-3 flex w-full items-center justify-center gap-3 rounded-md border border-line bg-white/80 px-4 py-3 text-sm font-semibold text-forest transition hover:bg-sunk"
        >
          <span className="grid h-5 w-5 place-items-center rounded-full bg-forest text-white"><Icon name="phone" size={11} /></span>
          Mobile OTP
        </Link>
      </div>

      {MOCK && (
        <div className="mt-5 rounded-[14px] border border-dashed border-[#cad8d2] bg-[#f4f7f5] px-3.5 py-3 text-[11.5px] leading-relaxed text-ink-50">
          <p className="font-bold text-forest">Demo accounts — password <span className="font-mono">nasou123</span></p>
          <ul className="mt-1 space-y-0.5">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.role} className="flex justify-between gap-2">
                <span className="font-mono">{a.email}</span>
                <span className="shrink-0 rounded-full bg-white px-2 font-bold text-forest">{a.role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-center text-[11px] text-ink-50">Or OTP login with the matching number + any 6 digits.</p>
        </div>
      )}
    </AuthCard>
  );
}
