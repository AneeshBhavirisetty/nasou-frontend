import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import Icon from '../Icon';
import { cx } from '../../lib/format';
import { EASE } from '../../lib/motion';

/* One card of the home page's "Everything a site needs" section (client,
   29 Oct 2026: "images are unequal", then "too simple — make it modern").
   Every card has the same shape and the photo fills it edge to edge — the
   one uploaded in Super Admin › Category photos, or the automatic one from the
   category's products. The name sits on frosted glass over a forest fade;
   on larger screens the top sub-categories show as chips. Hover: the photo
   eases in, light sweeps across, the arrow turns.
   `to` makes it a link; without it (the admin preview) it is a plain card. */
export default function CategoryCard({ dept, photo, to, index = 0, className = '' }) {
  const Box = to ? Link : 'div';
  const subs = (dept.subs || []).filter((s) => s.count).slice(0, 3);
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.55, delay: (index % 3) * 0.08, ease: EASE }}
      className={cx('h-full', className)}
    >
      <Box
        {...(to ? { to } : {})}
        className="sheen group relative block aspect-[4/5] overflow-hidden rounded-[26px] bg-pine shadow-card ring-1 ring-white/60 transition duration-500 hover:-translate-y-1.5 hover:shadow-[0_28px_60px_rgba(31,59,52,0.28)] sm:aspect-[5/4]"
      >
        {photo ? (
          <img
            src={photo}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full bg-white object-cover transition duration-[1200ms] ease-out group-hover:scale-110"
          />
        ) : (
          <span className="mesh-forest absolute inset-0 grid place-items-center text-white/20"><Icon name={dept.icon} size={96} strokeWidth={0.8} /></span>
        )}

        {/* the fade the text sits on */}
        <span className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(31,59,52,0)_38%,rgba(31,59,52,0.55)_68%,rgba(23,52,44,0.92)_100%)]" />

        {/* number and icon */}
        <span className="absolute left-3 top-3 rounded-full bg-white/85 px-2.5 py-1 font-mono text-[10.5px] font-bold tracking-[0.12em] text-forest shadow-card backdrop-blur sm:left-4 sm:top-4">
          {String(index + 1).padStart(2, '0')}
        </span>
        <span className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-[12px] border border-white/50 bg-white/30 text-forest shadow-[0_8px_20px_rgba(0,0,0,0.12)] backdrop-blur-md transition duration-500 group-hover:rotate-[-8deg] group-hover:bg-white sm:right-4 sm:top-4 sm:h-10 sm:w-10">
          <Icon name={dept.icon} size={17} />
        </span>

        {/* name on frosted glass */}
        <span className="absolute inset-x-2.5 bottom-2.5 rounded-[18px] border border-white/20 bg-white/10 p-3 backdrop-blur-md sm:inset-x-3.5 sm:bottom-3.5 sm:p-4">
          <span className="flex items-end gap-2">
            <span className="min-w-0 flex-1">
              <span className="font-hero block text-[15px] font-medium leading-tight tracking-[-0.02em] text-white sm:text-[20px]">{dept.name}</span>
              <span className="mt-0.5 block text-[11.5px] font-semibold text-white/75 sm:text-[12.5px]">
                {dept.count ? `${dept.count.toLocaleString('en-IN')} items` : 'Coming soon'}
              </span>
            </span>
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white text-forest shadow-[0_8px_18px_rgba(0,0,0,0.18)] transition duration-500 group-hover:-rotate-45 group-hover:bg-sand sm:h-10 sm:w-10">
              <Icon name="arrowRight" size={15} />
            </span>
          </span>
          {subs.length > 0 && (
            <span className="mt-2.5 hidden flex-wrap gap-1.5 sm:flex">
              {subs.map((s) => (
                <span key={s.slug} className="rounded-full border border-white/25 bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white/90">{s.name}</span>
              ))}
            </span>
          )}
        </span>
      </Box>
    </motion.div>
  );
}
