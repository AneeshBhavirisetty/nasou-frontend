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
