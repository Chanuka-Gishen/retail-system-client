'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  pageSizeOptions?: number[];
  isLoading?: boolean;
}

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
  pageSizeOptions = [10, 20, 50, 100],
  isLoading = false,
}: PaginationProps) {
  if (totalItems === 0) return null;

  const startItem = Math.min((currentPage - 1) * limit + 1, totalItems);
  const endItem = Math.min(currentPage * limit, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);
      if (currentPage > 3) {
        pages.push('...');
      }

      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (currentPage < totalPages - 2) {
        pages.push('...');
      }
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-slate-900 border-t border-slate-800 sm:px-6 rounded-b-xl text-xs text-slate-300">
      {/* Items info & page size */}
      <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <span className="text-slate-400">
          Showing <span className="font-semibold text-white">{startItem}</span> to{' '}
          <span className="font-semibold text-white">{endItem}</span> of{' '}
          <span className="font-semibold text-white">{totalItems}</span> results
        </span>

        {onLimitChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-slate-400">Rows:</span>
            <select
              value={limit}
              onChange={(e) => {
                onLimitChange(Number(e.target.value));
                onPageChange(1);
              }}
              disabled={isLoading}
              className="border border-slate-700 rounded px-1.5 py-0.5 text-xs bg-slate-800 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer disabled:opacity-50"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-slate-900 text-slate-200">
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1 || isLoading}
          title="First page"
          className="p-1 rounded border border-slate-750 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1 || isLoading}
          title="Previous page"
          className="p-1 rounded border border-slate-750 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Numbered page buttons */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((p, idx) =>
            typeof p === 'number' ? (
              <button
                key={idx}
                type="button"
                onClick={() => onPageChange(p)}
                disabled={isLoading}
                className={`min-w-[28px] h-7 px-2 rounded text-xs font-medium transition-colors ${
                  p === currentPage
                    ? 'bg-emerald-600 text-white font-bold shadow-sm shadow-emerald-600/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white border border-transparent'
                }`}
              >
                {p}
              </button>
            ) : (
              <span key={idx} className="px-1 text-slate-500">
                ...
              </span>
            ),
          )}
        </div>

        {/* Mobile simple page indicator */}
        <span className="sm:hidden px-2 text-xs font-medium text-slate-400">
          Page {currentPage} of {totalPages}
        </span>

        {/* Next */}
        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages || isLoading}
          title="Next page"
          className="p-1 rounded border border-slate-750 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage >= totalPages || isLoading}
          title="Last page"
          className="p-1 rounded border border-slate-750 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
