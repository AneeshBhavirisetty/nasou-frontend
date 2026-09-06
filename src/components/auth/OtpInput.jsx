import { useRef } from 'react';
import { cx } from '../../lib/format';

/* 6-box OTP input: auto-advance, backspace-retreat, full paste support,
   optional shake on error. Calls onChange with the joined string. */
export default function OtpInput({ value = '', onChange, length = 6, error = false, disabled = false }) {
  const refs = useRef([]);
  const chars = value.split('').concat(Array(length).fill('')).slice(0, length);

  const set = (i, ch) => {
    const next = [...chars];
    next[i] = ch;
    onChange(next.join('').slice(0, length));
  };

  const onKey = (i, e) => {
    if (e.key === 'Backspace' && !chars[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus();
    if (e.key === 'ArrowRight' && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onInput = (i, e) => {
    const digit = e.target.value.replace(/\D/g, '').slice(-1);
    set(i, digit);
    if (digit && i < length - 1) refs.current[i + 1]?.focus();
  };

  const onPaste = (e) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, length);
    if (digits) {
      onChange(digits);
      refs.current[Math.min(digits.length, length - 1)]?.focus();
    }
  };

  return (
    <div className={cx('flex gap-2', error && 'animate-shake')} onPaste={onPaste}>
      {chars.map((c, i) => (
        <input
          key={i}
          ref={(el) => (refs.current[i] = el)}
          value={c}
          onChange={(e) => onInput(i, e)}
          onKeyDown={(e) => onKey(i, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          inputMode="numeric"
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          maxLength={1}
          aria-label={`Digit ${i + 1}`}
          className={cx(
            'h-12 w-full rounded-md border bg-white text-center text-[18px] font-bold tnum outline-none transition',
            error ? 'border-clay focus:border-clay focus:ring-2 focus:ring-clay/15'
                  : 'border-line focus:border-emerald focus:ring-2 focus:ring-emerald/15'
          )}
        />
      ))}
    </div>
  );
}
