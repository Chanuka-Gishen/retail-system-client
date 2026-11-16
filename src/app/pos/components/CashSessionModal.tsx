'use client';

import React, { useState, useEffect } from 'react';
import {
  Banknote,
  DollarSign,
  ArrowDownRight,
  ArrowUpRight,
  Printer,
  CheckCircle2,
  AlertTriangle,
  X,
  Clock,
  Layers,
  Calculator,
} from 'lucide-react';
import { useAuthStore } from '../../../lib/auth-store';
import { apiClient } from '../../../lib/api-client';

export type SessionModalView = 'OPEN_SHIFT' | 'DRAWER_TX' | 'CLOSE_SHIFT' | 'Z_REPORT';

interface CashSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialView?: SessionModalView;
  onSessionUpdated?: (sessionId: string | null) => void;
}

interface PosTerminal {
  id: string;
  terminalCode: string;
  name: string;
  branchId: string;
  status: string;
}

interface ActiveSessionDetails {
  id: string;
  posTerminalId: string;
  openingFloat: number;
  cashSalesTotal?: number;
  cashInTotal?: number;
  cashOutTotal?: number;
  expectedDrawerCash?: number;
  openedAt: string;
  status: string;
  notes?: string;
  terminal?: {
    terminalCode: string;
    name: string;
  };
}

