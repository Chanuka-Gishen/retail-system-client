'use client';

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Save,
  Download,
  Search,
  Filter,
  Check,
  X,
  Warehouse as WarehouseIcon,
  Layers,
  TrendingDown,
  TrendingUp,
  FileCheck2,
  ScanLine,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../lib/auth-store';

interface StocktakeItem {
  variantId: string;
  sku: string;
  barcode: string;
  productName: string;
  variantName?: string;
  category?: string;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  expectedQty: number;
  countedQty: number;
  isCounted: boolean;
}

const STORAGE_KEY = 'retail_pos_active_stocktake_session';

export default function StocktakePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Warehouses
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [sessionName, setSessionName] = useState<string>('Store Wall-to-Wall Audit');

  // Session State
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [items, setItems] = useState<StocktakeItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(false);
  const [lastScannedSku, setLastScannedSku] = useState<string | null>(null);

  // Scanner & Filter State
  const [scanInput, setScanInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'DISCREPANCIES' | 'MATCHED' | 'UNCOUNTED'>('ALL');

  // Reconciliation Confirmation Modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmittingReconciliation, setIsSubmittingReconciliation] = useState(false);
  const [reconciledResult, setReconciledResult] = useState<any | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchWarehouses();
    checkForSavedSession();
  }, [isAuthenticated]);

  // Focus scanner input whenever session is active
  useEffect(() => {
    if (isSessionActive && scanInputRef.current) {
      scanInputRef.current.focus();
    }
  }, [isSessionActive]);

  const fetchWarehouses = async () => {
    try {
      const res = await apiClient<any[]>('/merchant/warehouses');
      setWarehouses(res || []);
      if (res && res.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(res[0].id);
      }
    } catch (err: any) {
      setErrorMsg('Failed to load warehouses');
    }
  };

  const checkForSavedSession = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.items && parsed.items.length > 0) {
          setSelectedWarehouseId(parsed.warehouseId || '');
          setSessionName(parsed.sessionName || 'Saved Stocktake Session');
          setItems(parsed.items || []);
          setIsSessionActive(true);
          setSuccessMsg('Restored previously saved active stocktake session from browser cache.');
        }
      }
    } catch (e) {
      console.error('Failed to restore saved stocktake session', e);
    }
  };

  const saveSessionToStorage = (updatedItems: StocktakeItem[]) => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          warehouseId: selectedWarehouseId,
          sessionName,
          items: updatedItems,
          updatedAt: new Date().toISOString(),
        }),
      );
    } catch (e) {
      console.error('Failed to save stocktake session to storage', e);
    }
  };

  const startNewStocktake = async () => {
    if (!selectedWarehouseId) {
      setErrorMsg('Please select a warehouse to start stocktake');
      return;
    }

    try {
      setIsLoadingItems(true);
      setErrorMsg(null);
      // Fetch all stock balances for this warehouse
      const res = await apiClient<any>(`/inventory/balances?warehouseId=${selectedWarehouseId}&limit=500`);
      const balances = res?.items || res?.balances || [];

      const stocktakeItems: StocktakeItem[] = balances.map((b: any) => ({
        variantId: b.variantId || b.variant?.id,
        sku: b.variant?.sku || 'UNKNOWN',
        barcode: b.variant?.barcode || b.variant?.sku || '',
        productName: b.variant?.product?.name || b.variant?.variantName || 'Item',
        variantName: b.variant?.variantName,
        category: b.variant?.product?.category?.name,
        unit: b.variant?.product?.unit || 'PCS',
        costPrice: Number(b.variant?.costPrice || 0),
        sellingPrice: Number(b.variant?.sellingPrice || 0),
        expectedQty: Number(b.quantityOnHand || 0),
        countedQty: Number(b.quantityOnHand || 0), // Pre-fill with expected baseline
        isCounted: false,
      }));

      setItems(stocktakeItems);
      setIsSessionActive(true);
      saveSessionToStorage(stocktakeItems);
      setSuccessMsg(`Loaded ${stocktakeItems.length} items from selected warehouse. Ready to count.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initialize stocktake session');
    } finally {
      setIsLoadingItems(false);
    }
  };

  // Barcode Scanning / Manual Search Handler
  const handleScanSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = scanInput.trim().toUpperCase();
    if (!query) return;

    let multiplier = 1;
    let target = query;

    // Check for "multiplier*barcode" syntax (e.g. 5*SKU-1002)
    if (query.includes('*')) {
      const parts = query.split('*');
      const mult = parseFloat(parts[0]);
      if (!isNaN(mult) && mult > 0 && parts[1]) {
        multiplier = mult;
        target = parts[1].trim();
      }
    }

    // Match by barcode, SKU, or exact name
    const matchIndex = items.findIndex(
      (item) =>
        item.barcode.toUpperCase() === target ||
        item.sku.toUpperCase() === target ||
        item.productName.toUpperCase() === target,
    );

    if (matchIndex >= 0) {
      const updated = [...items];
      const current = updated[matchIndex];
      // If first time counted, set directly to multiplier; if already counted, increment
      if (!current.isCounted) {
        current.countedQty = multiplier;
        current.isCounted = true;
      } else {
        current.countedQty = Math.round((current.countedQty + multiplier) * 1000) / 1000;
      }
      setItems(updated);
      saveSessionToStorage(updated);
      setLastScannedSku(current.sku);
      setScanInput('');
      setSuccessMsg(`Counted: ${current.productName} (${multiplier >= 1 ? `+${multiplier}` : multiplier}) → Total: ${current.countedQty}`);
    } else {
      setErrorMsg(`No item found matching barcode or SKU: "${target}"`);
      setScanInput('');
    }
  };

  const handleUpdateItemCount = (variantId: string, val: number) => {
    const updated = items.map((i) => {
      if (i.variantId === variantId) {
        return {
          ...i,
          countedQty: Math.max(0, val),
          isCounted: true,
        };
      }
      return i;
    });
    setItems(updated);
    saveSessionToStorage(updated);
  };

  const handleMarkItemMatched = (variantId: string) => {
    const updated = items.map((i) => {
      if (i.variantId === variantId) {
        return {
          ...i,
          countedQty: i.expectedQty,
          isCounted: true,
        };
      }
      return i;
    });
    setItems(updated);
    saveSessionToStorage(updated);
  };

  // Discrepancy & Valuation Computations
  const stats = useMemo(() => {
    let totalItems = items.length;
    let countedCount = 0;
    let matchedCount = 0;
    let shortageCount = 0;
    let overageCount = 0;
    let totalShortageValue = 0;
    let totalOverageValue = 0;

    items.forEach((item) => {
      if (item.isCounted) countedCount++;
      const diff = Math.round((item.countedQty - item.expectedQty) * 1000) / 1000;
      if (diff === 0) {
        matchedCount++;
      } else if (diff < 0) {
        shortageCount++;
        totalShortageValue += Math.abs(diff) * item.costPrice;
      } else {
        overageCount++;
        totalOverageValue += diff * item.costPrice;
      }
    });

    const netVarianceValue = totalOverageValue - totalShortageValue;

    return {
      totalItems,
      countedCount,
      matchedCount,
      shortageCount,
      overageCount,
      totalShortageValue,
      totalOverageValue,
      netVarianceValue,
    };
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Search query
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesSearch =
          item.productName.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.barcode.toLowerCase().includes(q);
        if (!matchesSearch) return false;
      }

      // Filter tabs
      const diff = Math.round((item.countedQty - item.expectedQty) * 1000) / 1000;
      if (activeFilter === 'DISCREPANCIES') return diff !== 0;
      if (activeFilter === 'MATCHED') return diff === 0;
      if (activeFilter === 'UNCOUNTED') return !item.isCounted;
      return true;
    });
  }, [items, searchQuery, activeFilter]);

  // Submit Reconciliation to Backend
  const handleExecuteReconciliation = async () => {
    const discrepancyItems = items.filter((i) => {
      const diff = Math.round((i.countedQty - i.expectedQty) * 1000) / 1000;
      return diff !== 0;
    });

    if (discrepancyItems.length === 0) {
      setErrorMsg('No stock discrepancies detected. All counted items match the system stock exactly!');
      setIsConfirmModalOpen(false);
      return;
    }

    try {
      setIsSubmittingReconciliation(true);
      setErrorMsg(null);

      const adjustmentPayload = {
        warehouseId: selectedWarehouseId,
        reason: `Physical Stocktake Audit Reconciliation: ${sessionName.trim()}`,
        items: discrepancyItems.map((i) => {
          const diff = Math.round((i.countedQty - i.expectedQty) * 1000) / 1000;
          return {
            variantId: i.variantId,
            type: diff > 0 ? ('POSITIVE' as const) : ('NEGATIVE' as const),
            quantity: Math.abs(diff),
          };
        }),
      };

      const res = await apiClient<any>('/inventory/adjustments', {
        method: 'POST',
        body: JSON.stringify(adjustmentPayload),
      });

      setReconciledResult(res);
      // Clear local storage session
      localStorage.removeItem(STORAGE_KEY);
      setIsConfirmModalOpen(false);
      setSuccessMsg(`Physical stocktake successfully reconciled! Adjustment voucher posted for ${discrepancyItems.length} items.`);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to post reconciliation adjustment');
    } finally {
      setIsSubmittingReconciliation(false);
    }
  };

  // CSV Audit Export
  const exportStocktakeCsv = () => {
    const headers = [
      'SKU',
      'Barcode',
      'Product Name',
      'Category',
      'Unit',
      'Expected Qty',
      'Counted Qty',
      'Variance',
      'Unit Cost (LKR)',
      'Variance Value (LKR)',
      'Status',
    ];

    const rows = items.map((i) => {
      const diff = Math.round((i.countedQty - i.expectedQty) * 1000) / 1000;
      const status = diff === 0 ? 'MATCH' : diff > 0 ? 'OVERAGE' : 'SHORTAGE';
      const val = (diff * i.costPrice).toFixed(2);
      return [
        `"${i.sku}"`,
        `"${i.barcode}"`,
        `"${i.productName}"`,
        `"${i.category || ''}"`,
        `"${i.unit}"`,
        i.expectedQty.toFixed(2),
        i.countedQty.toFixed(2),
        diff.toFixed(2),
        i.costPrice.toFixed(2),
        val,
        status,
      ];
    });

    const csv = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csv));
    link.setAttribute('download', `Stocktake_${sessionName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleResetSession = () => {
    if (window.confirm('Are you sure you want to discard this stocktake session? Any unsaved counts will be erased.')) {
      localStorage.removeItem(STORAGE_KEY);
      setItems([]);
      setIsSessionActive(false);
      setReconciledResult(null);
      setSuccessMsg(null);
      setErrorMsg(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/inventory"
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Link href="/inventory" className="hover:underline">
                Inventory
              </Link>
              <span>/</span>
              <span className="text-emerald-400 font-bold">Physical Stocktake</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <ScanLine className="w-6 h-6 text-emerald-400" />
              <span>Physical Stocktake & Inventory Audit</span>
            </h1>
          </div>
        </div>

        {isSessionActive && (
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={exportStocktakeCsv}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleResetSession}
              className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-slate-800 hover:bg-rose-950/80 border border-slate-700 hover:border-rose-800 text-slate-300 hover:text-rose-300 rounded-xl text-xs font-bold transition"
            >
              <RotateCcw className="w-4 h-4 text-rose-400" />
              <span>Reset Session</span>
            </button>

            <button
              type="button"
              onClick={() => setIsConfirmModalOpen(true)}
              disabled={items.length === 0}
              className="inline-flex items-center space-x-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-black shadow-xl shadow-emerald-900/30 transition"
            >
              <FileCheck2 className="w-4 h-4" />
              <span>Reconcile Stock ({stats.shortageCount + stats.overageCount} Discrepancies)</span>
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* STAGE 1: SETUP SESSION (When no session is active) */}
      {!isSessionActive && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sm:p-8 max-w-2xl mx-auto shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-2xl bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
              <WarehouseIcon className="w-6 h-6" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white">Initialize Stocktake Audit Session</h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
              Select a warehouse location to snapshot current system inventory balances and start physical barcode counting.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Target Warehouse Location
              </label>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code}) {w.isMain ? '• Main Hub' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Audit Session Name / Identifier
              </label>
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="e.g. End of Month Stocktake, Dairy & Beverage Count"
                className="w-full px-3 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              type="button"
              onClick={startNewStocktake}
              disabled={isLoadingItems || !selectedWarehouseId}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-lg shadow-emerald-900/40 transition flex items-center justify-center space-x-2"
            >
              {isLoadingItems ? (
                <span>Loading Warehouse Stock Snapshot...</span>
              ) : (
                <>
                  <ScanLine className="w-5 h-5" />
                  <span>Start Counting Station</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STAGE 2: ACTIVE COUNTING STATION */}
      {isSessionActive && (
        <div className="space-y-6">
          {/* Quick Barcode Scanner Input Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg">
            <form onSubmit={handleScanSubmit} className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Barcode className="w-5 h-5 text-emerald-400 absolute left-3.5 top-3" />
                <input
                  ref={scanInputRef}
                  type="text"
                  placeholder="Scan item barcode with handheld scanner or type SKU and hit Enter..."
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-emerald-900/30 transition flex items-center justify-center space-x-2"
              >
                <span>Add Count (+1)</span>
              </button>
            </form>

            <div className="flex flex-wrap items-center justify-between gap-2 mt-2.5 text-[11px] text-slate-400 px-1">
              <span>Tip: Enter <code className="text-emerald-400 font-mono">10*SKU</code> to count 10 units at once</span>
              {lastScannedSku && (
                <span className="text-emerald-400 font-mono font-bold">
                  Last Scanned: {lastScannedSku}
                </span>
              )}
            </div>
          </div>

          {/* Real-time KPI Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Items Counted</div>
              <div className="text-xl sm:text-2xl font-black text-white mt-1">
                {stats.countedCount} <span className="text-xs font-normal text-slate-400">/ {stats.totalItems}</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {stats.totalItems > 0 ? `${Math.round((stats.countedCount / stats.totalItems) * 100)}% audit progress` : '0%'}
              </div>
            </div>

            <div className="bg-slate-900 border border-emerald-900/60 rounded-xl p-4 shadow-sm">
              <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Exact Matches</div>
              <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-1">
                {stats.matchedCount}
              </div>
              <div className="text-[10px] text-emerald-500/70 mt-0.5">Zero variance verified</div>
            </div>

            <div className="bg-slate-900 border border-rose-900/60 rounded-xl p-4 shadow-sm">
              <div className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Shortage (Shrinkage)</div>
              <div className="text-xl sm:text-2xl font-black text-rose-400 mt-1">
                {stats.shortageCount} <span className="text-xs font-normal text-rose-400/80">items</span>
              </div>
              <div className="text-[10px] text-rose-400/70 mt-0.5">
                -LKR {stats.totalShortageValue.toFixed(2)}
              </div>
            </div>

            <div className="bg-slate-900 border border-blue-900/60 rounded-xl p-4 shadow-sm">
              <div className="text-[11px] font-semibold text-blue-400 uppercase tracking-wider">Overage (Stock Gain)</div>
              <div className="text-xl sm:text-2xl font-black text-blue-400 mt-1">
                {stats.overageCount} <span className="text-xs font-normal text-blue-400/80">items</span>
              </div>
              <div className="text-[10px] text-blue-400/70 mt-0.5">
                +LKR {stats.totalOverageValue.toFixed(2)}
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Net Discrepancy</div>
              <div className={`text-xl sm:text-2xl font-black font-mono mt-1 ${stats.netVarianceValue < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                LKR {stats.netVarianceValue.toFixed(2)}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                {stats.netVarianceValue < 0 ? 'Net inventory shrinkage' : 'Net inventory surplus'}
              </div>
            </div>
          </div>

          {/* Interactive Count Sheet Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm space-y-3">
            {/* Table Filter Strip */}
            <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    activeFilter === 'ALL'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({items.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('DISCREPANCIES')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    activeFilter === 'DISCREPANCIES'
                      ? 'bg-rose-950 text-rose-300 border border-rose-800 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Discrepancies ({stats.shortageCount + stats.overageCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('MATCHED')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    activeFilter === 'MATCHED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Matched ({stats.matchedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveFilter('UNCOUNTED')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition ${
                    activeFilter === 'UNCOUNTED'
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Uncounted ({items.length - stats.countedCount})
                </button>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Filter sheet items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                  <tr>
                    <th className="py-3 px-4">Item & SKU</th>
                    <th className="py-3 px-4">Barcode</th>
                    <th className="py-3 px-4 text-right">System Expected</th>
                    <th className="py-3 px-4 text-center">Physical Count</th>
                    <th className="py-3 px-4 text-right">Variance</th>
                    <th className="py-3 px-4 text-right">Variance Value</th>
                    <th className="py-3 px-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 italic">
                        No items found matching the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => {
                      const diff = Math.round((item.countedQty - item.expectedQty) * 1000) / 1000;
                      const isMatch = diff === 0;
                      const isOverage = diff > 0;
                      const varianceValue = diff * item.costPrice;

                      return (
                        <tr
                          key={item.variantId}
                          className={`hover:bg-slate-850 transition ${
                            lastScannedSku === item.sku ? 'bg-emerald-950/30' : ''
                          }`}
                        >
                          <td className="py-3 px-4 font-sans">
                            <Link
                              href={`/inventory/${item.variantId}`}
                              className="font-bold text-white hover:text-blue-400 transition"
                            >
                              {item.productName}
                            </Link>
                            <div className="text-[10px] text-slate-400 font-mono">
                              SKU: {item.sku} {item.variantName && `• ${item.variantName}`}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {item.barcode || '—'}
                          </td>

                          <td className="py-3 px-4 text-right font-bold text-slate-300">
                            {item.expectedQty.toFixed(2)} <span className="text-[10px] text-slate-500">{item.unit}</span>
                          </td>

                          <td className="py-3 px-4 text-center">
                            <div className="inline-flex items-center space-x-1 bg-slate-950 border border-slate-800 rounded-lg p-1">
                              <button
                                type="button"
                                onClick={() => handleUpdateItemCount(item.variantId, item.countedQty - 1)}
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                step="0.001"
                                min="0"
                                value={item.countedQty}
                                onChange={(e) => handleUpdateItemCount(item.variantId, parseFloat(e.target.value) || 0)}
                                className="w-16 text-center font-mono text-xs font-bold bg-transparent text-white focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateItemCount(item.variantId, item.countedQty + 1)}
                                className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold"
                              >
                                +
                              </button>
                            </div>
                          </td>

                          <td className={`py-3 px-4 text-right font-black ${
                            isMatch
                              ? 'text-slate-400'
                              : isOverage
                              ? 'text-blue-400'
                              : 'text-rose-400'
                          }`}>
                            {diff > 0 ? `+${diff.toFixed(2)}` : diff.toFixed(2)}
                          </td>

                          <td className={`py-3 px-4 text-right font-bold ${
                            isMatch
                              ? 'text-slate-500'
                              : isOverage
                              ? 'text-blue-400'
                              : 'text-rose-400'
                          }`}>
                            LKR {varianceValue.toFixed(2)}
                          </td>

                          <td className="py-3 px-4 text-center font-sans">
                            {isMatch ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                Match
                              </span>
                            ) : isOverage ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-800">
                                + Overage
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                - Shortage
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRMATION & RECONCILIATION MODAL */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-4">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Confirm Stocktake Reconciliation</h3>
                <p className="text-xs text-slate-400">{sessionName}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-300">
              <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Total Items in Session:</span>
                  <strong className="text-white font-mono">{stats.totalItems}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Items with Exact Match:</span>
                  <strong className="text-emerald-400 font-mono">{stats.matchedCount}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Items with Shortage (Shrinkage):</span>
                  <strong className="text-rose-400 font-mono">{stats.shortageCount} (-LKR {stats.totalShortageValue.toFixed(2)})</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Items with Overage (Surplus):</span>
                  <strong className="text-blue-400 font-mono">{stats.overageCount} (+LKR {stats.totalOverageValue.toFixed(2)})</strong>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between font-bold">
                  <span className="text-white">Net Financial Discrepancy:</span>
                  <span className={`font-mono ${stats.netVarianceValue < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                    LKR {stats.netVarianceValue.toFixed(2)}
                  </span>
                </div>
              </div>

              <p className="text-slate-400">
                Clicking <strong>Post Reconciliation</strong> will atomically create an adjustment voucher on the backend, update stock balances to match physical counts, and record audit ledger movements.
              </p>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsConfirmModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecuteReconciliation}
                  disabled={isSubmittingReconciliation}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/30 transition flex items-center space-x-1.5"
                >
                  {isSubmittingReconciliation ? (
                    <span>Posting Adjustment...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Post Reconciliation</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
