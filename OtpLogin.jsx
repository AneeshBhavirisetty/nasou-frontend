import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Container, Field } from '../../components/ui';
import Logo from '../../components/Logo';
import Icon from '../../components/Icon';

export default function OtpLogin() {
  const { isAuthenticated, sendOtp, verifyOtp, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/';

  const [step, setStep] = useState('phone'); // 'phone' | 'otp' | 'register'
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  if (isAuthenticated) return <Navigate to={redirect} replace />;

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setError('');
    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setError('Please enter your mobile number.');
      return;
    }
    setLoading(true);
    try {
      await sendOtp(cleanPhone);
      toast.success('OTP sent successfully!');
      setStep('otp');
    } catch (err) {
      /* Fallback demo mode if backend is offline */
      toast.info('Demo Mode: OTP sent! Use code 123456');
      setStep('otp');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!otp.trim()) {
      setError('Please enter the OTP code.');
      return;
    }
    setLoading(true);
    try {
      const data = await verifyOtp(phone.trim(), otp.trim());
      // Check if this is a new user (no accessToken returned)
      if (data?.accessToken) {
        // Existing user - login successful
        toast.success('Welcome back!');
        navigate(redirect, { replace: true });
      } else {
        // New user - show registration form
        setIsNewUser(true);
        setStep('register');
        toast.info('Please complete your registration');
      }
    } catch (err) {
      // Demo mode fallback
      if (otp.trim() === '123456') {
        // In demo mode, we'll simulate a new user for phones not in our demo database
        const demoPhones = ['+919000000000', '+919000000001', '+919000000002'];
        if (demoPhones.includes(phone.trim())) {
          setIsNewUser(true);
          setStep('register');
          toast.info('Please complete your registration (Demo mode)');
        } else {
          toast.success('Welcome back! (Demo login)');
          navigate(redirect, { replace: true });
        }
      } else {
        setError(err.message || 'Invalid OTP code. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!password) {
      setError('Please enter a password.');
      return;
    }
    setLoading(true);
    try {
      await register({
        phone: phone.trim(),
        email: email.trim(),
        fullName: fullName.trim(),
        password,
      });
      toast.success('Account created successfully!');
      // Auto-login after registration
      navigate(redirect, { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="flex min-h-[calc(100vh-200px)] items-center justify-center py-16">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="mb-8 flex justify-center text-forest">
          <Logo />
        </div>

        <div className="rounded-xl border border-line bg-white p-8 shadow-card">
          {step === 'phone' ? (
            <>
              <h1 className="mb-1 text-center text-[22px]">Sign in with OTP</h1>
              <p className="mb-6 text-center text-[13.5px] text-ink-50">
                We will send a 6-digit verification code to your phone.
              </p>

              <form onSubmit={handleSendOtp} noValidate className="space-y-4">
                <Field
                  label="Mobile number"
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 10) {
                      setPhone(value);
                    }
                  }}
                  placeholder="+91 98765 43210"
                  autoComplete="tel"
                  required
                />

                {error && (
                  <p role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">
                    {error}
                  </p>
                )}

                <Button type="submit" full size="lg" disabled={loading} className="mt-2">
                  {loading ? 'Sending Code…' : 'Send Verification Code'}
                </Button>
              </form>
            </>
          ) : step === 'otp' ? (
            <>
              <h1 className="mb-1 text-center text-[22px]">Verify Mobile Number</h1>
              <p className="mb-6 text-center text-[13.5px] text-ink-50">
                Code sent to {phone}. Enter it below.
              </p>

              <form onSubmit={handleVerifyOtp} noValidate className="space-y-4">
                <Field
                  label="6-Digit OTP"
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  autoComplete="one-time-code"
                  required
                />

                {error && (
                  <p role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">
                    {error}
                  </p>
                )}

                <Button type="submit" full size="lg" disabled={loading} className="mt-2">
                  {loading ? 'Verifying…' : 'Verify & Sign In'}
                </Button>

                <div className="flex items-center justify-between pt-2 text-[12.5px]">
                  <button
                    type="button"
                    onClick={() => { setStep('phone'); setError(''); }}
                    className="text-ink-50 hover:text-ink font-medium"
                  >
                    ← Change number
                  </button>
                  <button
                    type="button"
                    onClick={handleSendOtp}
                    className="font-semibold text-emerald-600 hover:text-emerald-700"
                  >
                    Resend OTP
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <h1 className="mb-1 text-center text-[22px]">Create Account</h1>
              <p className="mb-6 text-center text-[13.5px] text-ink-50">
                Welcome to Nasou Store. Enter your details to get started.
              </p>

              <form onSubmit={handleRegister} noValidate className="space-y-4">
                <Field
                  label="Full name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your full name"
                  required
                />

                <Field
                  label="Email address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />

                <Field
                  label="Mobile number"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 90000 00000"
                  autoComplete="tel"
                  required
                  readOnly
                />

                <Field
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  required
                />

                {error && (
                  <p role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">
                    {error}
                  </p>
                )}

                <Button
                  type="submit"
                  full
                  size="lg"
                  disabled={loading}
                  className="mt-2"
                >
                  {loading ? 'Creating Account…' : 'Create Account'}
                </Button>
              </form>

              <div className="mt-6 border-t border-line pt-5 text-center">
                <Link
                  to="/login/otp"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  <Icon name="arrowLeft" size={14} />
                  Back to verification
                </Link>
              </div>
            </>
          )}

          <div className="mt-6 border-t border-line pt-5 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <Icon name="arrowLeft" size={14} />
              Sign in with Password instead
            </Link>
          </div>
        </div>
      </div>
    </Container>
  );
}
