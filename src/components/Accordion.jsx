import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';
import { cx } from '../lib/format';
import { EASE } from '../lib/motion';

/* Single collapsible section. Compose several for an FAQ / spec list. */
export function AccordionItem({ title, children, defaultOpen = false, className = '' }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={cx('rounded-md bg-[#f4f7f5] px-4 transition-colors', open && 'bg-sunk/70', className)}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 py-4 text-left"
      >
        <span className="text-[14px] font-bold text-ink">{title}</span>
        <span className={cx('grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-forest transition-transform', open && 'rotate-180')}>
          <Icon name="chevronDown" size={15} />
        </span>
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
            <div className="pb-4 text-[14px] leading-6 text-ink-50">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Accordion({ children, className = '' }) {
  return <div className={cx('space-y-3 rounded-[18px] bg-white p-4 shadow-card sm:p-5', className)}>{children}</div>;
}
