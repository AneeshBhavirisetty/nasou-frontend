import Counter from './Counter';
import Icon from './Icon';
import { cx } from '../lib/format';

/* One number + label. Counts up on scroll-in. `dark` for the forest band. */
export default function StatTile({ value, decimals, prefix, suffix, label, note, icon, dark = false, className = '' }) {
  return (
    <div
      className={cx(
        'h-full rounded-[16px] border p-4 transition sm:p-5',
        dark ? 'border-white/10 bg-white/[0.07] text-white' : 'border-white/75 bg-white shadow-card',
        className
      )}
    >
      {icon && (
        <span
          className={cx(
            'mb-3 grid h-9 w-9 place-items-center rounded-[12px]',
            dark ? 'bg-white/10 text-white' : 'bg-sunk text-forest'
          )}
        >
          <Icon name={icon} size={17} />
        </span>
      )}
      <div className={cx('tnum text-[clamp(1.5rem,4vw,2rem)] font-semibold tracking-[-0.04em]', dark ? 'text-white' : 'text-ink')}>
        <Counter value={value} decimals={decimals} prefix={prefix} suffix={suffix} />
      </div>
      <p className={cx('mt-1 text-[13px] font-bold', dark ? 'text-white' : 'text-ink')}>{label}</p>
      {note && <p className={cx('mt-1 text-[12px] leading-5', dark ? 'text-[#c9d7d2]' : 'text-ink-50')}>{note}</p>}
    </div>
  );
}
