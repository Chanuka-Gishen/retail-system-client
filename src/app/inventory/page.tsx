'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Plus,
  RefreshCw,
  X,
  Check,
  AlertCircle,
  Warehouse,
  ArrowUpDown,
  Layers,
  Clock,
  Edit2,
  Search,
  AlertTriangle,
  Printer,
  ScanLine,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../lib/auth-store';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { EmptyState } from '../../components/EmptyState';

export default function InventoryPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'BALANCES' | 'BATCHES'>('BALANCES');
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');
  const [variantsList, setVariantsList] = useState<any[]>([]);

  // Balances state
  const [balances, setBalances] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Batches state
  const [batches, setBatches] = useState<any[]>([]);
  const [batchesSummary, setBatchesSummary] = useState<any>(null);
  const [batchStatusFilter, setBatchStatusFilter] = useState<'ALL' | 'HEALTHY' | 'NEAR_EXPIRY' | 'EXPIRED'>('ALL');
  const [batchSearch, setBatchSearch] = useState('');
  const [batchPage, setBatchPage] = useState(1);
  const [batchLimit, setBatchLimit] = useState(20);
  const [batchTotalPages, setBatchTotalPages] = useState(1);
  const [batchTotalItems, setBatchTotalItems] = useState(0);
  const [isBatchesLoading, setIsBatchesLoading] = useState(false);

  // New Batch Modal state
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
  const [newBatchWhId, setNewBatchWhId] = useState('');
  const [newBatchVarId, setNewBatchVarId] = useState('');
  const [newBatchNo, setNewBatchNo] = useState('');
  const [newBatchCost, setNewBatchCost] = useState('');
  const [newBatchPrice, setNewBatchPrice] = useState('');
  const [newBatchQty, setNewBatchQty] = useState('100');
  const [newBatchMfd, setNewBatchMfd] = useState('');
  const [newBatchExp, setNewBatchExp] = useState('');
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);

  // Edit Batch Modal state
  const [editingBatch, setEditingBatch] = useState<any | null>(null);
  const [editPrice, setEditPrice] = useState('');
  const [editCost, setEditCost] = useState('');
  const [editExp, setEditExp] = useState('');
  const [isUpdatingBatch, setIsUpdatingBatch] = useState(false);

  // Adjustment Modal state
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjWarehouseId, setAdjWarehouseId] = useState('');
  const [adjVariantId, setAdjVariantId] = useState('');
  const [adjType, setAdjType] = useState<'POSITIVE' | 'NEGATIVE'>('POSITIVE');
  const [adjQuantity, setAdjQuantity] = useState('10');
  const [adjReason, setAdjReason] = useState('Cycle count stock update');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Auth Guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // 2. Fetch Warehouses and Variants
  const fetchWarehouses = async () => {
    try {
      const whs = await apiClient<any[]>('/merchant/warehouses');
      setWarehouses(whs || []);
      if (whs && whs.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(whs[0].id);
        setAdjWarehouseId(whs[0].id);
        setNewBatchWhId(whs[0].id);
      }
    } catch (err: any) {
      console.warn('Warehouse fetch error:', err);
    }
  };

  const fetchVariants = async () => {
    try {
      const res = await apiClient<any>('/catalog/products?limit=100');
      const prods = res?.items || res || [];
      const allVars: any[] = [];
      prods.forEach((p: any) => {
        (p.variants || []).forEach((v: any) => {
          allVars.push({
            ...v,
            productName: p.name,
          });
        });
      });
      setVariantsList(allVars);
      if (allVars.length > 0 && !adjVariantId) {
        setAdjVariantId(allVars[0].id);
        setNewBatchVarId(allVars[0].id);
        setNewBatchPrice(String(allVars[0].sellingPrice || 0));
        setNewBatchCost(String(allVars[0].costPrice || 0));
      }
    } catch {
      // ignore
    }
  };

  // 3. Fetch Balances
  const fetchBalances = async () => {
    if (!selectedWarehouseId) return;
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const q = new URLSearchParams();
      q.set('warehouseId', selectedWarehouseId);
      q.set('page', String(page));
      q.set('limit', String(limit));

      const res = await apiClient<any>(`/inventory/balances?${q.toString()}`);
      setBalances(res?.items || (Array.isArray(res) ? res : []));
      setSummary(res?.summary || null);
      if (res?.meta) {
        setTotalPages(res.meta.totalPages || 1);
        setTotalItems(res.meta.total || 0);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load inventory balances');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Fetch Batches
  const fetchBatches = async () => {
    setIsBatchesLoading(true);
    setErrorMsg(null);
    try {
      const q = new URLSearchParams();
      if (selectedWarehouseId) q.set('warehouseId', selectedWarehouseId);
      if (batchStatusFilter !== 'ALL') q.set('status', batchStatusFilter);
      if (batchSearch.trim()) q.set('search', batchSearch.trim());
      q.set('page', String(batchPage));
      q.set('limit', String(batchLimit));

      const res = await apiClient<any>(`/inventory/batches?${q.toString()}`);
      setBatches(res?.items || []);
      setBatchesSummary(res?.summary || null);
      if (res?.meta) {
        setBatchTotalPages(res.meta.totalPages || 1);
        setBatchTotalItems(res.meta.total || 0);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load product batches');
    } finally {
      setIsBatchesLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
    setBatchPage(1);
  }, [selectedWarehouseId]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchWarehouses();
      fetchVariants();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && selectedWarehouseId) {
      if (activeTab === 'BALANCES') {
        fetchBalances();
      } else {
        fetchBatches();
      }
    }
  }, [selectedWarehouseId, page, limit, batchPage, batchLimit, batchStatusFilter, activeTab, isAuthenticated]);

  // Submit Stock Adjustment
  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjWarehouseId || !adjVariantId) {
      setErrorMsg('Please select a warehouse and variant');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const qty = parseFloat(adjQuantity);
      await apiClient('/inventory/adjustments', {
        method: 'POST',
        body: {
          warehouseId: adjWarehouseId,
          reason: adjReason.trim() || 'Inventory adjustment',
          items: [
            {
              variantId: adjVariantId,
              type: adjType,
              quantity: qty,
            },
          ],
        },
      });

      setSuccessMsg(`Stock adjustment of ${adjType === 'POSITIVE' ? '+' : '-'}${qty} units recorded successfully!`);
      setIsAdjustmentModalOpen(false);
      await fetchBalances();
    } catch (err: any) {
      setErrorMsg(err.message || 'Stock adjustment failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Create New Batch
  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchWhId || !newBatchVarId || !newBatchNo.trim()) {
      setErrorMsg('Please fill in all required batch fields');
      return;
    }
    setIsCreatingBatch(true);
    setErrorMsg(null);

    try {
      await apiClient('/inventory/batches', {
        method: 'POST',
        body: {
          warehouseId: newBatchWhId,
          variantId: newBatchVarId,
          batchNumber: newBatchNo.trim(),
          costPrice: parseFloat(newBatchCost) || 0,
          sellingPrice: parseFloat(newBatchPrice) || 0,
          quantityReceived: parseFloat(newBatchQty) || 0,
          quantityOnHand: parseFloat(newBatchQty) || 0,
          manufacturingDate: newBatchMfd ? new Date(newBatchMfd).toISOString() : undefined,
          expiryDate: newBatchExp ? new Date(newBatchExp).toISOString() : undefined,
        },
      });

      setSuccessMsg(`Batch "${newBatchNo.trim()}" created successfully with ${newBatchQty} units!`);
      setIsNewBatchModalOpen(false);
      setNewBatchNo('');
      await fetchBatches();
      await fetchBalances();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create product batch');
    } finally {
      setIsCreatingBatch(false);
    }
  };

  // Submit Edit Batch
  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;
    setIsUpdatingBatch(true);
    setErrorMsg(null);

    try {
      await apiClient(`/inventory/batches/${editingBatch.id}`, {
        method: 'PATCH',
        body: {
          sellingPrice: parseFloat(editPrice) || Number(editingBatch.sellingPrice),
          costPrice: parseFloat(editCost) || Number(editingBatch.costPrice),
          expiryDate: editExp ? new Date(editExp).toISOString() : undefined,
        },
      });

      setSuccessMsg(`Batch #${editingBatch.batchNumber} updated successfully!`);
      setEditingBatch(null);
      await fetchBatches();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update batch');
    } finally {
      setIsUpdatingBatch(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Inventory & Batch Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time warehouse stock, FIFO/FEFO expiry date tracking, and unique batch pricing
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Warehouse Selector */}
          {warehouses.length > 0 && (
            <div className="flex items-center space-x-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2">
              <Warehouse className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-slate-400 font-semibold">Warehouse:</span>
              <select
                value={selectedWarehouseId}
                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                className="bg-transparent text-white text-xs font-semibold focus:outline-none"
              >
                {warehouses.map((wh) => (
                  <option key={wh.id} value={wh.id} className="bg-slate-900 text-white">
                    {wh.name} ({wh.code})
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={() => (activeTab === 'BALANCES' ? fetchBalances() : fetchBatches())}
            disabled={isLoading || isBatchesLoading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition"
            title="Refresh Stock"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading || isBatchesLoading ? 'animate-spin' : ''}`} />
          </button>

          <Link
            href="/inventory/labels"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-3.5 rounded-xl flex items-center space-x-1.5 transition text-xs sm:text-sm shadow-md shadow-indigo-900/30"
            title="Generate and print barcode stickers and shelf price tags"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Barcode & Labels</span>
          </Link>

          <Link
            href="/inventory/stocktake"
            className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 font-bold py-2.5 px-3.5 rounded-xl flex items-center space-x-1.5 transition text-xs sm:text-sm"
            title="Perform physical barcode inventory stock counting"
          >
            <ScanLine className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Stocktake Audit</span>
          </Link>

          {activeTab === 'BALANCES' ? (
            <button
              onClick={() => {
                setAdjWarehouseId(selectedWarehouseId || (warehouses[0]?.id ?? ''));
                setIsAdjustmentModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center space-x-2 transition text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>New Adjustment</span>
            </button>
          ) : (
            <button
              onClick={() => {
                setNewBatchWhId(selectedWarehouseId || (warehouses[0]?.id ?? ''));
                setIsNewBatchModalOpen(true);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center space-x-2 transition text-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Create Batch</span>
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('BALANCES')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'BALANCES'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Warehouse className="w-4 h-4" />
          <span>Warehouse Stock Balances</span>
        </button>

        <button
          onClick={() => setActiveTab('BATCHES')}
          className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
            activeTab === 'BATCHES'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Batches & Expiry Tracking</span>
          {batchesSummary?.nearExpiryCount > 0 && (
            <span className="bg-amber-900 text-amber-300 text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-amber-700">
              {batchesSummary.nearExpiryCount}
            </span>
          )}
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {errorMsg && (
        <div className="p-3.5 bg-rose-950 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* TAB 1: STOCK BALANCES */}
      {activeTab === 'BALANCES' && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          {summary && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 uppercase font-semibold">Total On-Hand Units</div>
                <div className="text-xl font-black text-emerald-400 mt-1">
                  {Number(summary.totalUnitsOnHand || 0).toLocaleString()}
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 uppercase font-semibold">Total Stock Valuation</div>
                <div className="text-xl font-black text-white mt-1">
                  LKR {Number(summary.totalInventoryValuation || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          )}

          {/* Stock Balances Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Variant SKU</th>
                    <th className="py-3 px-4">Product Name</th>
                    <th className="py-3 px-4 text-right">Quantity On Hand</th>
                    <th className="py-3 px-4 text-right">Allocated</th>
                    <th className="py-3 px-4 text-right">Available for Sale</th>
                    <th className="py-3 px-4 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {isLoading ? (
                    <TableSkeleton columns={6} rows={6} theme="dark" />
                  ) : balances.length === 0 ? (
                    <EmptyState
                      colSpan={6}
                      theme="dark"
                      icon={Warehouse}
                      isSearchActive={false}
                      title="No stock records in this warehouse"
                      description="This warehouse doesn’t have any recorded stock balances yet. Create a stock adjustment or post a GRN to add stock."
                      actionLabel="New Adjustment"
                      onAction={() => setIsAdjustmentModalOpen(true)}
                    />
                  ) : (
                    balances.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-850 transition">
                        <td className="py-3 px-4 font-mono font-medium">
                          <Link
                            href={`/inventory/${b.variant?.id}`}
                            className="text-blue-400 hover:text-blue-300 hover:underline"
                          >
                            {b.variant?.sku}
                          </Link>
                        </td>
                        <td className="py-3 px-4 font-semibold text-white">
                          <Link
                            href={`/inventory/${b.variant?.id}`}
                            className="hover:text-blue-400 transition"
                          >
                            {b.variant?.product?.name || b.variant?.variantName}
                          </Link>
                          {b.variant?.variantName && (
                            <div className="text-[10px] text-slate-400 font-normal">
                              {b.variant.variantName}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">
                          {Number(b.quantityOnHand).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-400">
                          {Number(b.quantityAllocated).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-extrabold text-emerald-400">
                          {Number(b.quantityAvailable).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <Link
                            href={`/inventory/${b.variant?.id}`}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-xs font-semibold transition"
                          >
                            <span>View Item</span>
                            <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              totalItems={totalItems}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={setLimit}
              isLoading={isLoading}
            />
          </div>
        </div>
      )}

      {/* TAB 2: BATCHES & EXPIRY TRACKING */}
      {activeTab === 'BATCHES' && (
        <div className="space-y-6">
          {/* Batches KPI Metrics */}
          {batchesSummary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <div className="text-xs text-slate-400 uppercase font-semibold">Total Batches</div>
                <div className="text-xl font-black text-white mt-1">{batchesSummary.totalBatches}</div>
              </div>
              <div className="bg-slate-900 border border-emerald-800 rounded-xl p-4">
                <div className="text-xs text-emerald-400 uppercase font-semibold">Healthy Batches</div>
                <div className="text-xl font-black text-emerald-400 mt-1">{batchesSummary.healthyCount}</div>
              </div>
              <div className="bg-slate-900 border border-amber-800 rounded-xl p-4">
                <div className="text-xs text-amber-400 uppercase font-semibold">Near Expiry (≤30d)</div>
                <div className="text-xl font-black text-amber-400 mt-1">{batchesSummary.nearExpiryCount}</div>
              </div>
              <div className="bg-slate-900 border border-rose-800 rounded-xl p-4">
                <div className="text-xs text-rose-400 uppercase font-semibold">Expired Batches</div>
                <div className="text-xl font-black text-rose-400 mt-1">{batchesSummary.expiredCount}</div>
              </div>
            </div>
          )}

          {/* Filter Pills and Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0">
              {(
                [
                  { id: 'ALL', label: 'All Batches', count: batchesSummary?.totalBatches },
                  { id: 'HEALTHY', label: 'Healthy (>30d)', count: batchesSummary?.healthyCount },
                  { id: 'NEAR_EXPIRY', label: 'Near Expiry (≤30d)', count: batchesSummary?.nearExpiryCount },
                  { id: 'EXPIRED', label: 'Expired', count: batchesSummary?.expiredCount },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setBatchStatusFilter(tab.id);
                    setBatchPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 whitespace-nowrap ${
                    batchStatusFilter === tab.id
                      ? tab.id === 'EXPIRED'
                        ? 'bg-rose-900 text-rose-200 border border-rose-700'
                        : tab.id === 'NEAR_EXPIRY'
                        ? 'bg-amber-900 text-amber-200 border border-amber-700'
                        : 'bg-blue-600 text-white'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="text-[10px] bg-black/30 px-1.5 py-0.2 rounded-full">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search batch # or SKU..."
                value={batchSearch}
                onChange={(e) => setBatchSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setBatchPage(1);
                    fetchBatches();
                  }
                }}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* Batches Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-4">Product & SKU</th>
                    <th className="py-3 px-4 text-right">Cost Price</th>
                    <th className="py-3 px-4 text-right">Selling Price</th>
                    <th className="py-3 px-4 text-right">On Hand</th>
                    <th className="py-3 px-4">Expiry Date</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {isBatchesLoading ? (
                    <TableSkeleton columns={8} rows={6} theme="dark" />
                  ) : batches.length === 0 ? (
                    <EmptyState
                      colSpan={8}
                      theme="dark"
                      icon={Layers}
                      isSearchActive={!!batchSearch}
                      title="No product batches found"
                      description="No batches match your filter. Batches are automatically created when Goods Received Notes (GRN) are posted, or you can record opening batches manually."
                      actionLabel="Create Opening Batch"
                      onAction={() => setIsNewBatchModalOpen(true)}
                    />
                  ) : (
                    batches.map((b) => {
                      const now = new Date();
                      const daysLeft = b.expiryDate
                        ? Math.ceil((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                        : null;
                      const isExpired = daysLeft !== null && daysLeft <= 0;
                      const isNearExpiry = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;

                      return (
                        <tr key={b.id} className="hover:bg-slate-850 transition">
                          <td className="py-3 px-4 font-mono font-bold text-blue-400">
                            #{b.batchNumber}
                          </td>
                          <td className="py-3 px-4">
                            <Link
                              href={`/inventory/${b.variant?.id}`}
                              className="font-semibold text-white hover:text-blue-400 transition"
                            >
                              {b.variant?.product?.name || b.variant?.variantName}
                            </Link>
                            <div className="text-[10px] text-slate-400 font-mono">
                              <Link
                                href={`/inventory/${b.variant?.id}`}
                                className="hover:underline hover:text-blue-300"
                              >
                                {b.variant?.sku}
                              </Link>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300">
                            LKR {Number(b.costPrice).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400">
                            LKR {Number(b.sellingPrice).toFixed(2)}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-white">
                            {Number(b.quantityOnHand).toFixed(2)}
                          </td>
                          <td className="py-3 px-4">
                            {b.expiryDate ? (
                              <div className="space-y-0.5">
                                <div className="font-mono text-slate-300">
                                  {new Date(b.expiryDate).toISOString().slice(0, 10)}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {daysLeft !== null && daysLeft > 0 ? `${daysLeft} days remaining` : 'Expired'}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">No expiry</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {isExpired ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                <AlertTriangle className="w-2.5 h-2.5" />
                                <span>Expired</span>
                              </span>
                            ) : isNearExpiry ? (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                                <Clock className="w-2.5 h-2.5" />
                                <span>Near Expiry</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                <Check className="w-2.5 h-2.5" />
                                <span>Healthy</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBatch(b);
                                setEditPrice(String(b.sellingPrice));
                                setEditCost(String(b.costPrice));
                                setEditExp(b.expiryDate ? new Date(b.expiryDate).toISOString().slice(0, 10) : '');
                              }}
                              className="text-slate-400 hover:text-blue-400 p-1.5 rounded-lg hover:bg-slate-800 transition"
                              title="Edit batch selling price and expiry date"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              currentPage={batchPage}
              totalPages={batchTotalPages}
              totalItems={batchTotalItems}
              limit={batchLimit}
              onPageChange={setBatchPage}
              onLimitChange={setBatchLimit}
              isLoading={isBatchesLoading}
            />
          </div>
        </div>
      )}

      {/* MODAL: CREATE OPENING BATCH */}
      {isNewBatchModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-emerald-400" />
                <h2 className="text-lg font-bold text-white">Record Opening Product Batch</h2>
              </div>
              <button onClick={() => setIsNewBatchModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Warehouse *
                </label>
                <select
                  required
                  value={newBatchWhId}
                  onChange={(e) => setNewBatchWhId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Variant *
                </label>
                <select
                  required
                  value={newBatchVarId}
                  onChange={(e) => {
                    setNewBatchVarId(e.target.value);
                    const v = variantsList.find((item) => item.id === e.target.value);
                    if (v) {
                      setNewBatchPrice(String(v.sellingPrice || ''));
                      setNewBatchCost(String(v.costPrice || ''));
                    }
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs"
                >
                  {variantsList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.productName} ({v.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Batch Number *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BAT-2026-001"
                    value={newBatchNo}
                    onChange={(e) => setNewBatchNo(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Initial Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    min="0.001"
                    value={newBatchQty}
                    onChange={(e) => setNewBatchQty(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Batch Cost Price (LKR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newBatchCost}
                    onChange={(e) => setNewBatchCost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Batch Selling Price (LKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    min="0"
                    value={newBatchPrice}
                    onChange={(e) => setNewBatchPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Manufacturing Date
                  </label>
                  <input
                    type="date"
                    value={newBatchMfd}
                    onChange={(e) => setNewBatchMfd(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Expiry Date
                  </label>
                  <input
                    type="date"
                    value={newBatchExp}
                    onChange={(e) => setNewBatchExp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewBatchModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingBatch}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 px-5 rounded-xl text-xs transition"
                >
                  {isCreatingBatch ? 'Creating Batch...' : 'Create Batch'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT BATCH */}
      {editingBatch && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-base font-bold text-white">Edit Batch #{editingBatch.batchNumber}</h2>
                <p className="text-xs text-slate-400">
                  {editingBatch.variant?.product?.name || editingBatch.variant?.sku}
                </p>
              </div>
              <button onClick={() => setEditingBatch(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateBatch} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Batch Selling Price (LKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Batch Cost Price (LKR)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editCost}
                  onChange={(e) => setEditCost(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={editExp}
                  onChange={(e) => setEditExp(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditingBatch(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdatingBatch}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 px-5 rounded-xl text-xs transition"
                >
                  {isUpdatingBatch ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: STOCK ADJUSTMENT */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <ArrowUpDown className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold text-white">New Stock Adjustment</h2>
              </div>
              <button onClick={() => setIsAdjustmentModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Warehouse *
                </label>
                <select
                  required
                  value={adjWarehouseId}
                  onChange={(e) => setAdjWarehouseId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  {warehouses.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({w.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Variant *
                </label>
                <select
                  required
                  value={adjVariantId}
                  onChange={(e) => setAdjVariantId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                >
                  {variantsList.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.productName} ({v.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Adjustment Direction *
                  </label>
                  <select
                    value={adjType}
                    onChange={(e: any) => setAdjType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="POSITIVE">Positive (+ Increase Stock)</option>
                    <option value="NEGATIVE">Negative (- Reduce Stock)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    required
                    min="0.001"
                    value={adjQuantity}
                    onChange={(e) => setAdjQuantity(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason / Notes *
                </label>
                <textarea
                  required
                  rows={2}
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-2 px-5 rounded-xl text-xs transition"
                >
                  {isSubmitting ? 'Recording...' : 'Apply Stock Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
