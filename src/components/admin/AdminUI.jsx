import Icon from '../Icon';
import { cx } from '../../lib/format';

/* Shared admin chrome — page header and filter tabs. Presentation only;
   pages keep owning their state and handlers. */

export function AdminPageHead({ icon, title, note, children }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3.5">
        {icon && (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-forest text-white shadow-card">
            <Icon name={icon} size={20} />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="display-serif text-[clamp(1.5rem,4vw,2rem)]">{title}</h1>
          {note && <p className="mt-0.5 text-[13px] text-ink-50">{note}</p>}
        </div>
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
      <Icon name="search" size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-35" />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={placeholder}
        className="h-11 w-full rounded-md border border-line bg-white pl-10 pr-3.5 text-[14px] outline-none transition placeholder:text-ink-35 focus:border-emerald focus:ring-2 focus:ring-emerald/15"
      />
    </label>
  );
}
