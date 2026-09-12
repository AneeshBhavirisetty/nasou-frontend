import { useState } from 'react';
import { cx } from '../../lib/format';

export function scorePassword(pw = '') {
  let s = 0;
  if (pw.length >= 8) s++;
  if (pw.length >= 12) s++;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++;
  if (/\d/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return Math.min(4, s);
}
const LABELS = ['Too weak', 'Weak', 'Okay', 'Strong', 'Very strong'];
const BARS = ['bg-clay', 'bg-clay', 'bg-amber', 'bg-emerald', 'bg-emerald'];

export default function PasswordField({
  label = 'Password',
  value,
  onChange,
  strength = false,
  error,
  hint,
  autoComplete = 'current-password',
  placeholder = '••••••••',
  rightLink,
}) {
  const [show, setShow] = useState(false);
  const s = strength ? scorePassword(value) : 0;

  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between gap-3">
        <span className="text-[11.5px] font-semibold uppercase tracking-[0.16em] text-forest-800">{label}</span>
        <span className="text-[12.5px] font-semibold">{rightLink}</span>
      </span>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cx(
            'h-12 w-full rounded-md border bg-white/80 px-4 pr-16 text-[14px] text-ink outline-none transition placeholder:text-ink-35',
            error ? 'border-clay focus:border-clay focus:shadow-[0_0_0_2px_rgba(225,29,72,0.15)]' : 'border-line focus:border-forest focus:shadow-[0_8px_25px_rgba(37,88,73,0.14),0_0_0_2px_rgba(31,92,74,0.18)]'
          )}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm px-2 py-1 text-[13.5px] font-semibold text-forest transition hover:bg-sunk"
        >
          {show ? 'Hide' : 'Show'}
        </button>
      </div>

      {strength && value && (
        <div className="mt-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cx('h-1.5 flex-1 rounded-full transition-colors', i <= s - 1 ? BARS[s] : 'bg-sunk')} />
            ))}
          </div>
          <p className="mt-1 text-[11.5px] text-ink-35">{LABELS[s]}</p>
        </div>
      )}
      {error ? <span className="mt-1.5 block text-[12px] font-medium text-clay-600">{error}</span>
        : hint ? <span className="mt-1.5 block text-[12px] text-ink-35">{hint}</span> : null}
    </label>
  );
}
