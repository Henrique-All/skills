import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
  isNumeric?: boolean;
  render?: (item: T) => React.ReactNode;
}

export interface ResponsiveTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  titleKey?: keyof T;
  badgeKey?: keyof T;
  onItemClick?: (item: T) => void;
}

/**
 * ResponsiveTableToCards - Metamorfose Dual-Theme Tabela Desktop ➔ Cards Mobile
 * No desktop (>= 768px): Exibe tabela estruturada com suporte a `tabular-nums`.
 * No mobile (< 768px): Exibe pilha vertical de cards táteis com Touch Target >= 44px.
 */
export function ResponsiveTableToCards<T extends Record<string, any>>({
  data,
  columns,
  keyExtractor,
  titleKey,
  badgeKey,
  onItemClick,
}: ResponsiveTableProps<T>) {
  return (
    <div className="w-full">
      {/* Visualização Desktop: Tabela clássica Dual-Theme */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-zinc-200/80 dark:border-white/[0.08] bg-white dark:bg-zinc-900/90">
        <table className="w-full text-left text-sm text-zinc-800 dark:text-zinc-200">
          <thead className="bg-zinc-50 dark:bg-zinc-900/60 text-xs uppercase text-zinc-500 dark:text-zinc-400 border-b border-zinc-200/80 dark:border-white/[0.06]">
            <tr>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-semibold ${col.isNumeric ? 'text-right tabular-nums' : ''}`}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/60 dark:divide-white/[0.04]">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onItemClick && onItemClick(item)}
                className="hover:bg-zinc-50/80 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3.5 ${col.isNumeric ? 'text-right tabular-nums' : ''}`}
                  >
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visualização Mobile: Feed de Cards Táteis Dual-Theme */}
      <div className="md:hidden flex flex-col gap-3">
        {data.map((item) => {
          const key = keyExtractor(item);
          const title = titleKey ? String(item[titleKey]) : key;
          const badge = badgeKey ? String(item[badgeKey]) : null;

          return (
            <div
              key={key}
              onClick={() => onItemClick && onItemClick(item)}
              className="rounded-xl bg-white dark:bg-zinc-900/90 border border-zinc-200/80 dark:border-white/[0.08] p-4 flex flex-col gap-2.5 active:scale-[0.98] transition-transform touch-manipulation cursor-pointer shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-zinc-100 dark:border-white/[0.04] pb-2 min-w-0">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 tracking-tight text-base truncate">
                  {title}
                </span>
                {badge && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-zinc-100 dark:bg-white/[0.1] text-zinc-700 dark:text-zinc-300 font-medium shrink-0">
                    {badge}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5 text-sm">
                {columns
                  .filter((col) => col.key !== titleKey && col.key !== badgeKey)
                  .map((col) => (
                    <div key={col.key} className="flex justify-between items-center py-0.5 gap-2">
                      <span className="text-zinc-500 dark:text-zinc-400 text-xs">{col.header}:</span>
                      <span
                        className={`text-zinc-900 dark:text-zinc-200 font-medium ${
                          col.isNumeric ? 'tabular-nums' : ''
                        }`}
                      >
                        {col.render ? col.render(item) : item[col.key]}
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
