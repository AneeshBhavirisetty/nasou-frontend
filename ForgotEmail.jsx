import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { Button, Container, Field } from '../../components/ui';
import Logo from '../../components/Logo';
import Icon from '../../components/Icon';

export default function ForgotEmail() {
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [recoveredEmail, setRecoveredEmail] = useState(null);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const value = phone.trim();
    if (!value) {
      setError('Please enter your mobile number.');
      return;
    }
    setLoading(true);
    try {
      /* In a real app this calls API; for demo we show masked preview */
      setTimeout(() => {
        setRecoveredEmail(`${value.slice(-4)}***@nasoustore.com`);
        toast.success('Account found!');
        setLoading(false);
      }, 500);
    } catch (err) {
      setError('No account associated with this phone number.');
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
          <h1 className="mb-1 text-center text-[22px]">Recover Email</h1>
          <p className="mb-6 text-center text-[13.5px] text-ink-50">
            Enter your mobile number to find your registered email address.
          </p>

          {recoveredEmail ? (
            <div className="text-center space-y-4">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-emerald-600">
                <Icon name="check" size={24} />
              </div>
              <p className="text-[13.5px] text-ink-50">Associated email address:</p>
              <p className="rounded-md bg-canvas py-3 px-4 text-[15px] font-semibold text-ink">
                {recoveredEmail}
              </p>
              <Link
                to="/login"
                className="mt-4 inline-block font-semibold text-emerald-600 hover:text-emerald-700 text-[13.5px]"
              >
                Sign in with Email
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <Field
                label="Registered Mobile number"
                type="tel"
                value={phone}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 10) {
                    setPhone(value);
                  }
                }}
                placeholder="+91 90000 00000"
                required
              />

              {error && (
                <p role="alert" className="rounded-md bg-clay-50 px-3 py-2.5 text-[13px] text-clay-600">
                  {error}
                </p>
              )}

              <Button type="submit" full size="lg" disabled={loading} className="mt-2">
                {loading ? 'Searching…' : 'Find My Account Email'}
              </Button>
            </form>
          )}

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
      </div>
    </Container>
  );
}
