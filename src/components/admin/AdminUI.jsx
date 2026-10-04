import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { cx } from '../../lib/format';

/* Shared admin chrome — page header and filter tabs. Presentation only;
   pages keep owning their state and handlers. */

export function AdminPageHead({ title, note, children }) {
  /* demo SectionHeader: forest title + description, actions on the right */
  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
      <div className="min-w-0">
        <h2 className="text-xl font-semibold tracking-[-0.03em] text-forest">{title}</h2>
        {note && <p className="mt-1 text-sm text-forest-800">{note}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

/* Pill tabs with counts. `options`: [{ value, label, count, dot }] —
   `dot` is a bg-* class for a small status dot. */
export function FilterTabs({ value, onChange, options, label = 'Filter' }) {
  return (
    <div role="tablist" aria-label={label} className="no-bar -mx-1 flex gap-1.5 overflow-x-auto px-1 py-0.5">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button
            key={o.value || 'all'}
            role="tab"
            aria-selected={on}
            onClick={() => onChange(o.value)}
            className={cx(
              'flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 text-[12.5px] font-semibold transition',
              on
                ? 'border-forest bg-forest text-white shadow-card'
                : 'border-line bg-white text-ink-70 hover:border-ink-35 hover:text-ink'
            )}
          >
            {o.dot && <span className={cx('h-1.5 w-1.5 rounded-full', on ? 'bg-white' : o.dot)} />}
            {o.label}
            {o.count != null && (
              <span className={cx('tnum rounded-full px-1.5 text-[11px] font-bold', on ? 'bg-white/20 text-white' : 'bg-sunk text-ink-50')}>
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/* Search input with a leading icon, sized to sit in a filter bar. */
export function SearchInput({ value, onChange, placeholder }) {
  return (
    <label className="relative block min-w-[200px] flex-1">
      <Icon name="search" size={17} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-forest-800/70" />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-12 w-full rounded-[18px] border border-line bg-white/82 pl-11 pr-4 text-[14px] font-semibold text-forest shadow-[0_10px_24px_rgba(37,88,73,0.08)] outline-none transition placeholder:font-medium placeholder:text-forest-800/55 focus:border-forest/40"
      />
    </label>
  );
}

/* Shown on a module the signed-in admin can see but not change (IAM "view"). */
export function ViewOnlyBanner({ what = 'this section' }) {
  return (
    <p className="flex items-center gap-2 rounded-[14px] border border-amber/20 bg-amber-50 px-4 py-2.5 text-[12.5px] font-semibold text-amber">
      <Icon name="eye" size={15} /> View only — you can browse {what} but not change it. The Owner can widen your role in Team &amp; access.
    </p>
  );
}

/* ── shared console pieces (Super Admin + seller) ─────────────────────────── */

const TONES = {
  ok: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber',
  clay: 'bg-clay-50 text-clay-600',
  slate: 'bg-slate-50 text-slate',
  neutral: 'bg-sunk text-ink-70',
  dark: 'bg-forest text-white',
};
const STATUS_TONE = {
  Pending: 'amber', Processing: 'slate', Shipped: 'slate', Delivered: 'ok', Cancelled: 'clay',
  pending: 'amber', needs_changes: 'amber', approved: 'ok', rejected: 'clay', suspended: 'clay', deactivated: 'neutral', deleted: 'neutral',
  active: 'ok', blocked: 'clay', open: 'slate', paid: 'ok', on_hold: 'amber', requested: 'amber', processed: 'ok',
  matched: 'ok', mismatch: 'clay', missing_in_razorpay: 'amber', missing_in_books: 'clay', resolved: 'neutral',
  released: 'ok', reversed: 'neutral', Paid: 'ok', Collected: 'ok', 'Due on delivery': 'amber', 'Invoice due': 'amber', Refunded: 'neutral',
  accepted: 'ok', revoked: 'neutral', invited: 'amber',
};
const STATUS_TEXT = {
  needs_changes: 'Corrections asked', approved: 'Active', on_hold: 'On hold', missing_in_razorpay: 'Not in Razorpay', missing_in_books: 'Not in our books',
};

export function StatusPill({ status, label, tone, className = '' }) {
  const t = tone || STATUS_TONE[status] || 'neutral';
  const text = label || STATUS_TEXT[status] || (typeof status === 'string' ? status.charAt(0).toUpperCase() + status.slice(1) : status);
  return (
    <span className={cx('inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[11.5px] font-bold', TONES[t], className)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {text}
    </span>
  );
}

export function Panel({ title, note, action, className = '', children, pad = true }) {
  return (
    <section className={cx('min-w-0 rounded-[22px] border border-line bg-white shadow-card', pad && 'p-4 sm:p-5', className)}>
      {(title || action) && (
        <div className={cx('mb-4 flex flex-wrap items-start justify-between gap-3', !pad && 'px-4 pt-4 sm:px-5 sm:pt-5')}>
          <div className="min-w-0">
            {title && <h2 className="text-[16.5px] font-semibold tracking-[-0.02em] text-forest">{title}</h2>}
            {note && <p className="mt-0.5 text-[12.5px] text-ink-50">{note}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Kpi({ label, value, note, icon, tone = 'forest', onClick }) {
  const Tag = onClick ? 'button' : 'div';
  return (
    <Tag onClick={onClick} className={cx('group relative min-w-0 overflow-hidden rounded-[20px] border border-line bg-white p-4 text-left shadow-card transition sm:p-5', onClick && 'hover:-translate-y-0.5 hover:shadow-lift')}>
      <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[radial-gradient(circle,rgba(31,92,74,0.10),transparent_70%)]" />
      <span className="relative flex items-start justify-between gap-2">
        <span className="text-[12.5px] font-bold text-ink-50">{label}</span>
        {icon && <span className={cx('grid h-8 w-8 shrink-0 place-items-center rounded-[10px]', tone === 'clay' ? 'bg-clay-50 text-clay-600' : tone === 'amber' ? 'bg-amber-50 text-amber' : 'bg-sunk text-forest')}><Icon name={icon} size={15} /></span>}
      </span>
      <p className="tnum relative mt-2 truncate text-[clamp(1.3rem,3vw,1.75rem)] font-semibold tracking-[-0.04em] text-forest">{value}</p>
      {note && <p className="relative mt-0.5 truncate text-[11.5px] text-ink-50">{note}</p>}
    </Tag>
  );
}

export function Avatar({ name = '', size = 'md', tone = 'sunk' }) {
  const ini = name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('') || '?';
  return (
    <span className={cx('grid shrink-0 place-items-center rounded-full font-black', size === 'sm' ? 'h-8 w-8 text-[11px]' : size === 'lg' ? 'h-14 w-14 text-[17px]' : 'h-10 w-10 text-[12.5px]', tone === 'dark' ? 'bg-forest text-white' : 'bg-sunk text-forest')}>{ini}</span>
  );
}

export function DetailList({ rows }) {
  return (
    <dl className="divide-y divide-line-soft text-[13px]">
      {rows.filter(Boolean).map(([k, v]) => (
        <div key={k} className="flex items-start justify-between gap-4 py-2.5">
          <dt className="shrink-0 font-semibold text-ink-50">{k}</dt>
          <dd className="min-w-0 break-words text-right font-semibold text-ink">{v ?? '—'}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Tabs({ value, onChange, options }) {
  return (
    <div role="tablist" className="no-bar -mx-1 flex gap-1 overflow-x-auto px-1">
      <div className="flex gap-1 rounded-full border border-line bg-white/80 p-1 shadow-[0_8px_20px_rgba(37,88,73,0.06)]">
        {options.map((o) => (
          <button
            key={o.value}
            role="tab"
            aria-selected={value === o.value}
            onClick={() => onChange(o.value)}
            className={cx('flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-2 text-[12.5px] font-bold transition', value === o.value ? 'bg-forest text-white shadow-btn' : 'text-ink-70 hover:text-forest')}
          >
            {o.icon && <Icon name={o.icon} size={14} />}
            {o.label}
            {o.count != null && <span className={cx('tnum rounded-full px-1.5 text-[10.5px]', value === o.value ? 'bg-white/20' : 'bg-sunk text-ink-50')}>{o.count}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}

export function EmptyNote({ icon = 'check', title, body }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[#cad8d2] bg-[#f6f3ed] px-5 py-12 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-white text-forest shadow-card"><Icon name={icon} size={20} /></span>
      <p className="mt-3 text-[14.5px] font-bold text-forest">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-[13px] text-ink-50">{body}</p>}
    </div>
  );
}

export const SELECT_CLS = 'h-11 w-full rounded-md border border-line bg-white/80 px-3.5 text-[14px] text-ink outline-none transition focus:border-forest focus:shadow-[0_0_0_2px_rgba(31,92,74,0.18)] disabled:bg-sunk/60';
export const LABEL_CLS = 'mb-1.5 block text-[11.5px] font-semibold uppercase tracking-[0.16em] text-forest-800';
export const TEXTAREA_CLS = 'min-h-[92px] w-full rounded-md border border-line bg-white/80 px-3.5 py-3 text-[14px] text-ink outline-none transition placeholder:text-ink-35 focus:border-forest focus:shadow-[0_0_0_2px_rgba(31,92,74,0.18)]';

export function BackLinkInline({ to, children }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 text-[13px] font-bold text-forest-800 transition hover:-translate-x-0.5 hover:text-forest">
      <Icon name="arrowLeft" size={14} /> {children}
    </Link>
  );
}
