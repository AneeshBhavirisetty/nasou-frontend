import { useState } from 'react';
import Icon from '../Icon';
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
      <span className="mb-1.5 flex items-center justify-between text-[12.5px] font-semibold text-ink-70">
        <span>{label}</span>
        {rightLink}
      </span>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          className={cx(
            'h-11 w-full rounded-md border bg-white px-3.5 pr-11 text-[14px] outline-none transition placeholder:text-ink-35 focus:ring-2',
            error ? 'border-clay focus:border-clay focus:ring-clay/15' : 'border-line focus:border-emerald focus:ring-emerald/15'
          )}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? 'Hide password' : 'Show password'}
          className="absolute right-1.5 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-ink-35 transition hover:bg-emerald-50 hover:text-emerald-600"
        >
          <Icon name={show ? 'eyeOff' : 'eye'} size={17} strokeWidth={1.7} />
        </button>
      </div>

      {strength && value && (
        <div className="mt-2">
          <div className="flex gap-1">
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className={cx('h-1 flex-1 rounded-full transition-colors', i <= s - 1 ? BARS[s] : 'bg-sunk')} />
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
