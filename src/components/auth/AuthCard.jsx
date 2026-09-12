import { motion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import Icon from '../Icon';
import { cx } from '../../lib/format';

/* The white form card shared by every auth screen — NasouHive demo login
   card: "Signing in to" header, Sign In / Sign Up switch (links to our
   existing /login and /register pages), then the form. */
export default function AuthCard({ title, subtitle, children, footer, back }) {
  const { pathname } = useLocation();
  const signup = pathname === '/register';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 30 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
      className="w-full max-w-md"
    >
      <div className="relative overflow-hidden rounded-[22px] bg-white p-6 shadow-[0_24px_48px_rgba(37,88,73,0.12)] sm:p-8">
        {back && (
          <Link to={back.to} className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-forest-800 transition hover:-translate-x-1">
            <Icon name="arrowLeft" size={14} /> {back.label}
          </Link>
        )}

        <div className="mb-6 flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md border border-forest/30 bg-forest/10 text-forest">
            <Icon name="user" size={18} />
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-[0.24em] text-forest-800">{signup ? 'Creating an account on' : 'Signing in to'}</p>
            <p className="font-semibold text-forest">Nasou Hive</p>
          </div>
        </div>

        <div className="mb-7 flex gap-1 rounded-md bg-sunk p-1 shadow-[inset_0_0_0_1px_rgba(37,88,73,0.08)]">
          {[
            ['Sign In', '/login', !signup],
            ['Sign Up', '/register', signup],
          ].map(([label, to, on]) => (
            <Link
              key={to}
              to={to}
              aria-current={on ? 'page' : undefined}
              className={cx(
                'relative flex-1 rounded-sm py-2.5 text-center text-sm font-semibold transition',
                on ? 'text-white' : 'text-forest-800 hover:text-forest'
              )}
            >
              {on && (
                <motion.span
                  layoutId="auth-mode"
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-sm bg-forest shadow-[0_10px_24px_rgba(31,92,74,0.18)]"
                />
              )}
              <span className="relative">{label}</span>
            </Link>
          ))}
        </div>

        <h1 className="text-2xl font-bold text-forest">{title}</h1>
        {subtitle && <p className="mt-1 text-sm leading-relaxed text-forest-800">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>
      {footer && <div className="mt-5 text-center text-[13px] text-forest-800">{footer}</div>}
    </motion.div>
  );
}
