import React from 'react';
import { motion } from 'framer-motion';

export interface NavTabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badgeCount?: number;
}

export interface MobileBottomNavProps {
  tabs: NavTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}

/**
 * MobileBottomNav - Barra de Navegação Inferior Dual-Theme para Smartphone
 * Transforma menus superiores e sidebars em navegação acessível pelo polegar
 * com Touch Targets >= 48px, Safe Area inferior e `tabular-nums` em badges.
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  tabs,
  activeTab,
  onChange,
}) => {
  const triggerHaptic = (ms: number = 8) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(ms);
      } catch {
        // Fallback silencioso
      }
    }
  };

  const handleSelect = (id: string) => {
    triggerHaptic(8);
    onChange(id);
  };

  return (
    <nav
      aria-label="Navegação mobile principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-zinc-200/80 dark:border-white/[0.08] pb-[max(8px,env(safe-area-inset-bottom))] shadow-lg"
    >
      <div className="flex items-center justify-around px-2 py-1 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              type="button"
              onClick={() => handleSelect(tab.id)}
              whileTap={{ scale: 0.92 }}
              className="relative min-h-[48px] min-w-[56px] flex flex-col items-center justify-center gap-1 text-xs font-medium touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 rounded-xl"
            >
              {isActive && (
                <motion.div
                  layoutId="active-mobile-tab"
                  className="absolute inset-x-1 inset-y-1 bg-zinc-100 dark:bg-white/[0.08] rounded-xl -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                />
              )}

              <span
                className={`relative transition-colors duration-150 ${
                  isActive
                    ? 'text-zinc-900 dark:text-zinc-100'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {tab.icon}
                {typeof tab.badgeCount === 'number' && tab.badgeCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 px-1 min-w-[16px] h-4 rounded-full bg-rose-500 text-white text-[10px] font-semibold flex items-center justify-center tabular-nums">
                    {tab.badgeCount}
                  </span>
                )}
              </span>

              <span
                className={`transition-colors duration-150 ${
                  isActive
                    ? 'text-zinc-900 dark:text-zinc-100 font-semibold'
                    : 'text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {tab.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
};