export function CashSessionModal({
  isOpen,
  onClose,
  initialView = 'OPEN_SHIFT',
  onSessionUpdated,
}: CashSessionModalProps) {
  const auth = useAuthStore();
  const [view, setView] = useState<SessionModalView>(initialView);

  // Terminals for Open Shift
  const [terminals, setTerminals] = useState<PosTerminal[]>([]);
  const [selectedTerminalId, setSelectedTerminalId] = useState<string>('');

  // Open Shift Form State
  const [openingFloatInput, setOpeningFloatInput] = useState<string>('5000');
  const [openShiftNotes, setOpenShiftNotes] = useState<string>('');

  // Drawer Transaction State (Cash In / Out)
  const [txType, setTxType] = useState<'CASH_IN' | 'CASH_OUT'>('CASH_OUT');
  const [txAmountInput, setTxAmountInput] = useState<string>('');
  const [txReason, setTxReason] = useState<string>('');

  // Active Session Details & Close Shift State
  const [activeSession, setActiveSession] = useState<ActiveSessionDetails | null>(null);
  const [countedCashInput, setCountedCashInput] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [closedZReportData, setClosedZReportData] = useState<any | null>(null);

  // Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setView(initialView);
      setErrorMsg(null);
      loadTerminalsAndActiveSession();
    }
  }, [isOpen, initialView]);

  const loadTerminalsAndActiveSession = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Terminals
      const termRes = await apiClient<{ items: PosTerminal[] } | PosTerminal[]>('/pos/terminals');
      const termList = Array.isArray(termRes) ? termRes : termRes?.items || [];
      setTerminals(termList);
      if (termList.length > 0) {
        setSelectedTerminalId(auth.posTerminalId || termList[0]?.id || '');
      }

      // 2. Fetch Active Session
      if (auth.cashSessionId) {
        try {
          const sess = await apiClient<ActiveSessionDetails>(`/pos/sessions/${auth.cashSessionId}`);
          setActiveSession(sess);
          if (initialView === 'CLOSE_SHIFT' && sess?.expectedDrawerCash !== undefined) {
            setCountedCashInput(sess.expectedDrawerCash.toString());
          }
        } catch {
          // If session expired or not found, try active endpoint
          const activeSess = await apiClient<ActiveSessionDetails>('/pos/sessions/active');
          if (activeSess) {
            setActiveSession(activeSess);
            auth.setCashSession(activeSess.id);
          }
        }
      } else {
        try {
          const activeSess = await apiClient<ActiveSessionDetails>('/pos/sessions/active');
          if (activeSess && activeSess.id) {
            setActiveSession(activeSess);
            auth.setCashSession(activeSess.id);
            if (activeSess.posTerminalId) {
              auth.setTerminal(activeSess.posTerminalId);
            }
          }
        } catch {
          // No active session
        }
      }
    } catch (e: any) {
      console.warn('Could not load session or terminals:', e.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // Handle Open Shift
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const floatAmt = parseFloat(openingFloatInput);
    if (isNaN(floatAmt) || floatAmt < 0) {
      setErrorMsg('Please enter a valid opening float amount.');
      return;
    }
    if (!selectedTerminalId) {
      setErrorMsg('Please select a POS terminal for this shift.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await apiClient<ActiveSessionDetails>('/pos/sessions/open', {
        method: 'POST',
        body: JSON.stringify({
          posTerminalId: selectedTerminalId,
          openingFloat: floatAmt,
          notes: openShiftNotes.trim() || undefined,
        }),
      });

      if (res && res.id) {
        auth.setCashSession(res.id);
        auth.setTerminal(selectedTerminalId);
        setActiveSession(res);
        if (onSessionUpdated) onSessionUpdated(res.id);
        onClose();
      }
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to open shift session.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Cash In / Out Transaction
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!auth.cashSessionId) {
      setErrorMsg('No active cash session found. Please open a shift first.');
      return;
    }
    const amt = parseFloat(txAmountInput);
    if (isNaN(amt) || amt <= 0) {
      setErrorMsg('Please enter a valid amount greater than 0.');
      return;
    }
    if (!txReason.trim()) {
      setErrorMsg('Please provide a reason or purpose for this transaction.');
      return;
    }

    setIsLoading(true);
    try {
      await apiClient(`/pos/sessions/${auth.cashSessionId}/transactions`, {
        method: 'POST',
        body: JSON.stringify({
          type: txType,
          amount: amt,
          reason: txReason.trim(),
        }),
      });

      // Reload active session details
      const updated = await apiClient<ActiveSessionDetails>(`/pos/sessions/${auth.cashSessionId}`);
      setActiveSession(updated);
      setTxAmountInput('');
      setTxReason('');
      onClose();
      alert(`Recorded ${txType === 'CASH_IN' ? 'Cash In' : 'Cash Out'} of Rs ${amt.toLocaleString()} successfully.`);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to record drawer transaction.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Close Shift
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!auth.cashSessionId) {
      setErrorMsg('No active cash session found.');
      return;
    }
    const counted = parseFloat(countedCashInput);
    if (isNaN(counted) || counted < 0) {
      setErrorMsg('Please enter the physically counted cash amount in drawer.');
      return;
    }

    setIsLoading(true);
    try {
      const zReport = await apiClient<any>(`/pos/sessions/${auth.cashSessionId}/close`, {
        method: 'POST',
        body: JSON.stringify({
          closingCashActual: counted,
          notes: closeNotes.trim() || undefined,
        }),
      });

      setClosedZReportData(zReport);
      setView('Z_REPORT');
      auth.setCashSession(null);
      if (onSessionUpdated) onSessionUpdated(null);
    } catch (e: any) {
      setErrorMsg(e.message || 'Failed to close shift session.');
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate live discrepancy for Close Shift
  const expectedCash = activeSession?.expectedDrawerCash || 0;
  const countedCash = parseFloat(countedCashInput) || 0;
  const discrepancy = countedCash - expectedCash;

  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:max-h-none print:h-auto">
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950 print:hidden">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-emerald-950 text-emerald-400 border border-emerald-800 rounded-xl">
              <Banknote className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                {view === 'OPEN_SHIFT' && 'Open Cash Drawer Shift'}
                {view === 'DRAWER_TX' && 'Drawer Cash Operations (In / Out)'}
                {view === 'CLOSE_SHIFT' && 'Close Shift & Z-Report Reconciliation'}
                {view === 'Z_REPORT' && 'Official End-of-Day Z-Report'}
              </h2>
              <p className="text-xs text-slate-400">
                {view === 'OPEN_SHIFT' && 'Enter opening float to unlock checkout and begin shifts.'}
                {view === 'DRAWER_TX' && 'Record petty cash float additions or safe vault drops.'}
                {view === 'CLOSE_SHIFT' && 'Perform physical currency count against expected drawer sales.'}
                {view === 'Z_REPORT' && 'Financial shift close report and cashier clearance.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* View Switcher Tabs (when active session exists and not in final Z-Report) */}
        {auth.cashSessionId && view !== 'Z_REPORT' && (
          <div className="flex border-b border-slate-800 bg-slate-950/60 px-6 pt-2 print:hidden">
            <button
              type="button"
              onClick={() => {
                setView('DRAWER_TX');
                setErrorMsg(null);
              }}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
                view === 'DRAWER_TX'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Cash In / Out
            </button>
            <button
              type="button"
              onClick={() => {
                setView('CLOSE_SHIFT');
                setErrorMsg(null);
              }}
              className={`pb-3 px-3 text-xs font-bold border-b-2 transition ${
                view === 'CLOSE_SHIFT'
                  ? 'border-emerald-500 text-emerald-400'
                  : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              Close Shift (Z-Report)
            </button>
          </div>
        )}

        {/* Error Notification Banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-950/60 border border-rose-800/80 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* -------------------- VIEW 1: OPEN SHIFT -------------------- */}
          {view === 'OPEN_SHIFT' && (
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  POS Checkout Terminal
                </label>
                <select
                  value={selectedTerminalId}
                  onChange={(e) => setSelectedTerminalId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 font-medium"
                >
                  {terminals.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.terminalCode})
                    </option>
                  ))}
                  {terminals.length === 0 && (
                    <option value="">Default POS Terminal</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Opening Cash Float in Register (Rs)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-500 font-bold text-xs">Rs</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={openingFloatInput}
                    onChange={(e) => setOpeningFloatInput(e.target.value)}
                    placeholder="5000.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>

                {/* Quick Float Chips */}
                <div className="flex items-center space-x-2 mt-2">
                  {[1000, 2000, 5000, 10000].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setOpeningFloatInput(val.toString())}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition"
                    >
                      Rs {val.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Shift Notes / Identifier (Optional)
                </label>
                <input
                  type="text"
                  value={openShiftNotes}
                  onChange={(e) => setOpenShiftNotes(e.target.value)}
                  placeholder="e.g. Morning Shift 08:00 - 16:00, Cashier Front Desk #1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-xl transition shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{isLoading ? 'Opening Shift...' : 'Confirm & Open Cash Drawer'}</span>
                </button>
              </div>
            </form>
          )}

          {/* -------------------- VIEW 2: CASH IN / CASH OUT -------------------- */}
          {view === 'DRAWER_TX' && (
            <form onSubmit={handleAddTransaction} className="space-y-4">
              {/* Type Switcher */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setTxType('CASH_OUT')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-center space-x-3 ${
                    txType === 'CASH_OUT'
                      ? 'bg-rose-950/40 border-rose-600 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="p-2 bg-rose-900/60 rounded-lg text-rose-300">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Cash Out (Safe Drop)</div>
                    <div className="text-[11px] text-slate-400">Drawer to vault / petty expense</div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTxType('CASH_IN')}
                  className={`p-3.5 rounded-xl border text-left transition flex items-center space-x-3 ${
                    txType === 'CASH_IN'
                      ? 'bg-emerald-950/40 border-emerald-600 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="p-2 bg-emerald-900/60 rounded-lg text-emerald-300">
                    <ArrowDownRight className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Cash In (Float Top-up)</div>
                    <div className="text-[11px] text-slate-400">Add cash float to drawer</div>
                  </div>
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Operation Amount (Rs)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-500 font-bold text-xs">Rs</span>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    value={txAmountInput}
                    onChange={(e) => setTxAmountInput(e.target.value)}
                    placeholder="2500.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reason / Purpose (Required)
                </label>
                <input
                  type="text"
                  value={txReason}
                  onChange={(e) => setTxReason(e.target.value)}
                  placeholder={
                    txType === 'CASH_OUT'
                      ? 'e.g. Mid-shift safe drop to vault, Petty cash for cleaning supply'
                      : 'e.g. Added change float from supervisor'
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`w-full py-3 font-bold rounded-xl transition shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 ${
                    txType === 'CASH_OUT'
                      ? 'bg-rose-600 hover:bg-rose-500 text-white'
                      : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                  }`}
                >
                  <span>
                    {isLoading
                      ? 'Recording...'
                      : txType === 'CASH_OUT'
                      ? 'Confirm Cash Out (Drop)'
                      : 'Confirm Cash In (Top-up)'}
                  </span>
                </button>
              </div>
            </form>
          )}

          {/* -------------------- VIEW 3: CLOSE SHIFT -------------------- */}
          {view === 'CLOSE_SHIFT' && (
            <form onSubmit={handleCloseShift} className="space-y-4">
              {/* Expected Drawer Cash Summary Card */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Opening Float:</span>
                  <span className="font-mono text-white">
                    Rs {(activeSession?.openingFloat || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Cash Sales (+):</span>
                  <span className="font-mono text-emerald-400">
                    +Rs {(activeSession?.cashSalesTotal || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Cash In Top-ups (+):</span>
                  <span className="font-mono text-emerald-400">
                    +Rs {(activeSession?.cashInTotal || 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>Cash Out Drops (-):</span>
                  <span className="font-mono text-rose-400">
                    -Rs {(activeSession?.cashOutTotal || 0).toLocaleString()}
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-sm font-bold">
                  <span className="text-slate-200">Total Expected Cash in Drawer:</span>
                  <span className="font-mono text-emerald-400 text-base">
                    Rs {expectedCash.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Physical Counted Cash Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Physical Counted Cash in Drawer (Actual)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-500 font-bold text-xs">Rs</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={countedCashInput}
                    onChange={(e) => setCountedCashInput(e.target.value)}
                    placeholder="Enter total counted notes & coins"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-lg font-bold text-white focus:outline-none focus:border-emerald-500 font-mono"
                    required
                    autoFocus
                  />
                </div>
              </div>

              {/* Discrepancy Indicator */}
              <div
                className={`p-3 rounded-xl border flex items-center justify-between text-xs font-bold ${
                  discrepancy === 0
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : discrepancy > 0
                    ? 'bg-teal-950/40 border-teal-800 text-teal-300'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}
              >
                <span>
                  {discrepancy === 0 && 'Drawer is Perfectly Balanced'}
                  {discrepancy > 0 && `Cash Overage (+Rs ${discrepancy.toLocaleString()})`}
                  {discrepancy < 0 && `Cash Shortage (-Rs ${Math.abs(discrepancy).toLocaleString()})`}
                </span>
                <span className="font-mono">
                  {discrepancy >= 0 ? `+${discrepancy.toFixed(2)}` : discrepancy.toFixed(2)}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Closing Notes & Explanations (Optional)
                </label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="e.g. Shift finished on time, slight shortage due to 50c rounding"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold rounded-xl transition shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50"
                >
                  <span>{isLoading ? 'Closing Shift...' : 'Close Shift & Generate Z-Report'}</span>
                </button>
              </div>
            </form>
          )}

          {/* -------------------- VIEW 4: OFFICIAL Z-REPORT -------------------- */}
          {view === 'Z_REPORT' && closedZReportData && (
            <div className="space-y-4">
              <div
                id="printable-receipt"
                className="printable-receipt-area p-6 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-slate-300 space-y-3 print:bg-white print:text-black print:border-none print:shadow-none print:p-2"
              >
                <div className="text-center border-b border-dashed border-slate-800 pb-3">
                  <h3 className="text-base font-bold text-white uppercase tracking-wider">
                    *** END OF DAY Z-REPORT ***
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Shift ID: {closedZReportData.id || auth.cashSessionId}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Closed At: {new Date().toLocaleString()}
                  </p>
                </div>

                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span>Opening Float:</span>
                    <span className="text-white font-bold">
                      Rs {(closedZReportData.openingFloat || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Cash Sales (+):</span>
                    <span>Rs {(closedZReportData.cashSalesTotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-emerald-400">
                    <span>Cash In Top-ups (+):</span>
                    <span>Rs {(closedZReportData.cashInTotal || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-rose-400">
                    <span>Cash Out Safe Drops (-):</span>
                    <span>Rs {(closedZReportData.cashOutTotal || 0).toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-slate-800 pt-2 space-y-1.5">
                  <div className="flex justify-between text-white font-bold">
                    <span>Expected Drawer Cash:</span>
                    <span>Rs {(closedZReportData.expectedDrawerCash || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-white font-bold">
                    <span>Physical Counted Cash:</span>
                    <span>Rs {(closedZReportData.closingCashActual || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between font-bold text-sm">
                    <span>Discrepancy (Over / Short):</span>
                    <span
                      className={
                        (closedZReportData.discrepancy || 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {(closedZReportData.discrepancy || 0) >= 0 ? '+' : ''}
                      {(closedZReportData.discrepancy || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {closedZReportData.notes && (
                  <div className="border-t border-dashed border-slate-800 pt-2 text-slate-400">
                    <span>Notes: {closedZReportData.notes}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-3 pt-2 print:hidden">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition flex items-center justify-center space-x-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print Z-Report</span>
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition shadow"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
