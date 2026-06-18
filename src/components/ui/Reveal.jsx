import { motion, useReducedMotion } from 'motion/react';

export function Reveal({ children, delay = 0, y = 24, x = 0, duration = 0.6, className, as = 'div', once = true }) {
  const reduced = useReducedMotion();
  const MotionTag = motion.create(as);
  const variants = {
    hidden: { opacity: 0, y: reduced ? 0 : y, x: reduced ? 0 : x },
    visible: { opacity: 1, y: 0, x: 0 },
  };
  return (
    <MotionTag className={className} initial="hidden" whileInView="visible" viewport={{ once, margin: '-80px' }} variants={variants} transition={{ duration: reduced ? 0 : duration, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </MotionTag>
  );
}
