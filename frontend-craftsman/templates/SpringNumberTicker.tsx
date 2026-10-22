import React, { useEffect, useRef } from 'react';
import { useMotionValue, useReducedMotion, useSpring } from 'framer-motion';

interface SpringNumberTickerProps {
  value: number;
  locale?: string;
  formatOptions?: Intl.NumberFormatOptions;
  prefix?: string;
  suffix?: string;
  className?: string;
}

/**
 * SpringNumberTicker - Contador Numérico com Física de Mola e `tabular-nums` (0 Re-renders)
 * Atualiza o `textContent` diretamente no nó DOM via assinatura do `useSpring`,
 * garantindo interpolação a 120fps para KPIs, saldos e métricas sem re-renderizar o React.
 */
export const SpringNumberTicker: React.FC<SpringNumberTickerProps> = ({
  value,
  locale = 'pt-BR',
  formatOptions,
  prefix = '',
  suffix = '',
  className = '',
}) => {
  const spanRef = useRef<HTMLSpanElement>(null);
  const prefersReducedMotion = useReducedMotion();
  const motionValue = useMotionValue(value);
  const springValue = useSpring(motionValue, {
    stiffness: 180,
    damping: 26,
    mass: 0.8,
  });

  const formatter = React.useMemo(
    () => new Intl.NumberFormat(locale, formatOptions),
    [locale, formatOptions]
  );

  useEffect(() => {
    if (prefersReducedMotion) {
      if (spanRef.current) {
        spanRef.current.textContent = `${prefix}${formatter.format(value)}${suffix}`;
      }
      return;
    }
    motionValue.set(value);
  }, [value, prefersReducedMotion, motionValue, formatter, prefix, suffix]);

  useEffect(() => {
    const unsubscribe = springValue.on('change', (latest) => {
      if (spanRef.current) {
        spanRef.current.textContent = `${prefix}${formatter.format(latest)}${suffix}`;
      }
    });
    return () => unsubscribe();
  }, [springValue, formatter, prefix, suffix]);

  return (
    <span
      ref={spanRef}
      className={`inline-block tabular-nums tracking-tight font-semibold text-zinc-900 dark:text-zinc-100 ${className}`}
    >
      {`${prefix}${formatter.format(value)}${suffix}`}
    </span>
  );
};
