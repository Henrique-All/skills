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
}

/**
 * AnimatedTabs - Padrão de Abas Deslizantes (Estilo macOS / Linear)
 * Utiliza Framer Motion `layoutId` para mover suavemente a pílula ativa entre as abas.
 * Possui suporte nativo a WAI-ARIA (role="tablist"), navegação por teclado (ArrowLeft/Right),
 * CSS Container Queries (@container) e integração com a View Transitions API do navegador.
 */
export const AnimatedTabs: React.FC<AnimatedTabsProps> = ({
  tabs,
  defaultTabId,
  onChange,
  enableViewTransitions = true,
}) => {
  const [activeTab, setActiveTab] = useState(defaultTabId || tabs[0]?.id);

  const handleSelect = (id: string) => {
    if (enableViewTransitions && typeof document !== 'undefined' && 'startViewTransition' in document) {
      // @ts-ignore
      document.startViewTransition(() => {
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
      className="inline-flex items-center gap-1 p-1 rounded-xl bg-zinc-900/90 border border-white/[0.08] shadow-[inset_0_1px_0_0_rgba(255,255,255,0.06)] @container"
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
              focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950
              ${isActive ? 'text-zinc-100' : 'text-zinc-400 hover:text-zinc-200'}
            `}
          >
            {isActive && (
              <motion.div
                layoutId="active-pill"
                transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                className="absolute inset-0 rounded-lg bg-zinc-800 border border-white/[0.12] shadow-sm"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5">
              {tab.label}
              {typeof tab.count === 'number' && (
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isActive ? 'bg-zinc-700 text-zinc-200' : 'bg-zinc-800 text-zinc-500'
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
