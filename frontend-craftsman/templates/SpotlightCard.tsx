import React, { useRef } from 'react';
import { motion, useMotionTemplate, useMotionValue, useReducedMotion } from 'framer-motion';

interface SpotlightCardProps {
  children: React.ReactNode;
  className?: string;
  spotlightColorDark?: string;
  spotlightColorLight?: string;
}

/**
 * SpotlightCard - Card Dual-Theme de Alta Fidelidade com Iluminação GPU (0 Re-renders)
 * Utiliza `useMotionValue` + `useMotionTemplate` para atualizar o gradiente radial
 * diretamente na GPU a 120fps sem disparar re-renderizações do React no `onMouseMove`.
 */
export const SpotlightCard: React.FC<SpotlightCardProps> = ({
  children,
  className = '',
  spotlightColorDark = 'rgba(255, 255, 255, 0.08)',
  spotlightColorLight = 'rgba(15, 23, 42, 0.05)',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || prefersReducedMotion) return;
    const rect = cardRef.current.getBoundingClientRect();
    mouseX.set(e.clientX - rect.left);
    mouseY.set(e.clientY - rect.top);
  };

  const darkSpotlight = useMotionTemplate`radial-gradient(380px circle at ${mouseX}px ${mouseY}px, ${spotlightColorDark}, transparent 75%)`;
  const lightSpotlight = useMotionTemplate`radial-gradient(380px circle at ${mouseX}px ${mouseY}px, ${spotlightColorLight}, transparent 75%)`;

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      whileHover={prefersReducedMotion ? undefined : { y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`
        group relative overflow-hidden rounded-xl p-6
        bg-white dark:bg-zinc-900/90
        text-zinc-900 dark:text-zinc-100
        border border-zinc-200/80 dark:border-white/[0.08]
        shadow-[0_1px_3px_rgba(0,0,0,0.04),inset_0_1px_0_0_rgba(255,255,255,0.8)]
        dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)]
        hover:border-zinc-300 dark:hover:border-white/[0.16]
        transition-colors duration-200
        ${className}
      `}
    >
      {/* Luz Direcional Modo Claro (0 React Re-renders) */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:hidden"
        style={{ background: lightSpotlight }}
      />
      {/* Luz Direcional Modo Escuro (0 React Re-renders) */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-px hidden opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:block"
        style={{ background: darkSpotlight }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};
