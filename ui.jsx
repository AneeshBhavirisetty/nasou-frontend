import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { cx } from '../lib/format';

/* ---------- Layout ---------- */

export function Container({ className = '', children }) {
  return <div className={cx('mx-auto w-full max-w-[1280px] px-5 sm:px-8', className)}>{children}</div>;
}

export function SectionHead({ eyebrow, title, note, action }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-5">
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-3">{eyebrow}</p>}
        <h2 className="text-[clamp(1.65rem,3vw,2.4rem)]">{title}</h2>
        {note && <p className="mt-3 text-[15px] leading-relaxed text-ink-50">{note}</p>}
      </div>
      {action}
    </div>
  );
}

/* ---------- Button ---------- */

const BTN = {
  primary: 'bg-forest text-white hover:bg-forest-800 border-forest hover:border-forest-800',
  accent: 'bg-clay text-white hover:bg-clay-600 border-clay hover:border-clay-600',
  outline: 'bg-transparent text-ink border-line hover:border-ink hover:bg-white',
  ghost: 'bg-transparent text-ink-70 border-transparent hover:bg-sunk hover:text-ink',
  light: 'bg-white text-ink border-line hover:border-ink-35 shadow-card',
};

const SIZE = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-[14px] gap-2',
  lg: 'h-[52px] px-7 text-[15px] gap-2.5',
};

export function Button({
  as = 'button',
  to,
  href,
  variant = 'primary',
  size = 'md',
  icon,
  iconRight,
  full,
  className = '',
  children,
  ...rest
}) {
  const cls = cx(
    'inline-flex items-center justify-center rounded-md border font-semibold',
    'transition-[background,border-color,transform,box-shadow] duration-200',
    'active:translate-y-px disabled:pointer-events-none disabled:opacity-45',
    BTN[variant],
    SIZE[size],
    full && 'w-full',
    className
  );
  const inner = (
    <>
      {icon && <Icon name={icon} size={size === 'lg' ? 18 : 16} />}
      {children}
      {iconRight && <Icon name={iconRight} size={size === 'lg' ? 18 : 16} />}
    </>
  );
  if (to) return <Link to={to} className={cls} {...rest}>{inner}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{inner}</a>;
  const Tag = as;
  return <Tag className={cls} {...rest}>{inner}</Tag>;
}

/* ---------- Badge ---------- */

const TONE = {
  neutral: 'bg-sunk text-ink-70 border-line',
  ok: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  clay: 'bg-clay-50 text-clay-600 border-clay/25',
  amber: 'bg-amber-50 text-amber border-amber/25',
  slate: 'bg-slate-50 text-slate border-slate/20',
  dark: 'bg-forest text-white border-forest',
};

export function Badge({ tone = 'neutral', icon, className = '', children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1',
        'text-[11px] font-semibold tracking-tight',
        TONE[tone],
        className
      )}
    >
      {icon && <Icon name={icon} size={12} strokeWidth={2} />}
      {children}
    </span>
  );
}

/* ---------- Rating ---------- */

export function Stars({ value, reviews, size = 13, className = '' }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5', className)}>
      <span className="flex items-center gap-0.5 text-amber">
        {[0, 1, 2, 3, 4].map((i) => (
          <Icon
            key={i}
            name="star"
            size={size}
            strokeWidth={1.4}
            className={i < Math.round(value) ? 'fill-current' : 'text-ink-35'}
          />
        ))}
      </span>
      <span className="tnum text-[12.5px] font-semibold text-ink-70">{value}</span>
      {reviews != null && <span className="tnum text-[12.5px] text-ink-35">({reviews})</span>}
    </span>
  );
}

/* ---------- Product image with a graceful, on-brand fallback ---------- */

export function Photo({ src, alt, className = '', ratio = 'aspect-[4/3]' }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={cx('photo-bed relative overflow-hidden', ratio, className)}>
      {failed ? (
        <div className="absolute inset-0 grid place-items-center">
          <span className="font-display text-4xl font-bold text-ink-35/60">
            {alt?.[0] ?? 'N'}
          </span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.045]"
        />
      )}
    </div>
  );
}

/* ---------- Quantity stepper ---------- */

export function Stepper({ value, onChange, min = 1, max = 99, size = 'md' }) {
  const h = size === 'sm' ? 'h-8' : 'h-11';
  const w = size === 'sm' ? 'w-8' : 'w-10';
  return (
    <div className={cx('inline-flex items-center rounded-md border border-line bg-white', h)}>
      <button
        type="button"
        aria-label="Decrease quantity"
        onClick={() => onChange(Math.max(min, value - 1))}
        className={cx(w, h, 'grid place-items-center text-ink-50 transition hover:text-ink disabled:opacity-30')}
        disabled={value <= min}
      >
        <Icon name="minus" size={14} strokeWidth={2} />
      </button>
      <span className={cx('tnum grid place-items-center text-[14px] font-semibold', w)}>{value}</span>
      <button
        type="button"
        aria-label="Increase quantity"
        onClick={() => onChange(Math.min(max, value + 1))}
        className={cx(w, h, 'grid place-items-center text-ink-50 transition hover:text-ink disabled:opacity-30')}
        disabled={value >= max}
      >
        <Icon name="plus" size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

/* ---------- Misc ---------- */

export function Divider({ className = '' }) {
  return <div className={cx('h-px w-full bg-line', className)} />;
}

export function Field({ label, hint, className = '', inputMode, type = 'text', ...rest }) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1.5 block text-[12.5px] font-semibold text-ink-70">{label}</span>
      <input
        type={type}
        inputMode={inputMode}
        className="h-11 w-full rounded-md border border-line bg-white px-3.5 text-[14px]
                   outline-none transition placeholder:text-ink-35
                   focus:border-emerald focus:ring-2 focus:ring-emerald/15"
        {...rest}
      />
      {hint && <span className="mt-1.5 block text-[12px] text-ink-35">{hint}</span>}
    </label>
  );
}
