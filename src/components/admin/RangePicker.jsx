import { cx } from '../../lib/format';

/* Date-range presets for Billing and Reports — one row above the content
   they scope (0 = all time). */
export const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 0, label: 'All time' },
];

export default function RangePicker({ value, onChange }) {
  return (
    <div role="radiogroup" aria-label="Date range" className="flex w-fit rounded-[14px] bg-white p-1 shadow-card">
      {RANGES.map((r) => (
        <button
          key={r.days}
          role="radio"
          aria-checked={value === r.days}
          onClick={() => onChange(r.days)}
          className={cx('rounded-[10px] px-3 py-1.5 text-[12.5px] font-bold transition sm:px-3.5', value === r.days ? 'bg-forest text-white shadow-sm' : 'text-ink-50 hover:text-forest')}
        >
          {r.label}
        </button>
      ))}
    </div>
  );
}
