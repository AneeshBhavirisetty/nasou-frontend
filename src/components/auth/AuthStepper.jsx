import { motion } from 'framer-motion';
import Icon from '../Icon';
import { cx } from '../../lib/format';

/* Compact numbered step indicator for the OTP flow. */
export default function AuthStepper({ steps = [], current = 0 }) {
  return (
    <ol className="mb-6 flex items-center gap-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cx(
                'grid h-8 w-8 shrink-0 place-items-center rounded-full text-[12px] font-bold transition',
                (done || active) ? 'bg-forest text-white shadow-btn' : 'bg-sunk text-ink-50',
                active && 'ring-4 ring-forest/15'
              )}
            >
              {done ? <Icon name="check" size={11} strokeWidth={3} /> : i + 1}
            </span>
            <span className={cx('hidden text-[12px] font-bold sm:block', active ? 'text-forest' : 'text-ink-50')}>{label}</span>
            {i < steps.length - 1 && (
              <span className="relative h-1 flex-1 overflow-hidden rounded-full bg-sunk">
                <motion.span className="absolute inset-0 bg-forest" initial={{ scaleX: 0 }} animate={{ scaleX: done ? 1 : 0 }} style={{ transformOrigin: 'left' }} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
