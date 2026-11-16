'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  PackageCheck,
  Plus,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Printer,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../lib/auth-store';
import { Pagination } from '../../../components/Pagination';
import { TableSkeleton } from '../../../components/TableSkeleton';
import { EmptyState } from '../../../components/EmptyState';

export default function GoodsReceivedNotePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [grns, setGrns] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
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
  const [selectedGRN, setSelectedGRN] = useState<any>(null);

  // Form State
  const [newGRN, setNewGRN] = useState({
    supplierId: '',
    warehouseId: '',
    purchaseOrderId: '',
    deliveryNoteNumber: '',
    supplierInvoiceRef: '',
    vehicleReference: '',
    landedCosts: 0,
    remarks: '',
    items: [
      {
        variantId: '',
        orderedQuantity: 10,
        quantityReceived: 10,
        acceptedQuantity: 10,
        damagedQuantity: 0,
        rejectedQuantity: 0,
        freeQuantity: 0,
        unitCost: 100,
        discountAmount: 0,
        taxAmount: 0,
        batchNumber: '',
        serialNumber: '',
        expiryDate: '',
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

      const [grnRes, supRes, whRes, poRes, catRes] = await Promise.all([
        apiClient<any>(`/purchasing/grn?${q.toString()}`),
        apiClient<any>('/purchasing/suppliers?limit=100'),
        apiClient<any>('/warehouses').catch(() => []),
        apiClient<any>('/purchasing/orders?limit=100').catch(() => ({ items: [] })),
        apiClient<any>('/catalog/variants?limit=100').catch(() => ({ items: [] })),
      ]);

      setGrns(grnRes?.items || []);
      setTotalPages(grnRes?.meta?.totalPages || 1);
      setTotalItems(grnRes?.meta?.total || 0);
      setSuppliers(supRes?.items || []);
      setWarehouses(Array.isArray(whRes) ? whRes : whRes?.items || []);
      setPurchaseOrders(poRes?.items || []);
      setVariants(catRes?.items || []);

      if (supRes?.items?.length > 0 && !newGRN.supplierId) {
        setNewGRN((prev) => ({ ...prev, supplierId: supRes.items[0].id }));
      }
      if (whRes?.length > 0 && !newGRN.warehouseId) {
        setNewGRN((prev) => ({ ...prev, warehouseId: whRes[0].id }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load GRNs');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, page, limit, search, statusFilter, supplierFilter]);

  // Check URL query parameters for poId pre-fill
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const poId = params.get('poId');
      if (poId) {
        handleSelectPOForReceiving(poId);
      }
    }
  }, [purchaseOrders]);

  // When PO is selected in receiving form, auto-fill items!
  const handleSelectPOForReceiving = async (poId: string) => {
    if (!poId) {
      setNewGRN((prev) => ({ ...prev, purchaseOrderId: '' }));
      return;
    }

    try {
      const po = await apiClient<any>(`/purchasing/orders/${poId}`);
      if (po) {
        const prefilledItems = po.items.map((pi: any) => ({
          variantId: pi.variantId,
          orderedQuantity: Number(pi.quantityOrdered),
          quantityReceived: Math.max(0, Number(pi.quantityOrdered) - Number(pi.quantityReceived)),
          acceptedQuantity: Math.max(0, Number(pi.quantityOrdered) - Number(pi.quantityReceived)),
          damagedQuantity: 0,
          rejectedQuantity: 0,
          freeQuantity: 0,
          unitCost: Number(pi.unitCost),
          discountAmount: 0,
          taxAmount: 0,
          batchNumber: '',
          serialNumber: '',
          expiryDate: '',
        }));

        setNewGRN((prev) => ({
          ...prev,
          supplierId: po.supplierId,
          warehouseId: po.warehouseId,
          purchaseOrderId: po.id,
          items: prefilledItems.length > 0 ? prefilledItems : prev.items,
        }));
        setIsCreateModalOpen(true);
      }
    } catch (err) {
      // Ignore
    }
  };

  const updateLine = (idx: number, field: string, val: any) => {
    const updated: any[] = [...newGRN.items];
    updated[idx] = { ...updated[idx], [field]: val };

    // Auto-balance accepted = received - damaged - rejected
    if (field === 'quantityReceived' || field === 'damagedQuantity' || field === 'rejectedQuantity') {
      const recv = field === 'quantityReceived' ? Number(val) : updated[idx].quantityReceived;
      const dmg = field === 'damagedQuantity' ? Number(val) : updated[idx].damagedQuantity;
      const rej = field === 'rejectedQuantity' ? Number(val) : updated[idx].rejectedQuantity;
      updated[idx].acceptedQuantity = Math.max(0, recv - dmg - rej);
    }

    setNewGRN({ ...newGRN, items: updated });
  };

  const addLine = () => {
    setNewGRN({
      ...newGRN,
      items: [
        ...newGRN.items,
        {
          variantId: variants[0]?.id || '',
          orderedQuantity: 10,
          quantityReceived: 10,
          acceptedQuantity: 10,
          damagedQuantity: 0,
          rejectedQuantity: 0,
          freeQuantity: 0,
          unitCost: Number(variants[0]?.costPrice || 100),
          discountAmount: 0,
          taxAmount: 0,
          batchNumber: '',
          serialNumber: '',
          expiryDate: '',
        },
      ],
    });
  };

  const removeLine = (idx: number) => {
    if (newGRN.items.length === 1) return;
    setNewGRN({ ...newGRN, items: newGRN.items.filter((_, i) => i !== idx) });
  };

  // Submit GRN (Draft)
  const handleCreateGRN = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/purchasing/grn', {
        method: 'POST',
        body: JSON.stringify(newGRN),
      });
      setSuccessMsg('Goods Received Note created in DRAFT!');
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create GRN');
    }
  };

  // Post GRN (Atomic stock in)
  const handlePostGRN = async (id: string) => {
    if (!confirm('Post GRN? This will update warehouse inventory balances and weighted-average costing.')) {
      return;
    }
    try {
      await apiClient(`/purchasing/grn/${id}/post`, { method: 'POST' });
      setSuccessMsg('GRN posted successfully! Stock levels updated.');
      loadData();
      if (selectedGRN) setSelectedGRN(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to post GRN');
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 max-w-7xl mx-auto w-full space-y-6 text-slate-100">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <PackageCheck className="w-7 h-7 text-emerald-400" />
            Goods Received Notes (GRN)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Physical receiving inspection, accepted vs damaged goods quarantine, batch tracking, and inventory receipt
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition font-bold"
        >
          <Plus className="w-4 h-4" />
          Receive Goods (New GRN)
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

      {/* Top Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="text-xs font-semibold uppercase text-slate-400">Total Notes</div>
          <div className="mt-1 text-2xl font-bold text-white">{grns.length}</div>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="text-xs font-semibold uppercase text-emerald-400">Posted GRNs</div>
          <div className="mt-1 text-2xl font-bold text-emerald-400">
            {grns.filter((g) => g.status === 'POSTED').length}
          </div>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="text-xs font-semibold uppercase text-amber-400">Pending Drafts</div>
          <div className="mt-1 text-2xl font-bold text-amber-400">
            {grns.filter((g) => g.status === 'DRAFT').length}
          </div>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="text-xs font-semibold uppercase text-emerald-400">Total Value Received</div>
          <div className="mt-1 text-xl font-bold text-white truncate">
            LKR {grns.reduce((sum, g) => sum + Number(g.totalAmount || 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search GRN #, delivery note, supplier, or invoice ref..."
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
            <option value="POSTED" className="bg-slate-900 text-white">Posted</option>
            <option value="CANCELLED" className="bg-slate-900 text-white">Cancelled</option>
          </select>

          <button onClick={loadData} title="Refresh" className="p-2 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* GRN Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">GRN Number</th>
                <th className="px-4 py-3.5">Supplier</th>
                <th className="px-4 py-3.5">PO Ref</th>
                <th className="px-4 py-3.5">Delivery Note / Invoice</th>
                <th className="px-4 py-3.5 text-right">Total Amount</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <TableSkeleton columns={7} rows={6} theme="dark" />
              ) : grns.length === 0 ? (
                <EmptyState
                  colSpan={7}
                  theme="dark"
                  icon={PackageCheck}
                  isSearchActive={Boolean(search || statusFilter || supplierFilter)}
                  searchQuery={search}
                  title={search || statusFilter || supplierFilter ? 'No goods receipts match your filters' : 'No Goods Received Notes'}
                  description={
                    search || statusFilter || supplierFilter
                      ? 'No Goods Received Notes match your active filter criteria. Try clearing search filters.'
                      : 'Record physical deliveries from suppliers, inspect accepted or damaged quantities, and post goods to warehouse inventory.'
                  }
                  onResetFilters={() => {
                    setSearch('');
                    setStatusFilter('');
                    setSupplierFilter('');
                    setPage(1);
                  }}
                  actionLabel="Inspect Delivery (New GRN)"
                  onAction={() => setIsCreateModalOpen(true)}
                />
              ) : (
                grns.map((grn) => (
                  <tr key={grn.id} className="hover:bg-slate-850 transition">
                    <td className="px-4 py-3.5 font-bold text-emerald-400">
                      {grn.grnNumber}
                      <div className="text-[10px] text-slate-500 font-normal">
                        {new Date(grn.receivedAt).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-100">
                      {grn.supplier?.name}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-300">
                      {grn.purchaseOrder ? (
                        <span className="font-mono bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded">
                          {grn.purchaseOrder.poNumber}
                        </span>
                      ) : (
                        <span className="text-slate-500">Direct Receiving</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-300">
                      <div>DN: {grn.deliveryNoteNumber || '—'}</div>
                      <div className="text-slate-500">Inv: {grn.supplierInvoiceRef || '—'}</div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-white">
                      LKR {Number(grn.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                          grn.status === 'POSTED'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                            : 'bg-amber-950 text-amber-400 border-amber-800'
                        }`}
                      >
                        {grn.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                      {grn.status === 'DRAFT' && (
                        <button
                          onClick={() => handlePostGRN(grn.id)}
                          className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 rounded-lg transition inline-flex items-center gap-1"
                        >
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Post to Stock
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          const details = await apiClient(`/purchasing/grn/${grn.id}`);
                          setSelectedGRN(details);
                        }}
                        className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 border border-slate-700 rounded-lg transition"
                      >
                        View Slip
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

      {/* New GRN Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-emerald-400" />
                Goods Receiving Inspection (New GRN)
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGRN} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Select Supplier *</label>
                  <select
                    required
                    value={newGRN.supplierId}
                    onChange={(e) => setNewGRN({ ...newGRN, supplierId: e.target.value })}
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
                  <label className="block text-slate-300 font-medium mb-1">Destination Warehouse *</label>
                  <select
                    required
                    value={newGRN.warehouseId}
                    onChange={(e) => setNewGRN({ ...newGRN, warehouseId: e.target.value })}
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
                  <label className="block text-slate-300 font-medium mb-1">Link Purchase Order (Optional)</label>
                  <select
                    value={newGRN.purchaseOrderId}
                    onChange={(e) => handleSelectPOForReceiving(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">Direct Receiving (No PO)</option>
                    {purchaseOrders
                      .filter((p) => p.status === 'ISSUED' || p.status === 'PARTIALLY_RECEIVED')
                      .map((p) => (
                        <option key={p.id} value={p.id} className="bg-slate-900 text-white">
                          {p.poNumber} - {p.supplier?.name}
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Delivery Note #</label>
                  <input
                    type="text"
                    value={newGRN.deliveryNoteNumber}
                    onChange={(e) => setNewGRN({ ...newGRN, deliveryNoteNumber: e.target.value })}
                    placeholder="e.g. DN-19828"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Supplier Invoice Ref</label>
                  <input
                    type="text"
                    value={newGRN.supplierInvoiceRef}
                    onChange={(e) => setNewGRN({ ...newGRN, supplierInvoiceRef: e.target.value })}
                    placeholder="e.g. INV-99011"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Vehicle Reference / Driver</label>
                  <input
                    type="text"
                    value={newGRN.vehicleReference}
                    onChange={(e) => setNewGRN({ ...newGRN, vehicleReference: e.target.value })}
                    placeholder="WP-CAB-1234"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Items Grid */}
              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-slate-300">Received Items Inspection</h4>
                  <button type="button" onClick={addLine} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold">
                    + Add Line Item
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 uppercase border-b border-slate-800">
                        <th className="pb-2">Variant</th>
                        <th className="pb-2 w-16">Ordered</th>
                        <th className="pb-2 w-16">Delivered</th>
                        <th className="pb-2 w-16 text-emerald-400">Accepted</th>
                        <th className="pb-2 w-16 text-amber-400">Damaged</th>
                        <th className="pb-2 w-20">Unit Cost</th>
                        <th className="pb-2 w-24">Batch #</th>
                        <th className="pb-2 text-right">Line Total</th>
                        <th className="pb-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {newGRN.items.map((line, idx) => (
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
                              value={line.orderedQuantity}
                              onChange={(e) => updateLine(idx, 'orderedQuantity', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-center focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              min="0"
                              value={line.quantityReceived}
                              onChange={(e) => updateLine(idx, 'quantityReceived', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 text-center font-bold focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              min="0"
                              value={line.acceptedQuantity}
                              onChange={(e) => updateLine(idx, 'acceptedQuantity', Number(e.target.value))}
                              className="w-full border border-emerald-700 bg-emerald-950 text-emerald-300 rounded p-1.5 text-center font-bold focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              min="0"
                              value={line.damagedQuantity}
                              onChange={(e) => updateLine(idx, 'damagedQuantity', Number(e.target.value))}
                              className="w-full border border-amber-700 bg-amber-950 text-amber-300 rounded p-1.5 text-center focus:outline-none focus:border-amber-500"
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
                            <input
                              type="text"
                              value={line.batchNumber}
                              onChange={(e) => updateLine(idx, 'batchNumber', e.target.value)}
                              placeholder="Batch #"
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 uppercase font-mono focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2 text-right font-bold text-white">
                            LKR {(line.acceptedQuantity * line.unitCost).toLocaleString()}
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
                  Save Draft GRN
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable GRN Slip Modal */}
      {selectedGRN && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-mono font-bold text-emerald-400">{selectedGRN.grnNumber}</div>
                <h3 className="text-lg font-bold text-white">Goods Received Inspection Slip</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs border border-slate-700 rounded-lg text-slate-300 flex items-center gap-1 hover:bg-slate-800 hover:text-white transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button onClick={() => setSelectedGRN(null)} className="text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-950 border border-slate-800 p-3 rounded-lg">
              <div>
                <span className="text-slate-400">Supplier:</span>
                <p className="font-semibold text-slate-200">{selectedGRN.supplier?.name}</p>
              </div>
              <div>
                <span className="text-slate-400">Warehouse:</span>
                <p className="font-semibold text-slate-200">{selectedGRN.warehouse?.name}</p>
              </div>
              <div>
                <span className="text-slate-400">Received Date:</span>
                <p className="font-semibold text-slate-200">
                  {new Date(selectedGRN.receivedAt).toLocaleDateString()}
                </p>
              </div>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-2.5">Item Variant</th>
                    <th className="p-2.5">Batch / Serial</th>
                    <th className="p-2.5 text-center">Delivered</th>
                    <th className="p-2.5 text-center text-emerald-400">Accepted</th>
                    <th className="p-2.5 text-center text-amber-400">Damaged</th>
                    <th className="p-2.5 text-right">Unit Cost</th>
                    <th className="p-2.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {selectedGRN.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-800 transition">
                      <td className="p-2.5 font-medium text-slate-100">
                        {item.variant?.product?.name} ({item.variant?.sku})
                      </td>
                      <td className="p-2.5 font-mono text-[10px] text-slate-400">
                        {item.batchNumber ? `Batch: ${item.batchNumber}` : '—'}
                      </td>
                      <td className="p-2.5 text-center">{Number(item.quantityReceived)}</td>
                      <td className="p-2.5 text-center font-bold text-emerald-400">
                        {Number(item.acceptedQuantity)}
                      </td>
                      <td className="p-2.5 text-center font-bold text-amber-400">
                        {Number(item.damagedQuantity)}
                      </td>
                      <td className="p-2.5 text-right">LKR {Number(item.unitCost).toLocaleString()}</td>
                      <td className="p-2.5 text-right font-bold text-white">
                        LKR {Number(item.lineTotal).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs">
              <div className="text-slate-400">Status: <span className="font-bold text-emerald-400">{selectedGRN.status}</span></div>
              <div className="text-base font-bold text-white">
                Grand Total: LKR {Number(selectedGRN.totalAmount).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
