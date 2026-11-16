'use client';

import React from 'react';
import { useThemeStore } from '../lib/theme-store';

export interface TableSkeletonProps {
  columns: number;
  rows?: number;
  theme?: 'dark' | 'light';
}

export function TableSkeleton({
  columns,
  rows = 5,
  theme,
}: TableSkeletonProps) {
  const storeTheme = useThemeStore((s) => s.resolvedTheme);
  const activeTheme = storeTheme || theme || 'dark';

  // Pre-configured variable widths for natural skeleton look
  const widthClasses = [
    'w-24',
    'w-36',
    'w-20',
    'w-28',
    'w-16',
    'w-32',
    'w-24',
    'w-20',
  ];

  const isDark = activeTheme === 'dark';
  const rowBorderClass = isDark ? 'border-b border-slate-800' : 'border-b border-gray-100';
  const shimmerBg = isDark ? 'bg-slate-800' : 'bg-slate-200';

  return (
    <>
      {Array.from({ length: rows }).map((_, rIdx) => (
        <tr key={rIdx} className={rowBorderClass}>
          {Array.from({ length: columns }).map((_, cIdx) => {
            const widthClass = widthClasses[(rIdx + cIdx) % widthClasses.length];
            const isRight = cIdx === columns - 1;

            return (
              <td
                key={cIdx}
                className={`px-4 py-3.5 whitespace-nowrap ${isRight ? 'text-right' : ''}`}
              >
                <div
                  className={`inline-block animate-pulse h-4 ${shimmerBg} rounded ${widthClass} ${
                    isRight ? 'ml-auto' : ''
                  }`}
                />
              </td>
            );
          })}
        </tr>
      ))}
    </>
  );
}
