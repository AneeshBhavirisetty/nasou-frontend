import { useEffect, useState } from 'react';

/* "Resend in 0:28" → an active "Resend code" button. */
export default function ResendTimer({ seconds = 30, onResend, className = '' }) {
  const [left, setLeft] = useState(seconds);

  useEffect(() => {
    if (left <= 0) return;
    const t = setInterval(() => setLeft((n) => n - 1), 1000);
    return () => clearInterval(t);
  }, [left]);

  const restart = () => {
    onResend?.();
    setLeft(seconds);
  };

  if (left > 0) {
    return (
      <span className={`text-[12.5px] text-ink-35 ${className}`}>
        Resend code in 0:{String(left).padStart(2, '0')}
      </span>
    );
  }
  return (
    <button type="button" onClick={restart} className={`text-[12.5px] font-semibold text-emerald-600 transition hover:text-emerald-700 ${className}`}>
      Resend code
    </button>
  );
}
