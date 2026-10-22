import React from 'react';
import { motion } from 'framer-motion';

export interface MasterDetailShellProps {
  hasSelection: boolean;
  onBackToMaster: () => void;
  masterTitle: string;
  detailTitle?: string;
  detailSubtitle?: string;
  masterSlot: React.ReactNode;
  detailSlot: React.ReactNode;
  detailActionsSlot?: React.ReactNode;
}

/**
 * MasterDetailShell - Arquitetura Obrigatória para Telas Multi-Coluna (Chat / Atendimento / Inboxes)
 * - No Desktop (>= 768px): Renderiza lista à esquerda (320px) e área principal à direita em `100dvh`.
 * - No Mobile (< 768px): NUNCA empilha colunas verticalmente. Exibe apenas a lista quando
 *   `hasSelection === false`, e abre o detalhe em tela cheia (`100dvh`) com botão `← Voltar` (>= 44x44px).
 */
export const MasterDetailShell: React.FC<MasterDetailShellProps> = ({
  hasSelection,
  onBackToMaster,
  masterTitle,
  detailTitle,
  detailSubtitle,
  masterSlot,
  detailSlot,
  detailActionsSlot,
}) => {
  return (
    <div className="w-full h-screen h-dvh overflow-hidden grid grid-cols-1 md:grid-cols-[320px_1fr] bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      {/* Coluna 1: Master (Lista de Conversas / Itens) */}
      <aside
        aria-label={masterTitle}
        className={`${
          hasSelection ? 'hidden md:flex' : 'flex'
        } flex-col h-full min-w-0 border-r border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90`}
      >
        <header className="flex items-center justify-between px-4 h-14 shrink-0 border-b border-zinc-200/80 dark:border-white/[0.08]">
          <h1 className="text-base font-semibold tracking-tight truncate">{masterTitle}</h1>
        </header>
        <div data-lenis-prevent className="flex-1 overflow-y-auto overscroll-contain">
          {masterSlot}
        </div>
      </aside>

      {/* Coluna 2: Detail (Área de Conversa / Detalhe em 100dvh) */}
      <main
        className={`${
          hasSelection ? 'flex' : 'hidden md:flex'
        } flex-col h-full min-w-0 bg-zinc-50 dark:bg-zinc-950`}
      >
        {hasSelection ? (
          <>
            <header className="flex items-center justify-between gap-2 px-3 md:px-5 h-14 shrink-0 border-b border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90">
              <div className="flex items-center gap-2 min-w-0">
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={onBackToMaster}
                  aria-label="Voltar para a lista"
                  className="md:hidden min-h-[44px] min-w-[44px] -ml-1 inline-flex items-center justify-center rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 touch-manipulation outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </motion.button>
                <div className="min-w-0">
                  {detailTitle && (
                    <h2 className="text-sm font-semibold tracking-tight truncate text-zinc-900 dark:text-zinc-100">
                      {detailTitle}
                    </h2>
                  )}
                  {detailSubtitle && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                      {detailSubtitle}
                    </p>
                  )}
                </div>
              </div>
              {detailActionsSlot && <div className="flex items-center gap-1 shrink-0">{detailActionsSlot}</div>}
            </header>

            <div data-lenis-prevent className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
              {detailSlot}
            </div>
          </>
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center p-8 text-center text-xs text-zinc-500 dark:text-zinc-400">
            Selecione um item na lista ao lado para visualizar os detalhes.
          </div>
        )}
      </main>
    </div>
  );
};
