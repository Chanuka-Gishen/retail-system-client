'use client';

import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useThemeStore } from '../lib/theme-store';

export interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md';
}

export function ThemeToggle({
  className = '',
  showLabel = false,
  size = 'md',
}: ThemeToggleProps) {
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, toggleTheme, initTheme } = useThemeStore();

  useEffect(() => {
    initTheme();
    setMounted(true);
  }, [initTheme]);

  if (!mounted) {
    return (
      <button
        type="button"
        className={`p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition ${className}`}
        aria-label="Toggle theme"
      >
        <span className="w-4 h-4 block" />
      </button>
    );
  }

  const isDark = resolvedTheme === 'dark';
  const iconClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`flex items-center justify-center rounded-xl transition-all duration-200 select-none ${
        showLabel
          ? 'px-3 py-1.5 space-x-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-750'
          : 'p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition'
      } ${className}`}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
    >
      {isDark ? (
        <Sun className={`${iconClass} text-amber-400 transition-transform duration-300 hover:rotate-45`} />
      ) : (
        <Moon className={`${iconClass} text-emerald-600 transition-transform duration-300 hover:-rotate-12`} />
      )}

      {showLabel && (
        <span className="text-xs font-medium">
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </span>
      )}
    </button>
  );
}
