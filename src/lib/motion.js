/* Shared motion vocabulary — one place for easings, durations and the
   framer-motion variants used across the app. Keep transitions calm:
   short, quintic-out, never bouncy on content. */

import { useEffect, useRef, useState } from 'react';

export const EASE = [0.22, 1, 0.36, 1];
export const EASE_SPRING = { type: 'spring', stiffness: 320, damping: 30 };

export const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
};

export const fadeIn = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.4, ease: EASE } },
};

export const stagger = (gap = 0.07, delay = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: gap, delayChildren: delay } },
});

export const revealChild = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } },
};

export const pageTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18, ease: EASE } },
};

/* True once the user has "reduce motion" set. SSR-safe. */
export function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const on = (e) => setReduced(e.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return reduced;
}

/* Pointer-driven 3D tilt for cards / hero art.
   Returns { ref, style, onMouseMove, onMouseLeave } to spread onto an element. */
export function usePointerTilt({ max = 8, scale = 1.015 } = {}) {
  const ref = useRef(null);
  const [t, setT] = useState({ rx: 0, ry: 0, s: 1 });
  const reduced = usePrefersReducedMotion();

  const onMouseMove = (e) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    setT({ rx: -py * max, ry: px * max, s: scale });
  };
  const onMouseLeave = () => setT({ rx: 0, ry: 0, s: 1 });

  return {
    ref,
    onMouseMove,
    onMouseLeave,
    style: {
      transform: `perspective(900px) rotateX(${t.rx}deg) rotateY(${t.ry}deg) scale(${t.s})`,
      transition: 'transform 0.25s var(--ease-out-quint)',
      transformStyle: 'preserve-3d',
    },
  };
}

/* Magnetic pull toward the pointer — for hero CTAs. */
export function useMagnetic(strength = 0.3) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const onMouseMove = (e) => {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * strength;
    const y = (e.clientY - r.top - r.height / 2) * strength;
    ref.current.style.transform = `translate(${x}px, ${y}px)`;
  };
  const onMouseLeave = () => {
    if (ref.current) ref.current.style.transform = 'translate(0, 0)';
  };
  return { ref, onMouseMove, onMouseLeave, style: { transition: 'transform 0.3s var(--ease-out-quint)' } };
}

/* Count from 0 → value when `active`. */
export function useCountUp(value, { duration = 1400, active = true } = {}) {
  const [n, setN] = useState(0);
  const reduced = usePrefersReducedMotion();
  useEffect(() => {
    if (!active) return;
    if (reduced) { setN(value); return; }
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - p, 4);
      setN(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setN(value);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration, active, reduced]);
  return n;
}
