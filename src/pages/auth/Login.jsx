import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Field } from '../../components/ui';
import Icon from '../../components/Icon';
import AuthCard from '../../components/auth/AuthCard';
import PasswordField from '../../components/auth/PasswordField';
import OtpInput from '../../components/auth/OtpInput';
import { DEMO_ACCOUNTS, IS_MOCK } from '../../lib/api';
import { landingFor } from '../../lib/auth';

/* Sign in for all three portals. Login resolves the role (and for retailers,
   the retailer) and lands each person in the right place. Nasou Hive team
   accounts finish with a 6-digit second factor. */

function detectType(v) {
  const t = v.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return t.length === 10 ? 'mobile' : 'mobile-partial';
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return 'email';
  return 'invalid';
}

export default function Login() {
  const { isAuthenticated, user, login, verify2fa } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const explicit = params.get('redirect');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState('');

  if (isAuthenticated) return <Navigate to={landingFor(user, explicit)} replace />;

  const type = detectType(identifier);
  const done = (session) => {
    toast.success(session.reactivated ? 'Welcome back — your account is active again' : `Welcome back, ${session.fullName.split(' ')[0]}!`);
    navigate(landingFor(session, explicit), { replace: true });
  };

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
      const res = await login(trimmed, password);
      if (res?.twoFactorRequired) setChallenge(res);
      else done(res);
    } catch (err) {
      setError(err.message || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const submitCode = async (e) => {
    e?.preventDefault();
    if (code.length !== 6) return setError('Enter the 6-digit code.');
    setError('');
    setLoading(true);
    try {
      done(await verify2fa(challenge.challengeId, code));
    } catch (err) {
      setError(err.message);
      setCode('');
    } finally {
      setLoading(false);
    }
  };

  if (challenge) {
    return (
      <AuthCard title="Two-step check" subtitle={`Nasou Hive team accounts need a second step. Enter the code sent to ${challenge.maskedPhone}.`} back={{ to: '/login', label: 'Use another account' }}>
        <form onSubmit={submitCode} className="space-y-5">
          <OtpInput value={code} onChange={setCode} onComplete={() => {}} />
          {IS_MOCK && <p className="rounded-[12px] bg-[#f6f3ed] px-3 py-2 text-center text-[12px] text-ink-50">Demo code: <b className="font-mono text-forest">123456</b></p>}
          {error && <p role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{error}</p>}
          <Button type="submit" full size="lg" icon="shieldCheck" loading={loading}>Verify and sign in</Button>
        </form>
      </AuthCard>
    );
  }

  const groups = [...new Set(DEMO_ACCOUNTS.map((a) => a.group))];

  return (
    <AuthCard
      title="Sign in"
      subtitle="Shoppers, retailers and the Nivora team all sign in here."
      footer={<>New to Nivora? <Link to="/login/otp" className="font-bold text-forest hover:underline">Create an account</Link> · <Link to="/sell" className="font-bold text-forest hover:underline">Sell on Nivora</Link></>}
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
            setIdentifier(/^\d*$/.test(v) ? v.slice(0, 10) : v.trim());
          }}
          placeholder="you@example.com or 98765 43210"
          required
        />
        <PasswordField value={password} onChange={setPassword} rightLink={<Link to="/forgot-password" className="font-semibold text-forest hover:underline">Forgot password?</Link>} />
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{error}</motion.p>
        )}
        <Button type="submit" full size="lg" loading={loading}>{loading ? 'Signing in…' : 'Sign in'}</Button>
      </form>

      <div className="mt-5">
        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-line" /></div>
          <div className="relative flex justify-center text-xs uppercase tracking-[0.16em] text-forest-800"><span className="bg-white px-3">Or continue with</span></div>
        </div>
        <Link to="/login/otp" className="mt-3 flex w-full items-center justify-center gap-3 rounded-md border border-line bg-white/80 px-4 py-3 text-sm font-semibold text-forest transition hover:bg-sunk">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-forest text-white"><Icon name="phone" size={11} /></span>
          Mobile OTP
        </Link>
      </div>

      {IS_MOCK && (
        <details className="mt-5 rounded-[16px] border border-dashed border-[#cad8d2] bg-[#f6f3ed] px-3.5 py-3 text-[12px] text-ink-50" open>
          <summary className="cursor-pointer font-bold text-forest">Demo accounts — password <span className="font-mono">nivora123</span></summary>
          {groups.map((g) => (
            <div key={g} className="mt-2.5">
              <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-ink-35">{g}</p>
              <ul className="mt-1 space-y-0.5">
                {DEMO_ACCOUNTS.filter((a) => a.group === g).map((a) => (
                  <li key={a.email}>
                    <button type="button" onClick={() => { setIdentifier(a.email); setPassword('nivora123'); setError(''); }} className="flex w-full items-center justify-between gap-2 rounded-[8px] px-1.5 py-1 text-left transition hover:bg-white">
                      <span className="truncate font-mono text-[11.5px] text-ink-70">{a.email}</span>
                      <span className="shrink-0 rounded-full bg-white px-2 text-[11px] font-bold text-forest">{a.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <p className="mt-2 text-[11px]">Tap an account to fill it in. Team accounts then ask for the 2FA code <b className="font-mono">123456</b>.</p>
        </details>
      )}
    </AuthCard>
  );
}
