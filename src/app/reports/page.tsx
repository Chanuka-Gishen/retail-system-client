'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  Receipt,
  CreditCard,
  Banknote,
  DollarSign,
  User,
  Users,
  Building2,
  Search,
  Filter,
  CheckCircle2,
  RefreshCw,
  FileSpreadsheet,
  ArrowUpRight,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../lib/auth-store';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { EmptyState } from '../../components/EmptyState';

interface SaleItem {
  id: string;
  invoiceNumber: string;
  completedAt: string;
  totalGrossAmount: number;
  totalDiscountAmount: number;
  totalTaxAmount: number;
  totalNetAmount: number;
  status: 'COMPLETED' | 'PARTIALLY_REFUNDED' | 'REFUNDED' | 'VOIDED';
  branchId: string;
  cashierId: string;
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
  cashier?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  payments?: Array<{
    tenderType: string;
    amount: number;
  }>;
  items?: Array<{
    id: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    variant?: {
      sku: string;
      product?: { name: string };
    };
  }>;
}

export default function SalesReportsPage() {
  const { isAuthenticated } = useAuthStore();

  // Date Presets State
  const [datePreset, setDatePreset] = useState<'TODAY' | 'YESTERDAY' | 'THIS_WEEK' | 'THIS_MONTH' | 'CUSTOM'>('THIS_MONTH');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1); // First day of this month
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  // Filters State
  const [branchFilter, setBranchFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [branches, setBranches] = useState<Array<{ id: string; name: string; code: string }>>([]);

  // Data & Pagination State
  const [sales, setSales] = useState<SaleItem[]>([]);
  const [totalSalesCount, setTotalSalesCount] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Active Tab: Transactions vs Cashier Performance
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'CASHIERS'>('TRANSACTIONS');

  // Load Branches
  useEffect(() => {
    if (!isAuthenticated) return;
    const loadBranches = async () => {
      try {
        const res = await apiClient<any>('/merchant/branches');
        const list = Array.isArray(res) ? res : res?.items || [];
        setBranches(list);
      } catch (e: any) {
        console.warn('Could not load branches:', e.message);
      }
    };
    loadBranches();
  }, [isAuthenticated]);

  // Handle Preset Changes
  const handlePresetChange = (preset: typeof datePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'TODAY') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'YESTERDAY') {
      const y = new Date();
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (preset === 'THIS_WEEK') {
      const d = new Date();
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
      const monday = new Date(d.setDate(diff));
      setStartDate(monday.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'THIS_MONTH') {
      const d = new Date();
      d.setDate(1);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
    setPage(1);
  };

  // Fetch Sales Data
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchSales = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          limit: limit.toString(),
        });

        if (startDate) params.append('startDate', new Date(startDate).toISOString());
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          params.append('endDate', end.toISOString());
        }
        if (branchFilter !== 'ALL') params.append('branchId', branchFilter);
        if (statusFilter !== 'ALL') params.append('status', statusFilter);
        if (searchQuery.trim()) params.append('search', searchQuery.trim());

        const res = await apiClient<{ items: SaleItem[]; meta: any }>(`/pos/sales?${params.toString()}`);
        if (res && res.items) {
          setSales(res.items);
          setTotalSalesCount(res.meta?.total || res.items.length);
          setTotalPages(res.meta?.totalPages || 1);
        }
      } catch (err: any) {
        console.warn('Could not load sales report:', err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSales();
  }, [isAuthenticated, page, limit, startDate, endDate, branchFilter, statusFilter, searchQuery]);

  // Financial Metrics Calculations
  const metrics = useMemo(() => {
    let totalRevenue = 0;
    let totalDiscounts = 0;
    let totalTax = 0;
    let totalCash = 0;
    let totalCard = 0;

    sales.forEach((s) => {
      if (s.status !== 'VOIDED') {
        totalRevenue += Number(s.totalNetAmount || 0);
        totalDiscounts += Number(s.totalDiscountAmount || 0);
        totalTax += Number(s.totalTaxAmount || 0);

        (s.payments || []).forEach((p) => {
          if (p.tenderType === 'CASH') totalCash += Number(p.amount || 0);
          else if (p.tenderType === 'CARD') totalCard += Number(p.amount || 0);
        });
      }
    });

    const completedCount = sales.filter((s) => s.status === 'COMPLETED').length;
    const aov = completedCount > 0 ? totalRevenue / completedCount : 0;

    return {
      totalRevenue,
      totalDiscounts,
      totalTax,
      totalCash,
      totalCard,
      completedCount,
      aov,
    };
  }, [sales]);

  // Cashier Performance Aggregation
  const cashierStats = useMemo(() => {
    const map = new Map<string, { cashier: any; count: number; revenue: number }>();

    sales.forEach((s) => {
      const cid = s.cashierId || s.cashier?.id || 'unknown';
      const cname = s.cashier
        ? `${s.cashier.firstName} ${s.cashier.lastName}`
        : 'Store Cashier';

      const existing = map.get(cid) || {
        cashier: { name: cname, email: s.cashier?.email || '' },
        count: 0,
        revenue: 0,
      };

      if (s.status !== 'VOIDED') {
        existing.count += 1;
        existing.revenue += Number(s.totalNetAmount || 0);
      }

      map.set(cid, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  // Export to CSV Generator
  const handleExportCSV = () => {
    if (sales.length === 0) {
      alert('No sales data available to export.');
      return;
    }

    const headers = [
      'Invoice Number',
      'Date & Time',
      'Status',
      'Customer',
      'Cashier',
      'Gross Amount (LKR)',
      'Discount (LKR)',
      'Tax (LKR)',
      'Net Total (LKR)',
      'Payment Tenders',
    ];

    const rows = sales.map((s) => [
      `"${s.invoiceNumber}"`,
      `"${new Date(s.completedAt).toLocaleString()}"`,
      `"${s.status}"`,
      `"${s.customer?.name || 'Walk-in Customer'}"`,
      `"${s.cashier ? `${s.cashier.firstName} ${s.cashier.lastName}` : 'Cashier'}"`,
      Number(s.totalGrossAmount || 0).toFixed(2),
      Number(s.totalDiscountAmount || 0).toFixed(2),
      Number(s.totalTaxAmount || 0).toFixed(2),
      Number(s.totalNetAmount || 0).toFixed(2),
      `"${(s.payments || []).map((p) => `${p.tenderType}: ${p.amount}`).join('; ')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Sales_Report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-950 border border-emerald-800 text-emerald-400 rounded-xl">
            <LineChart className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Sales Reports & Analytics</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive transaction volume, cashier performance, revenue splits, and CSV export.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold rounded-xl transition text-xs flex items-center space-x-1.5 shadow-sm"
            title="Download CSV Spreadsheet"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold rounded-xl transition text-xs flex items-center space-x-1.5 shadow-sm"
            title="Print Summary Report"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Date Presets & Filter Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3">
        {/* Preset Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pb-2 border-b border-slate-800 text-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 flex items-center">
            <Calendar className="w-3.5 h-3.5 mr-1 text-slate-500" />
            Date Range:
          </span>
          {[
            { id: 'TODAY', label: 'Today' },
            { id: 'YESTERDAY', label: 'Yesterday' },
            { id: 'THIS_WEEK', label: 'This Week' },
            { id: 'THIS_MONTH', label: 'This Month' },
            { id: 'CUSTOM', label: 'Custom' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetChange(preset.id as any)}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                datePreset === preset.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-950 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Date Inputs, Branch Dropdown, Search */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDatePreset('CUSTOM');
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDatePreset('CUSTOM');
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Store Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="ALL">All Store Branches</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Search Invoice</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Invoice number..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Gross Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            LKR {metrics.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 font-semibold">
            {metrics.completedCount} successful orders
          </div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Order (AOV)</span>
            <Receipt className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-teal-400 font-mono">
            LKR {metrics.aov.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Per completed transaction</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Cash Tenders</span>
            <Banknote className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            LKR {metrics.totalCash.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">Physical register cash</div>
        </div>

        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Card & Digital</span>
            <CreditCard className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black text-white font-mono">
            LKR {metrics.totalCard.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">POS card slips</div>
        </div>
      </div>

      {/* Tabs: Transactions vs Cashier Performance */}
      <div className="flex border-b border-slate-800">
        <button
          type="button"
          onClick={() => setActiveTab('TRANSACTIONS')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'TRANSACTIONS'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Sales Invoices Register ({totalSalesCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('CASHIERS')}
          className={`pb-3 px-4 text-xs font-bold border-b-2 transition flex items-center space-x-2 ${
            activeTab === 'CASHIERS'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Cashier Sales Performance</span>
        </button>
      </div>

      {/* TAB 1: TRANSACTIONS REGISTER */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4">Cashier</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Tenders</th>
                  <th className="py-3 px-4 text-right">Net Amount</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading ? (
                  <TableSkeleton columns={7} rows={6} theme="dark" />
                ) : sales.length === 0 ? (
                  <EmptyState
                    colSpan={7}
                    icon={Receipt}
                    title="No Sales Transactions Found"
                    description="No checkout sales recorded matching the selected date range and filters."
                    isSearchActive={!!searchQuery || branchFilter !== 'ALL' || statusFilter !== 'ALL'}
                    onResetFilters={() => {
                      setSearchQuery('');
                      setBranchFilter('ALL');
                      setStatusFilter('ALL');
                      handlePresetChange('THIS_MONTH');
                    }}
                    theme="dark"
                  />
                ) : (
                  sales.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        <span className="text-emerald-400">{s.invoiceNumber}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(s.completedAt).toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-200">
                          {s.cashier ? `${s.cashier.firstName} ${s.cashier.lastName}` : 'Front Desk'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-slate-300">{s.customer?.name || 'Walk-in'}</div>
                        {s.customer?.phone && (
                          <div className="text-[10px] text-slate-500 font-mono">{s.customer.phone}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {(s.payments || []).map((p, idx) => (
                            <span
                              key={idx}
                              className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-slate-300"
                            >
                              {p.tenderType}: {Number(p.amount || 0).toFixed(0)}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 text-sm">
                        LKR {Number(s.totalNetAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : s.status === 'REFUNDED'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {s.status}
                        </span>
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
            totalItems={totalSalesCount}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(l) => {
              setLimit(l);
              setPage(1);
            }}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* TAB 2: CASHIER PERFORMANCE SUMMARY */}
      {activeTab === 'CASHIERS' && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 border-b border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Cashier Name</th>
                  <th className="py-3 px-4 text-center">Orders Completed</th>
                  <th className="py-3 px-4 text-right">Total Revenue (LKR)</th>
                  <th className="py-3 px-4 text-right">Avg Order Size (LKR)</th>
                  <th className="py-3 px-4 text-right">% Contribution</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {cashierStats.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No cashier activity found in this period.
                    </td>
                  </tr>
                ) : (
                  cashierStats.map((cs, idx) => {
                    const avg = cs.count > 0 ? cs.revenue / cs.count : 0;
                    const pct = metrics.totalRevenue > 0 ? (cs.revenue / metrics.totalRevenue) * 100 : 0;

                    return (
                      <tr key={idx} className="hover:bg-slate-800/50 transition">
                        <td className="py-3.5 px-4 font-bold text-white flex items-center space-x-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center font-bold text-xs">
                            {cs.cashier.name[0] || 'C'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-100">{cs.cashier.name}</div>
                            {cs.cashier.email && (
                              <div className="text-[10px] text-slate-500 font-mono font-normal">
                                {cs.cashier.email}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-200">{cs.count} orders</td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">
                          LKR {Number(cs.revenue || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                          LKR {Number(avg || 0).toFixed(2)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono font-bold text-teal-400">
                          {Number(pct || 0).toFixed(1)}%
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
