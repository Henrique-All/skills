import React from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * BottomSheet - Superfície Deslizante Mobile com Gesto de Arraste e Safe Area
 * Converte modais flutuantes do desktop em gaveta nativa de polegar no mobile.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  const triggerHaptic = (ms: number = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Fallback silencioso em browsers que bloqueiam vibração
      }
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    // Se arrastou mais de 100px para baixo ou com velocidade suficiente, fecha com feedback tátil
    if (info.offset.y > 100 || info.velocity.y > 350) {
      triggerHaptic(15);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          {/* Backdrop translúcido */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />

          {/* Painel do Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.15}
            onDragEnd={handleDragEnd}
            className="relative z-10 w-full max-w-lg rounded-t-3xl bg-neutral-900 border-t border-white/[0.08] shadow-2xl pb-[env(safe-area-inset-bottom)] touch-manipulation"
          >
            {/* Puxador tátil (Handle Pill) */}
            <div className="pt-3 pb-2 cursor-grab active:cursor-grabbing flex justify-center">
              <div className="w-12 h-1.5 rounded-full bg-white/20" />
            </div>

            {/* Cabeçalho */}
            {title && (
              <div className="px-6 py-2 border-b border-white/[0.06] flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white tracking-tight">{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-400 hover:text-white active:scale-95 transition-transform"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Conteúdo */}
            <div className="px-6 py-4 max-h-[75dvh] overflow-y-auto">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
