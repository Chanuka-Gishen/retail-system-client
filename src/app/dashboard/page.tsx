'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  ShoppingBag,
  Users,
  DollarSign,
  ArrowRight,
  Layers,
  Archive,
  Receipt,
  CreditCard,
  AlertTriangle,
  Clock,
  Calendar,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  Building2,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../lib/auth-store';

interface ChequeItem {
  id: string;
  chequeNumber: string;
  bankName: string;
  branchName?: string;
  chequeDate: string;
  maturityDate: string;
  amount: number | string;
  payeeName: string;
  status: 'ISSUED' | 'AWAITING_DEPOSIT' | 'DEPOSITED' | 'CLEARED' | 'BOUNCED' | 'CANCELLED';
  supplier?: {
    id: string;
    code: string;
    name: string;
  };
  payment?: {
    id: string;
    paymentNumber: string;
    paymentDate: string;
  };
}

interface ChequePendingSummary {
  totalPendingCount: number;
  totalPendingAmount: number;
  overdue: { count: number; totalAmount: number; items: ChequeItem[] };
  dueToday: { count: number; totalAmount: number; items: ChequeItem[] };
  dueIn3Days: { count: number; totalAmount: number; items: ChequeItem[] };
  dueIn7Days: { count: number; totalAmount: number; items: ChequeItem[] };
  upcomingLater: { count: number; totalAmount: number };
  byStatus: {
    ISSUED: { count: number; totalAmount: number };
    AWAITING_DEPOSIT: { count: number; totalAmount: number };
    DEPOSITED: { count: number; totalAmount: number };
  };
  upcomingCheques: ChequeItem[];
}

