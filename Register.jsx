import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Container, Field } from '../../components/ui';
import Logo from '../../components/Logo';
import Icon from '../../components/Icon';

export default function Register() {
  const { isAuthenticated, register } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirect = params.get('redirect') || '/';

  const [step, setStep] = useState('info'); // 'info' | 'success'
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState(''); // pre-filled from OTP flow
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (isAuthenticated) return <Navigate to={redirect} replace />;

  const handleSubmit = async (e) => {
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
      setStep('success');
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
          {step === 'info' ? (
            <>
              <h1 className="mb-1 text-center text-[22px]">Create Account</h1>
              <p className="mb-6 text-center text-[13.5px] text-ink-50">
                Welcome to Nasou Store. Enter your details to get started.
              </p>

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
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
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= 10) {
                      setPhone(value);
                    }
                  }}
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
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600 hover:text-emerald-700"
                >
                  <Icon name="arrowLeft" size={14} />
                  Already have an account? Sign in
                </Link>
              </div>
            </>
          ) : (
            <>
              <div className="text-center space-y-6">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                  <Icon name="check" size={32} />
                </div>
                <h1 className="mb-2 text-center text-[24px]">Account Created!</h1>
                <p className="mb-4 text-center text-[14px] text-ink-50">
                  Your account has been successfully created. You can now sign in and start shopping.
                </p>
                <Link
                  to="/login"
                  className="inline-block font-semibold text-emerald-600 hover:text-emerald-700 text-[13.5px]"
                >
                  Sign in to your account
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="mt-6 text-center text-[13px] text-ink-50">
          By signing up, you agree to our{' '}
          <Link to="/" className="font-semibold text-emerald-600 hover:text-emerald-700">
            Terms of Service
          </Link>
          and{' '}
          <Link to="/" className="font-semibold text-emerald-600 hover:text-emerald-700">
            Privacy Policy
          </Link>.
        </p>
      </div>
    </Container>
  );
}