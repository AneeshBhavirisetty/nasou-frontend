import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { useCountUp } from '../lib/motion';

/* Animated number that counts up once it scrolls into view. */
export default function Counter({ value, decimals = 0, prefix = '', suffix = '', className = '' }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const n = useCountUp(value, { active: inView });
  const shown = decimals ? n.toFixed(decimals) : Math.round(n).toLocaleString('en-IN');
  return (
    <span ref={ref} className={`tnum ${className}`}>
      {prefix}{shown}{suffix}
    </span>
  );
}