export default function DashboardPage() {
  const router = useRouter();
  const { branch, isAuthenticated } = useAuthStore();
  const [salesStats, setSalesStats] = useState({ totalSales: 0, todayRevenue: 0 });
  const [customerCount, setCustomerCount] = useState(0);

  // Cheque Pending Info State
  const [chequeSummary, setChequeSummary] = useState<ChequePendingSummary | null>(null);
  const [isChequesLoading, setIsChequesLoading] = useState(true);
  const [chequeTabFilter, setChequeTabFilter] = useState<'all' | 'urgent' | '7days'>('all');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  const fetchDashboardMetrics = async () => {
    try {
      setIsChequesLoading(true);
      const [salesRes, customersRes, chequesRes] = await Promise.all([
        apiClient<any>('/pos/sales?limit=5'),
        apiClient<any>('/customers?limit=1'),
        apiClient<ChequePendingSummary>('/purchasing/cheques/pending-summary').catch(() => null),
      ]);

      const totalSales = salesRes?.meta?.total || 0;
      const totalCustomers = customersRes?.meta?.total || 0;

      setSalesStats({
        totalSales,
        todayRevenue: (salesRes?.items || []).reduce((sum: number, s: any) => sum + Number(s.totalAmount), 0),
      });
      setCustomerCount(totalCustomers);
      if (chequesRes) {
        setChequeSummary(chequesRes);
      }
    } catch (err) {
      console.warn('Dashboard metrics fetch error:', err);
    } finally {
      setIsChequesLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  const getMaturityBadge = (maturityDateStr: string) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const mDate = new Date(maturityDateStr);
    mDate.setHours(0, 0, 0, 0);
    const diffTime = mDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-400 border border-rose-800">
          🚨 Overdue ({Math.abs(diffDays)}d ago)
        </span>
      );
    }
    if (diffDays === 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950 text-amber-400 border border-amber-800 animate-pulse">
          ⚡ Due Today
        </span>
      );
    }
    if (diffDays <= 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-950 text-orange-400 border border-amber-800">
          ⏳ In {diffDays} {diffDays === 1 ? 'day' : 'days'}
        </span>
      );
    }
    if (diffDays <= 7) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-950 text-sky-400 border border-sky-800">
          📅 In {diffDays} days
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
        🗓️ In {diffDays} days
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
            ISSUED
          </span>
        );
      case 'AWAITING_DEPOSIT':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-950 text-amber-400 border border-amber-800">
            AWAITING DEPOSIT
          </span>
        );
      case 'DEPOSITED':
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800">
            DEPOSITED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  // Filtered upcoming cheques list based on tab
  const filteredCheques = React.useMemo(() => {
    if (!chequeSummary?.upcomingCheques) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    in7Days.setHours(23, 59, 59, 999);

    if (chequeTabFilter === 'urgent') {
      return chequeSummary.upcomingCheques.filter((c) => {
        const d = new Date(c.maturityDate);
        d.setHours(0, 0, 0, 0);
        const in3Days = new Date(today);
        in3Days.setDate(in3Days.getDate() + 3);
        return d <= in3Days; // Overdue, Today, or In 3 Days
      });
    }

    if (chequeTabFilter === '7days') {
      return chequeSummary.upcomingCheques.filter((c) => {
        const d = new Date(c.maturityDate);
        return d <= in7Days;
      });
    }

    return chequeSummary.upcomingCheques;
  }, [chequeSummary, chequeTabFilter]);

  const urgentCount = (chequeSummary?.overdue.count || 0) + (chequeSummary?.dueToday.count || 0) + (chequeSummary?.dueIn3Days.count || 0);

  return (
    <div className="flex-1 bg-slate-950 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-blue-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Store Performance Overview
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Branch: <span className="text-blue-400 font-semibold">{branch?.name || 'Main Flagship'}</span>
          </p>
        </div>
        <Link
          href="/pos"
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-5 rounded-xl flex items-center space-x-2 transition text-sm"
        >
          <ShoppingBag className="w-4 h-4" />
          <span>Launch POS Register</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* KPI Stats Cards (5 Column Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Sales Transactions</span>
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">{salesStats.totalSales}</div>
          <div className="text-xs text-emerald-400 font-medium">Completed orders</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Recent Volume</span>
            <DollarSign className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black text-white">
            LKR {salesStats.todayRevenue.toLocaleString()}
          </div>
          <div className="text-xs text-slate-400">Total transaction value</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Loyalty Customers</span>
            <Users className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-white">{customerCount}</div>
          <div className="text-xs text-teal-400 font-medium">Registered members</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Stock Health</span>
            <Archive className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-emerald-400">Normal</div>
          <div className="text-xs text-slate-400">Active monitoring</div>
        </div>

        {/* Pending Cheques KPI Card */}
        <Link
          href="/purchasing/payments"
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-600 rounded-xl p-5 space-y-2 transition group block"
        >
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase">
            <span>Pending Cheques</span>
            <CreditCard className="w-4 h-4 text-amber-400 group-hover:scale-110 transition" />
          </div>
          <div className="text-2xl font-black text-white group-hover:text-amber-400 transition">
            LKR {(chequeSummary?.totalPendingAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </div>
          <div className="flex items-center justify-between text-xs pt-0.5">
            <span className="text-slate-400 font-medium">
              {chequeSummary?.totalPendingCount || 0} active
            </span>
            {chequeSummary && chequeSummary.overdue.count > 0 ? (
              <span className="text-rose-400 font-bold flex items-center gap-1 bg-rose-950 px-1.5 py-0.5 rounded border border-rose-800 text-[11px]">
                🚨 {chequeSummary.overdue.count} Overdue
              </span>
            ) : chequeSummary && chequeSummary.dueToday.count > 0 ? (
              <span className="text-amber-400 font-bold flex items-center gap-1 bg-amber-950 px-1.5 py-0.5 rounded border border-amber-800 text-[11px]">
                ⚡ {chequeSummary.dueToday.count} Due Today
              </span>
            ) : chequeSummary && chequeSummary.dueIn7Days.count > 0 ? (
              <span className="text-sky-400 font-medium flex items-center gap-1 bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800 text-[11px]">
                📅 {chequeSummary.dueIn7Days.count} Due in 7d
              </span>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center gap-1 text-[11px]">
                ✓ All Clear
              </span>
            )}
          </div>
        </Link>
      </div>

      {/* Cheque Obligations & Maturity Tracker Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-sm">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  Supplier Cheque Obligations & Maturity Tracker
                </h2>
                {urgentCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800">
                    {urgentCount} Urgent
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Active post-dated and issued supplier cheques awaiting bank clearance or maturity
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchDashboardMetrics}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition text-xs flex items-center gap-1.5"
              title="Refresh Cheque Status"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isChequesLoading ? 'animate-spin text-amber-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <Link
              href="/purchasing/payments"
              className="bg-slate-800 hover:bg-slate-700 text-amber-400 font-semibold px-3 py-2 rounded-lg text-xs flex items-center space-x-1.5 border border-amber-800 hover:border-amber-800 transition"
            >
              <span>Cheque Register</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* 4 Summary Pill Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Total Pending */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
              <span>Total Pending Liabilities</span>
              <CreditCard className="w-4 h-4 text-slate-400" />
            </div>
            <div className="mt-2">
              <div className="text-xl font-black text-white">
                LKR {(chequeSummary?.totalPendingAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {chequeSummary?.totalPendingCount || 0} Cheques in circulation
              </div>
            </div>
          </div>

          {/* Overdue */}
          <div
            className={`border rounded-xl p-3.5 flex flex-col justify-between transition ${
              (chequeSummary?.overdue.count || 0) > 0
                ? 'bg-rose-950 border-rose-800 text-rose-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={(chequeSummary?.overdue.count || 0) > 0 ? 'text-rose-300' : 'text-slate-400'}>
                Overdue Cheques
              </span>
              <AlertTriangle className={`w-4 h-4 ${(chequeSummary?.overdue.count || 0) > 0 ? 'text-rose-400 animate-bounce' : 'text-slate-500'}`} />
            </div>
            <div className="mt-2">
              <div className={`text-xl font-black ${(chequeSummary?.overdue.count || 0) > 0 ? 'text-rose-200' : 'text-white'}`}>
                LKR {(chequeSummary?.overdue.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-[11px] mt-0.5 font-medium ${(chequeSummary?.overdue.count || 0) > 0 ? 'text-rose-400' : 'text-slate-400'}`}>
                {chequeSummary?.overdue.count || 0} Past maturity date
              </div>
            </div>
          </div>

          {/* Due Today */}
          <div
            className={`border rounded-xl p-3.5 flex flex-col justify-between transition ${
              (chequeSummary?.dueToday.count || 0) > 0
                ? 'bg-amber-950 border-amber-800 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={(chequeSummary?.dueToday.count || 0) > 0 ? 'text-amber-300' : 'text-slate-400'}>
                Maturing Today
              </span>
              <Clock className={`w-4 h-4 ${(chequeSummary?.dueToday.count || 0) > 0 ? 'text-amber-400 animate-pulse' : 'text-slate-500'}`} />
            </div>
            <div className="mt-2">
              <div className={`text-xl font-black ${(chequeSummary?.dueToday.count || 0) > 0 ? 'text-amber-200' : 'text-white'}`}>
                LKR {(chequeSummary?.dueToday.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-[11px] mt-0.5 font-medium ${(chequeSummary?.dueToday.count || 0) > 0 ? 'text-amber-400' : 'text-slate-400'}`}>
                {chequeSummary?.dueToday.count || 0} Due for presentation today
              </div>
            </div>
          </div>

          {/* Maturing in 7 Days */}
          <div
            className={`border rounded-xl p-3.5 flex flex-col justify-between transition ${
              (chequeSummary?.dueIn7Days.count || 0) > 0
                ? 'bg-sky-950 border-sky-800 text-sky-300'
                : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className={(chequeSummary?.dueIn7Days.count || 0) > 0 ? 'text-sky-300' : 'text-slate-400'}>
                Maturing Next 7 Days
              </span>
              <Calendar className={`w-4 h-4 ${(chequeSummary?.dueIn7Days.count || 0) > 0 ? 'text-sky-400' : 'text-slate-500'}`} />
            </div>
            <div className="mt-2">
              <div className={`text-xl font-black ${(chequeSummary?.dueIn7Days.count || 0) > 0 ? 'text-sky-200' : 'text-white'}`}>
                LKR {(chequeSummary?.dueIn7Days.totalAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className={`text-[11px] mt-0.5 font-medium ${(chequeSummary?.dueIn7Days.count || 0) > 0 ? 'text-sky-400' : 'text-slate-400'}`}>
                {chequeSummary?.dueIn7Days.count || 0} Maturing within this week
              </div>
            </div>
          </div>
        </div>

        {/* Lifecycle Status Breakdown Chips */}
        {chequeSummary && (chequeSummary.totalPendingCount > 0) && (
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
            <span className="text-slate-400 font-medium">Status Distribution:</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-300 font-medium">
              Issued: <strong className="text-white">{chequeSummary.byStatus.ISSUED.count}</strong> (LKR {chequeSummary.byStatus.ISSUED.totalAmount.toLocaleString()})
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-amber-950 border border-amber-800 text-amber-300 font-medium">
              Awaiting Deposit: <strong className="text-white">{chequeSummary.byStatus.AWAITING_DEPOSIT.count}</strong> (LKR {chequeSummary.byStatus.AWAITING_DEPOSIT.totalAmount.toLocaleString()})
            </span>
            <span className="px-2.5 py-1 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-300 font-medium">
              Deposited in Bank: <strong className="text-white">{chequeSummary.byStatus.DEPOSITED.count}</strong> (LKR {chequeSummary.byStatus.DEPOSITED.totalAmount.toLocaleString()})
            </span>
          </div>
        )}

        {/* Tab Filters */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-2 text-xs">
          <button
            onClick={() => setChequeTabFilter('all')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              chequeTabFilter === 'all'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Pending ({chequeSummary?.totalPendingCount || 0})
          </button>
          <button
            onClick={() => setChequeTabFilter('urgent')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition flex items-center gap-1.5 ${
              chequeTabFilter === 'urgent'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <span>Urgent / Action Required</span>
            {urgentCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-white text-rose-600 font-black">
                {urgentCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setChequeTabFilter('7days')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition ${
              chequeTabFilter === '7days'
                ? 'bg-sky-600 text-white shadow-sm'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Maturing Next 7 Days ({(chequeSummary?.dueIn7Days.count || 0) + (chequeSummary?.dueToday.count || 0)})
          </button>
        </div>

        {/* Table / List */}
        {isChequesLoading ? (
          <div className="py-10 text-center space-y-3">
            <RefreshCw className="w-6 h-6 animate-spin text-amber-400 mx-auto" />
            <p className="text-xs text-slate-400">Loading pending cheque obligations...</p>
          </div>
        ) : filteredCheques.length === 0 ? (
          <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-950 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">No Pending Cheques</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {chequeTabFilter === 'urgent'
                  ? 'No cheques are currently overdue or maturing within the next 3 days.'
                  : chequeTabFilter === '7days'
                  ? 'No cheques are scheduled to mature in the next 7 days.'
                  : 'All issued supplier cheques have cleared through the banking system or no pending obligations exist.'}
              </p>
            </div>
            <div className="pt-2">
              <Link
                href="/purchasing/payments"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 transition"
              >
                <span>Open Cheque Register & Issue Payment</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950 text-slate-400 uppercase font-semibold border-b border-slate-800 text-[11px]">
                  <th className="py-3 px-4">Cheque # & Bank</th>
                  <th className="py-3 px-4">Supplier / Payee</th>
                  <th className="py-3 px-4">Maturity Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {filteredCheques.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-850 transition group">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-white group-hover:text-amber-400 transition flex items-center gap-1.5">
                        <span>{c.chequeNumber}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Building2 className="w-3 h-3 text-slate-500" />
                        <span>{c.bankName} {c.branchName ? `(${c.branchName})` : ''}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-200">
                        {c.supplier?.name || c.payeeName}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        {c.supplier?.code ? `Supplier: ${c.supplier.code}` : `Payee: ${c.payeeName}`}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-300">
                        {new Date(c.maturityDate).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </div>
                      <div className="mt-1">
                        {getMaturityBadge(c.maturityDate)}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-sm text-white">
                        LKR {Number(c.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      {c.payment?.paymentNumber && (
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          Ref: {c.payment.paymentNumber}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {getStatusBadge(c.status)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href="/purchasing/payments"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-400 hover:text-amber-300 border border-slate-700 hover:border-amber-800 text-[11px] font-semibold transition shadow-sm"
                      >
                        <span>Manage</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Navigation Cards (5 Columns Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pt-2">
        <Link
          href="/invoices"
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition group"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center mb-3">
            <Receipt className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base group-hover:text-emerald-400 transition">
            Invoices & Receipts
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Review sales invoices, thermal receipts, and reprint slips
          </p>
        </Link>

        <Link
          href="/catalog"
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition group"
        >
          <div className="w-10 h-10 rounded-lg bg-sky-950 text-sky-400 flex items-center justify-center mb-3">
            <Layers className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base group-hover:text-sky-400 transition">
            Product Catalog
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Manage SKUs, variants, prices, barcodes, and tax classifications
          </p>
        </Link>

        <Link
          href="/inventory"
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center mb-3">
            <Archive className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition">
            Inventory & Balances
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Warehouse on-hand quantities, cycle counting, and adjustments
          </p>
        </Link>

        <Link
          href="/purchasing/payments"
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition group"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-950 text-amber-400 flex items-center justify-center mb-3">
            <CreditCard className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base group-hover:text-amber-400 transition">
            Payments & Cheques
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Supplier settlements, cheque register, bounce handling & alerts
          </p>
        </Link>

        <Link
          href="/accounting"
          className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 rounded-xl p-5 transition group"
        >
          <div className="w-10 h-10 rounded-lg bg-teal-950 text-teal-400 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-white text-base group-hover:text-teal-400 transition">
            Financial Ledger
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Double-entry chart of accounts, Trial Balance, and P&L
          </p>
        </Link>
      </div>
    </div>
  );
}
