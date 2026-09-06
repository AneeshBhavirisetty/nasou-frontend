import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../lib/api';
import { Button } from '../../components/ui';
import Icon from '../../components/Icon';
import AuthCard from '../../components/auth/AuthCard';
import AuthStepper from '../../components/auth/AuthStepper';
import OtpInput from '../../components/auth/OtpInput';
import ResendTimer from '../../components/auth/ResendTimer';
import PasswordField, { scorePassword } from '../../components/auth/PasswordField';
import PhoneField from '../../components/auth/PhoneField';
import { isMobile10 } from '../../lib/format';

const MOCK = import.meta.env.VITE_API_BASE_URL === undefined || import.meta.env.VITE_MOCK_API === 'true';
const STEPS = ['Mobile', 'Verify', 'New password'];

export default function ForgotPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const { sendOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState(0);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpErr, setOtpErr] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const send = async () => {
    setError('');
    if (!isMobile10(phone)) return setError('Enter a valid 10-digit mobile number.');
    setLoading(true);
    try {
      await sendOtp(phone.trim());
      toast.success('Verification code sent.');
    } catch {
      toast.info(MOCK ? 'Demo mode — use code 123456' : 'Code sent.');
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
      setToken(data?.resetToken || data?.accessToken || 'demo-reset-token');
      setStep(2);
    } catch (err) {
      if (MOCK && otp === '123456') { setToken('demo-reset-token'); setStep(2); }
      else { setOtpErr(true); setError(err.message || 'That code didn’t work.'); }
    } finally {
      setLoading(false);
    }
  };

  const reset = async () => {
    setError('');
    if (scorePassword(pw) < 2) return setError('Choose a stronger password.');
    if (pw !== pw2) return setError('Passwords don’t match.');
    setLoading(true);
    try {
      await authApi.resetPassword(token, pw);
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      if (MOCK) { toast.success('Password updated (demo). Please sign in.'); navigate('/login', { replace: true }); }
      else setError(err.message || 'Could not reset your password.');
    } finally {
      setLoading(false);
    }
  };

  const err = error && (
    <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{error}</motion.p>
  );

  return (
    <AuthCard
      title="Reset your password"
      subtitle={step === 0 ? 'We’ll verify your mobile number first.' : step === 1 ? `Enter the code sent to ${phone}.` : 'Choose a new password.'}
      footer={<Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 hover:text-emerald-700"><Icon name="arrowLeft" size={14} /> Back to sign in</Link>}
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
            <Button onClick={verify} full size="lg" loading={loading}>Verify</Button>
            <div className="flex items-center justify-between">
              <button onClick={() => { setStep(0); setOtp(''); }} className="text-[12.5px] font-medium text-ink-50 hover:text-ink">← Change number</button>
              <ResendTimer seconds={30} onResend={send} />
            </div>
            {MOCK && <p className="text-center text-[11.5px] text-ink-35">Demo code: <span className="font-mono">123456</span></p>}
          </div>
        )}
        {step === 2 && (
          <form onSubmit={(e) => { e.preventDefault(); reset(); }} className="space-y-4">
            <PasswordField label="New password" autoComplete="new-password" strength value={pw} onChange={setPw} />
            <PasswordField label="Confirm password" autoComplete="new-password" value={pw2} onChange={setPw2} error={pw2 && pw !== pw2 ? 'Passwords don’t match' : ''} />
            {err}
            <Button type="submit" full size="lg" loading={loading}>Update password</Button>
          </form>
        )}
      </motion.div>
    </AuthCard>
  );
}
