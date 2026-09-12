import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Field } from '../../components/ui';
import Icon from '../../components/Icon';
import AuthCard from '../../components/auth/AuthCard';
import { landingFor } from '../../lib/auth';
import AuthStepper from '../../components/auth/AuthStepper';
import OtpInput from '../../components/auth/OtpInput';
import ResendTimer from '../../components/auth/ResendTimer';
import PasswordField from '../../components/auth/PasswordField';
import PhoneField from '../../components/auth/PhoneField';
import { isMobile10 } from '../../lib/format';

const MOCK = import.meta.env.VITE_API_BASE_URL === undefined || import.meta.env.VITE_MOCK_API === 'true';
const STEPS = ['Mobile', 'Verify', 'Details'];

export default function OtpLogin() {
  const { isAuthenticated, user, sendOtp, verifyOtp, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const explicit = params.get('redirect');
  const redirect = explicit || '/';

  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpErr, setOtpErr] = useState(false);
  const [form, setForm] = useState({ fullName: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to={landingFor(user, explicit)} replace />;

  const send = async () => {
    setError('');
    if (!isMobile10(phone)) return setError('Enter a valid 10-digit mobile number.');
    setLoading(true);
    try {
      await sendOtp(phone.trim());
      toast.success('OTP sent to your phone.');
    } catch {
      toast.info(MOCK ? 'Demo mode — use code 123456' : 'OTP sent.');
    } finally {
      setLoading(false);
      setStep(1);
    }
  };

  const verify = async () => {
    setError(''); setOtpErr(false);
    if (otp.length !== 6) { setOtpErr(true); return setError('Enter the 6-digit code.'); }
    setLoading(true);
    try {
      const data = await verifyOtp(phone.trim(), otp);
      if (data?.accessToken) {
        toast.success('Welcome back!');
        navigate(landingFor(data, explicit), { replace: true });
      } else {
        setStep(2);
        toast.info('One more step — create your account.');
      }
    } catch (err) {
      if (MOCK && otp === '123456') {
        const demoNew = ['9000000000', '9000000001', '9000000002'].includes(phone.replace(/\D/g, ''));
        if (demoNew) { setStep(2); toast.info('New number — create your account.'); }
        else { toast.success('Welcome back! (demo)'); navigate(redirect, { replace: true }); }
      } else {
        setOtpErr(true);
        setError(err.message || 'That code didn’t work. Try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const finish = async () => {
    setError('');
    if (!form.fullName.trim()) return setError('Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Enter a valid email.');
    if (form.password.length < 8) return setError('Use at least 8 characters for your password.');
    setLoading(true);
    try {
      await register({ phone: phone.trim(), email: form.email.trim(), fullName: form.fullName.trim(), password: form.password });
      toast.success('Account created — welcome to Nasou!');
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message || 'Could not create your account.');
    } finally {
      setLoading(false);
    }
  };

  const err = error && (
    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{error}</motion.p>
  );

  return (
    <AuthCard
      title={step === 2 ? 'Create your account' : 'Sign in with OTP'}
      subtitle={
        step === 0 ? 'We’ll text a 6-digit code to verify your number.'
          : step === 1 ? `Enter the code sent to ${phone}.`
            : 'Just your name and email to finish.'
      }
      footer={<>Prefer a password? <Link to="/login" className="font-bold text-forest hover:underline">Sign in here</Link></>}
    >
      <AuthStepper steps={STEPS} current={step} />

      <motion.div key={step} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.28 }}>
        {step === 0 && (
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="space-y-4">
            <PhoneField value={phone} onChange={setPhone} autoFocus />
            {err}
            <Button type="submit" full size="lg" loading={loading}>Send code</Button>
          </form>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <OtpInput value={otp} onChange={(v) => { setOtp(v); setOtpErr(false); }} error={otpErr} disabled={loading} />
            {err}
            <Button onClick={verify} full size="lg" loading={loading}>Verify &amp; continue</Button>
            <div className="flex items-center justify-between">
              <button onClick={() => { setStep(0); setOtp(''); }} className="text-[12.5px] font-semibold text-forest-800 hover:text-forest">← Change number</button>
              <ResendTimer seconds={30} onResend={send} />
            </div>
            {MOCK && <p className="text-center text-[11.5px] text-forest-800">Demo mode — enter any 6 digits</p>}
          </div>
        )}

        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); finish(); }} className="space-y-4">
            <Field label="Full name" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="Your name" required />
            <Field label="Email address" type="email" autoComplete="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" required />
            <PasswordField label="Create a password" autoComplete="new-password" strength value={form.password} onChange={(v) => setForm({ ...form, password: v })} />
            {err}
            <Button type="submit" full size="lg" loading={loading}>Create account</Button>
          </form>
        )}
      </motion.div>
    </AuthCard>
  );
}
