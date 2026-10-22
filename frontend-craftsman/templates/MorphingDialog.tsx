import React, { useEffect, useId, useState } from 'react';
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';

interface MorphingDialogProps {
  triggerLabel: string;
  triggerSubtitle?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}

/**
 * MorphingDialog - Transição de Elemento Compartilhado (Shared Layout Morphing)
 * O card/botão de gatilho se expande fisicamente transformando-se no próprio Modal
 * usando `layoutId` e física de molas calibrada, mantendo coerência Dual-Theme.
 */
export const MorphingDialog: React.FC<MorphingDialogProps> = ({
  triggerLabel,
  triggerSubtitle,
  title,
  description,
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const uid = useId();
  const cardLayoutId = `morph-card-${uid}`;
  const titleLayoutId = `morph-title-${uid}`;

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen]);

  return (
    <LayoutGroup>
      <motion.button
        type="button"
        layoutId={cardLayoutId}
        onClick={() => setIsOpen(true)}
        whileTap={{ scale: 0.98 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className="group relative flex flex-col items-start rounded-xl px-4 py-3 text-left bg-white dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 border border-zinc-200/80 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/[0.16] shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        <motion.span
          layoutId={titleLayoutId}
          className="text-xs font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
        >
          {triggerLabel}
        </motion.span>
        {triggerSubtitle && (
          <span className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400">
            {triggerSubtitle}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-zinc-950/45 dark:bg-black/65 backdrop-blur-xs"
            />

            <motion.div
              layoutId={cardLayoutId}
              transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl p-6 bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100 border border-zinc-200/90 dark:border-white/[0.1] shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <motion.h2
                    layoutId={titleLayoutId}
                    className="text-base font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
                  >
                    {title}
                  </motion.h2>
                  {description && (
                    <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Fechar diálogo"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-1.5 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:text-zinc-100 dark:hover:bg-zinc-800 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="mt-4">{children}</div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
};
