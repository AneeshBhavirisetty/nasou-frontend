import { useEffect, useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import Logo from '../components/Logo';
import Icon from '../components/Icon';
import HeroFallbackArt from '../components/hero/HeroFallbackArt';
import { testimonials, valueProps } from '../data/site';
import { EASE } from '../lib/motion';

function BrandPanel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % valueProps.length), 4000);
    return () => clearInterval(t);
  }, []);
  const vp = valueProps[i];
  const t = testimonials[i % testimonials.length];

  return (
    <div className="relative hidden overflow-hidden bg-forest text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
      <div className="field-dots-dark absolute inset-0 opacity-70" />
      <div className="relative">
        <Link to="/" className="text-white"><Logo /></Link>
      </div>

      <div className="relative">
        <div className="pointer-events-none absolute -right-16 top-1/2 hidden -translate-y-1/2 opacity-30 xl:block">
          <HeroFallbackArt className="h-[360px] w-[360px] animate-float" />
        </div>
        <AnimatePresence initial={false}>
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -14, position: 'absolute' }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <span className="grid h-11 w-11 place-items-center rounded-md bg-emerald/20 text-emerald-100">
              <Icon name={vp.icon} size={20} />
            </span>
            <h2 className="mt-5 display-serif text-[clamp(1.8rem,3vw,2.6rem)] text-white">{vp.title}</h2>
            <p className="mt-3 max-w-sm text-[14px] leading-relaxed text-white/60">{vp.body}</p>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="relative border-t border-white/12 pt-6">
        <p className="text-[13px] leading-relaxed text-white/70">“{t.quote}”</p>
        <p className="mt-2 text-[12px] font-semibold text-white/50">{t.name} · {t.role}</p>
      </div>
    </div>
  );
}

export default function AuthLayout() {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <BrandPanel />
      <div className="relative flex flex-col items-center justify-center bg-canvas px-4 py-10 sm:px-8">
        <Link to="/" className="mb-8 text-forest lg:hidden"><Logo /></Link>
        <Outlet />
        <Link to="/" className="mt-8 text-[12.5px] font-semibold text-ink-35 transition hover:text-ink">
          ← Back to nasouhive.com
        </Link>
      </div>
    </div>
  );
}
