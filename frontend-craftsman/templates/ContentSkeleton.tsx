import React from 'react';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: string;
}

/**
 * ShimmerBlock - Bloco Básico com Efeito Shimmer Deslizante
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
      className={`relative overflow-hidden bg-zinc-800/60 ${rounded} ${className}`}
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
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
      />
    </div>
  );
};

/**
 * CardSkeleton - Espelha a geometria exata de um Card Métrico
 */
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      className={`p-5 rounded-xl border border-white/[0.08] bg-zinc-900/80 space-y-3.5 ${className}`}
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
 * TableRowSkeleton - Espelha uma linha de tabela de alta fidelidade
 */
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => {
  return (
    <div className="flex items-center justify-between py-3.5 px-4 border-b border-white/[0.04]">
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
