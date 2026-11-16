'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Plus,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Printer,
  PackageCheck,
  ArrowRight,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../lib/auth-store';
import { Pagination } from '../../../components/Pagination';
import { TableSkeleton } from '../../../components/TableSkeleton';
import { EmptyState } from '../../../components/EmptyState';

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'orders' | 'requisitions'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [requisitions, setRequisitions] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [variants, setVariants] = useState<any[]>([]);

  // Pagination for Orders
  const [poPage, setPoPage] = useState(1);
  const [poLimit, setPoLimit] = useState(20);
  const [poTotalPages, setPoTotalPages] = useState(1);
  const [poTotalItems, setPoTotalItems] = useState(0);

  // Pagination for Requisitions
  const [prPage, setPrPage] = useState(1);
  const [prLimit, setPrLimit] = useState(20);
  const [prTotalPages, setPrTotalPages] = useState(1);
  const [prTotalItems, setPrTotalItems] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');

  // Modals
  const [isCreatePOModalOpen, setIsCreatePOModalOpen] = useState(false);
  const [isCreatePRModalOpen, setIsCreatePRModalOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [convertPRId, setConvertPRId] = useState<string | null>(null);
  const [convertSupplierId, setConvertSupplierId] = useState('');

  // PO Form State
  const [newPO, setNewPO] = useState({
    supplierId: '',
    warehouseId: '',
    expectedDate: '',
    paymentTerms: 'Net 30 Days',
    referenceNumber: '',
    discountAmount: 0,
    taxAmount: 0,
    shippingCharges: 0,
    otherCharges: 0,
    notes: '',
    items: [
      {
        variantId: '',
        quantityOrdered: 10,
        freeQuantity: 0,
        unitCost: 100,
        discountAmount: 0,
        taxAmount: 0,
      },
    ],
  });

  // PR Form State
  const [newPR, setNewPR] = useState({
    warehouseId: '',
    supplierId: '',
    requiredDate: '',
    reason: '',
    remarks: '',
    items: [
      {
        variantId: '',
        requestedQuantity: 20,
        estimatedUnitCost: 100,
        reason: '',
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
      const qPO = new URLSearchParams();
      qPO.set('page', String(poPage));
      qPO.set('limit', String(poLimit));
      if (search) qPO.append('search', search);
      if (statusFilter) qPO.append('status', statusFilter);
      if (supplierFilter) qPO.append('supplierId', supplierFilter);

      const qPR = new URLSearchParams();
      qPR.set('page', String(prPage));
      qPR.set('limit', String(prLimit));
      if (search) qPR.append('search', search);
      if (statusFilter) qPR.append('status', statusFilter);
      if (supplierFilter) qPR.append('supplierId', supplierFilter);

      const [poRes, prRes, supRes, whRes, catRes] = await Promise.all([
        apiClient<any>(`/purchasing/orders?${qPO.toString()}`),
        apiClient<any>(`/purchasing/requisitions?${qPR.toString()}`),
        apiClient<any>('/purchasing/suppliers?limit=100'),
        apiClient<any>('/merchant/warehouses').catch(() => []),
        apiClient<any>('/catalog/products?limit=100').catch(() => ({ items: [] })),
      ]);

      setOrders(poRes?.items || (Array.isArray(poRes) ? poRes : []));
      if (poRes?.meta) {
        setPoTotalPages(poRes.meta.totalPages || 1);
        setPoTotalItems(poRes.meta.total || 0);
      }

      setRequisitions(prRes?.items || (Array.isArray(prRes) ? prRes : []));
      if (prRes?.meta) {
        setPrTotalPages(prRes.meta.totalPages || 1);
        setPrTotalItems(prRes.meta.total || 0);
      }

      setSuppliers(supRes?.items || (Array.isArray(supRes) ? supRes : []));
      setWarehouses(Array.isArray(whRes) ? whRes : whRes?.items || []);

      const allVariants: any[] = [];
      const prods = catRes?.items || (Array.isArray(catRes) ? catRes : []);
      prods.forEach((p: any) => {
        (p.variants || []).forEach((v: any) => {
          allVariants.push({
            ...v,
            productName: p.name,
          });
        });
      });
      setVariants(allVariants);

      if (supRes?.items?.length > 0 && !newPO.supplierId) {
        setNewPO((prev) => ({ ...prev, supplierId: supRes.items[0].id }));
      }
      const whList = Array.isArray(whRes) ? whRes : whRes?.items || [];
      if (whList.length > 0 && !newPO.warehouseId) {
        setNewPO((prev) => ({ ...prev, warehouseId: whList[0].id }));
        setNewPR((prev) => ({ ...prev, warehouseId: whList[0].id }));
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load purchase orders');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPoPage(1);
    setPrPage(1);
  }, [search, statusFilter, supplierFilter]);

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [isAuthenticated, poPage, poLimit, prPage, prLimit, search, statusFilter, supplierFilter]);

  // Handle PO Line Item Changes
  const updatePOLine = (index: number, field: string, value: any) => {
    const updated: any[] = [...newPO.items];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-fill cost if variant selected
    if (field === 'variantId') {
      const v = variants.find((variant) => variant.id === value);
      if (v) {
        updated[index].unitCost = Number(v.costPrice || 0);
      }
    }

    setNewPO({ ...newPO, items: updated });
  };

  const addPOLine = () => {
    setNewPO({
      ...newPO,
      items: [
        ...newPO.items,
        {
          variantId: variants[0]?.id || '',
          quantityOrdered: 10,
          freeQuantity: 0,
          unitCost: Number(variants[0]?.costPrice || 100),
          discountAmount: 0,
          taxAmount: 0,
        },
      ],
    });
  };

  const removePOLine = (index: number) => {
    if (newPO.items.length === 1) return;
    setNewPO({ ...newPO, items: newPO.items.filter((_, i) => i !== index) });
  };

  const updatePRLine = (index: number, field: string, value: any) => {
    const updated: any[] = [...newPR.items];
    updated[index] = { ...updated[index], [field]: value };
    if (field === 'variantId') {
      const v = variants.find((variant) => variant.id === value);
      if (v) {
        updated[index].estimatedUnitCost = Number(v.costPrice || 0);
      }
    }
    setNewPR({ ...newPR, items: updated });
  };

  const addPRLine = () => {
    setNewPR({
      ...newPR,
      items: [
        ...newPR.items,
        {
          variantId: variants[0]?.id || '',
          requestedQuantity: 20,
          estimatedUnitCost: Number(variants[0]?.costPrice || 100),
          reason: '',
        },
      ],
    });
  };

  const removePRLine = (index: number) => {
    if (newPR.items.length === 1) return;
    setNewPR({ ...newPR, items: newPR.items.filter((_, i) => i !== index) });
  };

  // Submit PO
  const handleCreatePO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/purchasing/orders', {
        method: 'POST',
        body: JSON.stringify(newPO),
      });
      setSuccessMsg('Purchase Order created in DRAFT!');
      setIsCreatePOModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create PO');
    }
  };

  // Submit PR
  const handleCreatePR = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/purchasing/requisitions', {
        method: 'POST',
        body: JSON.stringify(newPR),
      });
      setSuccessMsg('Requisition submitted for approval!');
      setIsCreatePRModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to submit requisition');
    }
  };

  // Approve PO
  const handleApprovePO = async (id: string) => {
    try {
      await apiClient(`/purchasing/orders/${id}/approve`, { method: 'POST' });
      setSuccessMsg('Purchase Order approved!');
      loadData();
      if (selectedPO) setSelectedPO(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve PO');
    }
  };

  // Issue PO
  const handleIssuePO = async (id: string) => {
    try {
      await apiClient(`/purchasing/orders/${id}/issue`, { method: 'POST' });
      setSuccessMsg('PO issued / sent to supplier!');
      loadData();
      if (selectedPO) setSelectedPO(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to issue PO');
    }
  };

  // Approve PR
  const handleApprovePR = async (id: string) => {
    try {
      await apiClient(`/purchasing/requisitions/${id}/approve`, {
        method: 'POST',
        body: JSON.stringify({ remarks: 'Approved' }),
      });
      setSuccessMsg('Requisition approved!');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to approve requisition');
    }
  };

  // Convert PR to PO
  const handleConvertPR = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertPRId || !convertSupplierId) return;
    try {
      await apiClient(`/purchasing/requisitions/${convertPRId}/convert-to-po`, {
        method: 'POST',
        body: JSON.stringify({ supplierId: convertSupplierId }),
      });
      setSuccessMsg('Requisition successfully converted to Purchase Order!');
      setConvertPRId(null);
      loadData();
      setActiveTab('orders');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to convert requisition');
    }
  };

  // Calculate Subtotal and Total
  const poSubtotal = newPO.items.reduce((sum, item) => {
    const line = item.quantityOrdered * item.unitCost - (item.discountAmount || 0) + (item.taxAmount || 0);
    return sum + Math.max(0, line);
  }, 0);

  const poGrandTotal = Math.max(
    0,
    poSubtotal - Number(newPO.discountAmount || 0) + Number(newPO.taxAmount || 0) + Number(newPO.shippingCharges || 0) + Number(newPO.otherCharges || 0),
  );

  return (
    <div className="flex-1 bg-slate-950 p-6 max-w-7xl mx-auto w-full space-y-6 text-slate-100">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <FileText className="w-7 h-7 text-emerald-400" />
            Purchase Orders & Procurement
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Manage purchase requisitions, approve orders, and track goods delivery fulfillment
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'orders' ? (
            <button
              onClick={() => setIsCreatePOModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition"
            >
              <Plus className="w-4 h-4" />
              New Purchase Order
            </button>
          ) : (
            <button
              onClick={() => setIsCreatePRModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition"
            >
              <Plus className="w-4 h-4" />
              Create Requisition (PR)
            </button>
          )}
        </div>
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

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('orders')}
          className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'orders'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Purchase Orders ({poTotalItems})
        </button>
        <button
          onClick={() => setActiveTab('requisitions')}
          className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'requisitions'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Purchase Requisitions (PR) ({prTotalItems})
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'orders'
                ? 'Search PO #, reference, or supplier...'
                : 'Search Requisition # or reason...'
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {activeTab === 'orders' && (
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="" className="bg-slate-900 text-slate-400">All Suppliers</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
          >
            <option value="" className="bg-slate-900 text-slate-400">All Statuses</option>
            {activeTab === 'orders' ? (
              <>
                <option value="DRAFT" className="bg-slate-900 text-white">Draft</option>
                <option value="APPROVED" className="bg-slate-900 text-white">Approved</option>
                <option value="ISSUED" className="bg-slate-900 text-white">Issued</option>
                <option value="PARTIALLY_RECEIVED" className="bg-slate-900 text-white">Partially Received</option>
                <option value="COMPLETED" className="bg-slate-900 text-white">Completed</option>
                <option value="CANCELLED" className="bg-slate-900 text-white">Cancelled</option>
              </>
            ) : (
              <>
                <option value="PENDING_APPROVAL" className="bg-slate-900 text-white">Pending Approval</option>
                <option value="APPROVED" className="bg-slate-900 text-white">Approved</option>
                <option value="CONVERTED" className="bg-slate-900 text-white">Converted to PO</option>
                <option value="REJECTED" className="bg-slate-900 text-white">Rejected</option>
              </>
            )}
          </select>

          <button
            onClick={loadData}
            title="Refresh"
            className="p-2 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      {activeTab === 'orders' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">PO Number</th>
                  <th className="px-4 py-3.5">Supplier</th>
                  <th className="px-4 py-3.5">Warehouse</th>
                  <th className="px-4 py-3.5">Expected Date</th>
                  <th className="px-4 py-3.5 text-right">Grand Total</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading ? (
                  <TableSkeleton columns={7} rows={6} theme="dark" />
                ) : orders.length === 0 ? (
                  <EmptyState
                    colSpan={7}
                    theme="dark"
                    icon={FileText}
                    isSearchActive={Boolean(search || statusFilter)}
                    searchQuery={search}
                    title={search || statusFilter ? 'No purchase orders match your filters' : 'No purchase orders created'}
                    description={
                      search || statusFilter
                        ? 'No purchase orders match your search keyword or status criteria. Try clearing filters.'
                        : 'Create your first purchase order against a registered supplier to restock inventory.'
                    }
                    onResetFilters={() => {
                      setSearch('');
                      setStatusFilter('');
                      setPoPage(1);
                    }}
                    actionLabel="New Purchase Order"
                    onAction={() => setIsCreatePOModalOpen(true)}
                  />
                ) : (
                  orders.map((po) => {
                    const statusBadge: Record<string, string> = {
                      DRAFT: 'bg-slate-800 text-slate-300 border-slate-700',
                      APPROVED: 'bg-emerald-950 text-emerald-300 border-emerald-800',
                      ISSUED: 'bg-blue-950 text-blue-300 border-blue-800',
                      PARTIALLY_RECEIVED: 'bg-amber-950 text-amber-300 border-amber-800',
                      COMPLETED: 'bg-emerald-950 text-emerald-300 border-emerald-800',
                      CANCELLED: 'bg-rose-950 text-rose-300 border-rose-800',
                    };

                    return (
                      <tr key={po.id} className="hover:bg-slate-850 transition">
                        <td className="px-4 py-3.5 font-bold text-emerald-400">
                          {po.poNumber}
                          {po.referenceNumber && (
                            <div className="text-[10px] text-slate-500 font-normal">
                              Ref: {po.referenceNumber}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 font-medium text-slate-100">
                          {po.supplier?.name}
                          <div className="text-xs text-slate-400">{po.supplier?.code}</div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-300">
                          {po.warehouse?.name || 'Warehouse'}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-400">
                          {po.expectedDate ? new Date(po.expectedDate).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-white">
                          LKR {Number(po.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                              statusBadge[po.status] || 'bg-slate-800 text-slate-300 border-slate-700'
                            }`}
                          >
                            {po.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {po.status === 'DRAFT' && (
                            <button
                              onClick={() => handleApprovePO(po.id)}
                              className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 rounded-lg transition"
                            >
                              Approve
                            </button>
                          )}
                          {(po.status === 'APPROVED' || po.status === 'DRAFT') && (
                            <button
                              onClick={() => handleIssuePO(po.id)}
                              className="px-2.5 py-1 text-xs font-medium text-blue-300 bg-blue-950 hover:bg-blue-900 border border-blue-800 rounded-lg transition"
                            >
                              Send / Issue
                            </button>
                          )}
                          {(po.status === 'ISSUED' || po.status === 'PARTIALLY_RECEIVED') && (
                            <button
                              onClick={() => router.push(`/purchasing/grn?poId=${po.id}`)}
                              className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 rounded-lg transition inline-flex items-center gap-1"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              Receive Goods
                            </button>
                          )}
                          <button
                            onClick={async () => {
                              const details = await apiClient(`/purchasing/orders/${po.id}`);
                              setSelectedPO(details);
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
            currentPage={poPage}
            totalPages={poTotalPages}
            totalItems={poTotalItems}
            limit={poLimit}
            onPageChange={setPoPage}
            onLimitChange={setPoLimit}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Requisitions Table */}
      {activeTab === 'requisitions' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Requisition #</th>
                  <th className="px-4 py-3.5">Destination Warehouse</th>
                  <th className="px-4 py-3.5">Required Date</th>
                  <th className="px-4 py-3.5">Reason</th>
                  <th className="px-4 py-3.5 text-right">Estimated Value</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading ? (
                  <TableSkeleton columns={7} rows={6} theme="dark" />
                ) : requisitions.length === 0 ? (
                  <EmptyState
                    colSpan={7}
                    theme="dark"
                    icon={FileText}
                    isSearchActive={Boolean(search || statusFilter)}
                    searchQuery={search}
                    title={search || statusFilter ? 'No requisitions match your filters' : 'No purchase requisitions yet'}
                    description={
                      search || statusFilter
                        ? 'No internal requisitions match your search keyword or status criteria. Try clearing filters.'
                        : 'Internal purchase requisitions allow branches to request stock replenishment before generating a supplier PO.'
                    }
                    onResetFilters={() => {
                      setSearch('');
                      setStatusFilter('');
                      setPrPage(1);
                    }}
                    actionLabel="New Requisition"
                    onAction={() => setIsCreatePRModalOpen(true)}
                  />
                ) : (
                  requisitions.map((pr) => (
                    <tr key={pr.id} className="hover:bg-slate-850 transition">
                      <td className="px-4 py-3.5 font-bold text-emerald-400">{pr.requisitionNo}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-100">{pr.warehouse?.name}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">
                        {pr.requiredDate ? new Date(pr.requiredDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-300 max-w-xs truncate">
                        {pr.reason || 'General replenishment'}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-white">
                        LKR {Number(pr.totalEstimated || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {pr.status}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                        {pr.status === 'PENDING_APPROVAL' && (
                          <button
                            onClick={() => handleApprovePR(pr.id)}
                            className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 rounded-lg transition"
                          >
                            Approve
                          </button>
                        )}
                        {pr.status === 'APPROVED' && (
                          <button
                            onClick={() => {
                              setConvertPRId(pr.id);
                              setConvertSupplierId(pr.supplierId || suppliers[0]?.id || '');
                            }}
                            className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 rounded-lg transition inline-flex items-center gap-1"
                          >
                            <ArrowRight className="w-3.5 h-3.5" />
                            Convert to PO
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={prPage}
            totalPages={prTotalPages}
            totalItems={prTotalItems}
            limit={prLimit}
            onPageChange={setPrPage}
            onLimitChange={setPrLimit}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Create Purchase Order Modal */}
      {isCreatePOModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                Create Purchase Order
              </h3>
              <button onClick={() => setIsCreatePOModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePO} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Supplier *</label>
                  <select
                    required
                    value={newPO.supplierId}
                    onChange={(e) => setNewPO({ ...newPO, supplierId: e.target.value })}
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
                    value={newPO.warehouseId}
                    onChange={(e) => setNewPO({ ...newPO, warehouseId: e.target.value })}
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
                  <label className="block text-slate-300 font-medium mb-1">Expected Delivery Date</label>
                  <input
                    type="date"
                    value={newPO.expectedDate}
                    onChange={(e) => setNewPO({ ...newPO, expectedDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Line Items Table */}
              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-slate-300">Order Line Items</h4>
                  <button
                    type="button"
                    onClick={addPOLine}
                    className="text-xs text-emerald-400 hover:text-emerald-300 font-bold"
                  >
                    + Add Product Line
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 uppercase border-b border-slate-800">
                        <th className="pb-2">Product Variant</th>
                        <th className="pb-2 w-24">Qty</th>
                        <th className="pb-2 w-20">Free Qty</th>
                        <th className="pb-2 w-28">Unit Cost</th>
                        <th className="pb-2 w-24">Discount</th>
                        <th className="pb-2 text-right">Line Total</th>
                        <th className="pb-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {newPO.items.map((line, idx) => {
                        const lineGross = line.quantityOrdered * line.unitCost;
                        const lineTotal = Math.max(0, lineGross - (line.discountAmount || 0));

                        return (
                          <tr key={idx} className="hover:bg-slate-900 transition">
                            <td className="py-2 pr-2">
                              <select
                                required
                                value={line.variantId}
                                onChange={(e) => updatePOLine(idx, 'variantId', e.target.value)}
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
                                value={line.quantityOrdered}
                                onChange={(e) => updatePOLine(idx, 'quantityOrdered', Number(e.target.value))}
                                className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="py-2 pr-2">
                              <input
                                type="number"
                                min="0"
                                value={line.freeQuantity}
                                onChange={(e) => updatePOLine(idx, 'freeQuantity', Number(e.target.value))}
                                className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="py-2 pr-2">
                              <input
                                type="number"
                                min="0"
                                value={line.unitCost}
                                onChange={(e) => updatePOLine(idx, 'unitCost', Number(e.target.value))}
                                className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="py-2 pr-2">
                              <input
                                type="number"
                                min="0"
                                value={line.discountAmount}
                                onChange={(e) => updatePOLine(idx, 'discountAmount', Number(e.target.value))}
                                className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                            <td className="py-2 text-right font-bold text-white">
                              LKR {lineTotal.toLocaleString()}
                            </td>
                            <td className="py-2 text-right">
                              <button
                                type="button"
                                onClick={() => removePOLine(idx)}
                                className="text-rose-400 hover:text-rose-300 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary and Financials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-800 pt-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Remarks / Delivery Notes</label>
                  <textarea
                    rows={3}
                    value={newPO.notes}
                    onChange={(e) => setNewPO({ ...newPO, notes: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    placeholder="Instructions for supplier or logistics..."
                  />
                </div>

                <div className="space-y-1.5 text-xs text-right">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Subtotal:</span>
                    <span className="font-semibold text-slate-200">LKR {poSubtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Order Discount:</span>
                    <input
                      type="number"
                      min="0"
                      value={newPO.discountAmount}
                      onChange={(e) => setNewPO({ ...newPO, discountAmount: Number(e.target.value) })}
                      className="w-24 text-right bg-slate-950 border border-slate-800 text-white rounded p-1 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Shipping / Freight:</span>
                    <input
                      type="number"
                      min="0"
                      value={newPO.shippingCharges}
                      onChange={(e) => setNewPO({ ...newPO, shippingCharges: Number(e.target.value) })}
                      className="w-24 text-right bg-slate-950 border border-slate-800 text-white rounded p-1 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-800 text-sm font-bold text-emerald-400">
                    <span>Grand Total:</span>
                    <span>LKR {poGrandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatePOModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition shadow-sm shadow-emerald-600/20"
                >
                  Save Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Purchase Requisition (PR) Modal */}
      {isCreatePRModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                Create Purchase Requisition (PR)
              </h3>
              <button onClick={() => setIsCreatePRModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePR} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Destination Warehouse *</label>
                  <select
                    required
                    value={newPR.warehouseId}
                    onChange={(e) => setNewPR({ ...newPR, warehouseId: e.target.value })}
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
                  <label className="block text-slate-300 font-medium mb-1">Suggested Supplier (Optional)</label>
                  <select
                    value={newPR.supplierId}
                    onChange={(e) => setNewPR({ ...newPR, supplierId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">Any Preferred Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-white">
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Required By Date *</label>
                  <input
                    type="date"
                    required
                    value={newPR.requiredDate}
                    onChange={(e) => setNewPR({ ...newPR, requiredDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Requisition Reason / Justification</label>
                <input
                  type="text"
                  value={newPR.reason}
                  onChange={(e) => setNewPR({ ...newPR, reason: e.target.value })}
                  placeholder="e.g. Stock replenishment for weekend peak sale"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Items Grid */}
              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-slate-300">Requested Products</h4>
                  <button type="button" onClick={addPRLine} className="text-xs text-emerald-400 hover:text-emerald-300 font-bold">
                    + Add Item
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 uppercase border-b border-slate-800">
                        <th className="pb-2">Product / Variant</th>
                        <th className="pb-2 w-28">Requested Qty</th>
                        <th className="pb-2 w-32">Est. Unit Cost</th>
                        <th className="pb-2">Line Est.</th>
                        <th className="pb-2 w-8"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {newPR.items.map((line, idx) => (
                        <tr key={idx} className="hover:bg-slate-900 transition">
                          <td className="py-2 pr-2">
                            <select
                              required
                              value={line.variantId}
                              onChange={(e) => updatePRLine(idx, 'variantId', e.target.value)}
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
                              value={line.requestedQuantity}
                              onChange={(e) => updatePRLine(idx, 'requestedQuantity', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2 pr-2">
                            <input
                              type="number"
                              min="0"
                              value={line.estimatedUnitCost}
                              onChange={(e) => updatePRLine(idx, 'estimatedUnitCost', Number(e.target.value))}
                              className="w-full bg-slate-950 border border-slate-800 text-white rounded p-1.5 focus:outline-none focus:border-emerald-500"
                            />
                          </td>
                          <td className="py-2 font-bold text-white">
                            LKR {(line.requestedQuantity * line.estimatedUnitCost).toLocaleString()}
                          </td>
                          <td className="py-2 text-right">
                            <button
                              type="button"
                              onClick={() => removePRLine(idx)}
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
                <label className="block text-slate-300 font-medium mb-1">Remarks</label>
                <textarea
                  rows={2}
                  value={newPR.remarks}
                  onChange={(e) => setNewPR({ ...newPR, remarks: e.target.value })}
                  placeholder="Optional internal remarks for the approving manager..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreatePRModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition shadow-sm shadow-emerald-600/20"
                >
                  Submit Requisition
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Convert PR Modal */}
      {convertPRId && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <h3 className="text-base font-bold text-white">Convert Requisition to PO</h3>
            <p className="text-xs text-slate-400">
              Select the vendor/supplier to issue this purchase order against.
            </p>
            <form onSubmit={handleConvertPR} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Select Supplier *</label>
                <select
                  required
                  value={convertSupplierId}
                  onChange={(e) => setConvertSupplierId(e.target.value)}
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
              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setConvertPRId(null)}
                  className="px-3 py-1.5 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition shadow-sm shadow-emerald-600/20"
                >
                  Generate PO
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View PO Details Modal */}
      {selectedPO && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-3xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <div className="text-xs font-mono font-bold text-emerald-400">{selectedPO.poNumber}</div>
                <h3 className="text-lg font-bold text-white">{selectedPO.supplier?.name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 text-xs border border-slate-700 rounded-lg text-slate-300 flex items-center gap-1 hover:bg-slate-800 hover:text-white transition"
                >
                  <Printer className="w-3.5 h-3.5" /> Print
                </button>
                <button onClick={() => setSelectedPO(null)} className="text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 text-xs bg-slate-950 border border-slate-800 p-3 rounded-lg">
              <div>
                <span className="text-slate-400">Warehouse:</span>
                <p className="font-semibold text-slate-200">{selectedPO.warehouse?.name}</p>
              </div>
              <div>
                <span className="text-slate-400">Status:</span>
                <p className="font-semibold text-emerald-400">{selectedPO.status}</p>
              </div>
              <div>
                <span className="text-slate-400">Grand Total:</span>
                <p className="font-bold text-white">
                  LKR {Number(selectedPO.totalAmount).toLocaleString()}
                </p>
              </div>
            </div>

            <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400">
                  <tr>
                    <th className="p-2.5">Item</th>
                    <th className="p-2.5">Ordered</th>
                    <th className="p-2.5">Received</th>
                    <th className="p-2.5 text-right">Unit Cost</th>
                    <th className="p-2.5 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {selectedPO.items?.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-800 transition">
                      <td className="p-2.5 font-medium text-slate-100">
                        {item.variant?.product?.name} ({item.variant?.sku})
                      </td>
                      <td className="p-2.5">{Number(item.quantityOrdered)}</td>
                      <td className="p-2.5 font-bold text-emerald-400">
                        {Number(item.quantityReceived)}
                      </td>
                      <td className="p-2.5 text-right">LKR {Number(item.unitCost).toLocaleString()}</td>
                      <td className="p-2.5 text-right font-semibold text-white">
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
