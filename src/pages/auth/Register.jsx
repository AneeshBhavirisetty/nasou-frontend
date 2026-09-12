import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Field } from '../../components/ui';
import Icon from '../../components/Icon';
import AuthCard from '../../components/auth/AuthCard';
import AuthStepper from '../../components/auth/AuthStepper';
import OtpInput from '../../components/auth/OtpInput';
import ResendTimer from '../../components/auth/ResendTimer';
import PasswordField, { scorePassword } from '../../components/auth/PasswordField';
import PhoneField from '../../components/auth/PhoneField';
import { authApi, DEMO_ACCOUNTS } from '../../lib/api';
import { landingFor } from '../../lib/auth';
import { isMobile10 } from '../../lib/format';

const MOCK = import.meta.env.VITE_API_BASE_URL === undefined || import.meta.env.VITE_MOCK_API === 'true';
const STEPS = ['Your details', 'Verify mobile'];

/* Sign up: collect details, then prove the mobile number with an OTP before
   the account is created. The OTP is checked with authApi directly (not the
   context's verifyOtp) so verifying never signs anyone in by accident. */
export default function Register() {
  const { isAuthenticated, user, register, sendOtp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const explicit = params.get('redirect');

  const [step, setStep] = useState(0);
  const [f, setF] = useState({ fullName: '', email: '', phone: '', password: '' });
  const [otp, setOtp] = useState('');
  const [otpErr, setOtpErr] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to={landingFor(user, explicit)} replace />;

  const masked = f.phone ? `+91 ${f.phone.slice(0, 5)} ${f.phone.slice(5)}` : '';

  /* Step 1 → validate details, then text the code. */
  const send = async () => {
    setError('');
    if (!f.fullName.trim()) return setError('Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email)) return setError('Enter a valid email address.');
    if (!isMobile10(f.phone)) return setError('Enter a valid 10-digit mobile number.');
    if (scorePassword(f.password) < 2) return setError('Choose a stronger password (8+ chars, mixed case, a number).');

    setLoading(true);
    try {
      await sendOtp(f.phone.trim());
      toast.success(`OTP sent to ${masked}`);
      setOtp('');
      setOtpErr(false);
      setStep(1);
    } catch (err) {
      setError(err.message || 'Could not send the OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  /* Resend from the verify step (timer-gated). */
  const resend = async () => {
    setError('');
    try {
      await sendOtp(f.phone.trim());
      toast.success(`New code sent to ${masked}`);
    } catch (err) {
      setError(err.message || 'Could not resend the OTP.');
    }
  };

  /* Step 2 → verify the code, then create the account. */
  const verifyAndCreate = async () => {
    setError('');
    setOtpErr(false);
    if (otp.length !== 6) { setOtpErr(true); return setError('Enter the 6-digit code.'); }

    setLoading(true);
    try {
      const res = await authApi.verifyOtp(f.phone.trim(), otp);
      /* The real API answers { isNewUser, session? }. The demo mock treats
         every number as known, so there only the demo accounts count as taken. */
      const taken = MOCK
        ? DEMO_ACCOUNTS.some((a) => a.phone === f.phone)
        : res?.isNewUser === false || Boolean(res?.accessToken);
      if (taken) {
        setOtpErr(true);
        return setError('This mobile number already has an account. Sign in instead.');
      }

      const session = await register({
        phone: f.phone.trim(),
        email: f.email.trim(),
        fullName: f.fullName.trim(),
        password: f.password,
      });
      toast.success('Mobile verified — welcome to Nasou!');
      navigate(landingFor(session, explicit), { replace: true });
    } catch (err) {
      setOtpErr(true);
      setError(err.message || 'That code didn’t work. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const err = error && (
    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">
      {error}
      {error.startsWith('This mobile number already') && (
        <> <Link to="/login" className="font-bold underline">Sign in</Link></>
      )}
    </motion.p>
  );

  return (
    <AuthCard
      title="Create your account"
      subtitle={
        step === 0
          ? 'Step 1 of 2 — your details. We’ll text a code to verify your mobile.'
          : `Step 2 of 2 — enter the 6-digit code sent to ${masked}.`
      }
      footer={<>Already registered? <Link to="/login" className="font-bold text-forest hover:underline">Sign in</Link></>}
    >
      <AuthStepper steps={STEPS} current={step} />

      <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28 }}>
        {step === 0 && (
          <form onSubmit={(e) => { e.preventDefault(); send(); }} noValidate className="space-y-4">
            <Field label="Full name" value={f.fullName} onChange={(e) => setF({ ...f, fullName: e.target.value })} placeholder="Your name" autoComplete="name" required />
            <Field label="Email address" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="you@example.com" autoComplete="email" required />
            <PhoneField value={f.phone} onChange={(v) => setF({ ...f, phone: v })} hint="We’ll send a one-time code to verify this number." />
            <PasswordField label="Password" autoComplete="new-password" strength value={f.password} onChange={(v) => setF({ ...f, password: v })} />
            {err}
            <Button type="submit" full size="lg" loading={loading} iconRight="arrowRight">
              {loading ? 'Sending code…' : 'Send OTP'}
            </Button>
          </form>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-[14px] bg-[#f4f7f5] px-4 py-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-forest text-white"><Icon name="phone" size={15} /></span>
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-forest-800">Code sent to</p>
                <p className="tnum text-[14px] font-bold text-forest">{masked}</p>
              </div>
            </div>
            <OtpInput value={otp} onChange={(v) => { setOtp(v); setOtpErr(false); setError(''); }} error={otpErr} disabled={loading} />
            {err}
            <Button onClick={verifyAndCreate} full size="lg" loading={loading}>
              {loading ? 'Verifying…' : 'Verify & create account'}
            </Button>
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => { setStep(0); setOtp(''); setError(''); }}
                className="text-[12.5px] font-semibold text-forest-800 hover:text-forest"
              >
                ← Edit details
              </button>
              <ResendTimer seconds={30} onResend={resend} />
            </div>
            {MOCK && <p className="text-center text-[11.5px] text-forest-800">Demo mode — enter any 6 digits</p>}
          </div>
        )}
      </motion.div>

      <p className="mt-4 flex items-start gap-1.5 text-[11.5px] leading-relaxed text-ink-35">
        <Icon name="shieldCheck" size={13} className="mt-px shrink-0" />
        By continuing you agree to our Terms and Privacy Policy.
      </p>
    </AuthCard>
  );
}
