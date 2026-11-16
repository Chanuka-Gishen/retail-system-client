'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Truck,
  Plus,
  Search,
  RefreshCw,
  Building2,
  Phone,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  X,
  UserCheck,
  ShieldAlert,
  Printer,
  Eye,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../lib/auth-store';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { EmptyState } from '../../components/EmptyState';

export default function SuppliersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // State
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [supplierDashboard, setSupplierDashboard] = useState<any>(null);
  const [activeDrawerTab, setActiveDrawerTab] = useState<
    'overview' | 'orders' | 'grns' | 'invoices' | 'returns' | 'ledger' | 'contacts' | 'edit'
  >('overview');

  // New Supplier Form State
  const [newSupplier, setNewSupplier] = useState({
    code: '',
    name: '',
    businessRegNumber: '',
    supplierType: 'COMPANY',
    categoryId: '',
    contactPerson: '',
    email: '',
    phone: '',
    phoneSecondary: '',
    website: '',
    address: '',
    city: '',
    district: '',
    country: 'Sri Lanka',
    billingAddress: '',
    deliveryAddress: '',
    taxNumber: '',
    creditDays: 30,
    creditLimit: 0,
    openingBalance: 0,
    preferredPaymentMethod: 'BANK_TRANSFER',
    defaultCurrency: 'LKR',
    bankName: '',
    bankBranch: '',
    bankAccountName: '',
    bankAccountNumber: '',
    notes: '',
  });

  // Edit Supplier Form State
  const [editSupplier, setEditSupplier] = useState<any>(null);

  // New Category State
  const [newCategoryCode, setNewCategoryCode] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  // Contact Form State
  const [newContact, setNewContact] = useState({
    name: '',
    designation: '',
    phone: '',
    email: '',
    contactType: 'Sales',
    isPrimary: false,
  });

  // Ledger Filter State
  const [ledgerStartDate, setLedgerStartDate] = useState('');
  const [ledgerEndDate, setLedgerEndDate] = useState('');
  const [ledgerData, setLedgerData] = useState<any>(null);

  // Auth Protection
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load Initial Data
  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const queryParams = new URLSearchParams();
      queryParams.set('page', String(page));
      queryParams.set('limit', String(limit));
      if (search) queryParams.set('search', search);
      if (statusFilter) queryParams.set('status', statusFilter);
      if (categoryFilter) queryParams.set('categoryId', categoryFilter);

      const [suppliersRes, catsRes] = await Promise.all([
        apiClient<any>(`/purchasing/suppliers?${queryParams.toString()}`),
        apiClient<any[]>('/purchasing/suppliers/categories'),
      ]);

      setSuppliers(suppliersRes?.items || (Array.isArray(suppliersRes) ? suppliersRes : []));
      setCategories(catsRes || []);
      if (suppliersRes?.meta) {
        setTotalPages(suppliersRes.meta.totalPages || 1);
        setTotalItems(suppliersRes.meta.total || 0);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load suppliers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, categoryFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      loadData();
    }
  }, [isAuthenticated, page, limit, search, statusFilter, categoryFilter]);

  // Load Dashboard when supplier selected
  const loadSupplierDashboard = async (supplierId: string) => {
    try {
      const data = await apiClient<any>(`/purchasing/suppliers/${supplierId}/dashboard`);
      setSupplierDashboard(data);
      setEditSupplier({ ...data.supplier });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load supplier details');
    }
  };

  const handleSelectSupplier = (id: string) => {
    setSelectedSupplierId(id);
    setActiveDrawerTab('overview');
    loadSupplierDashboard(id);
  };

  // Load Ledger
  const loadLedger = async (supplierId: string) => {
    try {
      const q = new URLSearchParams({ supplierId });
      if (ledgerStartDate) q.append('startDate', ledgerStartDate);
      if (ledgerEndDate) q.append('endDate', ledgerEndDate);

      const data = await apiClient<any>(`/purchasing/ledger/statement?${q.toString()}`);
      setLedgerData(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load ledger');
    }
  };

  useEffect(() => {
    if (selectedSupplierId && activeDrawerTab === 'ledger') {
      loadLedger(selectedSupplierId);
    }
  }, [selectedSupplierId, activeDrawerTab, ledgerStartDate, ledgerEndDate]);

  // Create Supplier
  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    try {
      await apiClient('/purchasing/suppliers', {
        method: 'POST',
        body: JSON.stringify(newSupplier),
      });
      setSuccessMsg('Supplier registered successfully!');
      setIsCreateModalOpen(false);
      setNewSupplier({
        code: '',
        name: '',
        businessRegNumber: '',
        supplierType: 'COMPANY',
        categoryId: '',
        contactPerson: '',
        email: '',
        phone: '',
        phoneSecondary: '',
        website: '',
        address: '',
        city: '',
        district: '',
        country: 'Sri Lanka',
        billingAddress: '',
        deliveryAddress: '',
        taxNumber: '',
        creditDays: 30,
        creditLimit: 0,
        openingBalance: 0,
        preferredPaymentMethod: 'BANK_TRANSFER',
        defaultCurrency: 'LKR',
        bankName: '',
        bankBranch: '',
        bankAccountName: '',
        bankAccountNumber: '',
        notes: '',
      });
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create supplier');
    }
  };

  // Update Supplier Details
  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId || !editSupplier) return;
    try {
      await apiClient(`/purchasing/suppliers/${selectedSupplierId}`, {
        method: 'PUT',
        body: JSON.stringify(editSupplier),
      });
      setSuccessMsg('Supplier profile updated!');
      loadSupplierDashboard(selectedSupplierId);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update supplier');
    }
  };

  // Update Status
  const handleStatusChange = async (newStatus: string) => {
    if (!selectedSupplierId) return;
    try {
      await apiClient(`/purchasing/suppliers/${selectedSupplierId}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
      setSuccessMsg(`Supplier status set to ${newStatus}`);
      loadSupplierDashboard(selectedSupplierId);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to change status');
    }
  };

  // Add Contact
  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplierId) return;
    try {
      await apiClient(`/purchasing/suppliers/${selectedSupplierId}/contacts`, {
        method: 'POST',
        body: JSON.stringify(newContact),
      });
      setNewContact({
        name: '',
        designation: '',
        phone: '',
        email: '',
        contactType: 'Sales',
        isPrimary: false,
      });
      setSuccessMsg('Contact added successfully!');
      loadSupplierDashboard(selectedSupplierId);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to add contact');
    }
  };

  // Create Category
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient('/purchasing/suppliers/categories', {
        method: 'POST',
        body: JSON.stringify({
          code: newCategoryCode,
          name: newCategoryName,
          description: newCategoryDesc,
        }),
      });
      setSuccessMsg('Category created!');
      setNewCategoryCode('');
      setNewCategoryName('');
      setNewCategoryDesc('');
      setIsCategoryModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create category');
    }
  };

  // Aggregate Metrics for Top Cards
  const totalOutstanding = suppliers.reduce((sum, s) => sum + Number(s.outstandingPayables || 0), 0);
  const activeCount = suppliers.filter((s) => s.status === 'ACTIVE' || s.isActive).length;

  return (
    <div className="flex-1 bg-slate-950 p-6 max-w-7xl mx-auto w-full space-y-6 text-slate-100">
      {/* Page Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2 tracking-tight">
            <Truck className="w-6 h-6 text-emerald-400" />
            Supplier Management
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Centralized directory, procurement accounts, payables, and live performance dashboards
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-800 hover:text-white transition shadow-sm"
          >
            <Building2 className="w-4 h-4 text-slate-400" />
            Categories
          </button>
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition"
          >
            <Plus className="w-4 h-4" />
            Register Supplier
          </button>
        </div>
      </div>

      {/* Alert Messages */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-950 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Total Suppliers</span>
            <Building2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{suppliers.length}</div>
          <p className="text-xs text-slate-500 mt-1">{categories.length} categories active</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Active Suppliers</span>
            <UserCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">{activeCount}</div>
          <p className="text-xs text-slate-500 mt-1">Available for PO issuance</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Total Outstanding</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">
            LKR {totalOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-xs text-amber-400 mt-1">Net accounts payable balance</p>
        </div>

        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Suspended / Blacklist</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-rose-400">
            {suppliers.filter((s) => s.status === 'SUSPENDED' || s.status === 'BLACKLISTED').length}
          </div>
          <p className="text-xs text-slate-500 mt-1">Blocked procurement accounts</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search suppliers by code, name, city, contact person, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
          >
            <option value="" className="bg-slate-900 text-slate-200">All Statuses</option>
            <option value="ACTIVE" className="bg-slate-900 text-slate-200">Active</option>
            <option value="INACTIVE" className="bg-slate-900 text-slate-200">Inactive</option>
            <option value="SUSPENDED" className="bg-slate-900 text-slate-200">Suspended</option>
            <option value="BLACKLISTED" className="bg-slate-900 text-slate-200">Blacklisted</option>
          </select>

          <button
            onClick={loadData}
            title="Refresh"
            className="p-2 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-[11px] font-semibold uppercase text-slate-400 border-b border-slate-800">
              <tr>
                <th className="px-4 py-3.5">Code / Supplier Name</th>
                <th className="px-4 py-3.5">Category & Type</th>
                <th className="px-4 py-3.5">Primary Contact</th>
                <th className="px-4 py-3.5">Credit Terms</th>
                <th className="px-4 py-3.5 text-right">Outstanding</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {isLoading ? (
                <TableSkeleton columns={7} rows={6} theme="dark" />
              ) : suppliers.length === 0 ? (
                <EmptyState
                  colSpan={7}
                  theme="dark"
                  icon={Truck}
                  isSearchActive={Boolean(search || statusFilter || categoryFilter)}
                  searchQuery={search}
                  title={search || statusFilter || categoryFilter ? 'No suppliers match your filters' : 'No suppliers registered'}
                  description={
                    search || statusFilter || categoryFilter
                      ? `No suppliers found matching your query criteria. Try clearing search filters.`
                      : 'Register your vendor accounts, distributors, and manufacturers to initiate purchase orders and GRNs.'
                  }
                  onResetFilters={() => {
                    setSearch('');
                    setStatusFilter('');
                    setCategoryFilter('');
                    setPage(1);
                  }}
                  actionLabel="Register Supplier"
                  onAction={() => setIsCreateModalOpen(true)}
                />
              ) : (
                suppliers.map((s) => {
                  const statusColors: Record<string, string> = {
                    ACTIVE: 'bg-emerald-950 text-emerald-400 border-emerald-800',
                    INACTIVE: 'bg-slate-800 text-slate-400 border-slate-700',
                    SUSPENDED: 'bg-amber-950 text-amber-400 border-amber-800',
                    BLACKLISTED: 'bg-rose-950 text-rose-400 border-rose-800',
                  };

                  const primaryContact = s.contacts?.[0] || {
                    name: s.contactPerson || '—',
                    phone: s.phone || '',
                  };

                  return (
                    <tr
                      key={s.id}
                      onClick={() => handleSelectSupplier(s.id)}
                      className="hover:bg-slate-850 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3.5 font-medium">
                        <div className="font-semibold text-emerald-400">{s.code}</div>
                        <div className="text-white font-medium">{s.name}</div>
                        {s.city && <div className="text-[11px] text-slate-500">{s.city}</div>}
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          {s.category?.name || 'Uncategorized'}
                        </span>
                        <div className="text-[11px] text-slate-500 mt-0.5">{s.supplierType}</div>
                      </td>

                      <td className="px-4 py-3.5 text-xs">
                        <div className="font-medium text-slate-200">{primaryContact.name}</div>
                        <div className="text-slate-400 flex items-center gap-1 mt-0.5 text-[11px]">
                          <Phone className="w-3 h-3 text-slate-500" />
                          {primaryContact.phone || s.phone || '—'}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs text-slate-300">
                        <div>{s.creditDays} Days</div>
                        <div className="text-[11px] text-slate-500">
                          Limit: LKR {Number(s.creditLimit || 0).toLocaleString()}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right font-medium">
                        <span
                          className={
                            Number(s.outstandingPayables || 0) > 0 ? 'text-amber-400 font-bold' : 'text-slate-400'
                          }
                        >
                          LKR {Number(s.outstandingPayables || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </td>

                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            statusColors[s.status] || 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {s.status}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectSupplier(s.id);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-400 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 rounded-lg transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Profile
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
          onPageChange={setPage}
          onLimitChange={setLimit}
          isLoading={isLoading}
        />
      </div>

      {/* Supplier Profile Drawer */}
      {selectedSupplierId && supplierDashboard && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950 flex justify-end">
          <div className="w-full max-w-4xl bg-slate-900 border-l border-slate-800 shadow-2xl h-full flex flex-col overflow-y-auto text-slate-100">
            {/* Drawer Header */}
            <div className="p-6 bg-slate-950 border-b border-slate-800 text-white flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold bg-emerald-950 px-2 py-0.5 rounded text-emerald-300 border border-emerald-800">
                    {supplierDashboard.supplier.code}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {supplierDashboard.supplier.category?.name || 'Uncategorized'}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {supplierDashboard.supplier.status}
                  </span>
                </div>
                <h2 className="text-2xl font-bold mt-2 text-white">{supplierDashboard.supplier.name}</h2>
                <p className="text-sm text-slate-400 mt-1 flex items-center gap-3">
                  <span>{supplierDashboard.supplier.contactPerson}</span>
                  <span>•</span>
                  <span>{supplierDashboard.supplier.phone}</span>
                  {supplierDashboard.supplier.city && (
                    <>
                      <span>•</span>
                      <span>{supplierDashboard.supplier.city}</span>
                    </>
                  )}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {/* Status Quick Switch */}
                <select
                  value={supplierDashboard.supplier.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  className="bg-slate-900 text-slate-200 border border-slate-700 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
                >
                  <option value="ACTIVE" className="bg-slate-900 text-white">
                    Status: ACTIVE
                  </option>
                  <option value="INACTIVE" className="bg-slate-900 text-white">
                    Status: INACTIVE
                  </option>
                  <option value="SUSPENDED" className="bg-slate-900 text-white">
                    Status: SUSPENDED
                  </option>
                  <option value="BLACKLISTED" className="bg-slate-900 text-white">
                    Status: BLACKLISTED
                  </option>
                </select>

                <button
                  onClick={() => setSelectedSupplierId(null)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Drawer Tabs */}
            <div className="border-b border-slate-800 bg-slate-950 px-6 flex items-center gap-2 overflow-x-auto text-sm font-medium">
              {[
                { id: 'overview', label: 'Live Dashboard' },
                { id: 'ledger', label: 'Statement of Account' },
                { id: 'orders', label: 'Purchase Orders' },
                { id: 'grns', label: 'Goods Receipts' },
                { id: 'invoices', label: 'Invoices' },
                { id: 'contacts', label: 'Contacts' },
                { id: 'edit', label: 'Edit Profile' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveDrawerTab(t.id as any)}
                  className={`py-3 px-3 border-b-2 font-medium whitespace-nowrap transition-colors ${
                    activeDrawerTab === t.id
                      ? 'border-emerald-500 text-emerald-400 bg-slate-900'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Drawer Body */}
            <div className="p-6 flex-1 overflow-y-auto space-y-6 text-slate-200">
              {/* TAB 1: Live Dashboard */}
              {activeDrawerTab === 'overview' && (
                <div className="space-y-6">
                  {/* Top Stats Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-950 p-4 rounded-xl border border-emerald-800">
                      <div className="text-xs uppercase font-semibold text-emerald-400">Total Purchases</div>
                      <div className="text-xl font-bold text-white mt-1">
                        LKR {supplierDashboard.metrics.totalPurchases.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {supplierDashboard.metrics.totalPurchasesCount} verified invoices
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-amber-800">
                      <div className="text-xs uppercase font-semibold text-amber-400">Outstanding Balance</div>
                      <div className="text-xl font-bold text-amber-400 mt-1">
                        LKR {supplierDashboard.metrics.outstandingBalance.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">Current payable liability</div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-rose-800">
                      <div className="text-xs uppercase font-semibold text-rose-400">Overdue Balance</div>
                      <div className="text-xl font-bold text-rose-400 mt-1">
                        LKR {supplierDashboard.metrics.overdueBalance.toLocaleString()}
                      </div>
                      <div className="text-xs text-rose-400 mt-1">
                        {supplierDashboard.metrics.overdueInvoicesCount} invoices overdue
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-emerald-800">
                      <div className="text-xs uppercase font-semibold text-emerald-400">Total Paid</div>
                      <div className="text-xl font-bold text-emerald-400 mt-1">
                        LKR {supplierDashboard.metrics.totalPaid.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {supplierDashboard.metrics.totalPaidCount} payments recorded
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-teal-800">
                      <div className="text-xs uppercase font-semibold text-teal-400">Available Credit</div>
                      <div className="text-xl font-bold text-teal-400 mt-1">
                        LKR {supplierDashboard.metrics.availableCredit.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        Limit: LKR {supplierDashboard.metrics.creditLimit.toLocaleString()}
                      </div>
                    </div>

                    <div className="bg-slate-950 p-4 rounded-xl border border-cyan-800">
                      <div className="text-xs uppercase font-semibold text-cyan-400">Upcoming Cheques</div>
                      <div className="text-xl font-bold text-cyan-400 mt-1">
                        LKR {supplierDashboard.metrics.upcomingChequesAmount.toLocaleString()}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {supplierDashboard.metrics.upcomingChequesCount} cheques awaiting deposit
                      </div>
                    </div>
                  </div>

                  {/* Supplier Profile Information Card */}
                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold uppercase text-slate-300">Supplier Profile Summary</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400">Business Registration:</span>
                        <p className="font-semibold text-slate-200">
                          {supplierDashboard.supplier.businessRegNumber || '—'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">TIN / Tax Number:</span>
                        <p className="font-semibold text-slate-200">{supplierDashboard.supplier.taxNumber || '—'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Bank Details:</span>
                        <p className="font-semibold text-slate-200">
                          {supplierDashboard.supplier.bankName
                            ? `${supplierDashboard.supplier.bankName} (${supplierDashboard.supplier.bankAccountNumber || 'No A/C'})`
                            : 'Not Provided'}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400">Address:</span>
                        <p className="font-semibold text-slate-200">
                          {supplierDashboard.supplier.address || '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Recent Ledger Entries */}
                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 shadow-sm space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold uppercase text-slate-300">Recent Transactions</h3>
                      <button
                        onClick={() => setActiveDrawerTab('ledger')}
                        className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                      >
                        View Full Statement →
                      </button>
                    </div>

                    <div className="divide-y divide-slate-800 text-xs">
                      {supplierDashboard.recentTransactions.length === 0 ? (
                        <div className="py-4 text-slate-500 text-center">No transactions recorded yet.</div>
                      ) : (
                        supplierDashboard.recentTransactions.map((tx: any) => (
                          <div key={tx.id} className="py-2.5 flex items-center justify-between">
                            <div>
                              <div className="font-semibold text-slate-100">{tx.description}</div>
                              <div className="text-slate-400">
                                {new Date(tx.entryDate).toLocaleDateString()} • Ref: {tx.referenceNumber || '—'}
                              </div>
                            </div>
                            <div className="text-right">
                              {Number(tx.credit) > 0 && (
                                <span className="text-amber-400 font-semibold">
                                  +LKR {Number(tx.credit).toLocaleString()}
                                </span>
                              )}
                              {Number(tx.debit) > 0 && (
                                <span className="text-emerald-400 font-semibold">
                                  -LKR {Number(tx.debit).toLocaleString()}
                                </span>
                              )}
                              <div className="text-slate-500 text-[10px]">
                                Bal: LKR {Number(tx.runningBalance).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Statement of Account */}
              {activeDrawerTab === 'ledger' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={ledgerStartDate}
                        onChange={(e) => setLedgerStartDate(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                      <span className="text-xs text-slate-400">to</span>
                      <input
                        type="date"
                        value={ledgerEndDate}
                        onChange={(e) => setLedgerEndDate(e.target.value)}
                        className="bg-slate-900 border border-slate-700 text-white rounded px-2 py-1 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <button
                      onClick={() => window.print()}
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium text-slate-300 bg-slate-800 border border-slate-700 rounded hover:bg-slate-700 hover:text-white transition"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      Print Statement
                    </button>
                  </div>

                  {ledgerData && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2 text-center text-xs p-3 bg-slate-950 border border-slate-800 rounded-lg">
                        <div>
                          <span className="text-slate-400">Opening Balance</span>
                          <div className="font-bold text-white">
                            LKR {Number(ledgerData.period.openingBalance).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400">Total Billed (+)</span>
                          <div className="font-bold text-amber-400">
                            LKR {Number(ledgerData.period.totalCredit).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400">Total Paid (-)</span>
                          <div className="font-bold text-emerald-400">
                            LKR {Number(ledgerData.period.totalDebit).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-400">Closing Balance</span>
                          <div className="font-bold text-emerald-400">
                            LKR {Number(ledgerData.period.closingBalance).toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="overflow-x-auto border border-slate-800 rounded-lg">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase">
                            <tr>
                              <th className="p-2.5">Date</th>
                              <th className="p-2.5">Type</th>
                              <th className="p-2.5">Reference</th>
                              <th className="p-2.5">Description</th>
                              <th className="p-2.5 text-right">Debit (-)</th>
                              <th className="p-2.5 text-right">Credit (+)</th>
                              <th className="p-2.5 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800 text-slate-300">
                            {ledgerData.entries.map((entry: any) => (
                              <tr key={entry.id} className="hover:bg-slate-800 transition">
                                <td className="p-2.5 whitespace-nowrap">
                                  {new Date(entry.entryDate).toLocaleDateString()}
                                </td>
                                <td className="p-2.5 font-medium text-slate-200">{entry.transactionType}</td>
                                <td className="p-2.5">{entry.referenceNumber || '—'}</td>
                                <td className="p-2.5">{entry.description}</td>
                                <td className="p-2.5 text-right text-emerald-400">
                                  {Number(entry.debit) > 0 ? `LKR ${Number(entry.debit).toLocaleString()}` : '—'}
                                </td>
                                <td className="p-2.5 text-right text-amber-400">
                                  {Number(entry.credit) > 0 ? `LKR ${Number(entry.credit).toLocaleString()}` : '—'}
                                </td>
                                <td className="p-2.5 text-right font-bold text-white">
                                  LKR {Number(entry.runningBalance).toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: Purchase Orders */}
              {activeDrawerTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200">Recent Purchase Orders</h3>
                    <button
                      onClick={() => router.push('/purchasing/orders')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      Open PO Module →
                    </button>
                  </div>
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden text-xs bg-slate-950">
                    {supplierDashboard.supplier.purchaseOrders?.map((po: any) => (
                      <div key={po.id} className="p-3 flex items-center justify-between hover:bg-slate-800 transition">
                        <div>
                          <div className="font-bold text-emerald-400">{po.poNumber}</div>
                          <div className="text-slate-400">{new Date(po.createdAt).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">
                            LKR {Number(po.totalAmount).toLocaleString()}
                          </div>
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                            {po.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: GRNs */}
              {activeDrawerTab === 'grns' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200">Goods Received Notes</h3>
                    <button
                      onClick={() => router.push('/purchasing/grn')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      Open GRN Module →
                    </button>
                  </div>
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden text-xs bg-slate-950">
                    {supplierDashboard.supplier.grns?.map((grn: any) => (
                      <div key={grn.id} className="p-3 flex items-center justify-between hover:bg-slate-800 transition">
                        <div>
                          <div className="font-bold text-emerald-400">{grn.grnNumber}</div>
                          <div className="text-slate-400">
                            {grn.postedAt ? new Date(grn.postedAt).toLocaleDateString() : 'Draft'}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">
                            LKR {Number(grn.totalAmount).toLocaleString()}
                          </div>
                          <span className="inline-flex px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                            {grn.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 5: Invoices */}
              {activeDrawerTab === 'invoices' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-200">Supplier Invoices</h3>
                    <button
                      onClick={() => router.push('/purchasing/invoices')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
                    >
                      Open Invoices Module →
                    </button>
                  </div>
                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg overflow-hidden text-xs bg-slate-950">
                    {supplierDashboard.supplier.invoices?.map((inv: any) => (
                      <div key={inv.id} className="p-3 flex items-center justify-between hover:bg-slate-800 transition">
                        <div>
                          <div className="font-bold text-white">{inv.invoiceNumber}</div>
                          <div className="text-slate-400">Due: {new Date(inv.dueDate).toLocaleDateString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">
                            LKR {Number(inv.totalAmount).toLocaleString()}
                          </div>
                          <div className="text-amber-400 font-semibold">
                            Bal: LKR {Number(inv.balanceAmount).toLocaleString()}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 6: Contacts */}
              {activeDrawerTab === 'contacts' && (
                <div className="space-y-6">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
                    <h4 className="text-xs font-bold uppercase text-slate-300 mb-3">Add New Contact</h4>
                    <form onSubmit={handleAddContact} className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="block text-slate-400 mb-1">Contact Name *</label>
                        <input
                          type="text"
                          required
                          value={newContact.name}
                          onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                          placeholder="e.g. Priyantha Silva"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Designation</label>
                        <input
                          type="text"
                          value={newContact.designation}
                          onChange={(e) => setNewContact({ ...newContact, designation: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                          placeholder="e.g. Key Account Manager"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Phone Number *</label>
                        <input
                          type="text"
                          required
                          value={newContact.phone}
                          onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                          placeholder="+94771234567"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-400 mb-1">Email</label>
                        <input
                          type="email"
                          value={newContact.email}
                          onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                          className="w-full bg-slate-900 border border-slate-800 text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 placeholder-slate-500"
                          placeholder="priyantha@supplier.com"
                        />
                      </div>
                      <div className="sm:col-span-2 flex items-center justify-between pt-1">
                        <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                          <input
                            type="checkbox"
                            checked={newContact.isPrimary}
                            onChange={(e) => setNewContact({ ...newContact, isPrimary: e.target.checked })}
                            className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0"
                          />
                          <span>Primary Contact</span>
                        </label>
                        <button
                          type="submit"
                          className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition shadow-sm shadow-emerald-600/20"
                        >
                          Save Contact
                        </button>
                      </div>
                    </form>
                  </div>

                  <div className="divide-y divide-slate-800 border border-slate-800 rounded-lg text-xs overflow-hidden bg-slate-950">
                    {supplierDashboard.supplier.contacts?.map((c: any) => (
                      <div key={c.id} className="p-3 flex items-center justify-between hover:bg-slate-800 transition">
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5">
                            {c.name}
                            {c.isPrimary && (
                              <span className="bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded text-[10px]">
                                PRIMARY
                              </span>
                            )}
                          </div>
                          <div className="text-slate-400">{c.designation || 'No title'}</div>
                        </div>
                        <div className="text-right text-slate-300">
                          <div>{c.phone}</div>
                          <div className="text-slate-400">{c.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 7: Edit Profile */}
              {activeDrawerTab === 'edit' && editSupplier && (
                <form onSubmit={handleUpdateSupplier} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-400 mb-1">Supplier Name</label>
                      <input
                        type="text"
                        value={editSupplier.name || ''}
                        onChange={(e) => setEditSupplier({ ...editSupplier, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Category</label>
                      <select
                        value={editSupplier.categoryId || ''}
                        onChange={(e) => setEditSupplier({ ...editSupplier, categoryId: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                      >
                        <option value="" className="bg-slate-900 text-slate-400">None</option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id} className="bg-slate-900 text-white">
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Credit Limit (LKR)</label>
                      <input
                        type="number"
                        value={editSupplier.creditLimit || 0}
                        onChange={(e) => setEditSupplier({ ...editSupplier, creditLimit: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Credit Days</label>
                      <input
                        type="number"
                        value={editSupplier.creditDays || 30}
                        onChange={(e) => setEditSupplier({ ...editSupplier, creditDays: Number(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Bank Name</label>
                      <input
                        type="text"
                        value={editSupplier.bankName || ''}
                        onChange={(e) => setEditSupplier({ ...editSupplier, bankName: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-400 mb-1">Bank Account Number</label>
                      <input
                        type="text"
                        value={editSupplier.bankAccountNumber || ''}
                        onChange={(e) => setEditSupplier({ ...editSupplier, bankAccountNumber: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition shadow-sm shadow-emerald-600/20"
                    >
                      Save Profile Changes
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Register Supplier Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-400" />
                Register New Supplier
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Supplier Code *</label>
                  <input
                    type="text"
                    required
                    value={newSupplier.code}
                    onChange={(e) => setNewSupplier({ ...newSupplier, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SUP-UNILEVER"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono uppercase text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Supplier Business Name *</label>
                  <input
                    type="text"
                    required
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    placeholder="e.g. Unilever Sri Lanka Limited"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Category</label>
                  <select
                    value={newSupplier.categoryId}
                    onChange={(e) => setNewSupplier({ ...newSupplier, categoryId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="" className="bg-slate-900 text-slate-400">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Supplier Type</label>
                  <select
                    value={newSupplier.supplierType}
                    onChange={(e) => setNewSupplier({ ...newSupplier, supplierType: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="COMPANY" className="bg-slate-900 text-white">Company / Corporate</option>
                    <option value="INDIVIDUAL" className="bg-slate-900 text-white">Individual / Sole Proprietor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={newSupplier.contactPerson}
                    onChange={(e) => setNewSupplier({ ...newSupplier, contactPerson: e.target.value })}
                    placeholder="Primary contact name"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={newSupplier.phone}
                    onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                    placeholder="+94112345678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    placeholder="orders@supplier.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Tax / TIN Number</label>
                  <input
                    type="text"
                    value={newSupplier.taxNumber}
                    onChange={(e) => setNewSupplier({ ...newSupplier, taxNumber: e.target.value })}
                    placeholder="TIN-XXXXX"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Credit Limit (LKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={newSupplier.creditLimit}
                    onChange={(e) => setNewSupplier({ ...newSupplier, creditLimit: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Credit Days</label>
                  <input
                    type="number"
                    min="0"
                    value={newSupplier.creditDays}
                    onChange={(e) => setNewSupplier({ ...newSupplier, creditDays: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Opening Balance (LKR)</label>
                  <input
                    type="number"
                    min="0"
                    value={newSupplier.openingBalance}
                    onChange={(e) => setNewSupplier({ ...newSupplier, openingBalance: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-medium mb-1">City</label>
                  <input
                    type="text"
                    value={newSupplier.city}
                    onChange={(e) => setNewSupplier({ ...newSupplier, city: e.target.value })}
                    placeholder="e.g. Colombo"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Registered Address</label>
                <textarea
                  rows={2}
                  value={newSupplier.address}
                  onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  placeholder="Street address..."
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
                  Register Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Manager Modal */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Building2 className="w-5 h-5 text-emerald-400" />
                Supplier Categories
              </h3>
              <button
                onClick={() => setIsCategoryModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Category Code *</label>
                <input
                  type="text"
                  required
                  value={newCategoryCode}
                  onChange={(e) => setNewCategoryCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WHOLESALE"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 font-mono uppercase text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Wholesale Distributors"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition shadow-sm shadow-emerald-600/20"
              >
                Add Category
              </button>
            </form>

            <div className="border-t border-slate-800 pt-3">
              <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Existing Categories</h4>
              <div className="divide-y divide-slate-800 max-h-48 overflow-y-auto text-xs">
                {categories.map((c) => (
                  <div key={c.id} className="py-2 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white">{c.name}</span>
                      <span className="text-slate-400 font-mono ml-2">({c.code})</span>
                    </div>
                    <span className="text-slate-400">{c._count?.suppliers || 0} suppliers</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
