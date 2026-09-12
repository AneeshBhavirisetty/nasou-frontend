import { useState } from 'react';
import { motion } from 'framer-motion';
import { cx } from '../lib/format';

/* Segmented tabs (demo Sign In / Sign Up switch) with an animated pill. */
export default function Tabs({ tabs = [], initial, onChange, className = '' }) {
  const [active, setActive] = useState(initial ?? tabs[0]?.key);
  const select = (k) => {
    setActive(k);
    onChange?.(k);
  };
  const current = tabs.find((t) => t.key === active);
  return (
    <div className={className}>
      <div className="no-bar flex gap-1 overflow-x-auto rounded-md bg-sunk p-1 shadow-[inset_0_0_0_1px_rgba(37,88,73,0.08)]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => select(t.key)}
            className={cx(
              'relative flex-1 shrink-0 whitespace-nowrap rounded-sm px-4 py-2.5 text-[13.5px] font-semibold transition',
              active === t.key ? 'text-white' : 'text-forest-800 hover:text-forest'
            )}
          >
            {active === t.key && (
              <motion.span
                layoutId="tab-pill"
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                className="absolute inset-0 rounded-sm bg-forest shadow-[0_10px_24px_rgba(31,92,74,0.18)]"
              />
            )}
            <span className="relative">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="pt-5">{current?.content}</div>
    </div>
  );
}
