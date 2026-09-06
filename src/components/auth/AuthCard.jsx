import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { EASE } from '../../lib/motion';

/* The white form card shared by every auth screen. */
export default function AuthCard({ title, subtitle, children, footer, back }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: EASE }}
      className="w-full max-w-[420px]"
    >
      <div className="rounded-xl border border-line bg-white p-6 shadow-card sm:p-8">
        {back && (
          <Link to={back.to} className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-ink-50 transition hover:text-ink">
            <Icon name="arrowLeft" size={14} /> {back.label}
          </Link>
        )}
        <h1 className="display-serif text-[22px]">{title}</h1>
        {subtitle && <p className="mt-1 text-[13px] leading-relaxed text-ink-50">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-5 text-center text-[13px] text-ink-50">{footer}</div>}
    </motion.div>
  );
}
