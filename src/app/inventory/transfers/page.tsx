'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  Warehouse,
  ArrowRight,
  Package,
  AlertTriangle,
  X,
  Trash2,
  Check,
  Send,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../lib/auth-store';
import { Pagination } from '../../../components/Pagination';
import { TableSkeleton } from '../../../components/TableSkeleton';
import { EmptyState } from '../../../components/EmptyState';

interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  branchId?: string;
}

interface TransferItem {
  id: string;
  variantId: string;
  quantitySent: number;
  quantityReceived: number;
  variant: {
    id: string;
    sku: string;
    barcode?: string;
    costPrice: number;
    product: {
      id: string;
      name: string;
      unit: string;
    };
  };
}

interface StockTransfer {
  id: string;
  transferNumber: string;
  sourceWarehouseId: string;
  destinationWarehouseId: string;
  status: 'DRAFT' | 'IN_TRANSIT' | 'RECEIVED' | 'CANCELLED';
  notes?: string;
  createdAt: string;
  updatedAt: string;
  sourceWarehouse: WarehouseItem;
  destinationWarehouse: WarehouseItem;
  items: TransferItem[];
}

export default function StockTransfersPage() {
  const { isAuthenticated } = useAuthStore();

  // Transfers & Filters state
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Warehouses and Catalog Variants for creation
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [catalogVariants, setCatalogVariants] = useState<any[]>([]);

  // Create Modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [sourceWarehouseId, setSourceWarehouseId] = useState('');
  const [destWarehouseId, setDestWarehouseId] = useState('');
  const [transferNotes, setTransferNotes] = useState('');
  const [createItems, setCreateItems] = useState<Array<{ variantId: string; quantitySent: number }>>([
    { variantId: '', quantitySent: 1 },
  ]);
  const [createError, setCreateError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail & Action Drawer state
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [receiveInputs, setReceiveInputs] = useState<Record<string, number>>({});
  const [receiveNotes, setReceiveNotes] = useState('');

  // Initial Load
  useEffect(() => {
    if (isAuthenticated) {
      loadWarehouses();
      loadVariants();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadTransfers();
    }
  }, [isAuthenticated, page, limit, statusFilter, searchQuery]);

  const loadWarehouses = async () => {
    try {
      const res = await apiClient<WarehouseItem[] | { items: WarehouseItem[] }>('/merchant/warehouses');
      const list = Array.isArray(res) ? res : res?.items || [];
      setWarehouses(list);
      if (list.length >= 2) {
        setSourceWarehouseId(list[0]?.id || '');
        setDestWarehouseId(list[1]?.id || '');
      }
    } catch (e: any) {
      console.warn('Could not load warehouses:', e.message);
    }
  };

  const loadVariants = async () => {
    try {
      const res = await apiClient<any>('/catalog/variants?limit=150');
      const list = res?.items || (Array.isArray(res) ? res : []);
      setCatalogVariants(list);
    } catch {
      // fallback
    }
  };

  const loadTransfers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (searchQuery.trim()) params.append('search', searchQuery.trim());

      const res = await apiClient<{ items: StockTransfer[]; meta: any }>(
        `/inventory/transfers?${params.toString()}`
      );
      if (res && res.items) {
        setTransfers(res.items);
        setTotal(res.meta?.total || res.items.length);
        setTotalPages(res.meta?.totalPages || 1);
      }
    } catch (e: any) {
      console.warn('Failed to load transfers:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const drafts = transfers.filter((t) => t.status === 'DRAFT').length;
    const inTransit = transfers.filter((t) => t.status === 'IN_TRANSIT').length;
    const received = transfers.filter((t) => t.status === 'RECEIVED').length;
    return { drafts, inTransit, received, total: transfers.length };
  }, [transfers]);

  // Handle Create Transfer
  const handleAddCreateRow = () => {
    setCreateItems([...createItems, { variantId: '', quantitySent: 1 }]);
  };

  const handleRemoveCreateRow = (idx: number) => {
    if (createItems.length <= 1) return;
    setCreateItems(createItems.filter((_, i) => i !== idx));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateError(null);

    if (sourceWarehouseId === destWarehouseId) {
      setCreateError('Source and Destination warehouses cannot be the same.');
      return;
    }

    const validItems = createItems.filter((i) => i.variantId && i.quantitySent > 0);
    if (validItems.length === 0) {
      setCreateError('Please select at least one product variant with a quantity greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient('/inventory/transfers', {
        method: 'POST',
        body: JSON.stringify({
          sourceWarehouseId,
          destinationWarehouseId: destWarehouseId,
          notes: transferNotes.trim() || undefined,
          items: validItems,
        }),
      });

      setIsCreateModalOpen(false);
      setTransferNotes('');
      setCreateItems([{ variantId: '', quantitySent: 1 }]);
      setPage(1);
      await loadTransfers();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create transfer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Dispatch Transfer
  const handleDispatch = async (transferId: string) => {
    if (!confirm('Are you sure you want to dispatch this transfer? Stock will be atomically deducted from the source warehouse and marked IN_TRANSIT.')) {
      return;
    }

    try {
      await apiClient(`/inventory/transfers/${transferId}/dispatch`, {
        method: 'POST',
      });
      await loadTransfers();
      if (selectedTransfer?.id === transferId) {
        const updated = await apiClient<StockTransfer>(`/inventory/transfers/${transferId}`);
        setSelectedTransfer(updated);
      }
    } catch (err: any) {
      alert(`Dispatch failed: ${err.message}`);
    }
  };

  // Handle Cancel Transfer
  const handleCancel = async (transferId: string) => {
    const reason = prompt('Please enter a cancellation reason:');
    if (reason === null) return;

    try {
      await apiClient(`/inventory/transfers/${transferId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ notes: reason || 'Cancelled by manager' }),
      });
      await loadTransfers();
      if (selectedTransfer?.id === transferId) {
        const updated = await apiClient<StockTransfer>(`/inventory/transfers/${transferId}`);
        setSelectedTransfer(updated);
      }
    } catch (err: any) {
      alert(`Cancellation failed: ${err.message}`);
    }
  };

  // Open Receive Modal
  const handleOpenReceive = (transfer: StockTransfer) => {
    const initialInputs: Record<string, number> = {};
    transfer.items.forEach((item) => {
      initialInputs[item.variantId] = item.quantitySent;
    });
    setReceiveInputs(initialInputs);
    setReceiveNotes('');
    setIsReceiveModalOpen(true);
  };

  // Submit Receive
  const handleReceiveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTransfer) return;

    const payloadItems = selectedTransfer.items.map((i) => ({
      variantId: i.variantId,
      quantityReceived: Number(receiveInputs[i.variantId] ?? i.quantitySent),
    }));

    setIsSubmitting(true);
    try {
      await apiClient(`/inventory/transfers/${selectedTransfer.id}/receive`, {
        method: 'POST',
        body: JSON.stringify({
          notes: receiveNotes.trim() || undefined,
          items: payloadItems,
        }),
      });

      setIsReceiveModalOpen(false);
      await loadTransfers();
      const updated = await apiClient<StockTransfer>(`/inventory/transfers/${selectedTransfer.id}`);
      setSelectedTransfer(updated);
    } catch (err: any) {
      alert(`Failed to receive transfer: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: StockTransfer['status']) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
            <Clock className="w-3 h-3 mr-1 text-slate-400" />
            Draft
          </span>
        );
      case 'IN_TRANSIT':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
            <Truck className="w-3 h-3 mr-1 text-amber-400 animate-pulse" />
            In Transit
          </span>
        );
      case 'RECEIVED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
            <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-400" />
            Received
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
            <XCircle className="w-3 h-3 mr-1 text-rose-400" />
            Cancelled
          </span>
        );
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl">
              <ArrowLeftRight className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-black text-white tracking-tight">Inter-Branch Stock Transfers</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Dispatch, track, and receive inventory transfers between branch locations and central warehouses.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setCreateError(null);
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl transition shadow-lg flex items-center justify-center space-x-2 text-xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Stock Transfer</span>
        </button>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">All Transfers</div>
          <div className="text-2xl font-black text-white mt-1">{total}</div>
          <div className="text-[11px] text-slate-500 mt-1">Recorded in system</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">In Transit 🚚</div>
          <div className="text-2xl font-black text-amber-400 mt-1">{stats.inTransit}</div>
          <div className="text-[11px] text-slate-500 mt-1">Awaiting branch receiving</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Drafts Pending</div>
          <div className="text-2xl font-black text-slate-300 mt-1">{stats.drafts}</div>
          <div className="text-[11px] text-slate-500 mt-1">Ready for warehouse dispatch</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Completed Transfers</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">{stats.received}</div>
          <div className="text-[11px] text-slate-500 mt-1">Stock balance adjusted</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded-xl border border-slate-800">
        {/* Status Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {['ALL', 'DRAFT', 'IN_TRANSIT', 'RECEIVED', 'CANCELLED'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {st === 'ALL' && 'All Statuses'}
              {st === 'DRAFT' && 'Drafts'}
              {st === 'IN_TRANSIT' && 'In Transit'}
              {st === 'RECEIVED' && 'Received'}
              {st === 'CANCELLED' && 'Cancelled'}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            placeholder="Search transfer code or notes..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Main Transfers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Transfer Code</th>
                <th className="py-3 px-4">Source Warehouse</th>
                <th className="py-3 px-4">Destination Warehouse</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <TableSkeleton columns={7} rows={5} theme="dark" />
              ) : transfers.length === 0 ? (
                <EmptyState
                  colSpan={7}
                  icon={ArrowLeftRight}
                  title="No Stock Transfers Found"
                  description="Create an inter-warehouse transfer to dispatch and replenish stock between branches."
                  actionLabel="New Stock Transfer"
                  onAction={() => setIsCreateModalOpen(true)}
                  isSearchActive={!!searchQuery || statusFilter !== 'ALL'}
                  onResetFilters={() => {
                    setSearchQuery('');
                    setStatusFilter('ALL');
                  }}
                  theme="dark"
                />
              ) : (
                transfers.map((t) => {
                  const totalQtySent = t.items.reduce((acc, curr) => acc + curr.quantitySent, 0);
                  const totalQtyRec = t.items.reduce((acc, curr) => acc + curr.quantityReceived, 0);

                  return (
                    <tr key={t.id} className="hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        <span className="text-emerald-400">{t.transferNumber}</span>
                        {t.notes && (
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px] font-sans font-normal">
                            {t.notes}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{t.sourceWarehouse?.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{t.sourceWarehouse?.code}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">{t.destinationWarehouse?.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{t.destinationWarehouse?.code}</div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="font-bold text-white">{t.items.length} variants</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {totalQtySent} sent {t.status === 'RECEIVED' ? `(${totalQtyRec} rec)` : ''}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">{getStatusBadge(t.status)}</td>
                      <td className="py-3.5 px-4 text-[11px] text-slate-400 whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedTransfer(t)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
                            title="View Transfer Details"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {t.status === 'DRAFT' && (
                            <button
                              type="button"
                              onClick={() => handleDispatch(t.id)}
                              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg transition text-[11px] flex items-center space-x-1"
                              title="Dispatch to Destination Warehouse"
                            >
                              <Send className="w-3 h-3" />
                              <span>Dispatch</span>
                            </button>
                          )}

                          {t.status === 'IN_TRANSIT' && (
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedTransfer(t);
                                handleOpenReceive(t);
                              }}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition text-[11px] flex items-center space-x-1"
                              title="Receive Goods at Destination Warehouse"
                            >
                              <Check className="w-3 h-3" />
                              <span>Receive</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <Pagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={total}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          isLoading={isLoading}
        />
      </div>

      {/* =========================================================================
          CREATE STOCK TRANSFER MODAL
          ========================================================================= */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-xl">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Create Inter-Branch Stock Transfer</h2>
                  <p className="text-xs text-slate-400">
                    Prepare a draft transfer between two merchant warehouse locations.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{createError}</span>
                </div>
              )}

              {/* Source & Destination Warehouse Dropdowns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Source Warehouse (Origin)
                  </label>
                  <select
                    value={sourceWarehouseId}
                    onChange={(e) => setSourceWarehouseId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
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
                    Destination Warehouse
                  </label>
                  <select
                    value={destWarehouseId}
                    onChange={(e) => setDestWarehouseId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                    required
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name} ({w.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Transfer Purpose / Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={transferNotes}
                  onChange={(e) => setTransferNotes(e.target.value)}
                  placeholder="e.g. Replenishing high-demand stock for weekend sale"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Items Line Builder */}
              <div className="space-y-2 pt-2 border-t border-slate-800">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Transfer Items List ({createItems.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddCreateRow}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold rounded-lg text-xs flex items-center space-x-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {createItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center space-x-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800"
                    >
                      <div className="flex-1 min-w-0">
                        <select
                          value={item.variantId}
                          onChange={(e) => {
                            const updated = [...createItems];
                            updated[idx] = { ...updated[idx], variantId: e.target.value };
                            setCreateItems(updated);
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                          required
                        >
                          <option value="">Select Variant / SKU...</option>
                          {catalogVariants.map((v) => (
                            <option key={v.id} value={v.id}>
                              {v.sku} - {v.product?.name || v.variantName} (LKR {v.sellingPrice})
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="w-24">
                        <input
                          type="number"
                          min="0.001"
                          step="0.001"
                          value={item.quantitySent}
                          onChange={(e) => {
                            const updated = [...createItems];
                            updated[idx] = {
                              ...updated[idx],
                              quantitySent: parseFloat(e.target.value) || 0,
                            };
                            setCreateItems(updated);
                          }}
                          placeholder="Qty"
                          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-center text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                          required
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCreateRow(idx)}
                        disabled={createItems.length <= 1}
                        className="p-1.5 text-slate-500 hover:text-rose-400 disabled:opacity-30 rounded transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Create Draft Transfer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          VIEW TRANSFER DETAILS DRAWER
          ========================================================================= */}
      {selectedTransfer && !isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-xl">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-white font-mono">
                      {selectedTransfer.transferNumber}
                    </h2>
                    {getStatusBadge(selectedTransfer.status)}
                  </div>
                  <p className="text-xs text-slate-400">
                    Created {new Date(selectedTransfer.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTransfer(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {/* Route Summary */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Source Warehouse</div>
                  <div className="text-sm font-bold text-white">{selectedTransfer.sourceWarehouse?.name}</div>
                  <div className="text-xs font-mono text-emerald-400">{selectedTransfer.sourceWarehouse?.code}</div>
                </div>

                <div className="p-2 bg-slate-900 border border-slate-800 rounded-full text-slate-400">
                  <ArrowRight className="w-4 h-4" />
                </div>

                <div className="text-right">
                  <div className="text-[10px] text-slate-500 uppercase font-bold">Destination Warehouse</div>
                  <div className="text-sm font-bold text-white">{selectedTransfer.destinationWarehouse?.name}</div>
                  <div className="text-xs font-mono text-emerald-400">{selectedTransfer.destinationWarehouse?.code}</div>
                </div>
              </div>

              {selectedTransfer.notes && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300">
                  <span className="font-bold text-slate-400">Remarks: </span>
                  {selectedTransfer.notes}
                </div>
              )}

              {/* Items List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Transfer Line Items ({selectedTransfer.items.length})
                </span>
                <div className="border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Item / SKU</th>
                        <th className="py-2.5 px-3 text-center">Unit</th>
                        <th className="py-2.5 px-3 text-right">Qty Sent</th>
                        <th className="py-2.5 px-3 text-right">Qty Received</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 bg-slate-950/40">
                      {selectedTransfer.items.map((i) => (
                        <tr key={i.id}>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-white">{i.variant?.product?.name || i.variant?.sku}</div>
                            <div className="text-[10px] text-slate-500 font-mono">{i.variant?.sku}</div>
                          </td>
                          <td className="py-2.5 px-3 text-center text-slate-400">
                            {i.variant?.product?.unit || 'PCS'}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-400">
                            {i.quantitySent}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                            {selectedTransfer.status === 'RECEIVED' ? i.quantityReceived : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                {selectedTransfer.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => handleCancel(selectedTransfer.id)}
                    className="px-3.5 py-2 text-rose-400 hover:bg-rose-950/40 rounded-xl transition text-xs font-semibold"
                  >
                    Cancel Transfer
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setSelectedTransfer(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Close
                </button>

                {selectedTransfer.status === 'DRAFT' && (
                  <button
                    type="button"
                    onClick={() => handleDispatch(selectedTransfer.id)}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Dispatch Transfer</span>
                  </button>
                )}

                {selectedTransfer.status === 'IN_TRANSIT' && (
                  <button
                    type="button"
                    onClick={() => handleOpenReceive(selectedTransfer)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow flex items-center space-x-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Receive Goods</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          RECEIVE GOODS MODAL
          ========================================================================= */}
      {isReceiveModalOpen && selectedTransfer && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-xl">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Receive Goods at Destination</h2>
                  <p className="text-xs text-slate-400">
                    Verify received physical quantities. Stock will be added to {selectedTransfer.destinationWarehouse?.name}.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReceiveModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Item Quantities Received
                </span>
                {selectedTransfer.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-white text-xs">
                        {item.variant?.product?.name || item.variant?.sku}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        SKU: {item.variant?.sku} &bull; Sent: {item.quantitySent} {item.variant?.product?.unit || 'PCS'}
                      </div>
                    </div>

                    <div className="w-28">
                      <label className="block text-[10px] text-slate-400 mb-0.5">Qty Received</label>
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={receiveInputs[item.variantId] ?? item.quantitySent}
                        onChange={(e) =>
                          setReceiveInputs({
                            ...receiveInputs,
                            [item.variantId]: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-center text-white font-mono font-bold focus:outline-none focus:border-emerald-500"
                        required
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Receiving Inspection Remarks (Optional)
                </label>
                <input
                  type="text"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  placeholder="e.g. All units verified in perfect condition"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsReceiveModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{isSubmitting ? 'Receiving...' : 'Confirm Stock Receipt'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
