'use client';

import React from 'react';
import { Layers, Coffee, ShoppingBag, Utensils, Sparkles, Tag } from 'lucide-react';

export interface CategoryItem {
  id: string;
  name: string;
  code?: string;
  icon?: string;
}

interface CategoryTabsProps {
  categories: CategoryItem[];
  selectedCategoryId: string | null;
  onSelectCategory: (categoryId: string | null) => void;
  totalProductsCount?: number;
}

export function CategoryTabs({
  categories,
  selectedCategoryId,
  onSelectCategory,
  totalProductsCount,
}: CategoryTabsProps) {
  return (
    <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none select-none">
      {/* "All" category pill */}
      <button
        type="button"
        onClick={() => onSelectCategory(null)}
        className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 shrink-0 ${
          selectedCategoryId === null
            ? 'bg-emerald-600 text-white shadow-md'
            : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        <span>All Items</span>
        {totalProductsCount !== undefined && (
          <span
            className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
              selectedCategoryId === null ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-800 text-slate-400'
            }`}
          >
            {totalProductsCount}
          </span>
        )}
      </button>

      {/* Individual Category Pills */}
      {categories.map((cat) => {
        const isSelected = selectedCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelectCategory(cat.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 shrink-0 ${
              isSelected
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
}
