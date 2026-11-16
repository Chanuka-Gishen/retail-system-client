'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  RotateCcw,
  Banknote,
  ArrowRightLeft,
  Tag,
  Printer,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Copy,
  Check,
  Package,
  Layers,
} from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { useHardwareStore } from '../lib/hardware-store';
import { BarcodeSvg } from './BarcodeSvg';

export type RefundMethod = 'CASH' | 'ONLINE_TRANSFER' | 'ITEM_TO_ITEM';

interface SaleItemDetail {
  id: string;
  variantId: string;
  quantity: number | string;
  returnedQuantity: number | string;
  unitPrice: number | string;
  lineTotal: number | string;
  variant?: {
    sku: string;
    variantName?: string;
    product?: {
      name: string;
      unit?: string;
    };
  };
}

interface SaleDetail {
  id: string;
  invoiceNumber: string;
  totalAmount: number | string;
  status: string;
  createdAt: string;
  branch?: {
    id: string;
    name: string;
    code: string;
    address?: string;
    phone?: string;
  };
  warehouse?: {
    id: string;
    name: string;
  };
  customer?: {
    id: string;
    name: string;
    phone?: string;
  };
  cashier?: {
    firstName?: string;
    lastName?: string;
  };
  items: SaleItemDetail[];
}

interface ItemReturnSelection {
  saleItemId: string;
  selected: boolean;
  quantity: number;
  maxAvailable: number;
  returnAction: 'RETURN_TO_STOCK' | 'DAMAGE_DISPOSAL';
  unitPrice: number;
  productName: string;
  sku: string;
}

interface CustomerReturnModalProps {
  isOpen: boolean;
  onClose: () => void;
  preloadedSaleId?: string;
  onReturnProcessed?: (result: any) => void;
  onApplyVoucherToCart?: (voucherCode: string, creditAmount: number) => void;
}

