'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Undo2,
  Plus,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Truck,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../lib/auth-store';
import { Pagination } from '../../../components/Pagination';
import { TableSkeleton } from '../../../components/TableSkeleton';
import { EmptyState } from '../../../components/EmptyState';

export default function SupplierReturnsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [returns, setReturns] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<any>(null);

  // Form State
  const [newReturn, setNewReturn] = useState({
    supplierId: '',
    warehouseId: '',
    grnId: '',
    settlementMethod: 'CREDIT_NOTE',
    reason: '',
    notes: '',
    items: [
      {
        variantId: '',
        quantity: 5,
        unitCost: 100,
        returnReason: 'DAMAGED',
        batchNumber: '',
      },
    ],
  });

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const q = new URLSearchParams();
      q.append('page', page.toString());
      q.append('limit', limit.toString());
      if (search) q.append('search', search);
      if (statusFilter) q.append('status', statusFilter);
      if (supplierFilter) q.append('supplierId', supplierFilter);

      const [retRes, supRes, whRes, grnRes, catRes] = await Promise.all([
        apiClient<any>(`/purchasing/returns?${q.toString()}`),
        apiClient<any>('/purchasing/suppliers?limit=100'),
        apiClient<any>('/warehouses').catch(() => []),
        apiClient<any>('/purchasing/grn?limit=100').catch(() => ({ items: [] })),
        apiClient<any>('/catalog/variants?limit=100').catch(() => ({ items: [] })),
      ]);

      setReturns(retRes?.items || []);
      setTotalPages(retRes?.meta?.totalPages || 1);
      setTotalItems(retRes?.meta?.total || 0);
      setSuppliers(supRes?.items || []);
      setWarehouses(Array.isArray(whRes) ? whRes : whRes?.items || []);
      setGrns(grnRes?.items || []);
      setVariants(catRes?.items || []);

      if (supRes?.items?.length > 0 && !newReturn.supplierId) {
        setNewReturn((prev) => ({ ...prev, supplierId: supRes.items[0].id }));
      }
      if (whRes?.length > 0 && !newReturn.warehouseId) {
        setNewReturn((prev) => ({ ...prev, warehouseId: whRes[0].id }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load supplier returns');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, page, limit, search, statusFilter, supplierFilter]);

  const updateLine = (idx: number, field: string, val: any) => {
    const updated: any[] = [...newReturn.items];
    updated[idx] = { ...updated[idx], [field]: val };
    setNewReturn({ ...newReturn, items: updated });
  };

  const addLine = () => {
    setNewReturn({
      ...newReturn,
      items: [
        ...newReturn.items,
        {
          variantId: variants[0]?.id || '',
          quantity: 5,
          unitCost: Number(variants[0]?.costPrice || 100),
          returnReason: 'DAMAGED',
          batchNumber: '',
        },
      ],
    });
  };

  const removeLine = (idx: number) => {
    if (newReturn.items.length === 1) return;
    setNewReturn({ ...newReturn, items: newReturn.items.filter((_, i) => i !== idx) });
  };

  // Submit Return
  const handleCreateReturn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/purchasing/returns', {
        method: 'POST',
        body: JSON.stringify(newReturn),
      });
      setSuccessMsg('Supplier Return created in DRAFT!');
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create return');
    }
  };

  // Approve Return
  const handleApproveReturn = async (id: string) => {
    try {
      await apiClient(`/purchasing/returns/${id}/approve`, { method: 'POST' });
      setSuccessMsg('Return approved!');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve return');
    }
  };

  // Dispatch Return
  const handleDispatchReturn = async (id: string) => {
    if (!confirm('Dispatch return? This will deduct inventory and issue Credit Note settlement.')) {
      return;
    }
    try {
      await apiClient(`/purchasing/returns/${id}/dispatch`, { method: 'POST' });
      setSuccessMsg('Goods dispatched! Inventory deducted & Credit Note posted.');
      loadData();
      if (selectedReturn) setSelectedReturn(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch return');
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 max-w-7xl mx-auto w-full space-y-6 text-slate-100">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Undo2 className="w-7 h-7 text-emerald-400" />
            Supplier Returns & Settlements
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Dispatch damaged, expired or excess goods back to vendors with credit notes or replacement tracking
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition font-bold"
        >
          <Plus className="w-4 h-4" />
          Create Supplier Return
        </button>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-rose-950 border border-rose-800 rounded-xl text-sm text-rose-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-950 border border-emerald-800 rounded-xl text-sm text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search return #, credit note #, or reason..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={supplierFilter}
            onChange={(e) => {
              setSupplierFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="" className="bg-slate-900 text-slate-400">All Suppliers</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="" className="bg-slate-900 text-slate-400">All Statuses</option>
            <option value="DRAFT" className="bg-slate-900 text-white">Draft</option>
            <option value="APPROVED" className="bg-slate-900 text-white">Approved</option>
            <option value="DISPATCHED" className="bg-slate-900 text-white">Dispatched</option>
          </select>

          <button onClick={loadData} title="Refresh" className="p-2 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Returns Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Return #</th>
                <th className="px-4 py-3.5">Supplier</th>
                <th className="px-4 py-3.5">Warehouse</th>
                <th className="px-4 py-3.5">Settlement Method</th>
                <th className="px-4 py-3.5 text-right">Total Value</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <TableSkeleton columns={7} rows={6} theme="dark" />
              ) : returns.length === 0 ? (
                <EmptyState
                  colSpan={7}
                  theme="dark"
                  icon={Undo2}
                  isSearchActive={Boolean(search || statusFilter || supplierFilter)}
                  searchQuery={search}
                  title={search || statusFilter || supplierFilter ? 'No supplier returns match your filters' : 'No supplier returns recorded'}
                  description={
                    search || statusFilter || supplierFilter
                      ? 'No returns match your search keyword or active status criteria. Try clearing filters.'
                      : 'Create supplier returns to record damaged goods dispatched back to suppliers and generate credit notes.'
                  }
                  onResetFilters={() => {
                    setSearch('');
                    setStatusFilter('');
                    setSupplierFilter('');
                    setPage(1);
                  }}
                  actionLabel="Create Supplier Return"
                  onAction={() => setIsCreateModalOpen(true)}
                />
              ) : (
                returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-slate-850 transition">
                    <td className="px-4 py-3.5 font-bold text-emerald-400">
                      {ret.returnNumber}
                      {ret.creditNoteNumber && (
                        <div className="text-[10px] text-emerald-400 font-semibold font-mono">
                          {ret.creditNoteNumber}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-100">{ret.supplier?.name}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-300">{ret.warehouse?.name}</td>
                    <td className="px-4 py-3.5 text-xs font-medium">
                      <span className="bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded">
                        {ret.settlementMethod}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-white">
                      LKR {Number(ret.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                          ret.status === 'DISPATCHED'
                            ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                            : ret.status === 'APPROVED'
                            ? 'bg-blue-950 text-blue-300 border border-blue-800'
                            : 'bg-slate-800 text-slate-300 border border-slate-700'
                        }`}
                      >
                        {ret.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {ret.status === 'DRAFT' && (
                        <button
                          onClick={() => handleApproveReturn(ret.id)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-300 bg-blue-950 hover:bg-blue-900 border border-blue-800 rounded-lg transition"
                        >
                          Approve
                        </button>
                      )}
                      {ret.status === 'APPROVED' && (
                        <button
                          onClick={() => handleDispatchReturn(ret.id)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <Truck className="w-3.5 h-3.5" />
                          Dispatch
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          const details = await apiClient(`/purchasing/returns/${ret.id}`);
                          setSelectedReturn(details);
                        }}
                        className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 border border-slate-700 rounded-lg transition"
                      >
                        View
                      </button>
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
          onPageChange={(p) => setPage(p)}
          onLimitChange={(l) => {
            setLimit(l);
            setPage(1);
          }}
          isLoading={isLoading}
        />
      </div>

      {/* Create Return Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Undo2 className="w-5 h-5 text-emerald-400" />
                Create Supplier Return
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReturn} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Supplier *</label>
                  <select
                    required
                    value={newReturn.supplierId}
                    onChange={(e) => setNewReturn({ ...newReturn, supplierId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Warehouse *</label>
                  <select
                    required
                    value={newReturn.warehouseId}
                    onChange={(e) => setNewReturn({ ...newReturn, warehouseId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">Select Warehouse</option>
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id} className="bg-slate-900 text-white">
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Settlement Method</label>
                  <select
                    value={newReturn.settlementMethod}
                    onChange={(e) => setNewReturn({ ...newReturn, settlementMethod: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CREDIT_NOTE" className="bg-slate-900 text-white">Credit Note (Reduces Payables)</option>
                    <option value="REPLACEMENT" className="bg-slate-900 text-white">Stock Replacement</option>
                    <option value="REFUND" className="bg-slate-900 text-white">Direct Refund</option>
                    <option value="FUTURE_ADJUSTMENT" className="bg-slate-900 text-white">Future Bill Adjustment</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Reference GRN (Optional)</label>
                  <select
                    value={newReturn.grnId}
                    onChange={(e) => setNewReturn({ ...newReturn, grnId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">Direct Return (No GRN)</option>
                    {grns.map((g) => (
                      <option key={g.id} value={g.id} className="bg-slate-900 text-white">
                        {g.grnNumber} - {g.supplier?.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Items Grid */}
              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-slate-300">Returned Items</h4>
                  <button type="button" onClick={addLine} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold">
                    + Add Item
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 uppercase border-b border-slate-800">
                        <th className="pb-2">Variant</th>
                        <th className="pb-2 w-24">Quantity</th>
                        <th className="pb-2 w-28">Unit Cost</th>
                        <th className="pb-2 w-32">Return Reason</th>
                        <th className="pb-2 w-28">Batch #</th>
                        <th className="pb-2 text-right">Line Total</th>
                        <th className="pb-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {newReturn.items.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-900 transition">
                          <td className="py-2 pr-2">
                            <select
                              required
                              value={line.variantId}
                              onChange={(e) => updateLine(idx, 'variantId', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 focus:outline-none focus:border-emerald-500"
                            >
                              <option value="" className="bg-slate-900 text-slate-400">Select Variant</option>
                              {variants.map((v) => (
                                <option key={v.id} value={v.id} className="bg-slate-900 text-white">
                                  {v.variantName} ({v.sku})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              min="1"
                              value={line.quantity}
                              onChange={(e) => updateLine(idx, 'quantity', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              min="0"
                              value={line.unitCost}
                              onChange={(e) => updateLine(idx, 'unitCost', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <select
                              value={line.returnReason}
                              onChange={(e) => updateLine(idx, 'returnReason', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 focus:outline-none focus:border-emerald-500"
                            >
                              <option value="DAMAGED" className="bg-slate-900 text-white">Damaged</option>
                              <option value="EXPIRED" className="bg-slate-900 text-white">Expired</option>
                              <option value="DEFECTIVE" className="bg-slate-900 text-white">Defective</option>
                              <option value="OVER_DELIVERED" className="bg-slate-900 text-white">Over-Delivered</option>
                              <option value="WRONG_ITEM" className="bg-slate-900 text-white">Wrong Item</option>
                            </select>
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="text"
                              value={line.batchNumber}
                              onChange={(e) => updateLine(idx, 'batchNumber', e.target.value)}
                              placeholder="Batch #"
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2 text-right font-bold text-white">
                            LKR {(line.quantity * line.unitCost).toLocaleString()}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removeLine(idx)}
                              className="text-rose-400 hover:text-rose-300 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Return Remarks</label>
                <textarea
                  rows={2}
                  value={newReturn.reason}
                  onChange={(e) => setNewReturn({ ...newReturn, reason: e.target.value })}
                  placeholder="Reason for return..."
                  className="w-full bg-slate-950 border border-slate-800 rounded p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition shadow-sm shadow-emerald-600/20"
                >
                  Save Draft Return
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Return Modal */}
      {selectedReturn && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-mono font-bold text-emerald-400">{selectedReturn.returnNumber}</div>
                <h3 className="text-lg font-bold text-white">{selectedReturn.supplier?.name}</h3>
              </div>
              <button onClick={() => setSelectedReturn(null)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5">Qty</th>
                    <th className="p-2.5">Reason</th>
                    <th className="p-2.5 text-right">Unit Cost</th>
                    <th className="p-2.5 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {selectedReturn.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-800 transition">
                      <td className="p-2.5 font-medium text-slate-100">{item.variant?.product?.name}</td>
                      <td className="p-2.5 font-bold text-white">{Number(item.quantity)}</td>
                      <td className="p-2.5 text-rose-400 font-semibold">{item.returnReason}</td>
                      <td className="p-2.5 text-right">LKR {Number(item.unitCost).toLocaleString()}</td>
                      <td className="p-2.5 text-right font-bold text-white">
                        LKR {Number(item.lineTotal).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
