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
 * SmoothAccordion - Sanfona Fluida com Altura Dinâmica Sem Pulos
 * Utiliza AnimatePresence do Framer Motion com overflow escondido e molas suaves.
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
        return (
          <div
            key={item.id}
            className="rounded-xl border border-white/[0.08] bg-zinc-900/80 overflow-hidden transition-colors duration-200 hover:border-white/[0.14]"
          >
            <button
              onClick={() => toggle(item.id)}
              className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-zinc-200 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-inset active:bg-zinc-800/50 transition-colors"
            >
              <span>{item.title}</span>
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="text-zinc-500 text-xs"
              >
                ▼
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4 text-xs text-zinc-400 leading-relaxed border-t border-white/[0.04] pt-3">
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
