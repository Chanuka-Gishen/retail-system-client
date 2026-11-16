'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit2, Coins, CreditCard, RefreshCw, X, Check, AlertCircle, Users } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../lib/auth-store';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { EmptyState } from '../../components/EmptyState';

export default function CustomersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [customers, setCustomers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [activeCustomer, setActiveCustomer] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Customer fields
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newCreditLimit, setNewCreditLimit] = useState('0');

  // Edit Customer fields
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCreditLimit, setEditCreditLimit] = useState('0');

  // Settle Balance fields
  const [settleAmount, setSettleAmount] = useState('');
  const [settleTender, setSettleTender] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [settleRef, setSettleRef] = useState('');

  // Loyalty Points fields
  const [pointsDelta, setPointsDelta] = useState('');
  const [pointsReason, setPointsReason] = useState('');

  // 1. Auth Guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // 2. Fetch Customers
  const fetchCustomers = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const q = new URLSearchParams();
      q.set('page', String(page));
      q.set('limit', String(limit));
      if (search) q.set('search', search);

      const res = await apiClient<any>(`/customers?${q.toString()}`);
      setCustomers(res?.items || (Array.isArray(res) ? res : []));
      if (res?.meta) {
        setTotalPages(res.meta.totalPages || 1);
        setTotalItems(res.meta.total || 0);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load customers');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCustomers();
    }
  }, [page, limit, search, isAuthenticated]);

  // Open Edit Modal
  const openEditModal = (c: any) => {
    setActiveCustomer(c);
    setEditName(c.name || '');
    setEditPhone(c.phone || '');
    setEditEmail(c.email || '');
    setEditCreditLimit(String(c.creditLimit || 0));
    setIsEditModalOpen(true);
  };

  // Open Settle Balance Modal
  const openSettleModal = (c: any) => {
    setActiveCustomer(c);
    setSettleAmount(String(c.outstandingBalance || 0));
    setSettleTender('CASH');
    setSettleRef('');
    setIsSettleModalOpen(true);
  };

  // Open Points Adjustment Modal
  const openPointsModal = (c: any) => {
    setActiveCustomer(c);
    setPointsDelta('50');
    setPointsReason('Promotional bonus');
    setIsPointsModalOpen(true);
  };

  // Handle Add Customer
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await apiClient('/customers', {
        method: 'POST',
        body: {
          code: newCode.trim() || undefined,
          name: newName.trim(),
          phone: newPhone.trim() || undefined,
          email: newEmail.trim() || undefined,
          creditLimit: parseFloat(newCreditLimit) || 0,
        },
      });

      setSuccessMsg(`Customer "${newName}" registered successfully!`);
      setIsAddModalOpen(false);

      // Reset form
      setNewCode('');
      setNewName('');
      setNewPhone('');
      setNewEmail('');
      setNewCreditLimit('0');

      await fetchCustomers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit Customer
  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await apiClient(`/customers/${activeCustomer.id}`, {
        method: 'PUT',
        body: {
          name: editName.trim(),
          phone: editPhone.trim() || undefined,
          email: editEmail.trim() || undefined,
          creditLimit: parseFloat(editCreditLimit) || 0,
        },
      });

      setSuccessMsg(`Customer "${editName}" updated successfully!`);
      setIsEditModalOpen(false);
      setActiveCustomer(null);
      await fetchCustomers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Settle Balance
  const handleSettleBalance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await apiClient(`/customers/${activeCustomer.id}/settle-balance`, {
        method: 'POST',
        body: {
          amount: parseFloat(settleAmount) || 0,
          tenderType: settleTender,
          referenceNumber: settleRef.trim() || undefined,
        },
      });

      setSuccessMsg(`Payment of LKR ${parseFloat(settleAmount).toFixed(2)} recorded for ${activeCustomer.name}`);
      setIsSettleModalOpen(false);
      setActiveCustomer(null);
      await fetchCustomers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to settle balance');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Adjust Points
  const handleAdjustPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCustomer) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const delta = parseInt(pointsDelta, 10);
      await apiClient(`/customers/${activeCustomer.id}/loyalty-adjust`, {
        method: 'POST',
        body: {
          points: delta,
          reason: pointsReason.trim() || 'Loyalty adjustment',
        },
      });

      setSuccessMsg(`Loyalty points for ${activeCustomer.name} adjusted by ${delta > 0 ? '+' : ''}${delta} pts`);
      setIsPointsModalOpen(false);
      setActiveCustomer(null);
      await fetchCustomers();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to adjust loyalty points');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Customer Management</h1>
          <p className="text-sm text-slate-400 mt-1">
            Member profiles, loyalty points balances, and store credit ledger
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchCustomers()}
            disabled={isLoading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition"
            title="Refresh Customers"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center space-x-2 transition text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Customer</span>
          </button>
        </div>
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

      {/* Search Input */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between space-x-3">
        <div className="flex items-center space-x-3 flex-1">
          <Search className="w-5 h-5 text-slate-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Lookup customer by mobile phone, name, or customer code..."
            className="bg-transparent w-full text-white placeholder-slate-500 text-sm focus:outline-none"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1 transition"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Customers Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Phone / Contact</th>
                <th className="py-3 px-4 text-center">Loyalty Points</th>
                <th className="py-3 px-4 text-right">Credit Limit (LKR)</th>
                <th className="py-3 px-4 text-right">Outstanding (LKR)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {isLoading ? (
                <TableSkeleton columns={7} rows={6} theme="dark" />
              ) : customers.length === 0 ? (
                <EmptyState
                  colSpan={7}
                  theme="dark"
                  icon={Users}
                  isSearchActive={Boolean(search)}
                  searchQuery={search}
                  title={search ? 'No customers match your search' : 'No customers registered'}
                  description={
                    search
                      ? `No customers match "${search}". Try searching by a different name, phone, or customer code.`
                      : 'You haven’t registered any customers yet. Add your first customer to enable loyalty rewards and credit limits.'
                  }
                  onResetFilters={() => setSearch('')}
                  actionLabel="Add Customer"
                  onAction={() => setIsAddModalOpen(true)}
                />
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-850 transition">
                    <td className="py-3 px-4 font-mono text-blue-400 font-medium">{c.code}</td>
                    <td className="py-3 px-4 font-semibold text-white">
                      {c.name}
                      {c.email && <div className="text-[10px] text-slate-400 font-normal">{c.email}</div>}
                    </td>
                    <td className="py-3 px-4 text-slate-300">{c.phone || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="bg-amber-950 text-amber-300 border border-amber-800 font-extrabold px-2.5 py-0.5 rounded-full text-xs">
                        {c.loyaltyPoints} pts
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      {Number(c.creditLimit).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-rose-400">
                      {Number(c.outstandingBalance).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        onClick={() => openPointsModal(c)}
                        title="Adjust Loyalty Points"
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition"
                      >
                        <Coins className="w-3.5 h-3.5" />
                        <span>Pts</span>
                      </button>
                      {Number(c.outstandingBalance) > 0 && (
                        <button
                          onClick={() => openSettleModal(c)}
                          title="Settle Outstanding Balance"
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition"
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          <span>Settle</span>
                        </button>
                      )}
                      <button
                        onClick={() => openEditModal(c)}
                        title="Edit Customer"
                        className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
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
          onPageChange={setPage}
          onLimitChange={setLimit}
          isLoading={isLoading}
        />
      </div>

      {/* MODAL 1: ADD CUSTOMER */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Register New Customer</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Customer Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave blank to auto-generate (e.g. CUST-00101)"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Full Customer / Business Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Kasun Perera"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+94771234567"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    placeholder="kasun@gmail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Approved Credit Limit (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={newCreditLimit}
                  onChange={(e) => setNewCreditLimit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition"
                >
                  {isSubmitting ? 'Registering...' : 'Register Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT CUSTOMER */}
      {isEditModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Edit Customer Profile</h2>
                <div className="text-xs text-blue-400 font-mono">{activeCustomer.code}</div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Approved Credit Limit (LKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={editCreditLimit}
                  onChange={(e) => setEditCreditLimit(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition"
                >
                  {isSubmitting ? 'Saving...' : 'Save Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: SETTLE BALANCE */}
      {isSettleModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Settle Customer Balance</h2>
                <div className="text-xs text-slate-400">{activeCustomer.name}</div>
              </div>
              <button onClick={() => setIsSettleModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSettleBalance} className="space-y-4">
              <div className="p-3.5 bg-rose-950 border border-rose-800 rounded-xl">
                <div className="text-xs text-rose-300 font-semibold uppercase">Current Outstanding Balance</div>
                <div className="text-2xl font-black text-rose-400 mt-1">
                  LKR {Number(activeCustomer.outstandingBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Settlement Amount (LKR) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={Number(activeCustomer.outstandingBalance)}
                  required
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Method *
                </label>
                <select
                  value={settleTender}
                  onChange={(e) => setSettleTender(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="CASH">CASH</option>
                  <option value="CARD">CARD (POS Terminal)</option>
                  <option value="BANK_TRANSFER">BANK TRANSFER</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reference Note / Slip #
                </label>
                <input
                  type="text"
                  placeholder="Receipt # / Cheque # / Slip #"
                  value={settleRef}
                  onChange={(e) => setSettleRef(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSettleModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition"
                >
                  {isSubmitting ? 'Recording Settlement...' : 'Record Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ADJUST LOYALTY POINTS */}
      {isPointsModalOpen && activeCustomer && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Adjust Loyalty Points</h2>
                <div className="text-xs text-slate-400">{activeCustomer.name}</div>
              </div>
              <button onClick={() => setIsPointsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustPoints} className="space-y-4">
              <div className="p-3.5 bg-amber-950 border border-amber-800 rounded-xl">
                <div className="text-xs text-amber-300 font-semibold uppercase">Current Loyalty Balance</div>
                <div className="text-2xl font-black text-amber-400 mt-1">
                  {activeCustomer.loyaltyPoints} Points
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Points Delta (+ to grant, - to deduct) *
                </label>
                <input
                  type="number"
                  step="1"
                  required
                  placeholder="e.g. 50 or -25"
                  value={pointsDelta}
                  onChange={(e) => setPointsDelta(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Adjustment *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Promotional birthday bonus / Customer goodwill"
                  value={pointsReason}
                  onChange={(e) => setPointsReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPointsModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition"
                >
                  {isSubmitting ? 'Adjusting...' : 'Confirm Points'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
