'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BarChart3,
  Printer,
  CheckCircle2,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../lib/auth-store';
import { TableSkeleton } from '../../../components/TableSkeleton';
import { EmptyState } from '../../../components/EmptyState';

export default function PurchasingReportsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'ageing' | 'spend' | 'discrepancies'>('ageing');
  const [ageingData, setAgeingData] = useState<any>(null);
  const [spendData, setSpendData] = useState<any>(null);
  const [discrepancies, setDiscrepancies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Spend Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!isAuthenticated) router.push('/login');
  }, [isAuthenticated, router]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const qSpend = new URLSearchParams();
      if (startDate) qSpend.append('startDate', startDate);
      if (endDate) qSpend.append('endDate', endDate);

      const [ageingRes, spendRes, discRes] = await Promise.all([
        apiClient<any>('/purchasing/reports/ageing'),
        apiClient<any>(`/purchasing/reports/spend?${qSpend.toString()}`),
        apiClient<any>('/purchasing/reports/discrepancies'),
      ]);

      setAgeingData(ageingRes);
      setSpendData(spendRes);
      setDiscrepancies(discRes || []);
    } catch {
      // Ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) loadReports();
  }, [isAuthenticated, startDate, endDate]);

  return (
    <div className="flex-1 bg-slate-950 p-6 max-w-7xl mx-auto w-full space-y-6 text-slate-100">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <BarChart3 className="w-7 h-7 text-emerald-400" />
            Procurement Reports & Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Supplier payables ageing buckets, procurement expenditure by vendor & category, and 3-way match variances
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-300 bg-slate-900 border border-slate-800 rounded-xl hover:bg-slate-850 hover:text-white transition shadow-sm self-start sm:self-auto"
        >
          <Printer className="w-4 h-4 text-slate-400" />
          Print Report
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-3 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('ageing')}
          className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'ageing'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Accounts Payable Ageing
        </button>
        <button
          onClick={() => setActiveTab('spend')}
          className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'spend'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Spend by Supplier & Category
        </button>
        <button
          onClick={() => setActiveTab('discrepancies')}
          className={`py-3 px-4 font-semibold text-sm border-b-2 transition-colors ${
            activeTab === 'discrepancies'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          3-Way Discrepancy Log ({discrepancies.length})
        </button>
      </div>

      {isLoading ? (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-12 text-center text-slate-400">
          Loading report data...
        </div>
      ) : (
        <>
          {/* TAB 1: Ageing Analysis */}
      {activeTab === 'ageing' && ageingData && (
        <div className="space-y-6">
          {/* Ageing Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="bg-slate-900 p-3 rounded-xl border border-emerald-800">
              <span className="text-[11px] font-bold text-emerald-400 uppercase">Current (Not Due)</span>
              <div className="text-lg font-bold text-emerald-400 mt-1">
                LKR {ageingData.totals.current.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-amber-800">
              <span className="text-[11px] font-bold text-yellow-400 uppercase">1 - 30 Days</span>
              <div className="text-lg font-bold text-yellow-400 mt-1">
                LKR {ageingData.totals.days1To30.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-amber-800">
              <span className="text-[11px] font-bold text-amber-400 uppercase">31 - 60 Days</span>
              <div className="text-lg font-bold text-amber-400 mt-1">
                LKR {ageingData.totals.days31To60.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-amber-800">
              <span className="text-[11px] font-bold text-orange-400 uppercase">61 - 90 Days</span>
              <div className="text-lg font-bold text-orange-400 mt-1">
                LKR {ageingData.totals.days61To90.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-rose-800">
              <span className="text-[11px] font-bold text-rose-400 uppercase">90+ Days Overdue</span>
              <div className="text-lg font-bold text-rose-400 mt-1">
                LKR {ageingData.totals.daysOver90.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            </div>

            <div className="bg-slate-900 p-3 rounded-xl border border-emerald-800">
              <span className="text-[11px] font-bold text-emerald-400 uppercase">Total Outstanding</span>
              <div className="text-lg font-bold text-white mt-1">
                LKR {ageingData.totals.totalOutstanding.toLocaleString('en-US', { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>

          {/* Ageing Table */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="p-3">Supplier</th>
                    <th className="p-3 text-right">Current</th>
                    <th className="p-3 text-right">1 - 30 Days</th>
                    <th className="p-3 text-right">31 - 60 Days</th>
                    <th className="p-3 text-right">61 - 90 Days</th>
                    <th className="p-3 text-right">90+ Days</th>
                    <th className="p-3 text-right">Total Outstanding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {ageingData.rows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-slate-500">
                        No outstanding payables found.
                      </td>
                    </tr>
                  ) : (
                    ageingData.rows.map((row: any) => (
                      <tr key={row.supplierId} className="hover:bg-slate-850 transition">
                        <td className="p-3 font-medium text-slate-100">
                          <div>{row.supplierName}</div>
                          <div className="text-slate-500 font-mono text-[10px]">{row.supplierCode}</div>
                        </td>
                        <td className="p-3 text-right font-medium text-emerald-400">
                          {row.current > 0 ? `LKR ${row.current.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-3 text-right font-medium text-yellow-400">
                          {row.days1To30 > 0 ? `LKR ${row.days1To30.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-3 text-right font-medium text-amber-400">
                          {row.days31To60 > 0 ? `LKR ${row.days31To60.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-3 text-right font-medium text-orange-400">
                          {row.days61To90 > 0 ? `LKR ${row.days61To90.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-3 text-right font-bold text-rose-400">
                          {row.daysOver90 > 0 ? `LKR ${row.daysOver90.toLocaleString()}` : '—'}
                        </td>
                        <td className="p-3 text-right font-bold text-white">
                          LKR {row.total.toLocaleString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Spend Analysis */}
      {activeTab === 'spend' && spendData && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-slate-300">Date Filter:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
              />
              <span className="text-slate-500">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-white rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="text-sm font-bold text-emerald-400">
              Total Spend: LKR {spendData.totalSpend.toLocaleString()}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* By Supplier */}
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-300">Top Spend By Supplier</h3>
              <div className="divide-y divide-slate-800 text-xs">
                {spendData.bySupplier.length === 0 ? (
                  <div className="py-4 text-center text-slate-500">No spend records for this period.</div>
                ) : (
                  spendData.bySupplier.map((s: any) => {
                    const percent = spendData.totalSpend > 0 ? Math.round((s.totalSpend / spendData.totalSpend) * 100) : 0;
                    return (
                      <div key={s.supplierId} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-100">{s.name}</div>
                          <div className="text-slate-400">{s.category} • {s.count} invoices</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">
                            LKR {s.totalSpend.toLocaleString()}
                          </div>
                          <div className="text-emerald-400 font-semibold">{percent}% of spend</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* By Category */}
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase text-slate-300">Spend By Supplier Category</h3>
              <div className="divide-y divide-slate-800 text-xs">
                {spendData.byCategory.length === 0 ? (
                  <div className="py-4 text-center text-slate-500">No categories found.</div>
                ) : (
                  spendData.byCategory.map((c: any) => {
                    const percent = spendData.totalSpend > 0 ? Math.round((c.totalSpend / spendData.totalSpend) * 100) : 0;
                    return (
                      <div key={c.category} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-slate-100">{c.name}</div>
                          <div className="text-slate-400">{c.count} bills processed</div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold text-white">
                            LKR {c.totalSpend.toLocaleString()}
                          </div>
                          <div className="text-emerald-400 font-semibold">{percent}% of spend</div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Discrepancy Log */}
      {activeTab === 'discrepancies' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Supplier</th>
                  <th className="p-3">PO Reference</th>
                  <th className="p-3">GRN Reference</th>
                  <th className="p-3">Variance Details</th>
                  <th className="p-3 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {isLoading ? (
                  <TableSkeleton columns={6} rows={5} theme="dark" />
                ) : discrepancies.length === 0 ? (
                  <EmptyState
                    colSpan={6}
                    theme="dark"
                    icon={CheckCircle2}
                    title="No 3-Way Matching Discrepancies"
                    description="All verified bills and supplier invoices match against Purchase Orders and GRN quantities. Your accounts payable ledger is fully balanced."
                  />
                ) : (
                  discrepancies.map((d) => (
                    <tr key={d.id} className="hover:bg-rose-950 transition">
                      <td className="p-3 font-bold text-rose-400">{d.invoiceNumber}</td>
                      <td className="p-3 font-medium text-slate-100">{d.supplier?.name}</td>
                      <td className="p-3 text-slate-300">{d.purchaseOrder?.poNumber || '—'}</td>
                      <td className="p-3 text-slate-300">{d.grn?.grnNumber || '—'}</td>
                      <td className="p-3 text-rose-300 whitespace-pre-line font-medium max-w-md">
                        {d.discrepancyNote}
                      </td>
                      <td className="p-3 text-right font-bold text-white">
                        LKR {Number(d.totalAmount).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}
