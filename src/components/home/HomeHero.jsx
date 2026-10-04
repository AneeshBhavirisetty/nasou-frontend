import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Icon from '../Icon';
import ProductArt from '../ProductArt';
import HeroStage from '../hero/HeroStage';
import { cx } from '../../lib/format';

/* Homepage hero in the reference's "cinematic" language: cream paper, a
   status pill, a hairline section label, a big Sora headline in forest and
   a sand pill button — with the 3D fitting on a stage and live marketplace
   chips orbiting it. Headline rotates through the active banners set in
   Content & settings. */

const EASE = [0.22, 1, 0.36, 1];

function useWide(query = '(min-width: 1024px)') {
  const [wide, setWide] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setWide(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, [query]);
  return wide;
}

function FloatChip({ className, delay = 0, children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, delay, ease: EASE }}
      className={cx('chip-glass absolute z-10 rounded-[18px] px-3.5 py-2.5 shadow-[0_18px_40px_rgba(31,59,52,0.14)]', className)}
    >
      <div className="animate-float" style={{ animationDelay: `${delay}s` }}>{children}</div>
    </motion.div>
  );
}

export default function HomeHero({ banners, stats }) {
  const wide = useWide();
  const slides = banners.length ? banners : [{ id: 'x', eyebrow: 'Nivora marketplace', title: 'Every fitting, from every trusted counter.', sub: '', cta: 'Shop the catalogue', to: '/shop' }];
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || slides.length < 2) return undefined;
    const t = setInterval(() => setI((n) => (n + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [paused, slides.length]);
  const s = slides[i % slides.length];

  return (
    <section
      className="mesh-cream grain relative isolate overflow-hidden rounded-[28px] border border-white/70 shadow-[0_30px_80px_rgba(37,88,73,0.14)] sm:rounded-[36px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured"
    >
      <div className="field-dots pointer-events-none absolute inset-0 opacity-50" />
      <div className="relative grid min-h-[520px] items-center gap-6 px-5 pb-8 pt-7 sm:px-10 sm:pb-12 sm:pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:px-14">
        <div className="relative z-10 max-w-2xl">
          <span className="chip-glass inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.28em] text-forest">
            <span className="h-1.5 w-1.5 rounded-full bg-forest" /> Nivora
          </span>
          <AnimatePresence mode="wait">
            <motion.div key={s.id} initial={{ opacity: 0, y: 22 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -14 }} transition={{ duration: 0.55, ease: EASE }}>
              <p className="section-label mt-7">{s.eyebrow}</p>
              <h1 className="font-hero text-balance mt-4 text-[clamp(2.4rem,6.6vw,4.6rem)] font-semibold leading-[0.98] text-forest">{s.title}</h1>
              {s.sub && <p className="mt-5 max-w-xl text-[15px] leading-7 text-ink-70 sm:text-[16px]">{s.sub}</p>}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to={s.to} className="inline-flex items-center gap-2 rounded-full bg-forest px-6 py-3.5 text-[14px] font-bold text-white shadow-btn transition hover:-translate-y-0.5 hover:bg-forest-800">
                  {s.cta} <Icon name="arrowRight" size={16} />
                </Link>
                <Link to="/sell" className="pill-sand px-6 py-3.5 text-[14px]">Sell on Nivora</Link>
              </div>
            </motion.div>
          </AnimatePresence>
          <dl className="mt-9 grid max-w-lg grid-cols-3 gap-3">
            {stats.map((x) => (
              <div key={x.label} className="rounded-[18px] border border-white/70 bg-white/55 px-3 py-3 backdrop-blur">
                <dt className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-ink-50">{x.label}</dt>
                <dd className="font-hero tnum mt-1 text-[clamp(1.2rem,3vw,1.6rem)] font-semibold text-forest">{x.value}</dd>
              </div>
            ))}
          </dl>
          {slides.length > 1 && (
            <div className="mt-7 flex items-center gap-2">
              {slides.map((x, n) => (
                <button key={x.id} type="button" onClick={() => setI(n)} aria-label={`Show: ${x.title}`} aria-current={n === i % slides.length} className={cx('h-1.5 rounded-full transition-all duration-300', n === i % slides.length ? 'w-10 bg-forest' : 'w-4 bg-forest/25 hover:bg-forest/50')} />
              ))}
            </div>
          )}
        </div>

        <div className="relative hidden h-[460px] lg:block">
          <div className="absolute inset-6 rounded-[36px] bg-[radial-gradient(circle_at_50%_40%,#ffffff_0%,rgba(255,255,255,0.4)_45%,transparent_70%)]" />
          <div className="animate-pulse-ring absolute left-1/2 top-1/2 h-[330px] w-[330px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-forest/10" />
          <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-forest/10" />
          {wide ? <HeroStage active className="absolute inset-0" /> : null}
          <FloatChip className="left-0 top-10" delay={0.3}>
            <p className="flex items-center gap-2 text-[12px] font-bold text-forest"><Icon name="shieldCheck" size={15} /> Sri Sai Pipes · verified</p>
            <p className="text-[11px] text-ink-50">Hyderabad · ships today</p>
          </FloatChip>
          <FloatChip className="right-0 top-24" delay={0.5}>
            <div className="flex items-center gap-2.5">
              <span className="photo-bed grid h-10 w-10 place-items-center rounded-[12px]"><ProductArt kind="elbow" material="PVC" className="h-full w-full p-1" /></span>
              <span><span className="block text-[12px] font-bold text-ink">PVC Elbow ½″</span><span className="tnum block text-[12px] font-bold text-forest">₹41 <span className="text-emerald-700">27% off</span></span></span>
            </div>
          </FloatChip>
          <FloatChip className="bottom-12 left-6" delay={0.7}>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-ink-50">Order NV-10142</p>
            <div className="mt-1.5 flex gap-1">{[1, 1, 1, 0].map((on, k) => <span key={k} className={cx('h-1.5 w-8 rounded-full', on ? 'bg-forest' : 'bg-sunk')} />)}</div>
            <p className="mt-1 text-[11.5px] font-semibold text-forest">2 of 3 sellers shipped</p>
          </FloatChip>
          <FloatChip className="bottom-24 right-6" delay={0.9}>
            <p className="flex items-center gap-1.5 text-[12px] font-bold text-forest"><Icon name="truck" size={14} /> One cart, many counters</p>
          </FloatChip>
        </div>
      </div>
    </section>
  );
}
