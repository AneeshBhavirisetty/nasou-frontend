import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../Icon';
import PhoneField from './PhoneField';
import OtpInput from './OtpInput';
import ResendTimer from './ResendTimer';
import { authApi, IS_MOCK } from '../../lib/api';
import { cx, isMobile10 } from '../../lib/format';

/* Mobile number with its own "Verify" button (client review 6, customer item
   4: "in signup we need the Twilio button"). Tapping it texts a one-time code
   through nasou-api → Twilio Verify; the code is checked inline and the field
   locks with a green tick. `onVerified(phoneToken)` hands the proof to the
   form, which sends it with the sign-up (customer) or the application
   (retailer). Changing the number clears the proof.

   A number that already has an account cannot be verified for a new one —
   the person is pointed to sign in instead. */
export default function VerifyPhone({ value, onChange, token, onVerified, label = 'Mobile number', hint }) {
  const [stage, setStage] = useState('idle'); // idle → sent → (verified when token is set)
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const verified = !!token;
  const masked = value ? `+91 ${value.slice(0, 5)} ${value.slice(5)}` : '';

  const send = async () => {
    setError('');
    if (!isMobile10(value)) return setError('Enter a valid 10-digit mobile number first.');
    setBusy(true);
    try {
      await authApi.sendOtp(value);
      setOtp('');
      setStage('sent');
    } catch (x) {
      setError(x.message || 'Could not send the code. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const check = async () => {
    setError('');
    if (otp.length !== 6) return setError('Enter the 6-digit code.');
    setBusy(true);
    try {
      const res = await authApi.verifyOtp(value, otp);
      if (res?.isNewUser === false || res?.accessToken) {
        setError('This mobile number already has a Nivorva account. Sign in instead.');
        return;
      }
      onVerified(res?.phoneToken || (IS_MOCK ? 'demo-phone-token' : ''));
      setStage('idle');
    } catch (x) {
      setError(x.message || 'That code didn’t work. Try again.');
    } finally {
      setBusy(false);
    }
  };

  const change = (v) => {
    onChange(v);
    if (verified) onVerified('');
    if (stage === 'sent') setStage('idle');
  };

  return (
    <div>
      <div className="flex items-end gap-2">
        <div className="min-w-0 flex-1">
          <PhoneField label={label} value={value} onChange={change} disabled={stage === 'sent' || verified} hint={!error && !verified && stage !== 'sent' ? hint : undefined} />
        </div>
        {verified ? (
          <span className="mb-[3px] flex h-[46px] shrink-0 items-center gap-1.5 rounded-md bg-emerald-50 px-3.5 text-[13px] font-bold text-emerald-700">
            <Icon name="shieldCheck" size={16} /> Verified
          </span>
        ) : stage === 'sent' ? (
          <button type="button" onClick={() => { setStage('idle'); setOtp(''); setError(''); }} className="mb-[3px] h-[46px] shrink-0 rounded-md border border-line px-3 text-[12.5px] font-bold text-forest hover:border-forest">
            Change
          </button>
        ) : (
          <button type="button" onClick={send} disabled={busy || !isMobile10(value)} className="mb-[3px] flex h-[46px] shrink-0 items-center gap-1.5 rounded-md bg-forest px-4 text-[13px] font-bold text-white shadow-btn transition hover:bg-forest-800 disabled:opacity-45">
            {busy ? <Icon name="spinner" size={15} className="animate-spin" /> : <Icon name="phone" size={14} />} Verify
          </button>
        )}
      </div>
      {verified && (
        <button type="button" onClick={() => change(value)} className="mt-1.5 text-[12px] font-semibold text-ink-50 hover:text-forest">
          {masked} is verified by SMS · use a different number
        </button>
      )}

      <AnimatePresence initial={false}>
        {stage === 'sent' && !verified && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-3 space-y-3 rounded-[14px] border border-forest/15 bg-emerald-50/50 p-3.5">
              <p className="text-[12.5px] text-ink-70">Enter the 6-digit code we texted to <b className="tnum text-forest">{masked}</b>.</p>
              <OtpInput value={otp} onChange={(v) => { setOtp(v); setError(''); }} error={!!error} disabled={busy} />
              <div className="flex items-center justify-between gap-3">
                <ResendTimer seconds={30} onResend={send} />
                <button type="button" onClick={check} disabled={busy || otp.length !== 6} className="flex h-10 items-center gap-1.5 rounded-md bg-forest px-4 text-[13px] font-bold text-white shadow-btn disabled:opacity-45">
                  {busy ? <Icon name="spinner" size={15} className="animate-spin" /> : <Icon name="check" size={15} />} Confirm code
                </button>
              </div>
              {IS_MOCK && <p className="text-[11.5px] text-forest-800">Demo mode — any 6 digits work.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p role="alert" className={cx('mt-2 rounded-md bg-clay-50 px-3 py-2 text-[12.5px] text-clay-600')}>{error}</p>}
    </div>
  );
}
