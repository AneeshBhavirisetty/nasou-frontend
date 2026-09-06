import Icon from './Icon';
import { batchId, buildTrace } from '../data/catalog';
import { cx } from '../lib/format';

/* The journey rendered as a rail rather than a list: a shopper should be
   able to read it left-to-right the way a courier would. */
export default function TraceRail({ product, dark = false, compact = false }) {
  const steps = buildTrace(product);

  return (
    <div>
      <div
        className={cx(
          'mb-5 flex flex-wrap items-center gap-x-3 gap-y-2',
          compact && 'mb-4'
        )}
      >
        <span
          className={cx(
            'font-mono text-[11px] font-semibold tracking-[0.1em]',
            dark ? 'text-white/45' : 'text-ink-35'
          )}
        >
          BATCH
        </span>
        <span
          className={cx(
            'rounded border px-2 py-0.5 font-mono text-[12px] font-semibold',
            dark ? 'border-white/20 text-white/85' : 'border-line bg-white text-ink-70'
          )}
        >
          {batchId(product)}
        </span>
        <span className={cx('text-[12.5px]', dark ? 'text-white/45' : 'text-ink-35')}>
          verified {new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
        </span>
      </div>

      <ol
        className={cx(
          'relative grid gap-y-6',
          compact ? 'grid-cols-2 sm:grid-cols-3' : 'sm:grid-cols-3 lg:grid-cols-6'
        )}
      >
        {/* CSS stagger, not a scroll-triggered JS reveal: this rail also
            renders above the fold on the home hero, and a checkpoint list
            that needs an animation frame to become readable is no use. */}
        {steps.map((s, i) => (
          <li
            key={s.code}
            style={{ animationDelay: `${i * 60}ms` }}
            className="relative animate-[rise_.4s_cubic-bezier(.22,1,.36,1)_both] pr-4"
          >
            {/* connector */}
            {i < steps.length - 1 && (
              <span
                className={cx(
                  'absolute left-3 top-[11px] hidden h-px w-full lg:block',
                  dark ? 'bg-white/18' : 'bg-line'
                )}
              />
            )}

            <span
              className={cx(
                'relative z-10 grid h-6 w-6 place-items-center rounded-full border-2',
                dark
                  ? i === steps.length - 1
                    ? 'border-emerald bg-emerald text-forest'
                    : 'border-white/30 bg-forest text-white/70'
                  : i === steps.length - 1
                    ? 'border-emerald bg-emerald text-white'
                    : 'border-line bg-white text-ink-35'
              )}
            >
              <Icon name="check" size={11} strokeWidth={3} />
            </span>

            <p
              className={cx(
                'mt-3 font-mono text-[10.5px] font-semibold tracking-[0.12em]',
                dark ? 'text-emerald-100/60' : 'text-ink-35'
              )}
            >
              {s.code}
            </p>
            <p
              className={cx(
                'mt-1 text-[14px] font-bold leading-tight',
                dark ? 'text-white' : 'text-ink'
              )}
            >
              {s.stage}
            </p>
            <p
              className={cx(
                'mt-1 text-[12.5px] leading-snug',
                dark ? 'text-white/55' : 'text-ink-50'
              )}
            >
              {s.place}
            </p>
            {!compact && (
              <p
                className={cx(
                  'mt-0.5 text-[12px] leading-snug',
                  dark ? 'text-white/35' : 'text-ink-35'
                )}
              >
                {s.detail}
              </p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
