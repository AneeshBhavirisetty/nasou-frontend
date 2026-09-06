import Counter from './Counter';
import Icon from './Icon';
import { cx } from '../lib/format';

/* One number + label. Counts up on scroll-in. `dark` for the forest band. */
export default function StatTile({ value, decimals, prefix, suffix, label, note, icon, dark = false, className = '' }) {
  return (
    <div
      className={cx(
        'rounded-lg border p-5 transition',
        dark ? 'border-white/10 bg-white/[0.04] text-white' : 'border-line bg-white',
        className
      )}
    >
      {icon && (
        <span
          className={cx(
            'mb-3 grid h-9 w-9 place-items-center rounded-md',
            dark ? 'bg-emerald/20 text-emerald-100' : 'bg-emerald-50 text-emerald-600'
          )}
        >
          <Icon name={icon} size={17} />
        </span>
      )}
      <div className={cx('display-serif text-[clamp(1.7rem,5vw,2.4rem)]', dark ? 'text-white' : 'text-ink')}>
        <Counter value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </div>
      <p className={cx('mt-1 text-[13px] font-semibold', dark ? 'text-white/80' : 'text-ink-70')}>{label}</p>
      {note && <p className={cx('mt-0.5 text-[12px]', dark ? 'text-white/45' : 'text-ink-35')}>{note}</p>}
    </div>
  );
}
