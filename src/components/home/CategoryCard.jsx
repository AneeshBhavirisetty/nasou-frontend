import { Link } from 'react-router-dom';
import Icon from '../Icon';
import { cx } from '../../lib/format';

/* One card of the home page's "Everything a site needs" section. Every card is
   the same size and every photo sits in the same 4:3 frame (client, 29 Oct
   2026: "images are unequal"). A photo uploaded in Super Admin › Category
   photos fills the frame; a product photo (the automatic fallback) is shown
   whole on a light bed, so a long pipe or a switch is never cut off.
   `to` makes it a link; without it (the admin preview) it is a plain card. */
export default function CategoryCard({ dept, photo, uploaded = false, to, className = '' }) {
  const Box = to ? Link : 'div';
  return (
    <Box
      {...(to ? { to } : {})}
      className={cx('group flex h-full flex-col overflow-hidden rounded-[22px] border border-white/80 bg-white shadow-card transition duration-300', to && 'hover:-translate-y-1 hover:shadow-lift', className)}
    >
      <span className={cx('relative block aspect-[4/3] overflow-hidden', uploaded ? 'bg-sunk' : 'photo-bed')}>
        {photo ? (
          <img
            src={photo}
            alt=""
            loading="lazy"
            className={cx('h-full w-full transition duration-700 group-hover:scale-105', uploaded ? 'object-cover' : 'object-contain p-[9%] mix-blend-multiply')}
          />
        ) : (
          <span className="grid h-full w-full place-items-center text-forest/25"><Icon name={dept.icon} size={64} strokeWidth={1} /></span>
        )}
        <span className="absolute left-3 top-3 grid h-9 w-9 place-items-center rounded-[12px] bg-white/90 text-forest shadow-card backdrop-blur">
          <Icon name={dept.icon} size={16} />
        </span>
      </span>
      <span className="flex flex-1 items-center gap-2 px-3 py-3 sm:px-4 sm:py-3.5">
        <span className="min-w-0 flex-1">
          <span className="line-clamp-2 block text-[14px] font-bold leading-snug text-forest sm:text-[16px]">{dept.name}</span>
          <span className="block text-[12px] text-ink-50">{dept.count ? `${dept.count.toLocaleString('en-IN')} items` : 'Coming soon'}</span>
        </span>
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-sunk text-forest transition group-hover:bg-forest group-hover:text-white sm:h-8 sm:w-8">
          <Icon name="arrowRight" size={14} />
        </span>
      </span>
    </Box>
  );
}
