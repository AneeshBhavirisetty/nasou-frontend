import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../lib/api';
import { Button, Container, Field } from '../../components/ui';
import Logo from '../../components/Logo';
import Icon from '../../components/Icon';

export default function ResetPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { token } = useParams();
  const redirect = params.get('redirect') || '/';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!password) {
      setError('Please enter a new password.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!token) {
      setError('Invalid or expired reset token.');
      return;
    }
    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      toast.success('Password reset successfully!');
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message || 'Failed to reset password. Please try again.');
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
          <h1 className="mb-1 text-center text-[22px]">Reset Password</h1>
          <p className="mb-6 text-center text-[13.5px] text-ink-50">
            Enter a new password for your account.
          </p>

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <Field
              label="New password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              required
            />

            <Field
              label="Confirm password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
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
              {loading ? 'Resetting Password…' : 'Reset Password'}
            </Button>
          </form>

          <div className="mt-6 border-t border-line pt-5 text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-emerald-600 hover:text-emerald-700"
            >
              <Icon name="arrowLeft" size={14} />
              Back to Sign in
            </Link>
          </div>
        </div>

        <p className="mt-6 text-center text-[13px] text-ink-50">
          Didn't request a password reset?{' '}
          <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
            Sign in instead
          </Link>
        </p>
      </div>
    </Container>
  );
}