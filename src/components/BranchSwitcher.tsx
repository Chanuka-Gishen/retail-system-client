'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Store, ChevronDown, Check, MapPin, Building2 } from 'lucide-react';
import { useAuthStore, BranchInfo } from '../lib/auth-store';
import { apiClient } from '../lib/api-client';

interface BranchItem extends BranchInfo {
  phone?: string;
  address?: string;
  city?: string;
  isMain?: boolean;
}

export function BranchSwitcher() {
  const { branch, setBranch, isAuthenticated } = useAuthStore();
  const [branches, setBranches] = useState<BranchItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const loadBranches = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient<BranchItem[] | { items: BranchItem[] }>('/merchant/branches');
        const list = Array.isArray(res) ? res : res?.items || [];
        setBranches(list);

        // If no active branch set, set default to first branch
        if (!useAuthStore.getState().branch?.id && list.length > 0) {
          useAuthStore.getState().setBranch(list[0]);
        }
      } catch (e: any) {
        console.warn('Could not load branches:', e.message);
      } finally {
        setIsLoading(false);
      }
    };

    loadBranches();
  }, [isAuthenticated]);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectBranch = (targetBranch: BranchItem) => {
    setBranch(targetBranch);
    setIsOpen(false);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('branchChanged', { detail: targetBranch }));
    }
  };

  const activeBranch = (mounted && branch) || (branches.length > 0 ? branches[0] : null);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-1.5 sm:space-x-2 px-2 sm:px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl transition text-xs font-semibold shadow-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
        title="Switch Active Store Branch"
      >
        <div className="w-5 h-5 rounded-lg bg-emerald-950 border border-emerald-800/80 text-emerald-400 flex items-center justify-center shrink-0">
          <Store className="w-3 h-3" />
        </div>
        <div className="text-left max-w-[85px] xs:max-w-[110px] sm:max-w-[180px] truncate">
          <span className="block truncate font-bold text-white text-xs">
            {activeBranch ? activeBranch.name : 'Select Branch'}
          </span>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1.5 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5 select-none animate-in fade-in duration-150">
          <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Store Branches ({branches.length})</span>
            <span className="text-[10px] text-emerald-400 font-mono">Live</span>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {branches.length === 0 ? (
              <div className="px-3 py-3 text-center text-xs text-slate-500">
                {isLoading ? 'Loading branches...' : 'No branches found'}
              </div>
            ) : (
              branches.map((b) => {
                const isSelected = activeBranch?.id === b.id;
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => handleSelectBranch(b)}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition ${
                      isSelected
                        ? 'bg-emerald-950/60 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                          isSelected
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <div className="truncate">
                        <div className="truncate font-semibold">{b.name}</div>
                        <div className="text-[10px] text-slate-500 truncate flex items-center space-x-1">
                          <span className="font-mono text-emerald-400 uppercase">{b.code}</span>
                          {b.city && (
                            <>
                              <span>&bull;</span>
                              <span className="flex items-center">
                                <MapPin className="w-2.5 h-2.5 mr-0.5 inline" />
                                {b.city}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
