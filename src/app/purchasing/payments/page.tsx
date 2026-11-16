'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  CreditCard,
  Plus,
  Search,
  RefreshCw,
  X,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../lib/auth-store';
import { Pagination } from '../../../components/Pagination';
import { TableSkeleton } from '../../../components/TableSkeleton';
import { EmptyState } from '../../../components/EmptyState';

export default function SupplierPaymentsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'payments' | 'cheques'>('payments');
  const [payments, setPayments] = useState<any[]>([]);
  const [cheques, setCheques] = useState<any[]>([]);
  const [chequeAlerts, setChequeAlerts] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [supplierInvoices, setSupplierInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [methodFilter, setMethodFilter] = useState('');
  const [chequeStatusFilter, setChequeStatusFilter] = useState('');

  // Pagination State - Payments
  const [payPage, setPayPage] = useState(1);
  const [payLimit, setPayLimit] = useState(20);
  const [payTotalPages, setPayTotalPages] = useState(1);
  const [payTotalItems, setPayTotalItems] = useState(0);

  // Pagination State - Cheques
  const [chqPage, setChqPage] = useState(1);
  const [chqLimit, setChqLimit] = useState(20);
  const [chqTotalPages, setChqTotalPages] = useState(1);
  const [chqTotalItems, setChqTotalItems] = useState(0);

  // Modals State
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Cheque Action Modals State
  const [depositModalCheque, setDepositModalCheque] = useState<any | null>(null);
  const [depositNotes, setDepositNotes] = useState('');

  const [clearModalCheque, setClearModalCheque] = useState<any | null>(null);
  const [clearDate, setClearDate] = useState(new Date().toISOString().split('T')[0]);
  const [clearNotes, setClearNotes] = useState('');

  const [bounceModalCheque, setBounceModalCheque] = useState<any | null>(null);
  const [bounceReason, setBounceReason] = useState('Insufficient funds / Refer to drawer');
  const [bounceCharges, setBounceCharges] = useState(1500);
  const [bounceNotes, setBounceNotes] = useState('');

  const [cancelModalCheque, setCancelModalCheque] = useState<any | null>(null);
  const [cancelReason, setCancelReason] = useState('Payment stopped / cancelled by drawer');
  const [cancelNotes, setCancelNotes] = useState('');

  // Payment Form State
  const [newPayment, setNewPayment] = useState({
    supplierId: '',
    paymentDate: new Date().toISOString().split('T')[0],
    paymentMethod: 'BANK_TRANSFER',
    amount: 0,
    referenceNumber: '',
    bankName: '',
    bankAccountNumber: '',
    notes: '',
    allocations: [] as { invoiceId: string; allocatedAmount: number }[],
    chequeDetails: {
      chequeNumber: '',
      bankName: '',
      branchName: '',
      chequeDate: new Date().toISOString().split('T')[0],
      maturityDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      payeeName: '',
    },
  });

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  // Load Data
  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const qPay = new URLSearchParams();
      qPay.append('page', payPage.toString());
      qPay.append('limit', payLimit.toString());
      if (search) qPay.append('search', search);
      if (supplierFilter) qPay.append('supplierId', supplierFilter);
      if (methodFilter) qPay.append('paymentMethod', methodFilter);

      const qChq = new URLSearchParams();
      qChq.append('page', chqPage.toString());
      qChq.append('limit', chqLimit.toString());
      if (search) qChq.append('search', search);
      if (supplierFilter) qChq.append('supplierId', supplierFilter);
      if (chequeStatusFilter) qChq.append('status', chequeStatusFilter);

      const [payRes, chqRes, alertsRes, supRes] = await Promise.all([
        apiClient<any>(`/purchasing/payments?${qPay.toString()}`),
        apiClient<any>(`/purchasing/cheques?${qChq.toString()}`),
        apiClient<any>('/purchasing/cheques/alerts').catch(() => null),
        apiClient<any>('/purchasing/suppliers?limit=100'),
      ]);

      setPayments(payRes?.items || []);
      setPayTotalPages(payRes?.meta?.totalPages || 1);
      setPayTotalItems(payRes?.meta?.total || 0);

      setCheques(chqRes?.items || []);
      setChqTotalPages(chqRes?.meta?.totalPages || 1);
      setChqTotalItems(chqRes?.meta?.total || 0);

      setChequeAlerts(alertsRes);
      setSuppliers(supRes?.items || []);

      if (supRes?.items?.length > 0 && !newPayment.supplierId) {
        handleSelectSupplierForPayment(supRes.items[0].id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load payments data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadData();
  }, [
    isAuthenticated,
    payPage,
    payLimit,
    chqPage,
    chqLimit,
    search,
    supplierFilter,
    methodFilter,
    chequeStatusFilter,
  ]);

  // Check URL params
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tabParam = params.get('tab');
      if (tabParam === 'cheques' || tabParam === 'payments') {
        setActiveTab(tabParam);
      }
      const supId = params.get('supplierId');
      if (supId) {
        handleSelectSupplierForPayment(supId);
        setIsRecordPaymentModalOpen(true);
      }
    }
  }, [suppliers]);

  // When supplier selected for payment, load their unpaid invoices
  const handleSelectSupplierForPayment = async (supplierId: string) => {
    setNewPayment((prev) => ({ ...prev, supplierId }));
    try {
      const invRes = await apiClient<any>(
        `/purchasing/invoices?supplierId=${supplierId}&status=VERIFIED&status=PARTIALLY_PAID`,
      );
      const unpaidInvoices = invRes?.items || [];
      setSupplierInvoices(unpaidInvoices);

      const s = suppliers.find((item) => item.id === supplierId);
      if (s) {
        setNewPayment((prev) => ({
          ...prev,
          bankName: s.bankName || prev.bankName,
          bankAccountNumber: s.bankAccountNumber || prev.bankAccountNumber,
          chequeDetails: {
            ...prev.chequeDetails,
            payeeName: s.name,
            bankName: s.bankName || '',
          },
        }));
      }
    } catch {
      setSupplierInvoices([]);
    }
  };

  // Handle invoice allocation input
  const handleAllocationChange = (invoiceId: string, amount: number) => {
    const existing = newPayment.allocations.filter((a) => a.invoiceId !== invoiceId);
    if (amount > 0) {
      existing.push({ invoiceId, allocatedAmount: amount });
    }
    setNewPayment({ ...newPayment, allocations: existing });
  };

  // Submit Payment
  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPayment.amount <= 0) {
      setErrorMsg('Payment amount must be greater than zero.');
      return;
    }

    try {
      setIsSubmittingAction(true);
      await apiClient('/purchasing/payments', {
        method: 'POST',
        body: newPayment,
      });
      setSuccessMsg('Supplier payment recorded successfully!');
      setIsRecordPaymentModalOpen(false);
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to record payment');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Cheque Actions
  const handleDepositCheque = async () => {
    if (!depositModalCheque) return;
    try {
      setIsSubmittingAction(true);
      await apiClient(`/purchasing/cheques/${depositModalCheque.id}/deposit`, {
        method: 'POST',
        body: { notes: depositNotes.trim() || undefined },
      });
      setSuccessMsg(`Cheque #${depositModalCheque.chequeNumber} marked as DEPOSITED in bank`);
      setDepositModalCheque(null);
      setDepositNotes('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to deposit cheque');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleClearCheque = async () => {
    if (!clearModalCheque) return;
    try {
      setIsSubmittingAction(true);
      await apiClient(`/purchasing/cheques/${clearModalCheque.id}/clear`, {
        method: 'POST',
        body: {
          clearedAt: clearDate ? new Date(clearDate).toISOString() : new Date().toISOString(),
          notes: clearNotes.trim() || undefined,
        },
      });
      setSuccessMsg(`Cheque #${clearModalCheque.chequeNumber} marked as CLEARED & honoured!`);
      setClearModalCheque(null);
      setClearNotes('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to clear cheque');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleBounceCheque = async () => {
    if (!bounceModalCheque) return;
    const reason = bounceReason.trim();
    if (!reason) {
      setErrorMsg('Please specify a bounce reason');
      return;
    }
    try {
      setIsSubmittingAction(true);
      await apiClient(`/purchasing/cheques/${bounceModalCheque.id}/bounce`, {
        method: 'POST',
        body: {
          bounceReason: reason,
          bounceCharges: Number(bounceCharges || 0),
          notes: bounceNotes.trim() || undefined,
        },
      });
      setSuccessMsg(`Cheque #${bounceModalCheque.chequeNumber} marked as BOUNCED. Invoice settlements reversed & liability restored.`);
      setBounceModalCheque(null);
      setBounceNotes('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to bounce cheque');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleCancelCheque = async () => {
    if (!cancelModalCheque) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setErrorMsg('Please specify a cancellation reason');
      return;
    }
    try {
      setIsSubmittingAction(true);
      await apiClient(`/purchasing/cheques/${cancelModalCheque.id}/cancel`, {
        method: 'POST',
        body: {
          reason,
          notes: cancelNotes.trim() || undefined,
        },
      });
      setSuccessMsg(`Cheque #${cancelModalCheque.chequeNumber} marked as CANCELLED / VOIDED.`);
      setCancelModalCheque(null);
      setCancelNotes('');
      loadData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to cancel cheque');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Summary Metrics
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const totalChequesOutstanding = cheques
    .filter((c) => c.status === 'ISSUED' || c.status === 'AWAITING_DEPOSIT' || c.status === 'DEPOSITED')
    .reduce((sum, c) => sum + Number(c.amount || 0), 0);

  return (
    <div className="flex-1 bg-slate-950 p-6 max-w-7xl mx-auto w-full space-y-6 text-slate-100">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <CreditCard className="w-7 h-7 text-emerald-400" />
            Supplier Payments & Cheque Register
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Record supplier settlements, allocate payments across bills, track post-dated cheques, and manage bounce reconciliations
          </p>
        </div>

        <button
          onClick={() => setIsRecordPaymentModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-500 transition font-bold"
        >
          <Plus className="w-4 h-4" />
          Record Supplier Payment
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

      {/* Automated Cheque Maturity Alert Engine Banner */}
      {chequeAlerts && (chequeAlerts.overdue.count > 0 || chequeAlerts.dueToday.count > 0 || chequeAlerts.dueIn3Days.count > 0) && (
        <div className="p-4 bg-slate-900 border border-amber-800 rounded-xl space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-400">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              Cheque Maturity Reminders & Alerts
            </div>
            <button
              onClick={() => setActiveTab('cheques')}
              className="text-xs text-amber-400 font-bold hover:underline"
            >
              View Cheque Register →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1">
            {chequeAlerts.overdue.count > 0 && (
              <div className="bg-rose-950 p-2.5 rounded-lg border border-rose-800 text-rose-300">
                <span className="font-bold text-rose-200">🚨 {chequeAlerts.overdue.count} Overdue Cheques</span>
                <p className="mt-0.5 font-medium">LKR {chequeAlerts.overdue.totalAmount.toLocaleString()} past due date</p>
              </div>
            )}
            {chequeAlerts.dueToday.count > 0 && (
              <div className="bg-amber-950 p-2.5 rounded-lg border border-amber-800 text-amber-300">
                <span className="font-bold text-amber-200">⚡ {chequeAlerts.dueToday.count} Cheques Due Today</span>
                <p className="mt-0.5 font-medium">LKR {chequeAlerts.dueToday.totalAmount.toLocaleString()} maturing today</p>
              </div>
            )}
            {chequeAlerts.dueIn3Days.count > 0 && (
              <div className="bg-blue-950 p-2.5 rounded-lg border border-blue-800 text-blue-300">
                <span className="font-bold text-blue-200">📅 {chequeAlerts.dueIn3Days.count} Due in 3 Days</span>
                <p className="mt-0.5 font-medium">LKR {chequeAlerts.dueIn3Days.totalAmount.toLocaleString()} maturing soon</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Payments Settled</span>
          <p className="text-xl font-bold text-white mt-1">LKR {totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Active Cheques Outstanding</span>
          <p className="text-xl font-bold text-amber-400 mt-1">LKR {totalChequesOutstanding.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Total Cheques Issued</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">{chqTotalItems} Cheques</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Cleared Cheques</span>
          <p className="text-xl font-bold text-emerald-400 mt-1">{cheques.filter((c) => c.status === 'CLEARED').length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('payments')}
          className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'payments'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Payments Register ({payTotalItems})
        </button>
        <button
          onClick={() => setActiveTab('cheques')}
          className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'cheques'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Cheque Register ({chqTotalItems})
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'payments'
                ? 'Search payment #, reference, bank...'
                : 'Search cheque #, payee, bank...'
            }
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPayPage(1);
              setChqPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <select
            value={supplierFilter}
            onChange={(e) => {
              setSupplierFilter(e.target.value);
              setPayPage(1);
              setChqPage(1);
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

          {activeTab === 'payments' ? (
            <select
              value={methodFilter}
              onChange={(e) => {
                setMethodFilter(e.target.value);
                setPayPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="" className="bg-slate-900 text-slate-400">All Methods</option>
              <option value="BANK_TRANSFER" className="bg-slate-900 text-white">Bank Transfer</option>
              <option value="CHEQUE" className="bg-slate-900 text-white">Cheque</option>
              <option value="CASH" className="bg-slate-900 text-white">Cash</option>
              <option value="ONLINE" className="bg-slate-900 text-white">Online Transfer</option>
            </select>
          ) : (
            <select
              value={chequeStatusFilter}
              onChange={(e) => {
                setChequeStatusFilter(e.target.value);
                setChqPage(1);
              }}
              className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="" className="bg-slate-900 text-slate-400">All Statuses</option>
              <option value="ISSUED" className="bg-slate-900 text-white">Issued</option>
              <option value="AWAITING_DEPOSIT" className="bg-slate-900 text-white">Awaiting Deposit</option>
              <option value="DEPOSITED" className="bg-slate-900 text-white">Deposited</option>
              <option value="CLEARED" className="bg-slate-900 text-white">Cleared</option>
              <option value="BOUNCED" className="bg-slate-900 text-white">Bounced</option>
              <option value="CANCELLED" className="bg-slate-900 text-white">Cancelled / Voided</option>
            </select>
          )}

          <button onClick={loadData} title="Refresh" className="p-2 bg-slate-950 border border-slate-800 rounded-xl hover:bg-slate-800 text-slate-300 hover:text-white transition">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TAB 1: Payments Register */}
      {activeTab === 'payments' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Payment #</th>
                  <th className="px-4 py-3.5">Supplier</th>
                  <th className="px-4 py-3.5">Payment Date</th>
                  <th className="px-4 py-3.5">Method</th>
                  <th className="px-4 py-3.5">Reference / Bank</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5 text-right">Unallocated Advance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading ? (
                  <TableSkeleton columns={7} rows={6} theme="dark" />
                ) : payments.length === 0 ? (
                  <EmptyState
                    colSpan={7}
                    theme="dark"
                    icon={CreditCard}
                    isSearchActive={Boolean(search || supplierFilter || methodFilter)}
                    searchQuery={search}
                    title={search || supplierFilter || methodFilter ? 'No payments match your filters' : 'No payments settled yet'}
                    description={
                      search || supplierFilter || methodFilter
                        ? 'No supplier payments match your current query or method filter. Try clearing filters.'
                        : 'Record bank transfers, cheques, and cash payments against supplier invoices or advance accounts.'
                    }
                    onResetFilters={() => {
                      setSearch('');
                      setSupplierFilter('');
                      setMethodFilter('');
                      setPayPage(1);
                    }}
                    actionLabel="Record Payment"
                    onAction={() => setIsRecordPaymentModalOpen(true)}
                  />
                ) : (
                  payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-850 transition">
                      <td className="px-4 py-3.5 font-bold text-emerald-400">{p.paymentNumber}</td>
                      <td className="px-4 py-3.5 font-medium text-slate-100">{p.supplier?.name}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-400">
                        {new Date(p.paymentDate).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-300">
                        <div>{p.bankName || '—'}</div>
                        <div className="text-slate-500 font-mono">{p.referenceNumber}</div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-white">
                        LKR {Number(p.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium">
                        {Number(p.unallocatedAmount) > 0 ? (
                          <span className="text-teal-400 font-bold">
                            LKR {Number(p.unallocatedAmount).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-slate-500">0.00</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={payPage}
            totalPages={payTotalPages}
            totalItems={payTotalItems}
            limit={payLimit}
            onPageChange={(p) => setPayPage(p)}
            onLimitChange={(l) => {
              setPayLimit(l);
              setPayPage(1);
            }}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* TAB 2: Cheque Register */}
      {activeTab === 'cheques' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950 text-xs font-semibold uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3.5">Cheque #</th>
                  <th className="px-4 py-3.5">Payee / Supplier</th>
                  <th className="px-4 py-3.5">Bank & Branch</th>
                  <th className="px-4 py-3.5">Cheque Date</th>
                  <th className="px-4 py-3.5">Maturity Date</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-4 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading ? (
                  <TableSkeleton columns={8} rows={6} theme="dark" />
                ) : cheques.length === 0 ? (
                  <EmptyState
                    colSpan={8}
                    theme="dark"
                    icon={CreditCard}
                    isSearchActive={Boolean(search || supplierFilter || chequeStatusFilter)}
                    searchQuery={search}
                    title={search || supplierFilter || chequeStatusFilter ? 'No cheques match your filters' : 'No cheques in register'}
                    description={
                      search || supplierFilter || chequeStatusFilter
                        ? 'No cheques match your current status or supplier filter. Try clearing filters.'
                        : 'Post-dated and current cheques issued to suppliers will be tracked here with maturity reminders.'
                    }
                    onResetFilters={() => {
                      setSearch('');
                      setSupplierFilter('');
                      setChequeStatusFilter('');
                      setChqPage(1);
                    }}
                    actionLabel="Issue Cheque / Payment"
                    onAction={() => setIsRecordPaymentModalOpen(true)}
                  />
                ) : (
                  cheques.map((chq) => {
                    const isMatured = new Date(chq.maturityDate) <= new Date();
                    const statusColors: Record<string, string> = {
                      ISSUED: 'bg-emerald-950 text-emerald-300 border border-emerald-800',
                      AWAITING_DEPOSIT: 'bg-amber-950 text-amber-300 border border-amber-800',
                      DEPOSITED: 'bg-cyan-950 text-cyan-300 border border-cyan-800',
                      CLEARED: 'bg-emerald-950 text-emerald-400 border border-emerald-800',
                      BOUNCED: 'bg-rose-950 text-rose-300 border border-rose-800',
                      CANCELLED: 'bg-slate-800 text-slate-400 border border-slate-700',
                    };

                    const canDeposit = chq.status === 'ISSUED' || chq.status === 'AWAITING_DEPOSIT';
                    const canClearOrBounce = chq.status === 'ISSUED' || chq.status === 'AWAITING_DEPOSIT' || chq.status === 'DEPOSITED';

                    return (
                      <tr key={chq.id} className="hover:bg-slate-850 transition">
                        <td className="px-4 py-3.5 font-mono font-bold text-emerald-400">{chq.chequeNumber}</td>
                        <td className="px-4 py-3.5 font-medium text-slate-100">
                          {chq.payeeName}
                          <div className="text-xs text-slate-400">{chq.supplier?.name}</div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-300">
                          <div>{chq.bankName}</div>
                          <div className="text-slate-500">{chq.branchName}</div>
                        </td>
                        <td className="px-4 py-3.5 text-xs text-slate-400">
                          {new Date(chq.chequeDate).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3.5 text-xs font-semibold">
                          <span className={isMatured && chq.status !== 'CLEARED' ? 'text-amber-400 font-bold' : 'text-slate-300'}>
                            {new Date(chq.maturityDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-white">
                          LKR {Number(chq.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${
                              statusColors[chq.status] || 'bg-slate-800 text-slate-300 border border-slate-700'
                            }`}
                          >
                            {chq.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right space-x-1.5 whitespace-nowrap">
                          {canDeposit && (
                            <button
                              onClick={() => {
                                setDepositModalCheque(chq);
                                setDepositNotes('');
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-cyan-300 bg-cyan-950 hover:bg-cyan-900 border border-cyan-800 rounded-lg transition"
                              title="Mark cheque presented/deposited at bank"
                            >
                              Deposit
                            </button>
                          )}
                          {canClearOrBounce && (
                            <>
                              <button
                                onClick={() => {
                                  setClearModalCheque(chq);
                                  setClearDate(new Date().toISOString().split('T')[0]);
                                  setClearNotes('');
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-emerald-300 bg-emerald-950 hover:bg-emerald-900 border border-emerald-800 rounded-lg transition"
                                title="Mark cheque honoured & cleared by bank"
                              >
                                Clear
                              </button>
                              <button
                                onClick={() => {
                                  setBounceModalCheque(chq);
                                  setBounceReason('Insufficient funds / Refer to drawer');
                                  setBounceCharges(1500);
                                  setBounceNotes('');
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-rose-300 bg-rose-950 hover:bg-rose-900 border border-rose-800 rounded-lg transition"
                                title="Handle cheque dishonour / bounce"
                              >
                                Bounce
                              </button>
                              <button
                                onClick={() => {
                                  setCancelModalCheque(chq);
                                  setCancelReason('Payment stopped / cancelled by drawer');
                                  setCancelNotes('');
                                }}
                                className="px-2.5 py-1 text-xs font-semibold text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700 rounded-lg transition"
                                title="Void or cancel issued cheque"
                              >
                                Void
                              </button>
                            </>
                          )}
                          {chq.status === 'CLEARED' && (
                            <span className="text-xs text-emerald-400 font-medium inline-flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Cleared</span>
                            </span>
                          )}
                          {chq.status === 'BOUNCED' && (
                            <span className="text-xs text-rose-400 font-medium inline-flex items-center gap-1" title={chq.bounceReason || 'Bounced'}>
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Bounced</span>
                            </span>
                          )}
                          {chq.status === 'CANCELLED' && (
                            <span className="text-xs text-slate-500 font-medium inline-flex items-center gap-1">
                              <span>Voided</span>
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
          <Pagination
            currentPage={chqPage}
            totalPages={chqTotalPages}
            totalItems={chqTotalItems}
            limit={chqLimit}
            onPageChange={(p) => setChqPage(p)}
            onLimitChange={(l) => {
              setChqLimit(l);
              setChqPage(1);
            }}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* Record Payment Modal */}
      {isRecordPaymentModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-400" />
                Record Supplier Payment
              </h3>
              <button onClick={() => setIsRecordPaymentModalOpen(false)} className="text-slate-400 hover:text-white transition">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Supplier *</label>
                  <select
                    required
                    value={newPayment.supplierId}
                    onChange={(e) => handleSelectSupplierForPayment(e.target.value)}
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
                  <label className="block text-slate-300 font-medium mb-1">Payment Method *</label>
                  <select
                    value={newPayment.paymentMethod}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentMethod: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="BANK_TRANSFER" className="bg-slate-900 text-white">Bank Transfer</option>
                    <option value="CHEQUE" className="bg-slate-900 text-white">Cheque</option>
                    <option value="CASH" className="bg-slate-900 text-white">Cash</option>
                    <option value="ONLINE" className="bg-slate-900 text-white">Online Transfer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Total Amount Paid (LKR) *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-sm font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Payment Date</label>
                  <input
                    type="date"
                    value={newPayment.paymentDate}
                    onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Bank Name</label>
                  <input
                    type="text"
                    value={newPayment.bankName}
                    onChange={(e) => setNewPayment({ ...newPayment, bankName: e.target.value })}
                    placeholder="e.g. Commercial Bank"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Reference / Slip Number</label>
                  <input
                    type="text"
                    value={newPayment.referenceNumber}
                    onChange={(e) => setNewPayment({ ...newPayment, referenceNumber: e.target.value })}
                    placeholder="e.g. TXN-109283"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* If CHEQUE selected, show Cheque particulars */}
              {newPayment.paymentMethod === 'CHEQUE' && (
                <div className="bg-amber-950 p-4 rounded-xl border border-amber-800 space-y-3">
                  <h4 className="font-bold text-amber-300 uppercase text-xs">Cheque Particulars</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-slate-300 mb-1">Cheque Number *</label>
                      <input
                        type="text"
                        required
                        value={newPayment.chequeDetails.chequeNumber}
                        onChange={(e) =>
                          setNewPayment({
                            ...newPayment,
                            chequeDetails: { ...newPayment.chequeDetails, chequeNumber: e.target.value },
                          })
                        }
                        placeholder="CHQ-XXXXXX"
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 font-mono text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1">Payee Name *</label>
                      <input
                        type="text"
                        required
                        value={newPayment.chequeDetails.payeeName}
                        onChange={(e) =>
                          setNewPayment({
                            ...newPayment,
                            chequeDetails: { ...newPayment.chequeDetails, payeeName: e.target.value },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-slate-300 mb-1">Maturity Date (Post-dated) *</label>
                      <input
                        type="date"
                        required
                        value={newPayment.chequeDetails.maturityDate}
                        onChange={(e) =>
                          setNewPayment({
                            ...newPayment,
                            chequeDetails: { ...newPayment.chequeDetails, maturityDate: e.target.value },
                          })
                        }
                        className="w-full bg-slate-950 border border-slate-800 rounded p-1.5 text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Invoice Allocations Table */}
              <div className="border border-slate-800 rounded-xl p-4 bg-slate-950 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase text-slate-300">Allocate To Outstanding Invoices</h4>
                  <span className="text-slate-400 text-[11px]">
                    Remaining surplus will be saved as supplier advance
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="text-slate-400 uppercase border-b border-slate-800">
                        <th className="pb-2">Invoice #</th>
                        <th className="pb-2">Due Date</th>
                        <th className="pb-2 text-right">Invoice Total</th>
                        <th className="pb-2 text-right">Balance Due</th>
                        <th className="pb-2 text-right w-36">Allocate (LKR)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {supplierInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-500">
                            No unpaid invoices for this supplier. Full amount will be recorded as advance.
                          </td>
                        </tr>
                      ) : (
                        supplierInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-slate-900 transition">
                            <td className="py-2 font-bold text-emerald-400">{inv.invoiceNumber}</td>
                            <td className="py-2 text-slate-400">
                              {new Date(inv.dueDate).toLocaleDateString()}
                            </td>
                            <td className="py-2 text-right text-slate-200">LKR {Number(inv.totalAmount).toLocaleString()}</td>
                            <td className="py-2 text-right font-bold text-amber-400">
                              LKR {Number(inv.balanceAmount).toLocaleString()}
                            </td>
                            <td className="py-2 text-right">
                              <input
                                type="number"
                                min="0"
                                max={Number(inv.balanceAmount)}
                                placeholder="0.00"
                                onChange={(e) => handleAllocationChange(inv.id, Number(e.target.value))}
                                className="w-28 text-right bg-slate-950 border border-slate-800 text-white rounded p-1 font-semibold focus:outline-none focus:border-emerald-500"
                              />
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsRecordPaymentModalOpen(false)}
                  className="px-4 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition shadow-sm shadow-emerald-600/20"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 1. Cheque Deposit Modal */}
      {depositModalCheque && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-base">
                <CreditCard className="w-5 h-5" />
                Deposit Cheque in Bank
              </div>
              <button
                onClick={() => setDepositModalCheque(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Cheque Number:</span>
                <span className="font-mono font-bold text-cyan-300">{depositModalCheque.chequeNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bank & Branch:</span>
                <span className="font-medium text-white">{depositModalCheque.bankName} {depositModalCheque.branchName ? `(${depositModalCheque.branchName})` : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payee:</span>
                <span className="font-medium text-white">{depositModalCheque.payeeName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 mt-1">
                <span className="text-slate-400">Cheque Amount:</span>
                <span className="font-bold text-sm text-cyan-400">
                  LKR {Number(depositModalCheque.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-slate-300 font-medium">Bank Deposit Slip / Reference Notes (Optional)</label>
              <textarea
                rows={2}
                value={depositNotes}
                onChange={(e) => setDepositNotes(e.target.value)}
                placeholder="e.g. Deposited at Commercial Bank branch / CDM slip #10492"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setDepositModalCheque(null)}
                className="px-3.5 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleDepositCheque}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-semibold transition text-xs shadow-md shadow-cyan-600/20 flex items-center gap-1.5"
              >
                {isSubmittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Mark as Deposited</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Cheque Clear Modal */}
      {clearModalCheque && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                <CheckCircle2 className="w-5 h-5" />
                Mark Cheque as Cleared & Honoured
              </div>
              <button
                onClick={() => setClearModalCheque(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Cheque Number:</span>
                <span className="font-mono font-bold text-emerald-300">{clearModalCheque.chequeNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Bank & Branch:</span>
                <span className="font-medium text-white">{clearModalCheque.bankName} {clearModalCheque.branchName ? `(${clearModalCheque.branchName})` : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payee:</span>
                <span className="font-medium text-white">{clearModalCheque.payeeName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 mt-1">
                <span className="text-slate-400">Cheque Amount:</span>
                <span className="font-bold text-sm text-emerald-400">
                  LKR {Number(clearModalCheque.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Clearance Date *</label>
                <input
                  type="date"
                  required
                  value={clearDate}
                  onChange={(e) => setClearDate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Bank Statement / Clearance Ref (Optional)</label>
                <textarea
                  rows={2}
                  value={clearNotes}
                  onChange={(e) => setClearNotes(e.target.value)}
                  placeholder="e.g. Bank statement entry dated 12/11 / cleared by bank"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setClearModalCheque(null)}
                className="px-3.5 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleClearCheque}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold transition text-xs flex items-center gap-1.5"
              >
                {isSubmittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm Cheque Cleared</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Cheque Bounce Modal */}
      {bounceModalCheque && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-rose-400 font-bold text-base">
                <ShieldAlert className="w-5 h-5" />
                Handle Cheque Dishonour / Bounce
              </div>
              <button
                onClick={() => setBounceModalCheque(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Cheque Number:</span>
                <span className="font-mono font-bold text-rose-300">{bounceModalCheque.chequeNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payee:</span>
                <span className="font-medium text-white">{bounceModalCheque.payeeName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 mt-1">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-sm text-rose-400">
                  LKR {Number(bounceModalCheque.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <p className="text-xs text-rose-300 bg-rose-950 p-2.5 rounded-lg border border-rose-800 leading-relaxed">
              Recording this bounce will atomically reverse all invoice payment allocations, restore the supplier liability on the ledger, and charge bank fees.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Reason for Bounce *</label>
                <select
                  value={bounceReason}
                  onChange={(e) => setBounceReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500 mb-1.5"
                >
                  <option value="Insufficient funds / Refer to drawer">Insufficient funds / Refer to drawer</option>
                  <option value="Payment stopped by drawer">Payment stopped by drawer</option>
                  <option value="Signature mismatch / irregular">Signature mismatch / irregular</option>
                  <option value="Account closed / dormant">Account closed / dormant</option>
                  <option value="Post-dated presentation error">Post-dated presentation error</option>
                  <option value="Alteration requires drawer's signature">Alteration requires drawer&apos;s signature</option>
                  <option value="Custom">Other (Type custom reason below)</option>
                </select>
                {bounceReason === 'Custom' && (
                  <input
                    type="text"
                    required
                    placeholder="Enter custom bounce reason..."
                    onChange={(e) => setBounceReason(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white focus:outline-none focus:border-rose-500 text-xs"
                  />
                )}
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Bank Dishonour Charges (LKR)</label>
                <input
                  type="number"
                  min="0"
                  value={bounceCharges}
                  onChange={(e) => setBounceCharges(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Additional Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={bounceNotes}
                  onChange={(e) => setBounceNotes(e.target.value)}
                  placeholder="e.g. Bank return advice received on 12/11"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setBounceModalCheque(null)}
                className="px-3.5 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleBounceCheque}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-semibold transition text-xs shadow-md shadow-rose-600/20 flex items-center gap-1.5"
              >
                {isSubmittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm Bounce & Reverse</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Cheque Cancel / Void Modal */}
      {cancelModalCheque && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <AlertTriangle className="w-5 h-5" />
                Cancel & Void Issued Cheque
              </div>
              <button
                onClick={() => setCancelModalCheque(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Cheque Number:</span>
                <span className="font-mono font-bold text-amber-300">{cancelModalCheque.chequeNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payee:</span>
                <span className="font-medium text-white">{cancelModalCheque.payeeName}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-1.5 mt-1">
                <span className="text-slate-400">Amount:</span>
                <span className="font-bold text-sm text-amber-400">
                  LKR {Number(cancelModalCheque.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <p className="text-xs text-amber-300 bg-amber-950 p-2.5 rounded-lg border border-amber-800 leading-relaxed">
              This will void this cheque in the register, reverse any settled invoices, and restore the supplier payable liability.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Reason for Cancellation / Stop Payment *</label>
                <input
                  type="text"
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="e.g. Issued in error / replaced with bank transfer"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Notes (Optional)</label>
                <textarea
                  rows={2}
                  value={cancelNotes}
                  onChange={(e) => setCancelNotes(e.target.value)}
                  placeholder="Additional remarks..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setCancelModalCheque(null)}
                className="px-3.5 py-2 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-800 transition text-xs"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={handleCancelCheque}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-semibold transition text-xs flex items-center gap-1.5"
              >
                {isSubmittingAction ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm Void Cheque</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
