'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Scale, Plus, RefreshCw, X, Check, AlertCircle, BookOpen } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../lib/auth-store';
import { TableSkeleton } from '../../components/TableSkeleton';
import { EmptyState } from '../../components/EmptyState';

export default function AccountingPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'coa' | 'tb' | 'pnl' | 'bs'>('coa');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [trialBalance, setTrialBalance] = useState<any>(null);
  const [pnl, setPnl] = useState<any>(null);
  const [balanceSheet, setBalanceSheet] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Journal Entry Modal State
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0]);
  const [journalDesc, setJournalDesc] = useState('');
  const [debitAccountCode, setDebitAccountCode] = useState('');
  const [creditAccountCode, setCreditAccountCode] = useState('');
  const [journalAmount, setJournalAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create Account Modal State
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [newAccCode, setNewAccCode] = useState('');
  const [newAccName, setNewAccName] = useState('');
  const [newAccCat, setNewAccCat] = useState('ASSET');

  // 1. Auth Guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // 2. Fetch Accounting Data
  const fetchAccountingData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const [accs, tb, pnlData, bs] = await Promise.all([
        apiClient<any[]>('/accounting/accounts'),
        apiClient<any>('/accounting/reports/trial-balance'),
        apiClient<any>('/accounting/reports/profit-and-loss'),
        apiClient<any>('/accounting/reports/balance-sheet'),
      ]);

      setAccounts(accs || []);
      setTrialBalance(tb);
      setPnl(pnlData);
      setBalanceSheet(bs);

      if (accs && accs.length >= 2) {
        if (!debitAccountCode) setDebitAccountCode(accs[0].accountCode);
        if (!creditAccountCode) setCreditAccountCode(accs[1].accountCode);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load accounting data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchAccountingData();
    }
  }, [isAuthenticated]);

  // Handle Post Journal Entry
  const handlePostJournal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (debitAccountCode === creditAccountCode) {
      setErrorMsg('Debit and Credit accounts must be different');
      return;
    }
    const amt = parseFloat(journalAmount);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid amount');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await apiClient('/accounting/journal-entries', {
        method: 'POST',
        body: {
          entryDate: new Date(journalDate || Date.now()).toISOString(),
          referenceType: 'MANUAL',
          description: journalDesc.trim() || 'Manual Journal Voucher',
          lines: [
            {
              accountCode: debitAccountCode,
              entryType: 'DEBIT',
              amount: amt,
              description: journalDesc.trim() || undefined,
            },
            {
              accountCode: creditAccountCode,
              entryType: 'CREDIT',
              amount: amt,
              description: journalDesc.trim() || undefined,
            },
          ],
        },
      });

      setSuccessMsg(`Journal voucher of LKR ${amt.toFixed(2)} posted successfully!`);
      setIsJournalModalOpen(false);

      // Reset form
      setJournalDesc('');
      setJournalAmount('');

      await fetchAccountingData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to post journal entry');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add Account
  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      await apiClient('/accounting/accounts', {
        method: 'POST',
        body: {
          accountCode: newAccCode.trim(),
          accountName: newAccName.trim(),
          category: newAccCat,
        },
      });

      setSuccessMsg(`Account "${newAccCode} - ${newAccName}" created successfully!`);
      setIsAccountModalOpen(false);
      setNewAccCode('');
      setNewAccName('');

      await fetchAccountingData();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create account');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Double-Entry Accounting</h1>
          <p className="text-sm text-slate-400 mt-1">
            General ledger, financial statements, and real-time trial balance
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Tab Buttons */}
          <div className="flex items-center bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveTab('coa')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'coa' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Chart of Accounts
            </button>
            <button
              onClick={() => setActiveTab('tb')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'tb' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Trial Balance
            </button>
            <button
              onClick={() => setActiveTab('pnl')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'pnl' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Profit & Loss
            </button>
            <button
              onClick={() => setActiveTab('bs')}
              className={`px-3 py-1.5 rounded-lg transition ${
                activeTab === 'bs' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Balance Sheet
            </button>
          </div>

          <button
            onClick={() => fetchAccountingData()}
            disabled={isLoading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition"
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="bg-slate-800 hover:bg-slate-700 text-white font-semibold py-2 px-3.5 rounded-xl flex items-center space-x-1.5 transition text-xs border border-slate-700"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Account</span>
          </button>

          <button
            onClick={() => setIsJournalModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-4 rounded-xl flex items-center space-x-1.5 transition text-xs"
          >
            <BookOpen className="w-4 h-4" />
            <span>Post Journal Voucher</span>
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

      {/* TAB 1: CHART OF ACCOUNTS */}
      {activeTab === 'coa' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Account Title</th>
                <th className="py-3 px-4">Classification Category</th>
                <th className="py-3 px-4 text-right">Running Balance (LKR)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {isLoading ? (
                <TableSkeleton columns={4} rows={6} theme="dark" />
              ) : accounts.length === 0 ? (
                <EmptyState
                  colSpan={4}
                  theme="dark"
                  icon={BookOpen}
                  isSearchActive={false}
                  title="No accounts in general ledger"
                  description="Your Chart of Accounts is currently uninitialized. Click 'Add Account' to set up asset, liability, or equity accounts."
                  actionLabel="Add Account"
                  onAction={() => setIsAccountModalOpen(true)}
                />
              ) : (
                accounts.map((acc) => (
                  <tr key={acc.id} className="hover:bg-slate-850 transition">
                    <td className="py-3 px-4 font-mono font-bold text-blue-400">{acc.accountCode}</td>
                    <td className="py-3 px-4 font-semibold text-white">{acc.accountName}</td>
                    <td className="py-3 px-4">
                      <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold">
                        {acc.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-white">
                      {Number(acc.currentBalance).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: TRIAL BALANCE */}
      {activeTab === 'tb' && (() => {
        const tbRows = Array.isArray(trialBalance?.accounts)
          ? trialBalance.accounts
          : Array.isArray(trialBalance?.lines)
          ? trialBalance.lines
          : [];

        return (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Scale className="w-5 h-5 text-emerald-400" />
                <div>
                  <div className="text-xs text-slate-400 uppercase font-semibold">Trial Balance Equation</div>
                  <div className="text-sm font-bold text-white">
                    Total Debits: LKR {Number(trialBalance?.totalDebits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} | Total Credits: LKR {Number(trialBalance?.totalCredits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                trialBalance?.isBalanced ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                {trialBalance?.isBalanced ? 'BALANCED' : 'IMBALANCED'}
              </span>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Account Code</th>
                    <th className="py-3 px-4">Account Title</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4 text-right">Debit (LKR)</th>
                    <th className="py-3 px-4 text-right">Credit (LKR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {tbRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-500">
                        No trial balance rows available.
                      </td>
                    </tr>
                  ) : (
                    tbRows.map((l: any, i: number) => (
                      <tr key={i} className="hover:bg-slate-850 transition">
                        <td className="py-3 px-4 font-mono font-bold text-blue-400">{l.accountCode}</td>
                        <td className="py-3 px-4 font-semibold text-white">{l.accountName}</td>
                        <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">{l.category || '-'}</td>
                        <td className="py-3 px-4 text-right font-medium text-slate-300">
                          {Number(l.debit) > 0 ? Number(l.debit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-300">
                          {Number(l.credit) > 0 ? Number(l.credit).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {tbRows.length > 0 && (
                  <tfoot className="bg-slate-950 border-t border-slate-800 font-bold text-xs">
                    <tr>
                      <td colSpan={3} className="py-3 px-4 text-slate-300 uppercase">Total</td>
                      <td className="py-3 px-4 text-right text-emerald-400">
                        LKR {Number(trialBalance?.totalDebits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-right text-emerald-400">
                        LKR {Number(trialBalance?.totalCredits || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        );
      })()}

      {/* TAB 3: PROFIT & LOSS */}
      {activeTab === 'pnl' && (() => {
        const revenueRows = Array.isArray(pnl?.revenues)
          ? pnl.revenues
          : Array.isArray(pnl?.revenueAccounts)
          ? pnl.revenueAccounts
          : [];

        const expenseRows = Array.isArray(pnl?.expenses)
          ? pnl.expenses
          : Array.isArray(pnl?.expenseAccounts)
          ? pnl.expenseAccounts
          : [];

        const netResult = Number(pnl?.netIncome ?? pnl?.netProfitOrLoss ?? 0);
        const totalRevenue = Number(pnl?.totalRevenue ?? 0);
        const totalExpense = Number(pnl?.totalExpenses ?? pnl?.totalExpense ?? 0);

        return (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Net Operating Result</div>
                <div className="text-xl font-black text-white mt-1">
                  LKR {netResult.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                netResult >= 0 ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                {netResult >= 0 ? 'NET PROFIT' : 'NET LOSS'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider">Revenue Accounts</h3>
                <div className="divide-y divide-slate-800 text-xs">
                  {revenueRows.length === 0 ? (
                    <div className="py-4 text-slate-500 text-center">No revenue recorded yet.</div>
                  ) : (
                    revenueRows.map((r: any, idx: number) => (
                      <div key={idx} className="py-2.5 flex justify-between items-center text-slate-300">
                        <div>
                          <span className="font-semibold text-white">{r.name || r.accountName}</span>
                          {(r.code || r.accountCode) && (
                            <span className="text-[11px] font-mono text-slate-500 ml-2">({r.code || r.accountCode})</span>
                          )}
                        </div>
                        <span className="font-bold text-white">LKR {Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))
                  )}
                  <div className="pt-3 flex justify-between items-center text-sm font-bold text-emerald-400">
                    <span>Total Revenue</span>
                    <span>LKR {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <h3 className="text-sm font-bold text-rose-400 uppercase tracking-wider">Expense Accounts</h3>
                <div className="divide-y divide-slate-800 text-xs">
                  {expenseRows.length === 0 ? (
                    <div className="py-4 text-slate-500 text-center">No expenses recorded yet.</div>
                  ) : (
                    expenseRows.map((e: any, idx: number) => (
                      <div key={idx} className="py-2.5 flex justify-between items-center text-slate-300">
                        <div>
                          <span className="font-semibold text-white">{e.name || e.accountName}</span>
                          {(e.code || e.accountCode) && (
                            <span className="text-[11px] font-mono text-slate-500 ml-2">({e.code || e.accountCode})</span>
                          )}
                        </div>
                        <span className="font-bold text-white">LKR {Number(e.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))
                  )}
                  <div className="pt-3 flex justify-between items-center text-sm font-bold text-rose-400">
                    <span>Total Expenses</span>
                    <span>LKR {totalExpense.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* TAB 4: BALANCE SHEET */}
      {activeTab === 'bs' && (() => {
        const assetRows = Array.isArray(balanceSheet?.assets?.items)
          ? balanceSheet.assets.items
          : Array.isArray(balanceSheet?.assets)
          ? balanceSheet.assets
          : [];

        const liabilityRows = Array.isArray(balanceSheet?.liabilities?.items)
          ? balanceSheet.liabilities.items
          : Array.isArray(balanceSheet?.liabilities)
          ? balanceSheet.liabilities
          : [];

        const equityRows = Array.isArray(balanceSheet?.equity?.items)
          ? balanceSheet.equity.items
          : Array.isArray(balanceSheet?.equity)
          ? balanceSheet.equity
          : [];

        const totalAssets = Number(balanceSheet?.assets?.totalAssets ?? balanceSheet?.totalAssets ?? 0);
        const totalLiabilities = Number(balanceSheet?.liabilities?.totalLiabilities ?? balanceSheet?.totalLiabilities ?? 0);
        const totalEquity = Number(balanceSheet?.equity?.totalEquity ?? balanceSheet?.totalEquity ?? 0);
        const totalLiabAndEq = Number(balanceSheet?.totalLiabilitiesAndEquity ?? (totalLiabilities + totalEquity));
        const isBalanced = Boolean(balanceSheet?.isBalanced);

        return (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400 uppercase font-semibold">Accounting Identity</div>
                <div className="text-sm font-bold text-white mt-1">
                  Assets: LKR {totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })} = Liabilities & Equity: LKR {totalLiabAndEq.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                isBalanced ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-rose-950 text-rose-300 border border-rose-800'
              }`}>
                {isBalanced ? 'BALANCED' : 'IMBALANCED'}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Assets Pane */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <h3 className="text-sm font-bold text-blue-400 uppercase tracking-wider">Total Assets</h3>
                  <span className="text-xs font-bold text-blue-300">
                    LKR {totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="divide-y divide-slate-800 text-xs">
                  {assetRows.length === 0 ? (
                    <div className="py-4 text-slate-500 text-center">No assets found.</div>
                  ) : (
                    assetRows.map((a: any, idx: number) => (
                      <div key={idx} className="py-2.5 flex justify-between items-center text-slate-300">
                        <div>
                          <span className="font-semibold text-white">{a.name || a.accountName}</span>
                          {(a.code || a.accountCode) && (
                            <span className="text-[11px] font-mono text-slate-500 ml-2">({a.code || a.accountCode})</span>
                          )}
                        </div>
                        <span className="font-bold text-white">LKR {Number(a.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))
                  )}
                  <div className="pt-3 flex justify-between items-center text-sm font-bold text-blue-400">
                    <span>Total Assets</span>
                    <span>LKR {totalAssets.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>

              {/* Liabilities & Equity Pane */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-4">
                {/* Liabilities Sub-section */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-teal-400 uppercase tracking-wider">Liabilities</h3>
                    <span className="text-xs font-bold text-teal-300">
                      LKR {totalLiabilities.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-800 text-xs">
                    {liabilityRows.length === 0 ? (
                      <div className="py-2 text-slate-500 text-center">No liabilities recorded.</div>
                    ) : (
                      liabilityRows.map((l: any, idx: number) => (
                        <div key={idx} className="py-2 flex justify-between items-center text-slate-300">
                          <div>
                            <span className="font-semibold text-white">{l.name || l.accountName}</span>
                            {(l.code || l.accountCode) && (
                              <span className="text-[11px] font-mono text-slate-500 ml-2">({l.code || l.accountCode})</span>
                            )}
                          </div>
                          <span className="font-bold text-white">LKR {Number(l.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Equity Sub-section */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">Merchant Equity</h3>
                    <span className="text-xs font-bold text-amber-300">
                      LKR {totalEquity.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="divide-y divide-slate-800 text-xs">
                    {equityRows.length === 0 ? (
                      <div className="py-2 text-slate-500 text-center">No equity recorded.</div>
                    ) : (
                      equityRows.map((eq: any, idx: number) => (
                        <div key={idx} className="py-2 flex justify-between items-center text-slate-300">
                          <div>
                            <span className="font-semibold text-white">{eq.name || eq.accountName}</span>
                            {(eq.code || eq.accountCode) && (
                              <span className="text-[11px] font-mono text-slate-500 ml-2">({eq.code || eq.accountCode})</span>
                            )}
                          </div>
                          <span className="font-bold text-white">LKR {Number(eq.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Grand Total Liabilities & Equity */}
                <div className="pt-3 border-t border-slate-800 flex justify-between items-center text-sm font-bold text-teal-400">
                  <span>Total Liabilities & Equity</span>
                  <span>LKR {totalLiabAndEq.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 1: POST JOURNAL VOUCHER */}
      {isJournalModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-bold text-white">Post Balanced Journal Voucher</h2>
              </div>
              <button onClick={() => setIsJournalModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePostJournal} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Posting Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={journalDate}
                    onChange={(e) => setJournalDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Amount (LKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    placeholder="15000.00"
                    value={journalAmount}
                    onChange={(e) => setJournalAmount(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Description / Memo *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Owner equity investment / Petty cash replenishment"
                  value={journalDesc}
                  onChange={(e) => setJournalDesc(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Debit Line (Receiving / Asset)
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Debit Account</label>
                  <select
                    value={debitAccountCode}
                    onChange={(e) => setDebitAccountCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.accountCode}>
                        {a.accountCode} - {a.accountName} ({a.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
                <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Credit Line (Giving / Equity / Income)
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Credit Account</label>
                  <select
                    value={creditAccountCode}
                    onChange={(e) => setCreditAccountCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    {accounts.map((a) => (
                      <option key={a.id} value={a.accountCode}>
                        {a.accountCode} - {a.accountName} ({a.category})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsJournalModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition"
                >
                  {isSubmitting ? 'Posting Voucher...' : 'Post Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADD NEW ACCOUNT */}
      {isAccountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Create Account in COA</h2>
              <button onClick={() => setIsAccountModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Account Code (Numeric) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 1040"
                  value={newAccCode}
                  onChange={(e) => setNewAccCode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Account Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Petty Cash Float"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Classification Category *
                </label>
                <select
                  value={newAccCat}
                  onChange={(e) => setNewAccCat(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="ASSET">ASSET (Current / Non-Current)</option>
                  <option value="LIABILITY">LIABILITY (Accounts Payable / Tax)</option>
                  <option value="EQUITY">EQUITY (Retained Earnings / Capital)</option>
                  <option value="REVENUE">REVENUE (Sales Income)</option>
                  <option value="EXPENSE">EXPENSE (Cost of Goods / Operational)</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAccountModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition"
                >
                  {isSubmitting ? 'Creating...' : 'Create Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
