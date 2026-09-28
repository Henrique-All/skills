import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost';
  strength?: number;
}

/**
 * MagneticButton - Botão Tátil com Física de Mola e Micro-Atração
 * Proporciona resposta física ao hover e clique sem a 'cara de botão genérico de IA'.
 */
export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  variant = 'primary',
  strength = 15,
  className = '',
  ...props
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!btnRef.current) return;
    const { left, top, width, height } = btnRef.current.getBoundingClientRect();
    const x = ((e.clientX - (left + width / 2)) / (width / 2)) * strength;
    const y = ((e.clientY - (top + height / 2)) / (height / 2)) * strength;
    setPosition({ x, y });
  };

  const handleMouseLeave = () => {
    setPosition({ x: 0, y: 0 });
  };

  const variantStyles = {
    primary:
      'bg-zinc-100 text-zinc-900 hover:bg-white shadow-[0_1px_2px_rgba(0,0,0,0.1),inset_0_1px_0_rgba(255,255,255,0.8)] border border-transparent',
    secondary:
      'bg-zinc-900 text-zinc-100 hover:bg-zinc-800/90 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] hover:border-white/[0.14]',
    ghost:
      'bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 border border-transparent',
  };

  return (
    <motion.button
      ref={btnRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      animate={{ x: position.x, y: position.y }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 450, damping: 28, mass: 0.5 }}
      className={`
        relative inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-lg
        outline-none select-none transition-colors duration-150
        focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
        disabled:opacity-40 disabled:pointer-events-none
        ${variantStyles[variant]}
        ${className}
      `}
      {...(props as any)}
    >
      {children}
    </motion.button>
  );
};
