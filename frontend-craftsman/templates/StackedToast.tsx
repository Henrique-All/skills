import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone?: 'neutral' | 'success' | 'danger';
  onUndo?: () => void;
}

interface StackedToastProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

/**
 * StackedToast - Pilha 3D de Notificações (Estilo Sonner / Emil Kowalski)
 * Colapsa notificações em profundidade (`scale`, `y`) e expande suavemente no hover,
 * ideal para feedback de Optimistic UI com opção de desfazer (`onUndo`).
 */
export const StackedToast: React.FC<StackedToastProps> = ({ toasts, onDismiss }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const visibleToasts = toasts.slice(-3).reverse();

  const toneBadge = {
    neutral: 'bg-zinc-500',
    success: 'bg-emerald-500',
    danger: 'bg-rose-500',
  };

  return (
    <div
      role="region"
      aria-label="Notificações do sistema"
      onMouseEnter={() => setIsExpanded(true)}
      onMouseLeave={() => setIsExpanded(false)}
      className="fixed bottom-5 right-5 z-50 flex flex-col items-end w-80 pointer-events-none"
    >
      <div className="relative w-full h-36">
        <AnimatePresence initial={false}>
          {visibleToasts.map((toast, idx) => {
            const yOffset = isExpanded ? idx * -64 : idx * -10;
            const scale = isExpanded ? 1 : 1 - idx * 0.045;
            const opacity = idx > 2 ? 0 : 1 - idx * 0.15;

            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 24, scale: 0.94 }}
                animate={{ opacity, y: yOffset, scale }}
                exit={{ opacity: 0, y: 16, scale: 0.92 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                style={{ zIndex: 30 - idx }}
                className="pointer-events-auto absolute bottom-0 inset-x-0 flex items-center justify-between gap-3 rounded-xl px-4 py-3 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-white/[0.1] shadow-lg"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                      toneBadge[toast.tone || 'neutral']
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      {toast.title}
                    </p>
                    {toast.description && (
                      <p className="truncate text-[11px] text-zinc-600 dark:text-zinc-400">
                        {toast.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {toast.onUndo && (
                    <button
                      type="button"
                      onClick={() => {
                        toast.onUndo?.();
                        onDismiss(toast.id);
                      }}
                      className="rounded-md px-2 py-1 text-[11px] font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700 dark:text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                    >
                      Desfazer
                    </button>
                  )}
                  <button
                    type="button"
                    aria-label="Dispensar notificação"
                    onClick={() => onDismiss(toast.id)}
                    className="rounded-md p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  >
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
                      <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
};
