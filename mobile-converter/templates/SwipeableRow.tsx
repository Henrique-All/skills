import React, { useState } from 'react';
import { motion, useMotionValue, useTransform } from 'framer-motion';

export interface SwipeAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  color?: string; // ex: bg-red-600, bg-blue-600
  onClick: () => void;
}

export interface SwipeableRowProps {
  children: React.ReactNode;
  actions?: SwipeAction[];
  onSwipeDelete?: () => void;
}

/**
 * SwipeableRow - Linha de Lista Móvel com Gesto Deslizante (Estilo iOS / Nubank)
 * Permite arrastar horizontalmente com o polegar para revelar ações rápidas (Excluir, Arquivar, Favoritar).
 */
export const SwipeableRow: React.FC<SwipeableRowProps> = ({
  children,
  actions = [
    {
      id: 'archive',
      label: 'Arquivar',
      color: 'bg-blue-600',
      onClick: () => console.log('Arquivado')
    },
    {
      id: 'delete',
      label: 'Excluir',
      color: 'bg-red-600',
      onClick: () => console.log('Excluído')
    }
  ],
  onSwipeDelete
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const x = useMotionValue(0);

  // Aumenta a opacidade das ações conforme o usuário puxa para a esquerda
  const actionsOpacity = useTransform(x, [-140, -40, 0], [1, 0.6, 0]);
  const actionScale = useTransform(x, [-140, -40], [1, 0.85]);

  const maxSwipeWidth = actions.length * 70; // 70px por botão de ação

  const handleDragEnd = (_: any, info: any) => {
    // Se arrastou além do limite de gatilho rápido para exclusão (> 220px)
    if (info.offset.x < -220 && onSwipeDelete) {
      onSwipeDelete();
      return;
    }

    // Se arrastou mais de metade da gaveta de ações, fixa aberta
    if (info.offset.x < -maxSwipeWidth / 2) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-neutral-900 border border-white/[0.08] touch-manipulation">
      {/* Camada Inferior: Ações Reveladas */}
      <motion.div
        style={{ opacity: actionsOpacity }}
        className="absolute inset-y-0 right-0 flex items-center justify-end z-0"
      >
        {actions.map((act) => (
          <motion.button
            key={act.id}
            style={{ scale: actionScale }}
            onClick={() => {
              act.onClick();
              setIsOpen(false);
            }}
            className={`min-h-[48px] min-w-[70px] h-full flex flex-col items-center justify-center gap-1 text-white text-xs font-semibold px-2 active:brightness-110 transition-colors ${
              act.color || 'bg-neutral-800'
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
        className="relative z-10 bg-neutral-900 p-4 select-none cursor-grab active:cursor-grabbing"
      >
        {children}
      </motion.div>
    </div>
  );
};
