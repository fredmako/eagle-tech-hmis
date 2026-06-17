import { Sun, Moon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export function ThemeToggle({ theme, onToggle, className = '' }) {
  const isLight = theme === 'emerald';
  return (
    <button
      onClick={onToggle}
      aria-label={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
      className={`relative w-9 h-9 rounded-lg border border-border-strong hover:border-border-emphasis bg-card/40 hover:bg-card/70 transition-all duration-medium flex items-center justify-center cursor-pointer overflow-hidden ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isLight ? 'sun' : 'moon'}
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="absolute inset-0 flex items-center justify-center"
        >
          {isLight ? <Sun size={15} className="text-chart-4" /> : <Moon size={15} className="text-primary" />}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}
