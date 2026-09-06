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
                'grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-[11px] font-bold transition',
                done && 'border-emerald bg-emerald text-white',
                active && 'border-forest bg-white text-forest',
                !done && !active && 'border-line bg-white text-ink-35'
              )}
            >
              {done ? <Icon name="check" size={11} strokeWidth={3} /> : i + 1}
            </span>
            <span className={cx('hidden text-[12px] font-semibold sm:block', active ? 'text-ink' : 'text-ink-35')}>{label}</span>
            {i < steps.length - 1 && (
              <span className="relative h-px flex-1 bg-line">
                <motion.span className="absolute inset-0 bg-emerald" initial={{ scaleX: 0 }} animate={{ scaleX: done ? 1 : 0 }} style={{ transformOrigin: 'left' }} />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
