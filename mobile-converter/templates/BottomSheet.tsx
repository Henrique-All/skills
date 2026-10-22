import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence, PanInfo } from 'framer-motion';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  snapPoints?: number[]; // Frações da altura da tela, ex: [0.5, 0.88]
  initialSnap?: number;
  children: React.ReactNode;
}

/**
 * BottomSheet - Superfície Deslizante Mobile Dual-Theme com Snap Points e Teclado Virtual
 * - Suporta múltiplos pontos de parada (detents/snapPoints).
 * - Monitora `window.visualViewport` para subir automaticamente quando o teclado virtual do iOS/Android abre.
 * - Fecha com gesto de arraste rápido para baixo e feedback háptico.
 */
export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  snapPoints = [0.82],
  initialSnap = 0,
  children,
}) => {
  const [snapIndex, setSnapIndex] = useState(initialSnap);
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    const handleViewportResize = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardInset(offset);
    };
    vv.addEventListener('resize', handleViewportResize);
    vv.addEventListener('scroll', handleViewportResize);
    return () => {
      vv.removeEventListener('resize', handleViewportResize);
      vv.removeEventListener('scroll', handleViewportResize);
      setKeyboardInset(0);
    };
  }, [isOpen]);

  const triggerHaptic = (ms: number = 10) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Fallback silencioso
      }
    }
  };

  const handleDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 380) {
      if (snapIndex > 0) {
        triggerHaptic(8);
        setSnapIndex(snapIndex - 1);
      } else {
        triggerHaptic(15);
        onClose();
      }
      return;
    }
    if (info.offset.y < -70 && snapIndex < snapPoints.length - 1) {
      triggerHaptic(8);
      setSnapIndex(snapIndex + 1);
    }
  };

  const activeFraction = snapPoints[Math.min(snapIndex, snapPoints.length - 1)] || 0.82;
  const maxHeightCss = `${Math.round(activeFraction * 100)}dvh`;

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={title || 'Painel deslizante'}
          className="fixed inset-0 z-50 flex items-end justify-center md:items-center"
        >
          {/* Backdrop translúcido */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-zinc-950/45 dark:bg-black/65 backdrop-blur-xs"
          />

          {/* Painel do Bottom Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={0.14}
            onDragEnd={handleDragEnd}
            style={{ marginBottom: keyboardInset }}
            className="relative z-10 w-full max-w-lg rounded-t-3xl md:rounded-2xl bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border-t border-zinc-200/90 dark:border-white/[0.08] shadow-2xl pb-[max(16px,env(safe-area-inset-bottom))] touch-manipulation"
          >
            {/* Puxador tátil (Handle Pill) */}
            <div className="pt-3 pb-2 cursor-grab active:cursor-grabbing flex justify-center">
              <div className="w-12 h-1.5 rounded-full bg-zinc-300 dark:bg-white/20" />
            </div>

            {/* Cabeçalho */}
            {title && (
              <div className="px-6 py-2 border-b border-zinc-200/80 dark:border-white/[0.06] flex items-center justify-between">
                <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight">
                  {title}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 active:scale-95 transition-transform outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>
            )}

            {/* Conteúdo com isolamento de scroll */}
            <div
              data-lenis-prevent
              style={{ maxHeight: maxHeightCss }}
              className="px-6 py-4 overflow-y-auto overscroll-contain"
            >
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
