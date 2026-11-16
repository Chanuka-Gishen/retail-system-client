'use client';

import { create } from 'zustand';

export type Theme = 'dark' | 'light' | 'system';

interface ThemeState {
  theme: Theme;
  resolvedTheme: 'dark' | 'light';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

function applyThemeToDom(resolved: 'dark' | 'light') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const body = document.body;

  if (resolved === 'dark') {
    root.classList.remove('light');
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
    if (body) {
      body.classList.remove('light');
      body.classList.add('dark');
      body.setAttribute('data-theme', 'dark');
    }
  } else {
    root.classList.remove('dark');
    root.classList.add('light');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
    if (body) {
      body.classList.remove('dark');
      body.classList.add('light');
      body.setAttribute('data-theme', 'light');
    }
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark',
  resolvedTheme: 'dark',
  setTheme: (theme: Theme) => {
    let resolved: 'dark' | 'light' = 'dark';
    if (theme === 'system') {
      const prefersDark =
        typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches;
      resolved = prefersDark ? 'dark' : 'light';
    } else {
      resolved = theme;
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('retail_pos_theme', theme);
      } catch {
        // ignore
      }
      applyThemeToDom(resolved);
    }

    set({ theme, resolvedTheme: resolved });
  },
  toggleTheme: () => {
    const current = get().resolvedTheme;
    const nextTheme: Theme = current === 'dark' ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },
  initTheme: () => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem('retail_pos_theme') as Theme | null;
      const initialTheme: Theme =
        saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'dark';
      get().setTheme(initialTheme);
    } catch {
      get().setTheme('dark');
    }
  },
}));
