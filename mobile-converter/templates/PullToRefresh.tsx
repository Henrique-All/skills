import React, { useState } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

export interface PullToRefreshProps {
  onRefresh: () => Promise<void> | void;
  children: React.ReactNode;
  pullThreshold?: number;
}

/**
 * PullToRefresh - Container Mobile com Gesto Elástico de Atualização (0 Re-renders no Arrasto)
 * Utiliza `useMotionValue` + `useSpring` + `useTransform` para animar o indicador
 * de atualização diretamente na GPU com feedback háptico ao atingir o limiar.
 */
export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  children,
  pullThreshold = 76,
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pullY = useMotionValue(0);
  const smoothY = useSpring(pullY, { stiffness: 360, damping: 30 });
  const spinnerRotate = useTransform(smoothY, [0, pullThreshold], [0, 270]);
  const indicatorOpacity = useTransform(smoothY, [0, pullThreshold * 0.6, pullThreshold], [0, 0.5, 1]);

  const handleDragEnd = async () => {
    if (pullY.get() >= pullThreshold && !isRefreshing) {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(12);
        } catch {}
      }
      setIsRefreshing(true);
      pullY.set(52);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        pullY.set(0);
      }
    } else {
      pullY.set(0);
    }
  };

  return (
    <div className="relative overflow-hidden w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100">
      <motion.div
        style={{ opacity: indicatorOpacity }}
        className="pointer-events-none absolute top-3 inset-x-0 flex justify-center z-0"
      >
        <motion.div
          style={{ rotate: spinnerRotate }}
          className="h-8 w-8 rounded-full flex items-center justify-center bg-white dark:bg-zinc-800 border border-zinc-200/80 dark:border-white/[0.1] shadow-xs text-zinc-700 dark:text-zinc-200"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={isRefreshing ? 'animate-spin' : ''}
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round" />
          </svg>
        </motion.div>
      </motion.div>

      <motion.div
        drag="y"
        dragDirectionLock
        dragConstraints={{ top: 0, bottom: pullThreshold * 1.35 }}
        dragElastic={{ top: 0, bottom: 0.35 }}
        style={{ y: smoothY }}
        onDragEnd={handleDragEnd}
        className="relative z-10 touch-pan-x"
      >
        {children}
      </motion.div>
    </div>
  );
};
