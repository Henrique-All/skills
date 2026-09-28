import React from 'react';
import { motion } from 'framer-motion';

export interface NavTabItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

export interface MobileBottomNavProps {
  tabs: NavTabItem[];
  activeTab: string;
  onChange: (id: string) => void;
}

/**
 * MobileBottomNav - Barra de Navegação Inferior para Smartphone
 * Transforma menus superiores e sidebars em navegação acessível pelo polegar.
 */
export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  tabs,
  activeTab,
  onChange,
}) => {
  return (
    <nav
      aria-label="Navegação mobile principal"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-neutral-900/90 backdrop-blur-xl border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)] shadow-lg"
    >
      <div className="flex items-center justify-around px-2 py-1 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <motion.button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              whileTap={{ scale: 0.92 }}
              className="relative min-h-[48px] min-w-[56px] flex flex-col items-center justify-center gap-1 text-xs font-medium touch-manipulation focus:outline-none"
            >
              {/* Indicador deslizante ativo */}
              {isActive && (
                <motion.div
                  layoutId="active-mobile-tab"
                  className="absolute inset-x-1 inset-y-1 bg-white/[0.08] rounded-2xl -z-10"
                  transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                />
              )}

              <span
                className={`transition-colors duration-150 ${
                  isActive ? 'text-white' : 'text-neutral-400'
                }`}
              >
                {tab.icon}
              </span>

              <span
                className={`transition-colors duration-150 ${
                  isActive ? 'text-white font-semibold' : 'text-neutral-400'
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
