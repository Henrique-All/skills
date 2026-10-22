import React, { useState } from 'react';
import { motion } from 'framer-motion';

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

interface AnimatedTabsProps {
  tabs: TabItem[];
  defaultTabId?: string;
  onChange?: (id: string) => void;
  enableViewTransitions?: boolean;
  layoutGroupId?: string;
}

/**
 * AnimatedTabs - Padrão de Abas Deslizantes Dual-Theme (Estilo macOS / Linear)
 * Utiliza Framer Motion `layoutId` para mover suavemente a pílula ativa entre as abas.
 * Possui suporte nativo a WAI-ARIA (role="tablist"), navegação por teclado (ArrowLeft/Right),
 * contadores com `tabular-nums` e integração com a View Transitions API do navegador.
 */
export const AnimatedTabs: React.FC<AnimatedTabsProps> = ({
  tabs,
  defaultTabId,
  onChange,
  enableViewTransitions = true,
  layoutGroupId = 'active-pill',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTabId || tabs[0]?.id);

  const handleSelect = (id: string) => {
    if (enableViewTransitions && typeof document !== 'undefined' && 'startViewTransition' in document) {
      (document as any).startViewTransition(() => {
        setActiveTab(id);
        onChange?.(id);
      });
    } else {
      setActiveTab(id);
      onChange?.(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowRight') {
      const nextIdx = (index + 1) % tabs.length;
      handleSelect(tabs[nextIdx].id);
    } else if (e.key === 'ArrowLeft') {
      const prevIdx = (index - 1 + tabs.length) % tabs.length;
      handleSelect(tabs[prevIdx].id);
    }
  };

  return (
    <div
      role="tablist"
      aria-label="Navegação em abas"
      className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-100/90 dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/[0.08] shadow-xs dark:shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] @container"
    >
      {tabs.map((tab, idx) => {
        const isActive = activeTab === tab.id;
        return (
          <motion.button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={() => handleSelect(tab.id)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            whileTap={{ scale: 0.98 }}
            className={`
              relative px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors duration-200 outline-none
              focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2
              focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950
              ${
                isActive
                  ? 'text-zinc-900 dark:text-zinc-100'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
              }
            `}
          >
            {isActive && (
              <motion.div
                layoutId={layoutGroupId}
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                className="absolute inset-0 rounded-lg bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-white/[0.12] shadow-xs"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.label}
              {typeof tab.count === 'number' && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] tabular-nums ${
                    isActive
                      ? 'bg-zinc-100 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-200'
                      : 'bg-zinc-200/70 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
};
