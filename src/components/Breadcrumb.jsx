import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon';
import { cx } from '../lib/format';

/* ─────────────────────────────────────────────────────────────
   Breadcrumb — consistent breadcrumb trail.

   Usage:
     <Breadcrumb items={[
       { label: 'Home', to: '/' },
       { label: 'PVC Fittings', to: '/shop?category=pvc-fittings' },
       { label: 'PVC Elbow' },   // last item — no `to`, shown as current
     ]} />
   ───────────────────────────────────────────────────────────── */
export default function Breadcrumb({ items = [] }) {
  if (items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className="mb-6 flex flex-wrap items-center gap-1 text-[12.5px] text-ink-50"
    >
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && (
              <Icon name="chevronRight" size={12} className="text-ink-35" aria-hidden="true" />
            )}
            {isLast || !item.to ? (
              <span
                className={cx('font-semibold', isLast ? 'text-ink' : 'text-ink-50')}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            ) : (
              <Link to={item.to} className="transition hover:text-ink">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
}
