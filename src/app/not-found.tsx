'use client';

import React from 'react';
import Link from 'next/link';
import {
  Compass,
  ArrowLeft,
  LayoutDashboard,
  ShoppingBag,
  Layers,
  Receipt,
} from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
          <Compass className="w-8 h-8 animate-spin-slow" />
        </div>

        <div className="space-y-2">
          <span className="text-xs font-bold tracking-widest uppercase text-emerald-400">
            Error 404
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Page or Resource Not Found
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            The page you are looking for doesn't exist, has been removed, or you may have followed an outdated link.
          </p>
        </div>

        <div className="pt-2 border-t border-slate-800 space-y-3">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Quick Navigation
          </p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700"
            >
              <LayoutDashboard className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">Dashboard</span>
            </Link>
            <Link
              href="/pos"
              className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="truncate">POS Terminal</span>
            </Link>
            <Link
              href="/catalog"
              className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700"
            >
              <Layers className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="truncate">Catalog</span>
            </Link>
            <Link
              href="/invoices"
              className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors border border-slate-700"
            >
              <Receipt className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="truncate">Invoices</span>
            </Link>
          </div>
        </div>

        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
