import React from 'react';

export interface Column<T> {
  key: string;
  header: string;
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
 * ResponsiveTableToCards - Metamorfose Tabela Desktop para Cards Mobile
 * No desktop (>= 768px): Exibe tabela completa estruturada.
 * No mobile (< 768px): Exibe pilha vertical de cards táteis com thumb actions.
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
      {/* Visualização Desktop: Tabela clássica */}
      <div className="hidden md:block overflow-x-auto rounded-xl border border-white/[0.08]">
        <table className="w-full text-left text-sm text-neutral-200">
          <thead className="bg-neutral-900/60 text-xs uppercase text-neutral-400 border-b border-white/[0.06]">
            <tr>
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 font-semibold">
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[0.04]">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onItemClick && onItemClick(item)}
                className="hover:bg-white/[0.02] transition-colors cursor-pointer"
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3.5">
                    {col.render ? col.render(item) : item[col.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visualização Mobile: Feed de Cards Táteis */}
      <div className="md:hidden flex flex-col gap-3">
        {data.map((item) => {
          const key = keyExtractor(item);
          const title = titleKey ? String(item[titleKey]) : key;
          const badge = badgeKey ? String(item[badgeKey]) : null;

          return (
            <div
              key={key}
              onClick={() => onItemClick && onItemClick(item)}
              className="rounded-2xl bg-neutral-900/80 border border-white/[0.08] p-4 flex flex-col gap-2.5 active:scale-[0.98] transition-transform touch-manipulation cursor-pointer shadow-sm"
            >
              <div className="flex items-center justify-between border-b border-white/[0.04] pb-2">
                <span className="font-semibold text-white tracking-tight text-base">
                  {title}
                </span>
                {badge && (
                  <span className="px-2 py-0.5 text-xs rounded-full bg-white/[0.1] text-neutral-300 font-medium">
                    {badge}
                  </span>
                )}
              </div>

              <div className="flex flex-col gap-1.5 text-sm">
                {columns
                  .filter((col) => col.key !== titleKey && col.key !== badgeKey)
                  .map((col) => (
                    <div key={col.key} className="flex justify-between items-center py-0.5">
                      <span className="text-neutral-400 text-xs">{col.header}:</span>
                      <span className="text-neutral-200 font-medium">
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
