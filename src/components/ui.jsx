import { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from './Icon';
import { cx } from '../lib/format';
import { money, discount as pctOff } from '../lib/format';

/* ---------- Layout ---------- */

export function Container({ className = '', children }) {
  return <div className={cx('mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8', className)}>{children}</div>;
}

export function SectionHead({ eyebrow, title, note, action, serif = true, className = '' }) {
  return (
    <div className={cx('mb-5 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h2 className={cx('text-[clamp(1.3rem,3vw,1.6rem)] font-semibold text-ink', serif && 'display-serif')}>{title}</h2>
        {note && <p className="mt-1 text-[14px] leading-relaxed text-ink-50">{note}</p>}
      </div>
      {action}
    </div>
  );
}

export function Divider({ className = '' }) {
  return <div className={cx('h-px w-full bg-line', className)} />;
}

/* ---------- Button ---------- */

const BTN = {
  primary: 'bg-forest text-white border-forest shadow-btn hover:-translate-y-0.5 hover:bg-forest-800 hover:border-forest-800',
  accent: 'bg-forest text-white border-forest shadow-btn hover:-translate-y-0.5 hover:bg-forest-800 hover:border-forest-800',
  emerald: 'bg-emerald text-white border-emerald shadow-btn hover:-translate-y-0.5 hover:bg-emerald-600 hover:border-emerald-600',
  mint: 'bg-emerald-50 text-forest border-forest hover:bg-sunk',
  outline: 'bg-white/80 text-forest border-line hover:border-forest hover:bg-white',
  ghost: 'bg-transparent text-ink-70 border-transparent hover:bg-sunk hover:text-forest',
  light: 'bg-white text-forest border-white shadow-card hover:-translate-y-0.5',
};

const SIZE = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5',
  md: 'h-11 px-5 text-[14px] gap-2',
  lg: 'h-[52px] px-6 text-[15px] gap-2.5 sm:px-7',
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
  loading = false,
  sheen = true,
  disabled,
  className = '',
  children,
  ...rest
}) {
  const cls = cx(
    'group/btn relative inline-flex items-center justify-center rounded-md border font-bold',
    'transition-[background,border-color,transform,box-shadow] duration-200 will-change-transform',
    'active:translate-y-px disabled:pointer-events-none disabled:opacity-45',
    sheen && 'sheen',
    BTN[variant],
    SIZE[size],
    full && 'w-full',
    className
  );
  const inner = (
    <>
      {loading && <Icon name="spinner" size={size === 'lg' ? 18 : 16} className="animate-spin" />}
      {!loading && icon && <Icon name={icon} size={size === 'lg' ? 18 : 16} />}
      {children}
      {!loading && iconRight && (
        <Icon name={iconRight} size={size === 'lg' ? 18 : 16} className="transition-transform group-hover/btn:translate-x-0.5" />
      )}
    </>
  );
  if (to) return <Link to={to} className={cls} {...rest}>{inner}</Link>;
  if (href) return <a href={href} className={cls} {...rest}>{inner}</a>;
  const Tag = as;
  return <Tag className={cls} disabled={disabled || loading} {...rest}>{inner}</Tag>;
}

/* ---------- Badge ---------- */

const TONE = {
  neutral: 'bg-sunk text-ink-70 border-transparent',
  ok: 'bg-emerald-50 text-emerald-600 border-transparent',
  clay: 'bg-clay-50 text-clay-600 border-transparent',
  amber: 'bg-amber-50 text-amber border-transparent',
  slate: 'bg-slate-50 text-slate border-transparent',
  dark: 'bg-forest text-white border-forest',
};

export function Badge({ tone = 'neutral', icon, className = '', children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 rounded-full border px-3 py-1',
        'text-[11.5px] font-semibold',
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

export function Rating({ value = 0, count, size = 13, className = '', showValue = true }) {
  return (
    <span className={cx('inline-flex items-center gap-1.5', className)} aria-label={`Rated ${value.toFixed(1)} out of 5`}>
      <Icon name="star" size={size + 1} strokeWidth={1.4} fill="currentColor" className="text-amber-400" />
      {showValue && <span className="tnum text-[12.5px] font-bold text-ink">{value.toFixed(1)}</span>}
      {count != null && <span className="tnum text-[12.5px] text-ink-50">({count.toLocaleString('en-IN')})</span>}
    </span>
  );
}
/* back-compat alias */
export const Stars = ({ value, reviews, ...rest }) => <Rating value={value} count={reviews} {...rest} />;

/* ---------- Price ---------- */

export function PriceTag({ price, mrp, size = 'md', className = '' }) {
  const off = pctOff(price, mrp);
  const S = {
    sm: ['text-[15px]', 'text-[12px]', 'text-[10.5px]'],
    md: ['text-[19px]', 'text-[13px]', 'text-[11px]'],
    lg: ['text-[26px]', 'text-[15px]', 'text-[12px]'],
  }[size];
  return (
    <span className={cx('inline-flex flex-wrap items-baseline gap-x-2 gap-y-0.5', className)}>
      <span className={cx('tnum font-semibold text-ink', S[0])}>{money(price)}</span>
      {off > 0 && (
        <>
          <span className={cx('tnum font-bold text-emerald-700', S[2])}>{off}% off</span>
          <span className={cx('tnum text-ink-35 line-through', S[1])}>{money(mrp)}</span>
        </>
      )}
    </span>
  );
}

/* ---------- Product art / image with graceful fallback ---------- */

export function Photo({ src, alt, className = '', ratio = 'aspect-[4/3]', children }) {
  const [failed, setFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={cx('photo-bed relative overflow-hidden', ratio, className)}>
      {!loaded && !failed && src && <div className="absolute inset-0 shimmer" />}
      {failed || !src ? (
        <div className="absolute inset-0 grid place-items-center">
          <span className="text-4xl font-semibold text-ink-35/60">{alt?.[0] ?? 'N'}</span>
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onError={() => setFailed(true)}
          onLoad={() => setLoaded(true)}
          className={cx(
            'absolute inset-0 h-full w-full object-cover transition-[transform,opacity] duration-[900ms] ease-out group-hover:scale-[1.05]',
            loaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
      {children}
    </div>
  );
}

/* ---------- Quantity stepper ---------- */

export function Stepper({ value, onChange, min = 1, max = 99, size = 'md', label = 'Quantity' }) {
  const h = size === 'sm' ? 'h-8' : 'h-10';
  const w = size === 'sm' ? 'w-8' : 'w-10';
  const [draft, setDraft] = useState(null); // string while the field is being edited
  const clamp = (n) => Math.min(max, Math.max(min, n));

  const commit = (raw) => {
    const n = parseInt(String(raw ?? ''), 10);
    if (!Number.isNaN(n) && clamp(n) !== value) onChange(clamp(n));
    setDraft(null);
  };

  return (
    <div className={cx('inline-flex items-center rounded-md bg-[#f0f4f2] p-1')}>
      <button
        type="button"
        aria-label={`Decrease ${label.toLowerCase()}`}
        onClick={() => onChange(clamp(value - 1))}
        className={cx(w, h, 'grid place-items-center rounded-sm text-ink-70 transition hover:bg-white hover:text-forest disabled:opacity-30')}
        disabled={value <= min}
      >
        <Icon name="minus" size={14} strokeWidth={2} />
      </button>
      <input
        type="text"
        inputMode="numeric"
        aria-label={label}
        value={draft ?? value}
        onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ''))}
        onFocus={(e) => e.target.select()}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') { commit(e.currentTarget.value); e.currentTarget.blur(); }
          if (e.key === 'ArrowUp') { e.preventDefault(); onChange(clamp(value + 1)); }
          if (e.key === 'ArrowDown') { e.preventDefault(); onChange(clamp(value - 1)); }
        }}
        className={cx('tnum bg-transparent text-center text-[14px] font-bold outline-none focus:bg-white/70', h, size === 'sm' ? 'w-8' : 'w-10')}
      />
      <button
        type="button"
        aria-label={`Increase ${label.toLowerCase()}`}
        onClick={() => onChange(clamp(value + 1))}
        className={cx(w, h, 'grid place-items-center rounded-sm text-ink-70 transition hover:bg-white hover:text-forest disabled:opacity-30')}
        disabled={value >= max}
      >
        <Icon name="plus" size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

/* ---------- Field ---------- */

export function Field({ label, hint, error, className = '', inputMode, type = 'text', ...rest }) {
  return (
    <label className={cx('block', className)}>
      {label && <span className="mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.16em] text-forest-800">{label}</span>}
      <input
        type={type}
        inputMode={inputMode}
        className={cx(
          'h-12 w-full rounded-md border bg-white/80 px-4 text-[14px] text-ink outline-none transition',
          'placeholder:text-ink-35',
          error
            ? 'border-clay bg-clay-50/40 focus:border-clay focus:shadow-[0_0_0_2px_rgba(225,29,72,0.15)]'
            : 'border-line focus:border-forest focus:shadow-[0_8px_25px_rgba(37,88,73,0.14),0_0_0_2px_rgba(31,92,74,0.18)]'
        )}
        {...rest}
      />
      {error ? (
        <span className="mt-1.5 block text-[12px] font-medium text-clay-600">{error}</span>
      ) : hint ? (
        <span className="mt-1.5 block text-[12px] text-ink-35">{hint}</span>
      ) : null}
    </label>
  );
}

/* ---------- Skeleton ---------- */

export function Skeleton({ className = '' }) {
  return <div className={cx('shimmer rounded-md', className)} />;
}

/* ---------- Breadcrumbs ---------- */

export function Breadcrumbs({ items = [], className = '' }) {
  return (
    <nav className={cx('flex flex-wrap items-center gap-1.5 text-[12.5px] text-ink-50', className)} aria-label="Breadcrumb">
      {items.map((it, i) => {
        const last = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1.5">
            {it.to && !last ? (
              <Link to={it.to} className="-my-1 inline-block py-1 font-semibold text-forest transition hover:underline">{it.label}</Link>
            ) : (
              <span className={last ? 'font-semibold text-ink' : ''}>{it.label}</span>
            )}
            {!last && <Icon name="chevronRight" size={12} className="text-ink-35" />}
          </span>
        );
      })}
    </nav>
  );
}
