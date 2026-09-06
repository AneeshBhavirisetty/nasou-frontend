import { cx, digits10 } from '../../lib/format';

/* 10-digit Indian mobile input with a fixed +91 prefix.
   Accepts digits only, hard-capped at 10. `value` is the raw digit string. */
export default function PhoneField({ label = 'Mobile number', value, onChange, error, hint, autoFocus, disabled, name = 'phone' }) {
  return (
    <label className="block">
      {label && <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">{label}</span>}
      <div
        className={cx(
          'flex h-11 items-center overflow-hidden rounded-md border bg-white transition focus-within:ring-2',
          error ? 'border-clay focus-within:border-clay focus-within:ring-clay/15' : 'border-line focus-within:border-emerald focus-within:ring-emerald/15'
        )}
      >
        <span className="grid h-full place-items-center border-r border-line bg-canvas px-3 text-[13px] font-semibold text-ink-50">+91</span>
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
          className="h-full flex-1 bg-transparent px-3 text-[14px] tracking-wide outline-none placeholder:text-ink-35"
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
