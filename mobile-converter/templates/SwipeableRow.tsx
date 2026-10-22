import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

export interface SwipeAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  color?: string;
  onClick: () => void;
}

export interface SwipeableRowProps {
  children: React.ReactNode;
  actions?: SwipeAction[];
  onSwipeDelete?: () => void;
}

/**
 * SwipeableRow - Linha de Lista Móvel Dual-Theme com Gesto Deslizante (0 Re-renders no Drag)
 * Permite arrastar horizontalmente com o polegar para revelar ações rápidas (Excluir, Arquivar).
 */
export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  actions = [
    {
      id: 'archive',
      label: 'Arquivar',
      color: 'bg-blue-600 text-white',
      onClick: () => {},
    },
    {
      id: 'delete',
      label: 'Excluir',
      color: 'bg-rose-600 text-white',
      onClick: () => {},
    },
  ],
  onSwipeDelete,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const x = useMotionValue(0);

  const actionsOpacity = useTransform(x, [-140, -40, 0], [1, 0.6, 0]);
  const actionScale = useTransform(x, [-140, -40], [1, 0.85]);

  const maxSwipeWidth = actions.length * 72;

  const handleDragEnd = (_: any, info: any) => {
    if (info.offset.x < -220 && onSwipeDelete) {
      onSwipeDelete();
      return;
    }
    if (info.offset.x < -maxSwipeWidth / 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-white/[0.08] touch-manipulation">
      {/* Camada Inferior: Ações Reveladas */}
      <motion.div
        style={{ opacity: actionsOpacity }}
        className="absolute inset-y-0 right-0 flex items-center justify-end z-0"
      >
        {actions.map((act) => (
          <motion.button
            key={act.id}
            type="button"
            style={{ scale: actionScale }}
            onClick={() => {
              act.onClick();
              setIsOpen(false);
            }}
            className={`min-h-[48px] min-w-[72px] h-full flex flex-col items-center justify-center gap-1 text-xs font-semibold px-2 active:brightness-110 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
              act.color || 'bg-zinc-800 text-white'
            }`}
            aria-label={act.label}
          >
            {act.icon}
            <span>{act.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Camada Superior: Conteúdo Deslizante */}
      <motion.div
        style={{ x }}
        drag="x"
        dragConstraints={{ left: -maxSwipeWidth, right: 0 }}
        dragElastic={0.12}
        onDragEnd={handleDragEnd}
        animate={{ x: isOpen ? -maxSwipeWidth : 0 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="relative z-10 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 p-4 select-none cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
};
