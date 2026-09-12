import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from './Icon';
import ProductArt from './ProductArt';
import HeroStage from './hero/HeroStage';
import { cx } from '../lib/format';

/* NasouHive demo hero carousel — deep forest poster, left-aligned campaign
   copy, two actions, hover arrows and a pill indicator; autoplay pauses on
   hover. Slides carry our own copy and link to existing pages. Slide art is
   the 3D elbow (paused while hidden) or catalogue illustrations. */

const EASE = [0.22, 1, 0.36, 1];
const INTERVAL = 5000;

/* Art (and the WebGL scene) only mounts from the sm breakpoint up. */
function useWide(query = '(min-width: 640px)') {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return wide;
}

export default function HeroCarousel({ slides }) {
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [paused, setPaused] = useState(false);
  const wide = useWide();

  useEffect(() => {
    if (paused) return undefined;
    const t = window.setInterval(() => {
      setDirection(1);
      setActive((i) => (i + 1) % slides.length);
    }, INTERVAL);
    return () => window.clearInterval(t);
  }, [paused, slides.length]);

  const show = (i, dir) => {
    setDirection(dir);
    setActive((i + slides.length) % slides.length);
  };

  const s = slides[active];

  return (
    <section
      className="forest-band group relative min-h-[460px] overflow-hidden rounded-[24px] shadow-pop sm:min-h-[500px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured"
    >
      <div className="field-dots-dark pointer-events-none absolute inset-0 opacity-40" />

      {/* art — right half on desktop, a soft backdrop on tablets, none on phones */}
      {wide && (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-full opacity-60 lg:w-[52%] lg:opacity-100">
          <div className="absolute right-[6%] top-1/2 aspect-square w-[min(80%,460px)] -translate-y-1/2 rounded-full bg-white/[0.07] blur-2xl" />
          {slides.some((x) => x.art === '3d') && (
            <HeroStage
              active={s.art === '3d'}
              className={cx('absolute inset-0 transition-opacity duration-500', s.art === '3d' ? 'opacity-100' : 'opacity-0')}
            />
          )}
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            {s.art !== '3d' && (
              <motion.div
                key={s.id}
                custom={direction}
                initial={{ opacity: 0, x: direction > 0 ? 70 : -70, scale: 1.025 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: direction > 0 ? -50 : 50, scale: 1.01 }}
                transition={{ duration: 0.65, ease: EASE }}
                className="absolute inset-0 grid place-items-center"
              >
                <ProductArt kind={s.art.kind} material={s.art.material} className="animate-drift h-[78%] w-[78%] drop-shadow-[0_30px_40px_rgba(0,0,0,0.35)]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* readability wash, as in the demo */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(18,54,44,0.97)_0%,rgba(18,54,44,0.82)_38%,rgba(18,54,44,0.2)_70%,rgba(18,54,44,0)_100%)]" />

      <div className="relative z-10 flex min-h-[460px] max-w-3xl flex-col justify-center px-6 pb-20 pt-12 text-white sm:min-h-[500px] sm:px-12 lg:px-14">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${s.id}-copy`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14 }}
            transition={{ duration: 0.48, delay: 0.08 }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#d5e5df] sm:text-xs">{s.label}</p>
            <h1 className="font-hero mt-5 max-w-[640px] text-[clamp(2.1rem,6vw,3.6rem)] font-semibold leading-[1.03] text-white">{s.heading}</h1>
            <p className="mt-5 max-w-xl text-sm leading-6 text-sunk sm:text-base">{s.sub}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to={s.primary.to} className="inline-flex items-center gap-2 rounded-md bg-white px-5 py-3 text-sm font-bold text-forest shadow-lg transition hover:-translate-y-0.5">
                {s.primary.label} <Icon name="arrowRight" size={15} />
              </Link>
              <Link to={s.secondary.to} className="rounded-md border border-white/35 bg-white/10 px-5 py-3 text-sm font-bold text-white backdrop-blur-xl transition hover:bg-white/20">
                {s.secondary.label}
              </Link>
            </div>
            {s.points && (
              <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] font-semibold text-[#d5e5df]">
                {s.points.map((p) => (
                  <span key={p.label} className="flex items-center gap-1.5"><Icon name={p.icon} size={15} /> {p.label}</span>
                ))}
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        type="button"
        onClick={() => show(active - 1, -1)}
        aria-label="Previous slide"
        className="absolute left-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-[#173d33]/45 text-white backdrop-blur-lg transition hover:bg-[#173d33]/75 sm:left-5 lg:opacity-0 lg:group-hover:opacity-100"
      >
        <Icon name="chevronLeft" size={20} />
      </button>
      <button
        type="button"
        onClick={() => show(active + 1, 1)}
        aria-label="Next slide"
        className="absolute right-3 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/25 bg-[#173d33]/45 text-white backdrop-blur-lg transition hover:bg-[#173d33]/75 sm:right-5 lg:opacity-0 lg:group-hover:opacity-100"
      >
        <Icon name="chevronRight" size={20} />
      </button>

      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/15 bg-[#173d33]/35 px-3 py-2 backdrop-blur-lg">
        {slides.map((x, i) => (
          <button
            key={x.id}
            type="button"
            onClick={() => show(i, i > active ? 1 : -1)}
            aria-label={`Show slide ${i + 1}: ${x.label}`}
            aria-current={i === active}
            className={cx('h-2 rounded-full transition-all duration-300', i === active ? 'w-7 bg-white' : 'w-2 bg-white/45 hover:bg-white/75')}
          />
        ))}
      </div>
    </section>
  );
}
