'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileCheck,
  Plus,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Scale,
  CreditCard,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../lib/auth-store';
import { Pagination } from '../../../components/Pagination';
import { TableSkeleton } from '../../../components/TableSkeleton';
import { EmptyState } from '../../../components/EmptyState';

export default function SupplierInvoicesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [invoices, setInvoices] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [grns, setGrns] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [isOverdueOnly, setIsOverdueOnly] = useState(false);

  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [threeWayMatchData, setThreeWayMatchData] = useState<any>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);

  // Form State
  const [newInvoice, setNewInvoice] = useState({
    supplierId: '',
    purchaseOrderId: '',
    grnId: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    discountAmount: 0,
    taxAmount: 0,
    shippingCharges: 0,
    notes: '',
    items: [
      {
        variantId: '',
        billedQuantity: 10,
        unitCost: 100,
        discountAmount: 0,
        taxAmount: 0,
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
      if (isOverdueOnly) q.append('isOverdue', 'true');

      const [invRes, supRes, poRes, grnRes, catRes] = await Promise.all([
        apiClient<any>(`/purchasing/invoices?${q.toString()}`),
        apiClient<any>('/purchasing/suppliers?limit=100'),
        apiClient<any>('/purchasing/orders?limit=100').catch(() => ({ items: [] })),
        apiClient<any>('/purchasing/grn?limit=100').catch(() => ({ items: [] })),
        apiClient<any>('/catalog/variants?limit=100').catch(() => ({ items: [] })),
      ]);

      setInvoices(invRes?.items || []);
      setTotalPages(invRes?.meta?.totalPages || 1);
      setTotalItems(invRes?.meta?.total || 0);
      setSuppliers(supRes?.items || []);
      setPurchaseOrders(poRes?.items || []);
      setGrns(grnRes?.items || []);
      setVariants(catRes?.items || []);

      if (supRes?.items?.length > 0 && !newInvoice.supplierId) {
        setNewInvoice((prev) => ({ ...prev, supplierId: supRes.items[0].id }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load supplier invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, page, limit, search, statusFilter, supplierFilter, isOverdueOnly]);

  // Pre-fill from GRN or PO
  const handleSelectGRN = async (grnId: string) => {
    if (!grnId) {
      setNewInvoice((prev) => ({ ...prev, grnId: '' }));
      return;
    }

    try {
      const grn = await apiClient<any>(`/purchasing/grn/${grnId}`);
      if (grn) {
        const items = grn.items.map((gi: any) => ({
          variantId: gi.variantId,
          billedQuantity: Number(gi.acceptedQuantity > 0 ? gi.acceptedQuantity : gi.quantityReceived),
          unitCost: Number(gi.unitCost),
          discountAmount: Number(gi.discountAmount || 0),
          taxAmount: Number(gi.taxAmount || 0),
        }));

        setNewInvoice((prev) => ({
          ...prev,
          supplierId: grn.supplierId,
          grnId: grn.id,
          purchaseOrderId: grn.purchaseOrderId || prev.purchaseOrderId,
          invoiceNumber: grn.supplierInvoiceRef || prev.invoiceNumber,
          items: items.length > 0 ? items : prev.items,
        }));
      }
    } catch {
      // Ignore
    }
  };

  const updateLine = (idx: number, field: string, val: any) => {
    const updated: any[] = [...newInvoice.items];
    updated[idx] = { ...updated[idx], [field]: val };
    setNewInvoice({ ...newInvoice, items: updated });
  };

  const addLine = () => {
    setNewInvoice({
      ...newInvoice,
      items: [
        ...newInvoice.items,
        {
          variantId: variants[0]?.id || '',
          billedQuantity: 10,
          unitCost: Number(variants[0]?.costPrice || 100),
          discountAmount: 0,
          taxAmount: 0,
        },
      ],
    });
  };

  const removeLine = (idx: number) => {
    if (newInvoice.items.length === 1) return;
    setNewInvoice({ ...newInvoice, items: newInvoice.items.filter((_, i) => i !== idx) });
  };

  // Submit Invoice
  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/purchasing/invoices', {
        method: 'POST',
        body: JSON.stringify(newInvoice),
      });
      setSuccessMsg('Supplier Invoice registered!');
      setIsCreateModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create invoice');
    }
  };

  // Verify Invoice
  const handleVerifyInvoice = async (id: string) => {
    try {
      await apiClient(`/purchasing/invoices/${id}/verify`, {
        method: 'POST',
        body: JSON.stringify({ notes: 'Verified and approved' }),
      });
      setSuccessMsg('Invoice verified! Payable liability posted to supplier ledger.');
      loadData();
      if (selectedInvoice) setSelectedInvoice(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify invoice');
    }
  };

  // View 3-Way Match
  const handleOpen3WayMatch = async (id: string) => {
    try {
      const match = await apiClient<any>(`/purchasing/invoices/${id}/three-way-match`);
      setThreeWayMatchData(match);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load 3-way match');
    }
  };

  // Top Metrics
  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const totalPayable = invoices.reduce((sum, inv) => sum + Number(inv.balanceAmount || 0), 0);
  const discrepancyCount = invoices.filter((inv) => inv.matchStatus === 'DISCREPANCY').length;

  return (
    <div className="flex-1 bg-slate-950 p-6 max-w-7xl mx-auto w-full space-y-6 text-slate-100">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-emerald-400" />
            Supplier Invoices & 3-Way Matching
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Reconcile vendor bills against Purchase Orders and Goods Received Notes before approving payables
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition font-bold"
        >
          <Plus className="w-4 h-4" />
          Register Supplier Invoice
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
          <div className="text-xs font-semibold uppercase text-slate-400">Total Invoiced</div>
          <div className="mt-1 text-2xl font-bold text-white">
            LKR {totalBilled.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-xs text-slate-400 mt-1">{invoices.length} invoices recorded</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="text-xs font-semibold uppercase text-amber-400">Pending Payables</div>
          <div className="mt-1 text-2xl font-bold text-amber-400">
            LKR {totalPayable.toLocaleString('en-US', { maximumFractionDigits: 0 })}
          </div>
          <p className="text-xs text-amber-400 mt-1">Unsettled invoice balance</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="text-xs font-semibold uppercase text-rose-400">3-Way Discrepancies</div>
          <div className="mt-1 text-2xl font-bold text-rose-400">{discrepancyCount}</div>
          <p className="text-xs text-rose-400 mt-1">Variance against PO or GRN</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="text-xs font-semibold uppercase text-emerald-400">Fully Paid Invoices</div>
          <div className="mt-1 text-2xl font-bold text-emerald-400">
            {invoices.filter((i) => i.status === 'FULLY_PAID').length}
          </div>
          <p className="text-xs text-emerald-400 mt-1">Completed settlements</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search invoice #, supplier, or discrepancy notes..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
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
            <option value="PENDING_VERIFICATION" className="bg-slate-900 text-white">Pending Verification</option>
            <option value="VERIFIED" className="bg-slate-900 text-white">Verified</option>
            <option value="PARTIALLY_PAID" className="bg-slate-900 text-white">Partially Paid</option>
            <option value="FULLY_PAID" className="bg-slate-900 text-white">Fully Paid</option>
          </select>

          <label className="flex items-center gap-1.5 text-xs text-slate-300 border border-slate-800 bg-slate-950 px-3 py-2 rounded-xl cursor-pointer hover:bg-slate-850 transition">
            <input
              type="checkbox"
              checked={isOverdueOnly}
              onChange={(e) => {
                setIsOverdueOnly(e.target.checked);
                setPage(1);
              }}
              className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0"
            />
            <span>Overdue Only</span>
          </label>

          <button onClick={loadData} title="Refresh" className="p-2 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-950 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Invoice #</th>
                <th className="px-4 py-3.5">Supplier</th>
                <th className="px-4 py-3.5">PO / GRN Match</th>
                <th className="px-4 py-3.5">Invoice / Due Date</th>
                <th className="px-4 py-3.5 text-right">Total Amount</th>
                <th className="px-4 py-3.5 text-right">Balance Due</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <TableSkeleton columns={8} rows={6} theme="dark" />
              ) : invoices.length === 0 ? (
                <EmptyState
                  colSpan={8}
                  theme="dark"
                  icon={FileCheck}
                  isSearchActive={Boolean(search || statusFilter || supplierFilter || isOverdueOnly)}
                  searchQuery={search}
                  title={search || statusFilter || supplierFilter || isOverdueOnly ? 'No invoices match your filters' : 'No supplier bills recorded'}
                  description={
                    search || statusFilter || supplierFilter || isOverdueOnly
                      ? 'No supplier invoices match your current search, status, or overdue criteria. Try clearing filters.'
                      : 'Record supplier invoices to perform 3-way matching against Purchase Orders and GRNs, and track payables.'
                  }
                  onResetFilters={() => {
                    setSearch('');
                    setStatusFilter('');
                    setSupplierFilter('');
                    setIsOverdueOnly(false);
                    setPage(1);
                  }}
                  actionLabel="Record Invoice"
                  onAction={() => setIsCreateModalOpen(true)}
                />
              ) : (
                invoices.map((inv) => {
                  const isOverdue = new Date(inv.dueDate) < new Date() && Number(inv.balanceAmount) > 0;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-850 transition">
                      <td className="px-4 py-3.5 font-bold text-emerald-400">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-100">{inv.supplier?.name}</td>
                      <td className="px-4 py-3.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          {inv.matchStatus === 'DISCREPANCY' ? (
                            <button
                              onClick={() => handleOpen3WayMatch(inv.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 transition"
                            >
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              Discrepancy
                            </button>
                          ) : (
                            <button
                              onClick={() => handleOpen3WayMatch(inv.id)}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 hover:bg-emerald-900 transition"
                            >
                              <Scale className="w-3 h-3 text-emerald-400" />
                              3-Way Match
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">
                        <div>Inv: {new Date(inv.invoiceDate).toLocaleDateString()}</div>
                        <div className={isOverdue ? 'text-rose-400 font-bold' : 'text-slate-500'}>
                          Due: {new Date(inv.dueDate).toLocaleDateString()} {isOverdue && '(OVERDUE)'}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-white">
                        LKR {Number(inv.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold">
                        <span className={Number(inv.balanceAmount) > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                          LKR {Number(inv.balanceAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                            inv.status === 'VERIFIED'
                              ? 'bg-blue-950 text-blue-300 border-blue-800'
                              : inv.status === 'FULLY_PAID'
                              ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'bg-amber-950 text-amber-300 border-amber-800'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {inv.status === 'PENDING_VERIFICATION' && (
                          <button
                            onClick={() => handleVerifyInvoice(inv.id)}
                            className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 rounded-lg transition inline-flex items-center gap-1"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Verify Bill
                          </button>
                        )}
                        {Number(inv.balanceAmount) > 0 && inv.status !== 'PENDING_VERIFICATION' && (
                          <button
                            onClick={() => router.push(`/purchasing/payments?supplierId=${inv.supplierId}&invoiceId=${inv.id}`)}
                            className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 rounded-lg transition inline-flex items-center gap-1"
                          >
                            <CreditCard className="w-3.5 h-3.5" />
                            Pay
                          </button>
                        )}
                        <button
                          onClick={async () => {
                            const details = await apiClient(`/purchasing/invoices/${inv.id}`);
                            setSelectedInvoice(details);
                          }}
                          className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-850 hover:bg-slate-800 border border-slate-700 rounded-lg transition"
                        >
                          View
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

      {/* 3-Way Match Matrix Modal */}
      {threeWayMatchData && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Scale className="w-5 h-5 text-emerald-400" />
                  3-Way Match Reconciliation Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  PO: <span className="font-semibold text-slate-200">{threeWayMatchData.poNumber || 'None'}</span> • GRN:{' '}
                  <span className="font-semibold text-slate-200">{threeWayMatchData.grnNumber || 'None'}</span> • Invoice:{' '}
                  <span className="font-semibold text-slate-200">{threeWayMatchData.invoiceNumber}</span>
                </p>
              </div>
              <button onClick={() => setThreeWayMatchData(null)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            {threeWayMatchData.discrepancyNote && (
              <div className="p-3 bg-rose-950 border border-rose-800 rounded-xl text-xs text-rose-300">
                <span className="font-bold">Detected Variances:</span>
                <p className="whitespace-pre-line mt-1">{threeWayMatchData.discrepancyNote}</p>
              </div>
            )}

            <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase">
                  <tr>
                    <th className="p-2.5">Variant</th>
                    <th className="p-2.5 text-center">PO Ordered</th>
                    <th className="p-2.5 text-center text-emerald-400">GRN Accepted</th>
                    <th className="p-2.5 text-center font-bold">Invoice Billed</th>
                    <th className="p-2.5 text-center">Qty Variance</th>
                    <th className="p-2.5 text-right">PO Cost</th>
                    <th className="p-2.5 text-right">Billed Cost</th>
                    <th className="p-2.5 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {threeWayMatchData.matrix.map((row: any, i: number) => (
                    <tr key={i} className={row.isDiscrepant ? 'bg-rose-950' : 'hover:bg-slate-800 transition'}>
                      <td className="p-2.5 font-medium text-slate-100">{row.variantName}</td>
                      <td className="p-2.5 text-center">{row.poOrderedQty ?? '—'}</td>
                      <td className="p-2.5 text-center font-semibold text-emerald-400">{row.grnAcceptedQty ?? '—'}</td>
                      <td className="p-2.5 text-center font-bold text-white">{row.invoiceBilledQty}</td>
                      <td className="p-2.5 text-center font-bold">
                        {row.qtyVariance !== null && row.qtyVariance !== 0 ? (
                          <span className="text-rose-400">+{row.qtyVariance}</span>
                        ) : (
                          <span className="text-emerald-400">0</span>
                        )}
                      </td>
                      <td className="p-2.5 text-right">
                        {row.poUnitCost ? `LKR ${row.poUnitCost}` : '—'}
                      </td>
                      <td className="p-2.5 text-right font-bold text-white">LKR {row.invoiceUnitCost}</td>
                      <td className="p-2.5 text-center">
                        {row.isDiscrepant ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            Variance
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            Matched
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setThreeWayMatchData(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition"
              >
                Close Reconciliation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Register Invoice Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-emerald-400" />
                Register Supplier Invoice
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateInvoice} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Supplier *</label>
                  <select
                    required
                    value={newInvoice.supplierId}
                    onChange={(e) => setNewInvoice({ ...newInvoice, supplierId: e.target.value })}
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
                  <label className="block text-slate-300 font-medium mb-1">Link Purchase Order</label>
                  <select
                    value={newInvoice.purchaseOrderId}
                    onChange={(e) => setNewInvoice({ ...newInvoice, purchaseOrderId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">Direct Invoice (No PO)</option>
                    {purchaseOrders.map((po) => (
                      <option key={po.id} value={po.id} className="bg-slate-900 text-white">
                        {po.poNumber} - {po.supplier?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Link GRN (Auto-fills items)</label>
                  <select
                    value={newInvoice.grnId}
                    onChange={(e) => handleSelectGRN(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">Direct Invoice (No GRN)</option>
                    {grns.map((g) => (
                      <option key={g.id} value={g.id} className="bg-slate-900 text-white">
                        {g.grnNumber} - {g.supplier?.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Invoice Number *</label>
                  <input
                    type="text"
                    required
                    value={newInvoice.invoiceNumber}
                    onChange={(e) => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
                    placeholder="e.g. INV-99182"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Invoice Date *</label>
                  <input
                    type="date"
                    required
                    value={newInvoice.invoiceDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, invoiceDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Due Date *</label>
                  <input
                    type="date"
                    required
                    value={newInvoice.dueDate}
                    onChange={(e) => setNewInvoice({ ...newInvoice, dueDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Items Grid */}
              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-slate-300">Billed Line Items</h4>
                  <button type="button" onClick={addLine} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold">
                    + Add Item
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 uppercase border-b border-slate-800">
                        <th className="pb-2">Variant</th>
                        <th className="pb-2 w-24">Billed Qty</th>
                        <th className="pb-2 w-28">Unit Cost</th>
                        <th className="pb-2 w-24">Discount</th>
                        <th className="pb-2 text-right">Line Total</th>
                        <th className="pb-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {newInvoice.items.map((line, idx) => (
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
                              value={line.billedQuantity}
                              onChange={(e) => updateLine(idx, 'billedQuantity', Number(e.target.value))}
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
                            <input
                              type="number"
                              min="0"
                              value={line.discountAmount}
                              onChange={(e) => updateLine(idx, 'discountAmount', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2 text-right font-bold text-white">
                            LKR {(line.billedQuantity * line.unitCost - (line.discountAmount || 0)).toLocaleString()}
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
                  Register Invoice
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Invoice Details Modal */}
      {selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-mono font-bold text-emerald-400">{selectedInvoice.invoiceNumber}</div>
                <h3 className="text-lg font-bold text-white">{selectedInvoice.supplier?.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs border border-slate-700 rounded-lg text-slate-300 flex items-center gap-1 hover:bg-slate-800 hover:text-white transition"
                >
                  Print
                </button>
                <button onClick={() => setSelectedInvoice(null)} className="text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-950 border border-slate-800 p-3 rounded-lg">
              <div>
                <span className="text-slate-400">Invoice Date:</span>
                <p className="font-semibold text-slate-200">
                  {new Date(selectedInvoice.invoiceDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Due Date:</span>
                <p className="font-semibold text-slate-200">
                  {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                </p>
              </div>
              <div>
                <span className="text-slate-400">Balance Due:</span>
                <p className="font-bold text-amber-400">
                  LKR {Number(selectedInvoice.balanceAmount).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5">Billed Qty</th>
                    <th className="p-2.5 text-right">Unit Cost</th>
                    <th className="p-2.5 text-right">Discount</th>
                    <th className="p-2.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {selectedInvoice.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-800 transition">
                      <td className="p-2.5 font-medium text-slate-100">
                        {item.variant?.product?.name || 'Item'} ({item.variant?.sku || '—'})
                      </td>
                      <td className="p-2.5">{Number(item.billedQuantity)}</td>
                      <td className="p-2.5 text-right">LKR {Number(item.unitCost).toLocaleString()}</td>
                      <td className="p-2.5 text-right">
                        {Number(item.discountAmount) > 0 ? `LKR ${Number(item.discountAmount).toLocaleString()}` : '—'}
                      </td>
                      <td className="p-2.5 text-right font-semibold text-white">
                        LKR {Number(item.lineTotal).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-800 text-xs">
              <div className="text-slate-400">Status: <span className="font-bold text-emerald-400">{selectedInvoice.status}</span></div>
              <div className="text-base font-bold text-white">
                Grand Total: LKR {Number(selectedInvoice.totalAmount).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
