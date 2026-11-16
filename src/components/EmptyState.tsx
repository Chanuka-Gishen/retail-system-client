'use client';

import React from 'react';
import { SearchX, Plus, RefreshCw, FolderOpen } from 'lucide-react';
import { useThemeStore } from '../lib/theme-store';

export interface EmptyStateProps {
  colSpan?: number;
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  isSearchActive?: boolean;
  searchQuery?: string;
  onResetFilters?: () => void;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ComponentType<{ className?: string }>;
  theme?: 'dark' | 'light';
}

export function EmptyState({
  colSpan,
  icon: Icon = FolderOpen,
  title,
  description,
  isSearchActive = false,
  searchQuery,
  onResetFilters,
  actionLabel,
  onAction,
  actionIcon: ActionIcon = Plus,
  theme,
}: EmptyStateProps) {
  const storeTheme = useThemeStore((s) => s.resolvedTheme);
  const activeTheme = storeTheme || theme || 'dark';
  const isDark = activeTheme === 'dark';

  const titleClass = isDark ? 'text-white' : 'text-slate-900';
  const descClass = isDark ? 'text-slate-400' : 'text-slate-500';

  const resetBtnClass = isDark
    ? 'text-slate-300 bg-slate-800 border-slate-700 hover:bg-slate-700 hover:text-white shadow-sm'
    : 'text-slate-700 bg-white border-slate-300 hover:bg-slate-50 hover:text-slate-900 shadow-sm';

  const actionBtnClass = isDark
    ? 'text-white bg-emerald-600 hover:bg-emerald-500'
    : 'text-white bg-emerald-600 hover:bg-emerald-700';

  const iconCircleClass = isSearchActive
    ? isDark
      ? 'bg-amber-950 text-amber-400 ring-8 ring-amber-950/30'
      : 'bg-amber-50 text-amber-500 ring-8 ring-amber-50/50'
    : isDark
    ? 'bg-slate-800 text-slate-400 ring-8 ring-slate-800/40'
    : 'bg-slate-100 text-slate-500 ring-8 ring-slate-50';

  const content = (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center max-w-md mx-auto">
      <div
        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-inner mb-4 ${iconCircleClass}`}
      >
        {isSearchActive ? <SearchX className="w-7 h-7" /> : <Icon className="w-7 h-7" />}
      </div>

      <h3 className={`text-base font-semibold mb-1 ${titleClass}`}>
        {title || (isSearchActive ? 'No matching results found' : 'No records yet')}
      </h3>

      <p className={`text-xs mb-5 leading-relaxed ${descClass}`}>
        {description ||
          (isSearchActive
            ? searchQuery
              ? `We couldn't find any entries matching "${searchQuery}". Try adjusting your keywords or clearing active filters.`
              : 'No entries match your active filter criteria. Try clearing or relaxing filters.'
            : 'Get started by creating your first entry or checking back after new transactions.')}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {isSearchActive && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium border rounded-lg transition-colors ${resetBtnClass}`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Reset Filters & Search
          </button>
        )}

        {actionLabel && onAction && !isSearchActive && (
          <button
            type="button"
            onClick={onAction}
            className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-lg transition-colors ${actionBtnClass}`}
          >
            <ActionIcon className="w-3.5 h-3.5" />
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );

  if (colSpan !== undefined) {
    return (
      <tr>
        <td colSpan={colSpan} className="p-0">
          {content}
        </td>
      </tr>
    );
  }

  return content;
}
