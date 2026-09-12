import { cx, digits10 } from '../../lib/format';

/* 10-digit Indian mobile input with a fixed +91 prefix.
   Accepts digits only, hard-capped at 10. `value` is the raw digit string. */
export default function PhoneField({ label = 'Mobile number', value, onChange, error, hint, autoFocus, disabled, name = 'phone' }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.16em] text-forest-800">{label}</span>}
      <div
        className={cx(
          'flex h-12 items-center overflow-hidden rounded-md border bg-white/80 transition',
          error ? 'border-clay focus-within:border-clay focus-within:shadow-[0_0_0_2px_rgba(225,29,72,0.15)]' : 'border-line focus-within:border-forest focus-within:shadow-[0_8px_25px_rgba(37,88,73,0.14),0_0_0_2px_rgba(31,92,74,0.18)]'
        )}
      >
        <span className="grid h-full place-items-center border-r border-line bg-sunk/60 px-3.5 text-[13px] font-bold text-forest">+91</span>
        <input
          type="tel"
          name={name}
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={10}
          autoFocus={autoFocus}
          disabled={disabled}
          value={value}
          onChange={(e) => onChange(digits10(e.target.value))}
          onKeyDown={(e) => {
            // block non-digit printable keys
            if (e.key.length === 1 && !/\d/.test(e.key) && !e.metaKey && !e.ctrlKey) e.preventDefault();
          }}
          placeholder="98765 43210"
          aria-label={label}
          className="h-full min-w-0 flex-1 bg-transparent px-4 text-[14px] tracking-wide text-ink outline-none placeholder:text-ink-35"
        />
      </div>
      {error ? (
        <span className="mt-1.5 block text-[12px] font-medium text-clay-600">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12px] text-ink-35">{hint}</span>
      ) : null}
    </label>
  );
}
