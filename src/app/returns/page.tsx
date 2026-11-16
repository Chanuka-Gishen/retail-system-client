'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  RotateCcw,
  Search,
  Plus,
  RefreshCw,
  Tag,
  Banknote,
  ArrowRightLeft,
  Clock,
  Printer,
  X,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FileText,
  Filter,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { CustomerReturnModal } from '../../components/CustomerReturnModal';
import { useHardwareStore } from '../../lib/hardware-store';
import { BarcodeSvg } from '../../components/BarcodeSvg';

interface CustomerReturnItem {
  id: string;
  returnNumber: string;
  createdAt: string;
  refundAmount: number | string;
  refundMethod?: string;
  refundTender: string;
  transferReference?: string;
  voucherCode?: string;
  voucherExpiresAt?: string;
  voucherBalance?: number | string;
  isVoucherRedeemed?: boolean;
  reason?: string;
  branch?: {
    id: string;
    code: string;
    name: string;
  };
  warehouse?: {
    id: string;
    name: string;
  };
  sale?: {
    id: string;
    invoiceNumber: string;
  };
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
  _count?: {
    items: number;
  };
}

export default function CustomerReturnsPage() {
  const [returns, setReturns] = useState<CustomerReturnItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'ALL' | 'CASH' | 'ONLINE_TRANSFER' | 'ITEM_TO_ITEM'>('ALL');

  // Modal controls
  const [isNewReturnModalOpen, setIsNewReturnModalOpen] = useState(false);
  const [activeReceipt, setActiveReceipt] = useState<any | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const { printReturnReceipt } = useHardwareStore();

  const fetchReturns = async () => {
    setIsLoading(true);
    try {
      const data = await apiClient<{ items: CustomerReturnItem[] }>('/pos/returns?limit=100');
      setReturns(data.items || []);
    } catch (err: any) {
      console.error('Failed to load customer returns:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReturns();
  }, []);

  const handleOpenReceipt = async (returnId: string) => {
    try {
      const receiptData = await apiClient<any>(`/pos/returns/${returnId}/receipt`);
      setActiveReceipt(receiptData);
      setIsReceiptModalOpen(true);
    } catch (err: any) {
      alert(`Failed to load receipt: ${err.message || 'Unknown error'}`);
    }
  };

  const handlePrintEscPos = async () => {
    if (!activeReceipt) return;
    await printReturnReceipt(activeReceipt);
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  // Filtered returns
  const filteredReturns = useMemo(() => {
    return returns.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        r.returnNumber.toLowerCase().includes(q) ||
        (r.sale?.invoiceNumber && r.sale.invoiceNumber.toLowerCase().includes(q)) ||
        (r.voucherCode && r.voucherCode.toLowerCase().includes(q)) ||
        (r.customer?.name && r.customer.name.toLowerCase().includes(q));

      const effectiveMethod = r.refundMethod || (r.voucherCode ? 'ITEM_TO_ITEM' : r.refundTender);
      const matchMethod = methodFilter === 'ALL' || effectiveMethod === methodFilter;

      return matchSearch && matchMethod;
    });
  }, [returns, searchQuery, methodFilter]);

  // KPI calculations
  const totalRefundValue = useMemo(() => {
    return returns.reduce((sum, r) => sum + Number(r.refundAmount || 0), 0);
  }, [returns]);

  const activeVouchers = useMemo(() => {
    const now = new Date();
    return returns.filter((r) => {
      const hasCode = !!r.voucherCode;
      const notRedeemed = !r.isVoucherRedeemed && Number(r.voucherBalance || 0) > 0;
      const notExpired = r.voucherExpiresAt ? new Date(r.voucherExpiresAt) > now : false;
      return hasCode && notRedeemed && notExpired;
    });
  }, [returns]);

  const activeVouchersTotal = useMemo(() => {
    return activeVouchers.reduce((sum, r) => sum + Number(r.voucherBalance || r.refundAmount || 0), 0);
  }, [activeVouchers]);

  return (
    <div className="flex-1 flex flex-col min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white">Customer Returns & Exchanges</h1>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Manage customer returns, cash refunds, online transfers, and 24-hour item-to-item exchange credit vouchers.
          </p>
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <button
            onClick={fetchReturns}
            disabled={isLoading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition"
            title="Refresh returns"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>
          <button
            onClick={() => setIsNewReturnModalOpen(true)}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs px-4 py-2.5 rounded-xl transition shadow flex items-center justify-center space-x-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Process Return / Exchange</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS OVERVIEW */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Returns</div>
          <div className="text-2xl font-black text-white mt-1 font-mono">{returns.length}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Processed return slips</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Refund Value</div>
          <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
            LKR {totalRefundValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">All settlement methods combined</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-[10px] text-amber-400 uppercase font-semibold flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>Active 24h Vouchers</span>
          </div>
          <div className="text-2xl font-black text-amber-300 mt-1 font-mono">{activeVouchers.length}</div>
          <div className="text-[11px] text-amber-400/80 mt-0.5">
            LKR {activeVouchersTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })} available
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="text-[10px] text-slate-400 uppercase font-semibold">Item-to-Item Exchanges</div>
          <div className="text-2xl font-black text-sky-400 mt-1 font-mono">
            {returns.filter((r) => r.refundMethod === 'ITEM_TO_ITEM' || r.voucherCode).length}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Total credit vouchers issued</div>
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search return #, invoice #, voucher code..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'ITEM_TO_ITEM', 'CASH', 'ONLINE_TRANSFER'] as const).map((method) => (
            <button
              key={method}
              onClick={() => setMethodFilter(method)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                methodFilter === method
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {method === 'ALL'
                ? 'All Returns'
                : method === 'ITEM_TO_ITEM'
                ? 'Item to Item (24h)'
                : method === 'CASH'
                ? 'Cash'
                : 'Online Transfer'}
            </button>
          ))}
        </div>
      </div>

      {/* RETURNS TABLE */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
              <tr>
                <th className="py-3 px-4">Return Slip #</th>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Original Sale</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4 text-center">Items</th>
                <th className="py-3 px-4">Settlement Method</th>
                <th className="py-3 px-4">Voucher Status (24h)</th>
                <th className="py-3 px-4 text-right">Refund Amount</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-emerald-400" />
                    <span>Loading customer returns...</span>
                  </td>
                </tr>
              ) : filteredReturns.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    No customer returns found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredReturns.map((ret) => {
                  const isItemToItem = ret.refundMethod === 'ITEM_TO_ITEM' || !!ret.voucherCode;
                  const isOnline = ret.refundMethod === 'ONLINE_TRANSFER';

                  // Calculate 24-hour expiration status
                  let voucherStatusLabel = null;
                  if (isItemToItem && ret.voucherExpiresAt) {
                    const now = new Date();
                    const exp = new Date(ret.voucherExpiresAt);
                    const isExpired = now > exp;
                    const isRedeemed = ret.isVoucherRedeemed || Number(ret.voucherBalance || 0) <= 0;

                    if (isRedeemed) {
                      voucherStatusLabel = (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Redeemed</span>
                        </span>
                      );
                    } else if (isExpired) {
                      voucherStatusLabel = (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-300 border border-rose-800">
                          <AlertCircle className="w-3 h-3" />
                          <span>Expired (24h)</span>
                        </span>
                      );
                    } else {
                      const msLeft = exp.getTime() - now.getTime();
                      const hrsLeft = Math.max(0, Math.floor(msLeft / (1000 * 60 * 60)));
                      voucherStatusLabel = (
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800 animate-pulse">
                          <Clock className="w-3 h-3" />
                          <span>Active ({hrsLeft}h left)</span>
                        </span>
                      );
                    }
                  }

                  return (
                    <tr key={ret.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {ret.returnNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-400 whitespace-nowrap">
                        {new Date(ret.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-300">
                        {ret.sale?.invoiceNumber || 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {ret.customer?.name || 'Walk-in'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono font-bold text-slate-300">
                          {ret._count?.items ?? 'Items'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {isItemToItem ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                              <Tag className="w-3 h-3" />
                              <span>Item-to-Item (24h)</span>
                            </span>
                            {ret.voucherCode && (
                              <div className="text-[10px] font-mono font-bold text-slate-300">
                                {ret.voucherCode}
                              </div>
                            )}
                          </div>
                        ) : isOnline ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-sky-950 text-sky-300 border border-sky-800">
                              <ArrowRightLeft className="w-3 h-3" />
                              <span>Online Transfer</span>
                            </span>
                            {ret.transferReference && (
                              <div className="text-[10px] font-mono text-slate-400">
                                Ref: {ret.transferReference}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                            <Banknote className="w-3 h-3" />
                            <span>Cash Refund</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {voucherStatusLabel || <span className="text-slate-600">—</span>}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-emerald-400 text-sm">
                        LKR {Number(ret.refundAmount || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => handleOpenReceipt(ret.id)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold flex items-center space-x-1 mx-auto transition border border-slate-700"
                        >
                          <Printer className="w-3.5 h-3.5 text-amber-400" />
                          <span>Slip</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* NEW CUSTOMER RETURN MODAL */}
      <CustomerReturnModal
        isOpen={isNewReturnModalOpen}
        onClose={() => setIsNewReturnModalOpen(false)}
        onReturnProcessed={() => {
          fetchReturns();
        }}
      />

      {/* RECEIPT / REPRINT MODAL (Print Isolated) */}
      {isReceiptModalOpen && activeReceipt && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl my-auto">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 print:hidden">
              <div className="flex items-center space-x-2">
                <Printer className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Return Slip & Voucher</h3>
              </div>
              <button
                onClick={() => setIsReceiptModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Print Isolation Thermal Paper Receipt */}
            <div className="flex justify-center">
              <div
                id="printable-receipt"
                className="printable-receipt-area bg-white text-black p-5 rounded-xl shadow w-full max-w-[80mm] font-mono text-[11px] leading-tight space-y-2 border border-slate-300"
              >
                <div className="text-center space-y-0.5">
                  <div className="text-sm font-black uppercase">
                    {activeReceipt.store?.branchName || activeReceipt.store?.companyName || 'RETAIL CLOUD POS'}
                  </div>
                  {activeReceipt.store?.branchAddress && (
                    <div className="text-[10px] text-slate-700">{activeReceipt.store.branchAddress}</div>
                  )}
                  {activeReceipt.store?.branchPhone && (
                    <div className="text-[10px] text-slate-700">Tel: {activeReceipt.store.branchPhone}</div>
                  )}
                  <div className="font-bold border-y border-black py-1 my-1 text-xs uppercase">
                    {activeReceipt.refundMethod === 'ITEM_TO_ITEM'
                      ? 'ITEM EXCHANGE VOUCHER'
                      : activeReceipt.refundMethod === 'ONLINE_TRANSFER'
                      ? 'ONLINE REFUND SLIP'
                      : 'CASH REFUND RECEIPT'}
                  </div>
                </div>

                <div className="space-y-0.5 text-[10px]">
                  <div className="flex justify-between">
                    <span>Return Slip:</span>
                    <span className="font-bold">{activeReceipt.returnNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Original Inv:</span>
                    <span>{activeReceipt.originalInvoiceNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Date/Time:</span>
                    <span>{new Date(activeReceipt.issuedAt || Date.now()).toLocaleString()}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-black pt-1">
                  <div className="flex justify-between font-bold text-[10px] pb-1">
                    <span>RETURNED ITEM</span>
                    <span>QTY &times; AMT</span>
                  </div>
                  <div className="space-y-1">
                    {(activeReceipt.items || []).map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-start text-[10px]">
                        <div className="pr-2">
                          <div className="font-semibold">{item.name || item.sku}</div>
                          <div className="text-[9px] text-slate-600">
                            {item.returnAction === 'RETURN_TO_STOCK' ? '[Restocked]' : '[Damage Disposal]'}
                          </div>
                        </div>
                        <div className="text-right whitespace-nowrap">
                          {item.quantity} &times; {Number(item.unitPrice).toFixed(2)} ={' '}
                          <strong>{Number(item.refundSubtotal).toFixed(2)}</strong>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-black pt-1.5 space-y-1">
                  <div className="flex justify-between items-center text-xs font-black">
                    <span>TOTAL REFUND:</span>
                    <span className="text-sm">LKR {Number(activeReceipt.totalRefund || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-[10px]">
                    <span>Method:</span>
                    <span className="font-bold">
                      {activeReceipt.refundMethod === 'ITEM_TO_ITEM'
                        ? 'Item-to-Item (24h Credit)'
                        : activeReceipt.refundMethod === 'ONLINE_TRANSFER'
                        ? `Online Transfer (${activeReceipt.transferReference || 'Ref N/A'})`
                        : 'Cash Refund'}
                    </span>
                  </div>
                </div>

                {/* Voucher Barcode Section on Thermal Receipt */}
                {activeReceipt.voucherCode && (
                  <div className="border-t-2 border-black border-dashed pt-2 text-center space-y-1">
                    <div className="font-bold text-[10px] uppercase">*** 24-HOUR EXCHANGE CODE ***</div>
                    <div className="text-sm font-black tracking-wider bg-slate-100 py-1 border border-slate-300">
                      {activeReceipt.voucherCode}
                    </div>
                    <div className="py-1 flex justify-center">
                      <BarcodeSvg value={activeReceipt.voucherCode} height={35} showText={false} />
                    </div>
                    <div className="text-[9px] font-bold">
                      VALID UNTIL: {new Date(activeReceipt.voucherExpiresAt).toLocaleString()}
                    </div>
                    <div className="text-[8px] text-slate-700">
                      Present barcode or code at checkout to reduce from your next purchase within 24 hours.
                    </div>
                  </div>
                )}

                <div className="border-t border-dashed border-black pt-2 text-center text-[9px] space-y-0.5">
                  <div>{activeReceipt.footer?.message}</div>
                  <div className="text-[8px] text-slate-600">*** Thank you ***</div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center space-x-2 pt-2 border-t border-slate-800 print:hidden">
              <button
                onClick={handlePrintEscPos}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs py-2.5 rounded-xl flex items-center justify-center space-x-1.5 shadow transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print ESC/POS</span>
              </button>
              <button
                onClick={handleBrowserPrint}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 rounded-xl flex items-center justify-center space-x-1.5 border border-slate-700 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Browser Print</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
