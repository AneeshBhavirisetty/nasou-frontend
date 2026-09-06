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

const MOCK = import.meta.env.VITE_API_BASE_URL === undefined || import.meta.env.VITE_MOCK_API === 'true';

function detectType(v) {
  const t = v.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return t.length === 10 ? 'mobile' : 'mobile-partial';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return 'email';
  return 'invalid';
}

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to={redirect} replace />;

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
      await login(trimmed, password);
      toast.success('Welcome back!');
      navigate(redirect, { replace: true });
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
      footer={<>New to Nasou? <Link to="/login/otp" className="font-semibold text-emerald-600 hover:text-emerald-700">Create an account</Link></>}
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
          rightLink={<Link to="/forgot-password" className="font-normal text-emerald-600 hover:text-emerald-700">Forgot password?</Link>}
        />

        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">
            {error}
          </motion.p>
        )}

        <Button type="submit" full size="lg" loading={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
      </form>

      <div className="mt-5">
        <div className="flex items-center gap-3 text-[12px] text-ink-35">
          <div className="h-px flex-1 bg-line" /><span>or</span><div className="h-px flex-1 bg-line" />
        </div>
        <Link
          to="/login/otp"
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-md border border-line text-[13.5px] font-semibold text-ink-70 transition hover:border-ink-35 hover:text-ink"
        >
          <Icon name="phone" size={15} /> Sign in with OTP
        </Link>
      </div>

      {MOCK && (
        <div className="mt-5 rounded-md border border-dashed border-line bg-canvas px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-50">
          <p className="font-semibold text-ink-70">Demo accounts — password <span className="font-mono">nasou123</span></p>
          <ul className="mt-1 space-y-0.5">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.role} className="flex justify-between gap-2">
                <span className="font-mono">{a.email}</span>
                <span className="shrink-0 rounded bg-white px-1.5 font-semibold text-ink-70">{a.role}</span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-ink-35">Or OTP login with the matching number + any 6 digits.</p>
        </div>
      )}
    </AuthCard>
  );
}
