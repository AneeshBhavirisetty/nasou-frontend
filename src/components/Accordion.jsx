import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';
import { cx } from '../lib/format';
import { EASE } from '../lib/motion';

/* Single collapsible section. Compose several for an FAQ / spec list. */
export function AccordionItem({ title, children, defaultOpen = false, className = '' }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cx('border-b border-line last:border-0', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-[14.5px] font-semibold text-ink">{title}</span>
        <Icon name="chevronDown" size={16} className={cx('shrink-0 text-ink-35 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.26, ease: EASE }}
            className="overflow-hidden"
          >
            <div className="pb-4 text-[13.5px] leading-relaxed text-ink-50">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Accordion({ children, className = '' }) {
  return <div className={cx('rounded-lg border border-line bg-white px-4', className)}>{children}</div>;
}
