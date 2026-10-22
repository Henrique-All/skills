import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface AccordionItem {
  id: string;
  title: string;
  content: React.ReactNode;
}

interface SmoothAccordionProps {
  items: AccordionItem[];
  allowMultiple?: boolean;
}

/**
 * SmoothAccordion - Sanfona Dual-Theme Fluida com Altura Dinâmica Sem Pulos
 * Utiliza AnimatePresence do Framer Motion com molas calibradas, ícone vetorial SVG
 * e atributos WAI-ARIA (`aria-expanded`, `aria-controls`).
 */
export const SmoothAccordion: React.FC<SmoothAccordionProps> = ({
  items,
  allowMultiple = false,
}) => {
  const [openIds, setOpenIds] = useState<string[]>([]);

  const toggle = (id: string) => {
    if (allowMultiple) {
      setOpenIds((prev) =>
        prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
      );
    } else {
      setOpenIds((prev) => (prev.includes(id) ? [] : [id]));
    }
  };

  return (
    <div className="space-y-2 w-full">
      {items.map((item) => {
        const isOpen = openIds.includes(item.id);
        const panelId = `accordion-panel-${item.id}`;
        const triggerId = `accordion-trigger-${item.id}`;
        return (
          <div
            key={item.id}
            className="rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/80 overflow-hidden transition-colors duration-200 hover:border-zinc-300 dark:hover:border-white/[0.14]"
          >
            <button
              id={triggerId}
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-zinc-900 dark:text-zinc-100 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-inset active:bg-zinc-50 dark:active:bg-zinc-800/50 transition-colors"
            >
              <span>{item.title}</span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="text-zinc-500 dark:text-zinc-400 inline-flex items-center justify-center"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path
                    d="M4 6L8 10L12 6"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={panelId}
                  role="region"
                  aria-labelledby={triggerId}
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed border-t border-zinc-100 dark:border-white/[0.04] pt-3">
                    {item.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};