export function CustomerReturnModal({
  isOpen,
  onClose,
  preloadedSaleId,
  onReturnProcessed,
  onApplyVoucherToCart,
}: CustomerReturnModalProps) {
  const [searchInvoice, setSearchInvoice] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [sale, setSale] = useState<SaleDetail | null>(null);
  const [itemSelections, setItemSelections] = useState<ItemReturnSelection[]>([]);

  const [refundMethod, setRefundMethod] = useState<RefundMethod>('ITEM_TO_ITEM');
  const [transferReference, setTransferReference] = useState('');
  const [returnReason, setReturnReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Completed Return Receipt View
  const [completedReceipt, setCompletedReceipt] = useState<any | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const { printReturnReceipt } = useHardwareStore();

  // Load sale if preloadedSaleId is provided
  useEffect(() => {
    if (isOpen && preloadedSaleId) {
      loadSaleById(preloadedSaleId);
    } else if (isOpen) {
      // Reset state for new lookup
      setSale(null);
      setItemSelections([]);
      setCompletedReceipt(null);
      setSearchError(null);
    }
  }, [isOpen, preloadedSaleId]);

  const loadSaleById = async (saleId: string) => {
    setIsSearching(true);
    setSearchError(null);
    try {
      const data = await apiClient<SaleDetail>(`/pos/sales/${saleId}`);
      initializeSaleSelections(data);
    } catch (err: any) {
      setSearchError(err.message || 'Failed to load sale details.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleLookupInvoice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchInvoice.trim()) return;

    setIsSearching(true);
    setSearchError(null);
    try {
      const res = await apiClient<{ items: SaleDetail[] }>(
        `/pos/sales?search=${encodeURIComponent(searchInvoice.trim())}&limit=1`,
      );
      if (!res.items || res.items.length === 0) {
        throw new Error(`Invoice "${searchInvoice.trim()}" not found.`);
      }
      initializeSaleSelections(res.items[0]);
    } catch (err: any) {
      setSearchError(err.message || 'Invoice lookup failed.');
      setSale(null);
      setItemSelections([]);
    } finally {
      setIsSearching(false);
    }
  };

  const initializeSaleSelections = (data: SaleDetail) => {
    setSale(data);
    const selections: ItemReturnSelection[] = (data.items || []).map((item) => {
      const bought = Number(item.quantity || 0);
      const returned = Number(item.returnedQuantity || 0);
      const available = Math.max(0, bought - returned);
      const unitPrice = bought > 0 ? Number(item.lineTotal || 0) / bought : Number(item.unitPrice || 0);

      return {
        saleItemId: item.id,
        selected: false,
        quantity: available > 0 ? 1 : 0,
        maxAvailable: available,
        returnAction: 'RETURN_TO_STOCK',
        unitPrice,
        productName: item.variant?.product?.name || item.variant?.variantName || 'Item',
        sku: item.variant?.sku || 'N/A',
      };
    });
    setItemSelections(selections);
  };

  const handleToggleSelect = (index: number) => {
    setItemSelections((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item,
      ),
    );
  };

  const handleQtyChange = (index: number, qty: number) => {
    setItemSelections((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const validQty = Math.max(0.001, Math.min(item.maxAvailable, qty));
        return { ...item, quantity: validQty };
      }),
    );
  };

  const handleActionChange = (index: number, action: 'RETURN_TO_STOCK' | 'DAMAGE_DISPOSAL') => {
    setItemSelections((prev) =>
      prev.map((item, i) => (i === index ? { ...item, returnAction: action } : item)),
    );
  };

  // Calculate total refund amount from active selections
  const selectedItems = itemSelections.filter((i) => i.selected && i.quantity > 0);
  const totalRefundAmount = selectedItems.reduce(
    (sum, i) => sum + i.quantity * i.unitPrice,
    0,
  );

  const handleSubmitReturn = async () => {
    if (!sale) return;
    if (selectedItems.length === 0) {
      alert('Please select at least one item to return.');
      return;
    }

    if (refundMethod === 'ONLINE_TRANSFER' && !transferReference.trim()) {
      alert('Please enter the online transfer / bank transaction reference number.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        saleId: sale.id,
        branchId: sale.branch?.id,
        warehouseId: sale.warehouse?.id,
        refundMethod,
        transferReference: refundMethod === 'ONLINE_TRANSFER' ? transferReference.trim() : undefined,
        voucherExpiresInHours: 24, // 24 hours validity
        reason: returnReason.trim() || undefined,
        items: selectedItems.map((item) => ({
          saleItemId: item.saleItemId,
          quantity: item.quantity,
          returnAction: item.returnAction,
        })),
      };

      const result = await apiClient<any>('/pos/returns', {
        method: 'POST',
        body: payload,
      });

      // Load formatted thermal receipt
      const receiptData = await apiClient<any>(`/pos/returns/${result.id}/receipt`);
      setCompletedReceipt(receiptData);

      if (onReturnProcessed) {
        onReturnProcessed(result);
      }
    } catch (err: any) {
      alert(`Return processing failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyVoucher = () => {
    if (completedReceipt?.voucherCode) {
      navigator.clipboard.writeText(completedReceipt.voucherCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handlePrintEscPos = async () => {
    if (!completedReceipt) return;
    await printReturnReceipt(completedReceipt);
  };

  const handleBrowserPrint = () => {
    window.print();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto">
        {/* MODAL HEADER */}
        <div className="flex justify-between items-center px-5 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0 print:hidden">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base sm:text-lg text-white">
                {completedReceipt ? 'Customer Return Slip & Voucher' : 'Customer Return / Item Exchange'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {completedReceipt
                  ? 'Return confirmed. Print receipt or copy exchange credit voucher code.'
                  : 'Process refunds via Cash, Online Transfer, or 24-Hour Item Exchange Voucher'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL CONTENT */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1">
          {/* ======================================================== */}
          {/* PHASE 2: COMPLETED RECEIPT & VOUCHER PRINT STATION */}
          {/* ======================================================== */}
          {completedReceipt ? (
            <div className="space-y-6">
              {/* Top Banner */}
              <div className="bg-emerald-950/70 border border-emerald-800/80 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 text-emerald-300 print:hidden">
                <div className="flex items-center space-x-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
                  <div>
                    <h4 className="font-bold text-sm text-emerald-200">Return Processed Successfully</h4>
                    <p className="text-xs text-emerald-400/80">
                      Return Slip <span className="font-mono font-bold text-white">{completedReceipt.returnNumber}</span> recorded.
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handlePrintEscPos}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 shadow transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print ESC/POS</span>
                  </button>
                  <button
                    onClick={handleBrowserPrint}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs px-3.5 py-2 rounded-xl flex items-center space-x-1.5 border border-slate-700 transition"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Browser Print</span>
                  </button>
                </div>
              </div>

              {/* 24-HOUR EXCHANGE VOUCHER HIGHLIGHT BOX */}
              {completedReceipt.voucherCode && (
                <div className="bg-gradient-to-r from-amber-950/60 to-orange-950/60 border border-amber-800/80 p-5 rounded-2xl space-y-3 print:hidden">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <div>
                      <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                        <Clock className="w-3 h-3" />
                        <span>Valid for 24 Hours Only</span>
                      </div>
                      <h4 className="text-lg font-black text-white mt-1">Item to Item Exchange Credit</h4>
                      <p className="text-xs text-slate-300">
                        Customer can reduce this credit amount on their next purchase within 24 hours.
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Credit Value</div>
                      <div className="text-2xl font-black text-amber-400 font-mono">
                        LKR {Number(completedReceipt.totalRefund || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Voucher Code Card */}
                  <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center space-x-3">
                      <Tag className="w-5 h-5 text-amber-400 shrink-0" />
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Voucher Code</div>
                        <div className="text-xl font-black text-white font-mono tracking-widest">
                          {completedReceipt.voucherCode}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleCopyVoucher}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center space-x-1 border border-slate-700 transition"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedCode ? 'Copied' : 'Copy Code'}</span>
                      </button>
                      {onApplyVoucherToCart && (
                        <button
                          onClick={() => {
                            onApplyVoucherToCart(
                              completedReceipt.voucherCode,
                              Number(completedReceipt.totalRefund || 0),
                            );
                            onClose();
                          }}
                          className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition shadow flex items-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Redeem on Active POS Cart</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Code128 Vector Barcode preview */}
                  <div className="bg-white p-3 rounded-xl flex flex-col items-center justify-center">
                    <BarcodeSvg value={completedReceipt.voucherCode} height={42} showText={false} />
                    <span className="text-[11px] font-mono font-bold text-slate-900 tracking-widest mt-1">
                      {completedReceipt.voucherCode}
                    </span>
                  </div>

                  <div className="text-[11px] text-amber-200/80 flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Expires on:{' '}
                      <strong className="text-white">
                        {completedReceipt.voucherExpiresAt
                          ? new Date(completedReceipt.voucherExpiresAt).toLocaleString()
                          : 'In 24 Hours'}
                      </strong>
                    </span>
                  </div>
                </div>
              )}

              {/* UNIVERSAL THERMAL RECEIPT CONTAINER (Print Isolated) */}
              <div className="flex justify-center">
                <div
                  id="printable-receipt"
                  className="printable-receipt-area bg-white text-black p-6 rounded-xl shadow-xl w-full max-w-[80mm] font-mono text-[11px] leading-tight space-y-2 border border-slate-300"
                >
                  <div className="text-center space-y-0.5">
                    <div className="text-sm font-black uppercase">
                      {completedReceipt.store?.branchName || completedReceipt.store?.companyName || 'RETAIL CLOUD POS'}
                    </div>
                    {completedReceipt.store?.branchAddress && (
                      <div className="text-[10px] text-slate-700">{completedReceipt.store.branchAddress}</div>
                    )}
                    {completedReceipt.store?.branchPhone && (
                      <div className="text-[10px] text-slate-700">Tel: {completedReceipt.store.branchPhone}</div>
                    )}
                    {completedReceipt.store?.taxNumber && (
                      <div className="text-[10px] text-slate-700">Tax Reg: {completedReceipt.store.taxNumber}</div>
                    )}
                    <div className="font-bold border-y border-black py-1 my-1 text-xs uppercase">
                      {completedReceipt.refundMethod === 'ITEM_TO_ITEM'
                        ? 'ITEM EXCHANGE VOUCHER'
                        : completedReceipt.refundMethod === 'ONLINE_TRANSFER'
                        ? 'ONLINE REFUND SLIP'
                        : 'CASH REFUND RECEIPT'}
                    </div>
                  </div>

                  <div className="space-y-0.5 text-[10px]">
                    <div className="flex justify-between">
                      <span>Return Slip:</span>
                      <span className="font-bold">{completedReceipt.returnNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Original Inv:</span>
                      <span>{completedReceipt.originalInvoiceNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date/Time:</span>
                      <span>{new Date(completedReceipt.issuedAt || Date.now()).toLocaleString()}</span>
                    </div>
                    {completedReceipt.customer && (
                      <div className="flex justify-between">
                        <span>Customer:</span>
                        <span>{completedReceipt.customer.name}</span>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-dashed border-black pt-1">
                    <div className="flex justify-between font-bold text-[10px] pb-1">
                      <span>RETURNED ITEM</span>
                      <span>QTY &times; AMT</span>
                    </div>
                    <div className="space-y-1">
                      {(completedReceipt.items || []).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-start text-[10px]">
                          <div className="pr-2">
                            <div className="font-semibold">{item.name || item.sku}</div>
                            <div className="text-[9px] text-slate-600">
                              {item.returnAction === 'RETURN_TO_STOCK' ? '[Restocked]' : '[Damage Write-off]'}
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
                      <span className="text-sm">LKR {Number(completedReceipt.totalRefund || 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-[10px]">
                      <span>Method:</span>
                      <span className="font-bold">
                        {completedReceipt.refundMethod === 'ITEM_TO_ITEM'
                          ? 'Item-to-Item (24h Credit)'
                          : completedReceipt.refundMethod === 'ONLINE_TRANSFER'
                          ? `Online Transfer (${completedReceipt.transferReference || 'Ref N/A'})`
                          : 'Cash Refund'}
                      </span>
                    </div>
                  </div>

                  {/* Voucher Section on Thermal Paper */}
                  {completedReceipt.voucherCode && (
                    <div className="border-t-2 border-black border-dashed pt-2 text-center space-y-1">
                      <div className="font-bold text-[10px] uppercase">*** 24-HOUR EXCHANGE CODE ***</div>
                      <div className="text-sm font-black tracking-wider bg-slate-100 py-1 border border-slate-300">
                        {completedReceipt.voucherCode}
                      </div>
                      <div className="py-1 flex justify-center">
                        <BarcodeSvg value={completedReceipt.voucherCode} height={35} showText={false} />
                      </div>
                      <div className="text-[9px] font-bold">
                        VALID UNTIL: {new Date(completedReceipt.voucherExpiresAt).toLocaleString()}
                      </div>
                      <div className="text-[8px] text-slate-700">
                        Present this barcode or voucher at checkout to reduce from your next purchase within 24 hours.
                      </div>
                    </div>
                  )}

                  <div className="border-t border-dashed border-black pt-2 text-center text-[9px] space-y-0.5">
                    <div>{completedReceipt.footer?.message}</div>
                    <div className="text-[8px] text-slate-600">*** Thank you ***</div>
                  </div>
                </div>
              </div>

              {/* Bottom Done Action */}
              <div className="flex justify-end pt-3 border-t border-slate-800 print:hidden">
                <button
                  onClick={onClose}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* PHASE 1: SEARCH & RETURN CREATION FORM */
            /* ======================================================== */
            <div className="space-y-6">
              {/* SALE LOOKUP (If not preloaded) */}
              {!preloadedSaleId && (
                <form onSubmit={handleLookupInvoice} className="space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Lookup Original Invoice
                  </label>
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input
                        type="text"
                        value={searchInvoice}
                        onChange={(e) => setSearchInvoice(e.target.value)}
                        placeholder="Scan or enter Invoice # (e.g. INV-B01-20261116-0001)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearching || !searchInvoice.trim()}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition flex items-center space-x-1.5"
                    >
                      <Search className="w-3.5 h-3.5" />
                      <span>{isSearching ? 'Searching...' : 'Find Sale'}</span>
                    </button>
                  </div>
                  {searchError && (
                    <div className="p-3 bg-rose-950/40 border border-rose-900/60 rounded-xl text-xs text-rose-300 flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{searchError}</span>
                    </div>
                  )}
                </form>
              )}

              {/* SALE OVERVIEW & ITEMS SELECTION */}
              {sale && (
                <div className="space-y-5">
                  {/* Sale Summary Banner */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Invoice Number</div>
                      <div className="font-bold text-white font-mono">{sale.invoiceNumber}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Sale Date</div>
                      <div className="text-slate-300">{new Date(sale.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Customer</div>
                      <div className="text-slate-300">{sale.customer?.name || 'Walk-in Customer'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase font-semibold">Original Total</div>
                      <div className="font-bold text-emerald-400 font-mono">
                        LKR {Number(sale.totalAmount || 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Itemized Selection Table */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-white uppercase tracking-wider">
                        Select Items to Return ({selectedItems.length} selected)
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        Refund Amount: <strong className="text-emerald-400 font-mono">LKR {totalRefundAmount.toFixed(2)}</strong>
                      </span>
                    </div>

                    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                          <tr>
                            <th className="py-2.5 px-3 w-8">#</th>
                            <th className="py-2.5 px-3">Item Details</th>
                            <th className="py-2.5 px-3">Unit Price</th>
                            <th className="py-2.5 px-3 text-center">Available</th>
                            <th className="py-2.5 px-3 text-center">Return Qty</th>
                            <th className="py-2.5 px-3">Inventory Action</th>
                            <th className="py-2.5 px-3 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850">
                          {itemSelections.map((item, idx) => {
                            const isAvailable = item.maxAvailable > 0;
                            return (
                              <tr
                                key={item.saleItemId}
                                className={`transition ${
                                  item.selected
                                    ? 'bg-emerald-950/20'
                                    : isAvailable
                                    ? 'hover:bg-slate-900/50'
                                    : 'opacity-40'
                                }`}
                              >
                                <td className="py-3 px-3">
                                  <input
                                    type="checkbox"
                                    checked={item.selected}
                                    disabled={!isAvailable}
                                    onChange={() => handleToggleSelect(idx)}
                                    className="w-4 h-4 rounded text-emerald-600 border-slate-700 bg-slate-900 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </td>
                                <td className="py-3 px-3">
                                  <div className="font-bold text-white">{item.productName}</div>
                                  <div className="text-[10px] text-slate-400 font-mono">SKU: {item.sku}</div>
                                </td>
                                <td className="py-3 px-3 font-mono text-slate-300">
                                  LKR {item.unitPrice.toFixed(2)}
                                </td>
                                <td className="py-3 px-3 text-center">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                      isAvailable
                                        ? 'bg-slate-800 text-slate-300'
                                        : 'bg-rose-950/60 text-rose-300'
                                    }`}
                                  >
                                    {item.maxAvailable}
                                  </span>
                                </td>
                                <td className="py-3 px-3">
                                  <div className="flex items-center justify-center space-x-1">
                                    <input
                                      type="number"
                                      disabled={!item.selected}
                                      value={item.quantity}
                                      onChange={(e) => handleQtyChange(idx, parseFloat(e.target.value) || 0)}
                                      min={0.001}
                                      max={item.maxAvailable}
                                      step={1}
                                      className="w-16 bg-slate-900 border border-slate-700 disabled:opacity-40 rounded-lg px-2 py-1 text-center font-bold text-white text-xs font-mono focus:border-emerald-500 focus:outline-none"
                                    />
                                  </div>
                                </td>
                                <td className="py-3 px-3">
                                  <select
                                    disabled={!item.selected}
                                    value={item.returnAction}
                                    onChange={(e) =>
                                      handleActionChange(idx, e.target.value as 'RETURN_TO_STOCK' | 'DAMAGE_DISPOSAL')
                                    }
                                    className="bg-slate-900 border border-slate-700 disabled:opacity-40 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:border-emerald-500 focus:outline-none"
                                  >
                                    <option value="RETURN_TO_STOCK">Restock to Shelf</option>
                                    <option value="DAMAGE_DISPOSAL">Damaged (Disposal)</option>
                                  </select>
                                </td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-white">
                                  LKR {(item.selected ? item.quantity * item.unitPrice : 0).toFixed(2)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* REFUND METHOD SELECTOR (Cash, Online Transfer, Item-to-Item 24h Voucher) */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-white uppercase tracking-wider">
                      Select Refund Settlement Method
                    </label>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* 1. Item-to-Item (24-Hour Exchange Voucher) */}
                      <button
                        type="button"
                        onClick={() => setRefundMethod('ITEM_TO_ITEM')}
                        className={`p-3.5 rounded-xl border text-left transition relative flex flex-col justify-between ${
                          refundMethod === 'ITEM_TO_ITEM'
                            ? 'bg-amber-950/40 border-amber-500/80 shadow-md ring-1 ring-amber-500/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                            <Tag className="w-4 h-4" />
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            24 Hours
                          </span>
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">Item to Item</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Customer reduces amount from next purchase within 24 hours
                          </div>
                        </div>
                      </button>

                      {/* 2. Cash Refund */}
                      <button
                        type="button"
                        onClick={() => setRefundMethod('CASH')}
                        className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          refundMethod === 'CASH'
                            ? 'bg-emerald-950/40 border-emerald-500/80 shadow-md ring-1 ring-emerald-500/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                            <Banknote className="w-4 h-4" />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">Cash Refund</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Immediate cash payout disbursed from cash register drawer
                          </div>
                        </div>
                      </button>

                      {/* 3. Online Transfer */}
                      <button
                        type="button"
                        onClick={() => setRefundMethod('ONLINE_TRANSFER')}
                        className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between ${
                          refundMethod === 'ONLINE_TRANSFER'
                            ? 'bg-sky-950/40 border-sky-500/80 shadow-md ring-1 ring-sky-500/50'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                            <ArrowRightLeft className="w-4 h-4" />
                          </div>
                        </div>
                        <div>
                          <div className="font-bold text-sm text-white">Online Transfer</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            Bank deposit or online transfer directly to customer account
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Online Transfer Reference Input */}
                    {refundMethod === 'ONLINE_TRANSFER' && (
                      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5 animate-in fade-in">
                        <label className="text-xs font-semibold text-slate-300">
                          Bank / Transfer Reference Number or Slip ID <span className="text-rose-400">*</span>
                        </label>
                        <input
                          type="text"
                          value={transferReference}
                          onChange={(e) => setTransferReference(e.target.value)}
                          placeholder="e.g. TXN-COMM-98472918"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                        />
                      </div>
                    )}

                    {/* Return Reason Field */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">
                        Return Reason / Notes (Optional)
                      </label>
                      <input
                        type="text"
                        value={returnReason}
                        onChange={(e) => setReturnReason(e.target.value)}
                        placeholder="e.g. Size exchange requested, Defective seal, Unwanted gift"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Total Value & Submit Button */}
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Refund Due</div>
                      <div className="text-2xl font-black text-emerald-400 font-mono">
                        LKR {totalRefundAmount.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-slate-400">
                        Method:{' '}
                        <span className="font-semibold text-white">
                          {refundMethod === 'ITEM_TO_ITEM'
                            ? 'Item-to-Item (24h Exchange Voucher)'
                            : refundMethod === 'ONLINE_TRANSFER'
                            ? 'Online Transfer'
                            : 'Cash Refund'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center space-x-3 w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs rounded-xl transition"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={isSubmitting || selectedItems.length === 0 || totalRefundAmount <= 0}
                        onClick={handleSubmitReturn}
                        className="flex-1 sm:flex-initial px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs rounded-xl transition shadow flex items-center justify-center space-x-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        <span>{isSubmitting ? 'Processing Return...' : 'Confirm & Issue Return Slip'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
