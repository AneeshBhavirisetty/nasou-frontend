import Icon from './Icon';
import { cx } from '../lib/format';

/* A labelled dropdown that reads as a pill, with the number of matches per option.
   `options`: [value, label, count?, disabled?]; `groups` (optional): [[groupLabel, options]]. */
export default function FilterDropdown({ label, icon, value, onChange, options, groups, disabled }) {
  const all = groups ? [...options, ...groups.flatMap(([, o]) => o)] : options;
  const opt = ([v, l, n, off]) => <option key={v || 'all'} value={v} disabled={off}>{n != null ? `${l} (${n})` : l}</option>;
  const current = all.find((o) => o[0] === value) || options[0];
  return (
    <label className={cx('relative flex h-12 min-w-0 items-center gap-2.5 rounded-[16px] border bg-white pl-3.5 pr-8 transition', value ? 'border-forest shadow-btn' : 'border-line hover:border-forest/40', disabled && 'opacity-50')}>
      <span className={cx('hidden h-7 w-7 shrink-0 place-items-center rounded-full sm:grid', value ? 'bg-forest text-white' : 'bg-sunk text-forest')}><Icon name={icon} size={14} /></span>
      <span className="min-w-0 leading-tight">
        <span className="block truncate text-[10px] font-bold uppercase tracking-[0.12em] text-ink-50">{label}</span>
        <span className="block truncate text-[13.5px] font-bold text-ink">{current[1]}</span>
      </span>
      <select value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={label}>
        {options.map(opt)}
        {groups?.map(([g, o]) => <optgroup key={g} label={g}>{o.map(opt)}</optgroup>)}
      </select>
      <Icon name="chevronDown" size={14} className="pointer-events-none absolute right-3 text-ink-50" />
    </label>
  );
}
