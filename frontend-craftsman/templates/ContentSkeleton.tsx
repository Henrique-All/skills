import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: string;
}

/**
 * ShimmerBlock - Bloco Básico Dual-Theme com Efeito Shimmer Deslizante
 * Animação contínua sutil sem Layout Shift (CLS = 0).
 */
export const ShimmerBlock: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  rounded = 'rounded-md',
}) => {
  return (
    <div
      style={{ width, height }}
      className={`relative overflow-hidden bg-zinc-200/75 dark:bg-zinc-800/60 ${rounded} ${className}`}
      role="status"
      aria-label="Carregando conteúdo"
    >
      <motion.div
        animate={{ x: ['-100%', '100%'] }}
        transition={{
          repeat: Infinity,
          duration: 1.6,
          ease: 'linear',
        }}
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 dark:via-white/[0.06] to-transparent"
      />
    </div>
  );
};

/**
 * CardSkeleton - Espelha a geometria exata de um Card Métrico Dual-Theme
 */
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`p-5 rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/80 space-y-3.5 ${className}`}
    >
      <div className="flex items-center justify-between">
        <ShimmerBlock width={100} height={14} />
        <ShimmerBlock width={28} height={28} rounded="rounded-lg" />
      </div>
      <ShimmerBlock width={140} height={28} rounded="rounded-md" />
      <div className="pt-2 flex items-center gap-2">
        <ShimmerBlock width={48} height={16} rounded="rounded-full" />
        <ShimmerBlock width={80} height={12} />
      </div>
    </div>
  );
};

/**
 * TableRowSkeleton - Espelha uma linha de tabela Dual-Theme de alta fidelidade
 */
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => {
  return (
    <div className="flex items-center justify-between py-3.5 px-4 border-b border-zinc-100 dark:border-white/[0.04]">
      <div className="flex items-center gap-3">
        <ShimmerBlock width={32} height={32} rounded="rounded-full" />
        <div className="space-y-1.5">
          <ShimmerBlock width={120} height={14} />
          <ShimmerBlock width={80} height={10} />
        </div>
      </div>
      {Array.from({ length: columns - 1 }).map((_, i) => (
        <ShimmerBlock key={i} width={70 + (i % 2) * 20} height={14} />
      ))}
      <ShimmerBlock width={60} height={24} rounded="rounded-lg" />
    </div>
  );
};

interface EmptyStateCardProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  isFiltered?: boolean;
  onClearFilter?: () => void;
}

/**
 * EmptyStateCard - Cobre os Estados 2 (Empty State) e 3 (Filtered Empty State) da Arquitetura de UX
 */
export const EmptyStateCard: React.FC<EmptyStateCardProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  isFiltered = false,
  onClearFilter,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-8 rounded-xl border border-dashed border-zinc-300 dark:border-white/[0.1] bg-zinc-50/50 dark:bg-zinc-900/40">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
          <rect x="3" y="4" width="18" height="16" rx="2" />
          <path d="M7 8h10M7 12h6" strokeLinecap="round" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        {title}
      </h3>
      <p className="mt-1 max-w-sm text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed">
        {description}
      </p>
      {isFiltered && onClearFilter ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onClearFilter}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium bg-zinc-200/80 text-zinc-900 hover:bg-zinc-300/80 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
        >
          Limpar filtros
        </motion.button>
      ) : (
        actionLabel &&
        onAction && (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onAction}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            {actionLabel}
          </motion.button>
        )
      )}
    </div>
  );
};
