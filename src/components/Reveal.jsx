import { motion } from 'framer-motion';
import { fadeUp, stagger, revealChild } from '../lib/motion';

/* Scroll-into-view reveal. Wrap a section; children marked <Reveal.Item>
   stagger in. Falls back to visible instantly under reduced-motion
   (framer-motion honours the OS setting automatically). */
export default function Reveal({
  as: Tag = 'div',
  children,
  className = '',
  amount = 0.2,
  once = true,
  stagger: gap,
  ...rest
}) {
  const MotionTag = motion(Tag);
  return (
    <MotionTag
      className={className}
      variants={gap != null ? stagger(gap) : fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      {...rest}
    >
      {children}
    </MotionTag>
  );
}

Reveal.Item = function RevealItem({ as: Tag = 'div', children, className = '', ...rest }) {
  const MotionTag = motion(Tag);
  return (
    <MotionTag className={className} variants={revealChild} {...rest}>
      {children}
    </MotionTag>
  );
};
