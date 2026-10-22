import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface HoldToConfirmButtonProps {
  label?: string;
  holdingLabel?: string;
  confirmedLabel?: string;
  holdDurationMs?: number;
  onConfirm: () => void;
  className?: string;
}

/**
 * HoldToConfirmButton - Botão de UX Defensiva para Ações Destrutivas
 * Substitui `window.confirm()` e modais bloqueantes por uma interação física:
 * o usuário mantém pressionado por `holdDurationMs` (1.2s) enquanto uma barra
 * preenche o botão. Soltar antes cancela a ação instantaneamente.
 */
export const HoldToConfirmButton: React.FC<HoldToConfirmButtonProps> = ({
  label = 'Segure para excluir',
  holdingLabel = 'Mantenha pressionado...',
  confirmedLabel = 'Excluído',
  holdDurationMs = 1200,
  onConfirm,
  className = '',
}) => {
  const [isHolding, setIsHolding] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startHold = () => {
    if (isConfirmed) return;
    setIsHolding(true);
    timerRef.current = setTimeout(() => {
      setIsHolding(false);
      setIsConfirmed(true);
      onConfirm();
    }, holdDurationMs);
  };

  const cancelHold = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsHolding(false);
  };

  return (
    <motion.button
      type="button"
      onPointerDown={startHold}
      onPointerUp={cancelHold}
      onPointerLeave={cancelHold}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && !isHolding) startHold();
      }}
      onKeyUp={(e) => {
        if (e.key === 'Enter' || e.key === ' ') cancelHold();
      }}
      whileTap={{ scale: 0.98 }}
      className={`
        relative overflow-hidden inline-flex items-center justify-center gap-2
        rounded-lg px-4 py-2 text-xs font-medium select-none outline-none
        bg-rose-50 text-rose-700 border border-rose-200/90
        dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-500/25
        focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2
        focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950
        transition-colors duration-150
        ${className}
      `}
    >
      {/* Barra de preenchimento com física progressiva */}
      <motion.span
        aria-hidden="true"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isConfirmed ? 1 : isHolding ? 1 : 0 }}
        transition={{
          duration: isHolding ? holdDurationMs / 1000 : 0.18,
          ease: isHolding ? 'linear' : 'easeOut',
        }}
        style={{ transformOrigin: 'left' }}
        className="pointer-events-none absolute inset-0 bg-rose-500/20 dark:bg-rose-500/30"
      />
      <span className="relative z-10 flex items-center gap-1.5">
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
          <path d="M2.5 4h11M5.5 4V2.5h5V4M6.5 7v4.5M9.5 7v4.5M3.5 4l.7 9.5a1 1 0 0 0 1 .9h5.6a1 1 0 0 0 1-.9L12.5 4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span>{isConfirmed ? confirmedLabel : isHolding ? holdingLabel : label}</span>
      </span>
    </motion.button>
  );
};
