import { motion, useReducedMotion } from 'motion/react';

export function Stagger({ children, className, as = 'div', stagger = 0.08, delayChildren = 0 }) {
  const reduced = useReducedMotion();
  const MotionTag = motion.create(as);
  const parent = { hidden: {}, visible: { transition: { staggerChildren: reduced ? 0 : stagger, delayChildren: reduced ? 0 : delayChildren } } };
  return (
    <MotionTag className={className} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} variants={parent}>
      {children}
    </MotionTag>
  );
}

export function StaggerItem({ children, className, as = 'div', y = 20, ...rest }) {
  const reduced = useReducedMotion();
  const MotionTag = motion.create(as);
  const item = { hidden: { opacity: 0, y: reduced ? 0 : y }, visible: { opacity: 1, y: 0, transition: { duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] } } };
  return (<MotionTag className={className} variants={item} {...rest}>{children}</MotionTag>);
}
