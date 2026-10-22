import React, { useRef } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  strength?: number;
  shortcut?: string;
}

/**
 * MagneticButton - Botão Tátil Dual-Theme com Física de Mola na GPU (0 Re-renders)
 * Utiliza `useMotionValue` + `useSpring` para atração elástica a 120fps sem `useState`
 * no `onMouseMove`, com suporte a badge de atalho `<kbd>` e respeito a `useReducedMotion`.
 */
export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  variant = 'primary',
  strength = 12,
  shortcut,
  className = '',
  ...props
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const springConfig = { stiffness: 450, damping: 28, mass: 0.5 };
  const x = useSpring(rawX, springConfig);
  const y = useSpring(rawY, springConfig);

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current || prefersReducedMotion) return;
    const { left, top, width, height } = btnRef.current.getBoundingClientRect();
    const offsetX = ((e.clientX - (left + width / 2)) / (width / 2)) * strength;
    const offsetY = ((e.clientY - (top + height / 2)) / (height / 2)) * strength;
    rawX.set(offsetX);
    rawY.set(offsetY);
  };

  const handleMouseLeave = () => {
    rawX.set(0);
    rawY.set(0);
  };

  const variantStyles = {
    primary:
      'bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shadow-[0_1px_2px_rgba(0,0,0,0.12)] border border-transparent',
    secondary:
      'bg-white text-zinc-900 hover:bg-zinc-50 border border-zinc-200/90 shadow-xs dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800/90 dark:border-white/[0.08] dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]',
    ghost:
      'bg-transparent text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100/80 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800/50 border border-transparent',
  };

  return (
    <motion.button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x, y }}
      whileTap={prefersReducedMotion ? undefined : { scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 450, damping: 28 }}
      className={`
        relative inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg
        outline-none select-none transition-colors duration-150
        focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2
        focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950
        disabled:opacity-40 disabled:pointer-events-none
        ${variantStyles[variant]}
        ${className}
      `}
      {...(props as any)}
    >
      <span>{children}</span>
      {shortcut && (
        <kbd className="ml-1 inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-mono leading-none opacity-70 bg-black/10 dark:bg-white/15">
          {shortcut}
        </kbd>
      )}
    </motion.button>
  );
};
