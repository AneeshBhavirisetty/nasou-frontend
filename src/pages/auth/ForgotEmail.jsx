import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui';
import Icon from '../../components/Icon';
import AuthCard from '../../components/auth/AuthCard';
import PhoneField from '../../components/auth/PhoneField';
import { isMobile10 } from '../../lib/format';

export default function ForgotEmail() {
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [found, setFound] = useState(null);
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    setError('');
    if (!isMobile10(phone)) return setError('Enter a valid 10-digit mobile number.');
    setLoading(true);
    setTimeout(() => {
      setFound(`${phone.slice(0, 2)}•••••@gmail.com`);
      toast.success('Account found.');
      setLoading(false);
    }, 550);
  };

  return (
    <AuthCard
      title="Recover your email"
      subtitle="We’ll show the masked email linked to your mobile number."
      footer={<Link to="/login" className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 hover:text-emerald-700"><Icon name="arrowLeft" size={14} /> Back to sign in</Link>}
    >
      {found ? (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600"><Icon name="check" size={22} strokeWidth={2.6} /></span>
          <p className="text-[13px] text-ink-50">Registered email</p>
          <p className="rounded-md bg-canvas px-4 py-3 font-mono text-[15px] font-semibold">{found}</p>
          <Button to="/login" full size="lg" iconRight="arrowRight">Sign in</Button>
        </motion.div>
      ) : (
        <form onSubmit={submit} noValidate className="space-y-4">
          <PhoneField label="Registered mobile number" value={phone} onChange={setPhone} autoFocus />
          {error && (
            <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">{error}</motion.p>
          )}
          <Button type="submit" full size="lg" loading={loading}>Find my email</Button>
        </form>
      )}
    </AuthCard>
  );
}
