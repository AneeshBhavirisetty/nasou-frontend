import { useState } from 'react';
import { motion } from 'framer-motion';
import { cx } from '../lib/format';

/* Underline tabs with an animated indicator (layoutId). */
export default function Tabs({ tabs = [], initial, onChange, className = '' }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);
  const select = (k) => {
    setActive(k);
    onChange?.(k);
  };
  const current = tabs.find((t) => t.key === active);
  return (
    <div className={className}>
      <div className="no-bar flex gap-1 overflow-x-auto border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => select(t.key)}
            className={cx(
              'relative shrink-0 px-3.5 py-2.5 text-[13.5px] font-semibold transition',
              active === t.key ? 'text-ink' : 'text-ink-50 hover:text-ink'
            )}
          >
            {t.label}
            {active === t.key && (
              <motion.span
                layoutId="tab-underline"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-forest"
              />
            )}
          </button>
        ))}
      </div>
      <div className="pt-5">{current?.content}</div>
    </div>
  );
}
