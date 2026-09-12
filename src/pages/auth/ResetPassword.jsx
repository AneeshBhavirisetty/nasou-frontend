import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import { authApi } from '../../lib/api';
import { Button } from '../../components/ui';
import Icon from '../../components/Icon';
import AuthCard from '../../components/auth/AuthCard';
import PasswordField, { scorePassword } from '../../components/auth/PasswordField';

const MOCK = import.meta.env.VITE_API_BASE_URL === undefined || import.meta.env.VITE_MOCK_API === 'true';

export default function ResetPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const { token } = useParams();

  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (scorePassword(pw) < 2) return setError('Choose a stronger password (8+ chars, mixed case, a number).');
    if (pw !== pw2) return setError('Passwords don’t match.');
    if (!token) return setError('This reset link is invalid or expired.');

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

  return (
    <AuthCard
      title="Set a new password"
      subtitle="Choose something you haven’t used here before."
      footer={<Link to="/login" className="inline-flex items-center gap-1.5 font-bold text-forest hover:underline"><Icon name="arrowLeft" size={14} /> Back to sign in</Link>}
    >
      <form onSubmit={submit} noValidate className="space-y-4">
        <PasswordField label="New password" autoComplete="new-password" strength value={pw} onChange={setPw} />
        <PasswordField label="Confirm password" autoComplete="new-password" value={pw2} onChange={setPw2} error={pw2 && pw !== pw2 ? 'Passwords don’t match' : ''} />
        {error && (
          <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{error}</motion.p>
        )}
        <Button type="submit" full size="lg" loading={loading}>Update password</Button>
      </form>
    </AuthCard>
  );
}
