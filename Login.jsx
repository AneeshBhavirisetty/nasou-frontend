import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { Button, Container, Field } from '../../components/ui';
import Logo from '../../components/Logo';
import Icon from '../../components/Icon';

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const redirect = params.get('redirect') || '/';

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  /**
   * Detect whether the user entered:
   * - Mobile number (exactly 10 digits)
   * - Email
   * - Invalid value
   */
  const getInputType = (value) => {
    const trimmed = value.trim();

    if (!trimmed) return null;

    // Remove all non-digits and check if exactly 10 digits
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (/^\d{10}$/.test(digitsOnly)) {
      return 'mobile';
    }

    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return 'email';
    }

    return 'invalid';
  };

  /* Already logged in — skip to intended route */
  if (isAuthenticated) {
    return <Navigate to={redirect} replace />;
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');

    const trimmed = identifier.trim();

    if (!trimmed) {
      setError('Enter your mobile number or email address.');
      return;
    }

    const type = getInputType(trimmed);

    if (type === 'invalid') {
      setError('Invalid mobile number or email address.');
      return;
    }

    if (!password) {
      setError('Enter your password.');
      return;
    }

    setLoading(true);

    try {
      await login(trimmed, password);

      toast.success('Welcome back!');

      navigate(redirect, {
        replace: true,
      });
    } catch (err) {
      setError(
        err.message || 'Invalid credentials. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const inputType = getInputType(identifier);

  const isMobile = inputType === 'mobile';
  const isEmail = inputType === 'email';

  const label = isMobile
    ? 'Mobile number'
    : isEmail
      ? 'Email address'
      : 'Mobile number or email';

  const placeholder = isMobile
    ? '+91 90000 00000'
    : isEmail
      ? 'you@example.com'
      : 'Mobile number or email';

  /**
   * IMPORTANT:
   * Keep the actual HTML input type as "text".
   *
   * Previously the input type was changing between:
   * type="email"
   * type="tel"
   *
   * while the user was typing.
   *
   * This could cause the cursor/caret to jump back
   * to the beginning of the input.
   *
   * inputMode changes the mobile keyboard without
   * changing the actual input type.
   */
  const inputMode = isMobile ? 'numeric' : 'email';

  const autoComplete = isMobile ? 'tel' : 'email';

  return (
    <Container className="flex min-h-[calc(100vh-200px)] items-center justify-center py-16">
      <div className="w-full max-w-[420px]">

        {/* Logo */}
        <div className="mb-8 flex justify-center text-forest">
          <Logo />
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-line bg-white p-8 shadow-card">

          {/* Header */}
          <h1 className="mb-1 text-center text-[22px]">
            Sign in
          </h1>

          <p className="mb-6 text-center text-[13.5px] text-ink-50">
            Welcome back! Your cart stays with you.
          </p>

          {/* Login Form */}
          <form
            onSubmit={submit}
            noValidate
            className="space-y-4"
          >

            {/* Mobile / Email */}
            <Field
              label={label}
              type="text"
              inputMode={inputMode}
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder={placeholder}
              autoComplete={autoComplete}
              required
            />

            {/* Password */}
            <label className="block">

              <span className="mb-1.5 flex items-center justify-between text-[12.5px] font-semibold text-ink-70">
                <span>Password</span>

                <Link
                  to="/forgot-password"
                  className="font-normal text-emerald-600 transition-colors hover:text-emerald-700"
                >
                  Forgot password?
                </Link>
              </span>

              <div className="relative">

                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  required
                  className="
                    h-11
                    w-full
                    rounded-md
                    border
                    border-line
                    bg-white
                    px-3.5
                    pr-12
                    text-[14px]
                    outline-none
                    transition
                    placeholder:text-ink-35
                    focus:border-emerald
                    focus:ring-2
                    focus:ring-emerald/15
                  "
                />

                {/* Show / Hide Password */}
                <button
                  type="button"
                  onClick={() => setShowPw((value) => !value)}
                  className="
                    absolute
                    right-1.5
                    top-1/2
                    flex
                    h-9
                    w-9
                    -translate-y-1/2
                    items-center
                    justify-center
                    rounded-full
                    text-ink-35
                    transition-all
                    duration-200
                    hover:bg-emerald-50
                    hover:text-emerald-600
                    focus:outline-none
                    focus:ring-2
                    focus:ring-emerald/20
                  "
                  aria-label={
                    showPw
                      ? 'Hide password'
                      : 'Show password'
                  }
                  title={
                    showPw
                      ? 'Hide password'
                      : 'Show password'
                  }
                >
                  {showPw ? (
                    <EyeOff
                      size={18}
                      strokeWidth={1.8}
                    />
                  ) : (
                    <Eye
                      size={18}
                      strokeWidth={1.8}
                    />
                  )}
                </button>

              </div>
            </label>

            {/* Error */}
            {error && (
              <p
                role="alert"
                className="
                  rounded-md
                  bg-clay-50
                  px-3
                  py-2.5
                  text-[13px]
                  text-clay-600
                "
              >
                {error}
              </p>
            )}

            {/* Sign In Button */}
            <Button
              type="submit"
              full
              size="lg"
              disabled={loading}
              className="mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </Button>

          </form>

          {/* Alternative Login */}
          <div className="mt-5 space-y-3">

            {/* Divider */}
            <div className="flex items-center gap-3 text-[12px] text-ink-35">
              <div className="h-px flex-1 bg-line" />

              <span>or</span>

              <div className="h-px flex-1 bg-line" />
            </div>

            {/* OTP Login */}
            <Link
              to="/login/otp"
              className="
                flex
                h-11
                w-full
                items-center
                justify-center
                gap-2
                rounded-md
                border
                border-line
                text-[13.5px]
                font-semibold
                text-ink-70
                transition
                hover:border-ink-35
                hover:text-ink
              "
            >
              <Icon
                name="phone"
                size={15}
              />

              Sign in with OTP
            </Link>

          </div>
        </div>

        {/* New User */}
        <p className="mt-6 text-center text-[13px] text-ink-50">
          New user?{' '}

          <Link
            to="/login/otp"
            className="font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Get started with OTP
          </Link>
        </p>

        {/* Forgot Email */}
        <p className="mt-2 text-center text-[13px] text-ink-50">
          Forgot your email?{' '}

          <Link
            to="/forgot-email"
            className="font-semibold text-emerald-600 hover:text-emerald-700"
          >
            Recover it
          </Link>
        </p>

      </div>
    </Container>
  );
}