'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Receipt,
  Printer,
  Download,
  Eye,
  RefreshCw,
  X,
  FileText,
  DollarSign,
  ShoppingBag,
  AlertCircle,
  RotateCcw,
  CheckCircle2,
  Minus,
  Plus,
  Check,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../lib/auth-store';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { EmptyState } from '../../components/EmptyState';
import { useHardwareStore } from '../../lib/hardware-store';
import { CustomerReturnModal } from '../../components/CustomerReturnModal';

interface ReturnItemState {
  saleItemId: string;
  variantId: string;
  sku: string;
  name: string;
  unit: string;
  purchasedQuantity: number;
  returnedQuantity: number;
  availableQuantity: number;
  unitPrice: number;
  returnQuantity: number;
  returnAction: 'RETURN_TO_STOCK' | 'DAMAGE_DISPOSAL';
  selected: boolean;
}

export default function InvoicesPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  // Handle URL param ?action=return
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('action') === 'return') {
        setIsQuickReturnOpen(true);
      }
    }
  }, []);

  const [invoices, setInvoices] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Selected invoice & receipt modal state
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [isLoadingReceipt, setIsLoadingReceipt] = useState(false);
  const [viewFormat, setViewFormat] = useState<'thermal' | 'tax_invoice'>('thermal');

  // Return Processing State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnSale, setReturnSale] = useState<any | null>(null);
  const [returnItems, setReturnItems] = useState<ReturnItemState[]>([]);
  const [refundTender, setRefundTender] = useState<string>('CASH');
  const [returnReason, setReturnReason] = useState<string>('');
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
  const [returnError, setReturnError] = useState<string | null>(null);

  // Completed Return Voucher Modal State
  const [completedReturn, setCompletedReturn] = useState<any | null>(null);
  const [completedReturnReceipt, setCompletedReturnReceipt] = useState<any | null>(null);
  const [isReturnReceiptModalOpen, setIsReturnReceiptModalOpen] = useState(false);

  // Quick Invoice Lookup Modal State
  const [isQuickReturnOpen, setIsQuickReturnOpen] = useState(false);
  const [quickInvoiceNumber, setQuickInvoiceNumber] = useState('');
  const [isLookingUp, setIsLookingUp] = useState(false);

  // 1. Auth Guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // 2. Fetch Invoices List
  const fetchInvoices = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(limit));
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);

      const res = await apiClient<any>(`/pos/sales?${params.toString()}`);
      setInvoices(res?.items || (Array.isArray(res) ? res : []));
      if (res?.meta) {
        setTotalPages(res.meta.totalPages || 1);
        setTotalItems(res.meta.total || 0);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load invoices');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchInvoices();
    }
  }, [page, limit, search, statusFilter, isAuthenticated]);

  // 3. Fetch Receipt for Selected Invoice
  const handleOpenReceipt = async (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setIsLoadingReceipt(true);
    setReceiptData(null);

    try {
      const data = await apiClient<any>(`/pos/sales/${invoiceId}/receipt`);
      setReceiptData(data);
    } catch (err: any) {
      setErrorMsg(`Failed to load receipt details: ${err.message}`);
      setSelectedInvoiceId(null);
    } finally {
      setIsLoadingReceipt(false);
    }
  };

  // 4. Open Return Modal for Invoice
  const handleOpenReturn = async (saleId: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    setReturnError(null);

    try {
      const sale = await apiClient<any>(`/pos/sales/${saleId}`);
      if (!sale) throw new Error('Sale transaction not found');

      if (sale.status === 'REFUNDED' || sale.status === 'VOIDED') {
        setErrorMsg(`Invoice ${sale.invoiceNumber} cannot be returned because it is already ${sale.status}.`);
        return;
      }

      const items: ReturnItemState[] = (sale.items || []).map((si: any) => {
        const purchasedQty = Number(si.quantity || 0);
        const returnedQty = Number(si.returnedQuantity || 0);
        const availableQty = Math.max(0, purchasedQty - returnedQty);

        return {
          saleItemId: si.id,
          variantId: si.variantId,
          sku: si.variant?.sku || '',
          name: si.variant?.product?.name || si.variant?.variantName || 'Item',
          unit: si.variant?.product?.unit || 'PCS',
          purchasedQuantity: purchasedQty,
          returnedQuantity: returnedQty,
          availableQuantity: availableQty,
          unitPrice: Number(si.unitPrice || 0),
          returnQuantity: availableQty > 0 ? 1 : 0,
          returnAction: 'RETURN_TO_STOCK',
          selected: availableQty > 0,
        };
      });

      setReturnSale(sale);
      setReturnItems(items);
      setRefundTender(sale.payments?.[0]?.tenderType || 'CASH');
      setReturnReason('');
      setIsReturnModalOpen(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load sale details for return');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Lookup Invoice Number for Return
  const handleQuickLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickInvoiceNumber.trim()) return;

    setIsLookingUp(true);
    setReturnError(null);

    try {
      const searchRes = await apiClient<any>(`/pos/sales?search=${encodeURIComponent(quickInvoiceNumber.trim())}&limit=1`);
      const matched = (searchRes?.items || searchRes || [])[0];

      if (!matched) {
        setReturnError(`No invoice found matching "${quickInvoiceNumber}".`);
        return;
      }

      setIsQuickReturnOpen(false);
      setQuickInvoiceNumber('');
      await handleOpenReturn(matched.id);
    } catch (err: any) {
      setReturnError(err.message || 'Failed to find invoice');
    } finally {
      setIsLookingUp(false);
    }
  };

  // 6. Return Modal Handlers
  const handleToggleItemSelect = (saleItemId: string) => {
    setReturnItems((prev) =>
      prev.map((item) => {
        if (item.saleItemId === saleItemId) {
          const nextSelected = !item.selected;
          return {
            ...item,
            selected: nextSelected,
            returnQuantity: nextSelected ? (item.returnQuantity > 0 ? item.returnQuantity : Math.min(1, item.availableQuantity)) : 0,
          };
        }
        return item;
      })
    );
  };

  const handleQuantityChange = (saleItemId: string, qty: number) => {
    setReturnItems((prev) =>
      prev.map((item) => {
        if (item.saleItemId === saleItemId) {
          const clamped = Math.max(0, Math.min(item.availableQuantity, qty));
          return {
            ...item,
            returnQuantity: clamped,
            selected: clamped > 0,
          };
        }
        return item;
      })
    );
  };

  const handleActionChange = (saleItemId: string, action: 'RETURN_TO_STOCK' | 'DAMAGE_DISPOSAL') => {
    setReturnItems((prev) =>
      prev.map((item) => (item.saleItemId === saleItemId ? { ...item, returnAction: action } : item))
    );
  };

  const totalRefundAmount = useMemo(() => {
    return returnItems
      .filter((i) => i.selected && i.returnQuantity > 0)
      .reduce((sum, i) => sum + i.returnQuantity * i.unitPrice, 0);
  }, [returnItems]);

  const selectedItemCount = useMemo(() => {
    return returnItems.filter((i) => i.selected && i.returnQuantity > 0).length;
  }, [returnItems]);

  // 7. Submit Return Process
  const handleSubmitReturn = async () => {
    const selected = returnItems.filter((i) => i.selected && i.returnQuantity > 0);
    if (selected.length === 0) {
      setReturnError('Please select at least one item to return with quantity > 0.');
      return;
    }

    setIsSubmittingReturn(true);
    setReturnError(null);

    try {
      const payload = {
        saleId: returnSale.id,
        refundTender,
        reason: returnReason.trim() || 'Customer product return',
        items: selected.map((i) => ({
          saleItemId: i.saleItemId,
          quantity: Number(i.returnQuantity),
          returnAction: i.returnAction,
          reason: returnReason.trim() || undefined,
        })),
      };

      const res = await apiClient<any>('/pos/returns', {
        method: 'POST',
        body: payload,
      });

      setIsReturnModalOpen(false);
      setCompletedReturn(res);

      try {
        const receiptRes = await apiClient<any>(`/pos/returns/${res.id}/receipt`);
        setCompletedReturnReceipt(receiptRes);
      } catch {
        // fallback
      }

      setIsReturnReceiptModalOpen(true);
      setSuccessMsg(`Return ${res.returnNumber} processed successfully! LKR ${Number(res.refundAmount).toFixed(2)} refunded.`);
      await fetchInvoices();
    } catch (err: any) {
      setReturnError(err.message || 'Failed to process return');
    } finally {
      setIsSubmittingReturn(false);
    }
  };

  // 8. Download Thermal Text Receipt (.txt)
  const downloadThermalText = (receipt: any) => {
    const W = 42;
    const center = (str: string) => {
      const pad = Math.max(0, Math.floor((W - str.length) / 2));
      return ' '.repeat(pad) + str;
    };
    const row = (left: string, right: string) => {
      const space = Math.max(1, W - left.length - right.length);
      return left + ' '.repeat(space) + right;
    };
    const divider = '-'.repeat(W);
    const doubleDivider = '='.repeat(W);

    let txt = '';
    txt += center(receipt.store?.companyName || 'RETAIL CLOUD POS') + '\n';
    txt += center(receipt.store?.branchName || 'Main Flagship') + '\n';
    if (receipt.store?.branchAddress) txt += center(receipt.store.branchAddress) + '\n';
    if (receipt.store?.branchPhone) txt += center(`Tel: ${receipt.store.branchPhone}`) + '\n';
    if (receipt.store?.taxNumber) txt += center(`Tax/VAT Reg: ${receipt.store.taxNumber}`) + '\n';
    txt += doubleDivider + '\n';
    txt += row('Invoice #:', receipt.receiptNumber) + '\n';
    txt += row('Date/Time:', new Date(receipt.issuedAt).toLocaleString()) + '\n';
    txt += row('Cashier:', receipt.cashier || 'Cashier') + '\n';
    if (receipt.customer?.name) {
      txt += row('Customer:', receipt.customer.name) + '\n';
    }
    txt += divider + '\n';
    txt += row('ITEMS', 'AMOUNT (LKR)') + '\n';
    txt += divider + '\n';

    (receipt.items || []).forEach((item: any) => {
      const lineName = item.name;
      const lineAmt = Number(item.lineTotal).toFixed(2);
      if (lineName.length > 28) {
        txt += lineName + '\n';
        txt += ' '.repeat(W - lineAmt.length) + lineAmt + '\n';
      } else {
        txt += row(lineName, lineAmt) + '\n';
      }
    });

    txt += divider + '\n';
    txt += row('Subtotal:', Number(receipt.pricing?.subtotal || 0).toFixed(2)) + '\n';
    if (Number(receipt.pricing?.discountTotal) > 0) {
      txt += row('Discount:', `-${Number(receipt.pricing.discountTotal).toFixed(2)}`) + '\n';
    }
    if (Number(receipt.pricing?.taxTotal) > 0) {
      txt += row('Tax Amount:', Number(receipt.pricing.taxTotal).toFixed(2)) + '\n';
    }
    txt += doubleDivider + '\n';
    txt += row('TOTAL AMOUNT (LKR):', Number(receipt.pricing?.grandTotal || 0).toFixed(2)) + '\n';
    txt += doubleDivider + '\n';

    (receipt.payments || []).forEach((pay: any) => {
      txt += row(`Tender (${pay.tenderType}):`, Number(pay.amount).toFixed(2)) + '\n';
    });
    if (Number(receipt.pricing?.changeGiven) > 0) {
      txt += row('Change Given:', Number(receipt.pricing.changeGiven).toFixed(2)) + '\n';
    }

    txt += '\n';
    txt += center(receipt.footer?.thankYouMessage || 'THANK YOU FOR SHOPPING WITH US!') + '\n';
    txt += center(receipt.footer?.returnPolicy || '7 Days Exchange with Receipt') + '\n';
    txt += '\n\n';

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Receipt-${receipt.receiptNumber}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // 9. Download HTML Tax Invoice
  const downloadHtmlInvoice = (receipt: any) => {
    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Tax Invoice - ${receipt.receiptNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1e293b; background: #fff; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
    .company h1 { margin: 0; font-size: 24px; color: #0f172a; }
    .company p { margin: 4px 0; font-size: 13px; color: #64748b; }
    .invoice-title { text-align: right; }
    .invoice-title h2 { margin: 0; font-size: 28px; color: #2563eb; font-weight: 800; }
    .invoice-meta { margin-top: 8px; font-size: 13px; color: #475569; }
    .bill-to { margin: 24px 0; padding: 16px; background: #f8fafc; border-radius: 8px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 13px; }
    th { background: #0f172a; color: #fff; text-align: left; padding: 10px 12px; font-weight: 600; text-transform: uppercase; font-size: 11px; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    .totals { width: 350px; margin-left: auto; margin-top: 20px; font-size: 13px; }
    .totals-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
    .grand-total { font-size: 18px; font-weight: 800; color: #0f172a; border-top: 2px solid #0f172a; border-bottom: 2px solid #0f172a; padding: 10px 0; margin-top: 8px; }
    .footer { margin-top: 50px; padding-top: 20px; border-top: 1px dashed #cbd5e1; text-align: center; font-size: 12px; color: #64748b; }
    @media print {
      body { margin: 0; }
      @page { size: auto; margin: 15mm; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">
      <h1>${receipt.store?.companyName || 'Retail Cloud POS'}</h1>
      <p>${receipt.store?.branchName || ''} - ${receipt.store?.branchAddress || ''}</p>
      <p>Tel: ${receipt.store?.branchPhone || 'N/A'} | Email: support@retailpos.com</p>
      ${receipt.store?.taxNumber ? `<p><strong>Tax / VAT Reg #:</strong> ${receipt.store.taxNumber}</p>` : ''}
    </div>
    <div class="invoice-title">
      <h2>TAX INVOICE</h2>
      <div class="invoice-meta">
        <div><strong>Invoice #:</strong> ${receipt.receiptNumber}</div>
        <div><strong>Date:</strong> ${new Date(receipt.issuedAt).toLocaleDateString()}</div>
        <div><strong>Cashier:</strong> ${receipt.cashier || 'Cashier'}</div>
      </div>
    </div>
  </div>

  <div class="bill-to">
    <strong>Billed To:</strong><br>
    ${receipt.customer ? `${receipt.customer.name}<br>Contact: ${receipt.customer.phone || 'N/A'}` : 'Cash Customer / Walk-in'}
  </div>

  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>Description</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: center;">Qty</th>
        <th style="text-align: right;">Discount</th>
        <th style="text-align: right;">Total (LKR)</th>
      </tr>
    </thead>
    <tbody>
      ${(receipt.items || []).map((i: any) => `
        <tr>
          <td style="font-family: monospace;">${i.sku}</td>
          <td><strong>${i.name}</strong></td>
          <td style="text-align: right;">${Number(i.unitPrice).toFixed(2)}</td>
          <td style="text-align: center;">${i.quantity}</td>
          <td style="text-align: right;">${Number(i.discount) > 0 ? `-${Number(i.discount).toFixed(2)}` : '-'}</td>
          <td style="text-align: right; font-weight: bold;">${Number(i.lineTotal).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row">
      <span>Subtotal</span>
      <span>LKR ${Number(receipt.pricing?.subtotal || 0).toFixed(2)}</span>
    </div>
    ${Number(receipt.pricing?.discountTotal) > 0 ? `
    <div class="totals-row" style="color: #16a34a;">
      <span>Discounts</span>
      <span>-LKR ${Number(receipt.pricing.discountTotal).toFixed(2)}</span>
    </div>` : ''}
    ${Number(receipt.pricing?.taxTotal) > 0 ? `
    <div class="totals-row">
      <span>Tax / VAT Total</span>
      <span>LKR ${Number(receipt.pricing.taxTotal).toFixed(2)}</span>
    </div>` : ''}
    <div class="totals-row grand-total">
      <span>GRAND TOTAL</span>
      <span>LKR ${Number(receipt.pricing?.grandTotal || 0).toFixed(2)}</span>
    </div>
  </div>

  <div class="footer">
    <p>Thank you for choosing ${receipt.store?.companyName || 'Retail Cloud POS'}. Terms: 7 days exchange with original receipt.</p>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Invoice-${receipt.receiptNumber}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // 10. Download Refund Slip (.txt)
  const downloadReturnText = (receipt: any) => {
    const W = 42;
    const center = (str: string) => {
      const pad = Math.max(0, Math.floor((W - str.length) / 2));
      return ' '.repeat(pad) + str;
    };
    const row = (left: string, right: string) => {
      const space = Math.max(1, W - left.length - right.length);
      return left + ' '.repeat(space) + right;
    };
    const divider = '-'.repeat(W);
    const doubleDivider = '='.repeat(W);

    let txt = '';
    txt += center(receipt.store?.companyName || 'RETAIL CLOUD POS') + '\n';
    txt += center(receipt.store?.branchName || 'Main Flagship') + '\n';
    txt += center('SALES RETURN & REFUND VOUCHER') + '\n';
    txt += doubleDivider + '\n';
    txt += row('Return Ref:', receipt.returnNumber) + '\n';
    txt += row('Orig Invoice:', receipt.originalInvoiceNumber || receipt.sale?.invoiceNumber || '') + '\n';
    txt += row('Date/Time:', new Date(receipt.issuedAt || receipt.createdAt).toLocaleString()) + '\n';
    if (receipt.customer?.name) {
      txt += row('Customer:', receipt.customer.name) + '\n';
    }
    txt += row('Refund Method:', receipt.refundTender) + '\n';
    txt += divider + '\n';
    txt += row('RETURNED ITEMS', 'REFUND (LKR)') + '\n';
    txt += divider + '\n';

    (receipt.items || []).forEach((item: any) => {
      const name = item.name || item.variant?.product?.name || item.variant?.variantName || 'Item';
      const sub = Number(item.refundSubtotal).toFixed(2);
      txt += name + '\n';
      txt += row(`  ${item.quantity} x ${Number(item.unitPrice).toFixed(2)} [${item.returnAction}]`, sub) + '\n';
    });

    txt += doubleDivider + '\n';
    txt += row('TOTAL REFUND PAID:', `${Number(receipt.totalRefund || receipt.refundAmount).toFixed(2)} LKR`) + '\n';
    txt += doubleDivider + '\n';
    if (receipt.reason) {
      txt += `Reason: ${receipt.reason}\n`;
    }
    txt += '\n\n';
    txt += center('Customer Signature: __________________') + '\n\n';
    txt += center(receipt.footer?.message || 'Goods returned in accordance with return policy.') + '\n';

    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `RefundSlip-${receipt.returnNumber}.txt`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  // 11. Download Refund HTML Credit Note
  const downloadReturnHtml = (receipt: any) => {
    const origInv = receipt.originalInvoiceNumber || receipt.sale?.invoiceNumber || '';
    const dateStr = new Date(receipt.issuedAt || receipt.createdAt).toLocaleString();
    const custName = receipt.customer?.name || 'Walk-in Customer';
    const totalRef = Number(receipt.totalRefund || receipt.refundAmount).toFixed(2);

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Refund Voucher - ${receipt.returnNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 40px; color: #1e293b; background: #fff; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; }
    .company h1 { margin: 0; font-size: 24px; color: #0f172a; }
    .company p { margin: 4px 0; font-size: 13px; color: #64748b; }
    .voucher-title { text-align: right; }
    .voucher-title h2 { margin: 0; font-size: 28px; color: #d97706; font-weight: 800; }
    .voucher-meta { margin-top: 8px; font-size: 13px; color: #475569; }
    .details { margin: 24px 0; padding: 16px; background: #fef3c7; border-radius: 8px; font-size: 13px; border: 1px solid #fde68a; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; font-size: 13px; }
    th { background: #0f172a; color: #fff; text-align: left; padding: 10px 12px; font-weight: 600; text-transform: uppercase; font-size: 11px; }
    td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; }
    .totals { width: 350px; margin-left: auto; margin-top: 20px; font-size: 14px; }
    .grand-total { font-size: 18px; font-weight: 800; color: #b45309; border-top: 2px solid #b45309; border-bottom: 2px solid #b45309; padding: 10px 0; margin-top: 8px; display: flex; justify-content: space-between; }
    .footer { margin-top: 60px; padding-top: 20px; border-top: 1px dashed #cbd5e1; font-size: 12px; color: #64748b; display: flex; justify-content: space-between; }
    @media print { body { margin: 0; } @page { size: auto; margin: 15mm; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">
      <h1>${receipt.store?.companyName || 'Retail Cloud POS'}</h1>
      <p>${receipt.store?.branchName || ''} - ${receipt.store?.branchAddress || ''}</p>
      <p>Tel: ${receipt.store?.branchPhone || 'N/A'}</p>
    </div>
    <div class="voucher-title">
      <h2>REFUND VOUCHER</h2>
      <div class="voucher-meta">
        <div><strong>Return Voucher #:</strong> ${receipt.returnNumber}</div>
        <div><strong>Original Invoice #:</strong> ${origInv}</div>
        <div><strong>Date:</strong> ${dateStr}</div>
      </div>
    </div>
  </div>

  <div class="details">
    <strong>Customer:</strong> ${custName}<br>
    <strong>Refund Payout Tender:</strong> ${receipt.refundTender}<br>
    ${receipt.reason ? `<strong>Reason:</strong> ${receipt.reason}` : ''}
  </div>

  <table>
    <thead>
      <tr>
        <th>SKU</th>
        <th>Product Description</th>
        <th style="text-align: center;">Returned Qty</th>
        <th style="text-align: right;">Unit Price</th>
        <th style="text-align: center;">Action</th>
        <th style="text-align: right;">Refund Subtotal (LKR)</th>
      </tr>
    </thead>
    <tbody>
      ${(receipt.items || []).map((i: any) => `
        <tr>
          <td style="font-family: monospace;">${i.sku || i.variant?.sku || '-'}</td>
          <td><strong>${i.name || i.variant?.product?.name || i.variant?.variantName || 'Product'}</strong></td>
          <td style="text-align: center; font-weight: bold;">${i.quantity}</td>
          <td style="text-align: right;">${Number(i.unitPrice).toFixed(2)}</td>
          <td style="text-align: center; font-size: 11px;">${i.returnAction}</td>
          <td style="text-align: right; font-weight: bold;">${Number(i.refundSubtotal).toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="grand-total">
      <span>TOTAL REFUND PAID:</span>
      <span>LKR ${totalRef}</span>
    </div>
  </div>

  <div class="footer">
    <div>Goods inspected & restocked to inventory.</div>
    <div>Customer Signature: _______________________</div>
  </div>
</body>
</html>`;

    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `RefundVoucher-${receipt.returnNumber}.html`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handlePrint = () => {
    window.print();
  };

  // Metrics computation
  const totalInvoicesCount = invoices.length;
  const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount || 0), 0);
  const completedCount = invoices.filter((i) => i.status === 'COMPLETED').length;
  const refundedCount = invoices.filter((i) => i.status === 'REFUNDED' || i.status === 'PARTIALLY_REFUNDED').length;

  return (
    <div className="flex-1 bg-slate-950 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight flex items-center space-x-2">
            <Receipt className="w-6 h-6 text-emerald-400" />
            <span>Invoices & Sales Transactions</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Search invoices, process customer item returns, and print thermal slips or tax documents
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsQuickReturnOpen(true)}
            className="px-3.5 py-2.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition"
            title="Scan or enter invoice number to process return"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Process Return</span>
          </button>

          <button
            onClick={() => fetchInvoices()}
            disabled={isLoading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition"
            title="Refresh Invoices"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-950 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-950 border border-emerald-800 rounded-xl text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-blue-950 text-blue-400 rounded-xl">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold">Total Invoices</div>
            <div className="text-2xl font-black text-white mt-0.5">{totalInvoicesCount}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-emerald-950 text-emerald-400 rounded-xl">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold">Gross Sales Volume</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">
              LKR {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-teal-950 text-teal-400 rounded-xl">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold">Completed Orders</div>
            <div className="text-2xl font-black text-white mt-0.5">{completedCount}</div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-amber-950 text-amber-400 rounded-xl">
            <RotateCcw className="w-6 h-6" />
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase font-semibold">Returns & Refunds</div>
            <div className="text-2xl font-black text-amber-400 mt-0.5">{refundedCount}</div>
          </div>
        </div>
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by invoice number (e.g. INV-BR-...), customer name, or cashier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-10 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs p-1"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['', 'COMPLETED', 'PARTIALLY_REFUNDED', 'REFUNDED'].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setPage(1);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === st
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {st === '' ? 'ALL INVOICES' : st.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices List Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date & Time</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Cashier / Branch</th>
                <th className="py-3 px-4 text-center">Tender</th>
                <th className="py-3 px-4 text-right">Total (LKR)</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {isLoading ? (
                <TableSkeleton columns={8} rows={6} theme="dark" />
              ) : invoices.length === 0 ? (
                <EmptyState
                  colSpan={8}
                  theme="dark"
                  icon={Receipt}
                  isSearchActive={Boolean(search || statusFilter)}
                  searchQuery={search}
                  title={search || statusFilter ? 'No invoices match your query' : 'No invoices recorded yet'}
                  description={
                    search || statusFilter
                      ? `No sales invoices matched your current filter criteria${search ? ` for "${search}"` : ''}. Try resetting your search or filter.`
                      : 'Sales receipts and tax invoices generated from the POS checkout will appear here in real time.'
                  }
                  onResetFilters={() => {
                    setSearch('');
                    setStatusFilter('');
                    setPage(1);
                  }}
                  actionLabel="Go to POS Terminal"
                  onAction={() => router.push('/pos')}
                  actionIcon={ShoppingBag}
                />
              ) : (
                invoices.map((inv) => {
                  const tenders = (inv.payments || []).map((p: any) => p.tenderType).join(', ');
                  const canReturn = inv.status !== 'REFUNDED' && inv.status !== 'VOIDED';

                  return (
                    <tr key={inv.id} className="hover:bg-slate-850 transition">
                      <td className="py-3 px-4 font-mono font-bold text-blue-400">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {new Date(inv.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {inv.customer?.name || (
                          <span className="text-slate-500 font-normal">Walk-in</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        <div>
                          {inv.cashier?.firstName} {inv.cashier?.lastName}
                        </div>
                        <div className="text-[10px] text-slate-500">{inv.branch?.name}</div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px] font-semibold border border-slate-700">
                          {tenders || 'CASH'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-400">
                        {Number(inv.totalAmount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.status === 'COMPLETED'
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : inv.status === 'REFUNDED'
                              ? 'bg-rose-950 text-rose-300 border border-rose-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {inv.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenReceipt(inv.id)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition"
                          title="View Receipt"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Receipt</span>
                        </button>

                        {canReturn ? (
                          <button
                            onClick={() => handleOpenReturn(inv.id)}
                            className="px-2.5 py-1.5 bg-amber-950 hover:bg-amber-900 text-amber-400 hover:text-amber-300 border border-amber-800 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition"
                            title="Process Item Return & Refund"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Return</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-600 font-semibold px-2 py-1">
                            Refunded
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
          currentPage={page}
          totalPages={totalPages}
          totalItems={totalItems}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={setLimit}
          isLoading={isLoading}
        />
      </div>

      {/* =========================================================================
          MODAL 1: VIEW RECEIPT & INVOICE
          ========================================================================= */}
      {selectedInvoiceId && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden print:border-none print:shadow-none print:bg-white print:max-h-none print:h-auto">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950 print:hidden">
              <div className="flex items-center space-x-2">
                <Receipt className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white">
                  Sales Transaction Receipt: {receiptData?.receiptNumber || '...'}
                </h2>
              </div>

              <div className="flex items-center space-x-3">
                <div className="flex items-center bg-slate-900 border border-slate-800 p-0.5 rounded-lg text-xs font-semibold">
                  <button
                    onClick={() => setViewFormat('thermal')}
                    className={`px-2.5 py-1 rounded transition ${
                      viewFormat === 'thermal'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Thermal (80mm)
                  </button>
                  <button
                    onClick={() => setViewFormat('tax_invoice')}
                    className={`px-2.5 py-1 rounded transition ${
                      viewFormat === 'tax_invoice'
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Tax Invoice (A4)
                  </button>
                </div>

                <button
                  onClick={() => {
                    setSelectedInvoiceId(null);
                    setReceiptData(null);
                  }}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 flex justify-center bg-slate-950 print:p-0 print:m-0 print:bg-white print:overflow-visible">
              {isLoadingReceipt || !receiptData ? (
                <div className="py-16 text-center text-slate-400 flex flex-col items-center space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
                  <span>Loading sales receipt...</span>
                </div>
              ) : viewFormat === 'thermal' ? (
                /* FORMAT 1: 80MM THERMAL SLIP PREVIEW */
                <div
                  id="printable-receipt"
                  className="printable-receipt-area bg-white text-slate-900 rounded-xl p-6 w-full max-w-sm shadow-xl font-mono text-xs space-y-4 border border-slate-200 print:p-2 print:border-none print:shadow-none print:rounded-none"
                >
                  <div className="text-center space-y-1 border-b border-dashed border-slate-400 pb-3">
                    <h3 className="font-extrabold text-sm uppercase tracking-tight">
                      {receiptData.store?.companyName || 'RETAIL CLOUD POS'}
                    </h3>
                    <p className="text-[11px] text-slate-700">{receiptData.store?.branchName}</p>
                    {receiptData.store?.branchAddress && (
                      <p className="text-[10px] text-slate-500">{receiptData.store.branchAddress}</p>
                    )}
                    {receiptData.store?.branchPhone && (
                      <p className="text-[10px] text-slate-500">Tel: {receiptData.store.branchPhone}</p>
                    )}
                    {receiptData.store?.taxNumber && (
                      <p className="text-[10px] text-slate-600 font-bold">
                        VAT/Tax: {receiptData.store.taxNumber}
                      </p>
                    )}
                  </div>

                  <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Invoice:</span>
                      <span className="font-bold">{receiptData.receiptNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Date:</span>
                      <span>{new Date(receiptData.issuedAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">Cashier:</span>
                      <span>{receiptData.cashier}</span>
                    </div>
                    {receiptData.customer && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Customer:</span>
                        <span>{receiptData.customer.name}</span>
                      </div>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="space-y-1.5 border-b border-dashed border-slate-400 pb-3">
                    <div className="flex justify-between font-bold text-slate-800 pb-1 border-b border-slate-200">
                      <span>Description</span>
                      <span>Total</span>
                    </div>
                    {(receiptData.items || []).map((item: any, idx: number) => (
                      <div key={idx} className="space-y-0.5">
                        <div className="font-semibold text-slate-900 leading-tight">{item.name}</div>
                        <div className="flex justify-between text-[11px] text-slate-600">
                          <span>
                            {item.quantity} x {Number(item.unitPrice).toFixed(2)}
                            {Number(item.discount) > 0 && ` (Disc -${Number(item.discount).toFixed(2)})`}
                          </span>
                          <span className="font-bold text-slate-900">
                            {Number(item.lineTotal).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Pricing Breakdown */}
                  <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subtotal:</span>
                      <span>{Number(receiptData.pricing?.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {Number(receiptData.pricing?.discountTotal) > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount Total:</span>
                        <span>-{Number(receiptData.pricing.discountTotal).toFixed(2)}</span>
                      </div>
                    )}
                    {Number(receiptData.pricing?.taxTotal) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tax / VAT:</span>
                        <span>{Number(receiptData.pricing.taxTotal).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-extrabold text-sm text-slate-900 pt-1 border-t border-slate-300">
                      <span>TOTAL:</span>
                      <span>LKR {Number(receiptData.pricing?.grandTotal || 0).toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payments & Tenders */}
                  <div className="space-y-1 text-[11px] border-b border-dashed border-slate-400 pb-2">
                    {(receiptData.payments || []).map((pay: any, idx: number) => (
                      <div key={idx} className="flex justify-between text-slate-700">
                        <span>Paid ({pay.tenderType}):</span>
                        <span className="font-bold">{Number(pay.amount).toFixed(2)}</span>
                      </div>
                    ))}
                    {Number(receiptData.pricing?.changeGiven) > 0 && (
                      <div className="flex justify-between text-slate-700">
                        <span>Change Given:</span>
                        <span>{Number(receiptData.pricing.changeGiven).toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* Footer & Barcode note */}
                  <div className="text-center space-y-1 text-[10px] text-slate-500 pt-1">
                    <p className="font-bold text-slate-700">
                      {receiptData.footer?.thankYouMessage || 'THANK YOU FOR YOUR PATRONAGE!'}
                    </p>
                    <p>{receiptData.footer?.returnPolicy || '7 Days Exchange with Receipt'}</p>
                    <p className="font-mono text-[9px] pt-1">*** END OF RECEIPT ***</p>
                  </div>
                </div>
              ) : (
                /* FORMAT 2: TAX INVOICE (A4) PREVIEW */
                <div className="printable-a4-area bg-white text-slate-900 rounded-xl p-8 w-full max-w-xl shadow-xl space-y-6 border border-slate-200 print:p-4 print:border-none print:shadow-none print:rounded-none">
                  <div className="flex justify-between border-b pb-4">
                    <div>
                      <h2 className="text-xl font-black text-slate-900 uppercase">
                        {receiptData.store?.companyName || 'Retail Cloud POS'}
                      </h2>
                      <p className="text-xs text-slate-600 mt-1">{receiptData.store?.branchName}</p>
                      <p className="text-xs text-slate-500">{receiptData.store?.branchAddress}</p>
                      <p className="text-xs text-slate-500">Tel: {receiptData.store?.branchPhone || 'N/A'}</p>
                      {receiptData.store?.taxNumber && (
                        <p className="text-xs font-bold text-slate-700">Tax Reg: {receiptData.store.taxNumber}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <h3 className="text-2xl font-black text-blue-600">TAX INVOICE</h3>
                      <div className="text-xs text-slate-600 mt-1">
                        <div>
                          <strong>Invoice #:</strong> {receiptData.receiptNumber}
                        </div>
                        <div>
                          <strong>Date:</strong> {new Date(receiptData.issuedAt).toLocaleDateString()}
                        </div>
                        <div>
                          <strong>Cashier:</strong> {receiptData.cashier}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border text-xs">
                    <strong>Billed To:</strong> {receiptData.customer?.name || 'Walk-in Customer'}
                    {receiptData.customer?.phone && ` (${receiptData.customer.phone})`}
                  </div>

                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white uppercase text-[10px]">
                        <th className="p-2">SKU</th>
                        <th className="p-2">Item</th>
                        <th className="p-2 text-right">Price</th>
                        <th className="p-2 text-center">Qty</th>
                        <th className="p-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {(receiptData.items || []).map((i: any, idx: number) => (
                        <tr key={idx}>
                          <td className="p-2 font-mono text-[11px]">{i.sku}</td>
                          <td className="p-2 font-medium">{i.name}</td>
                          <td className="p-2 text-right">{Number(i.unitPrice).toFixed(2)}</td>
                          <td className="p-2 text-center">{i.quantity}</td>
                          <td className="p-2 text-right font-bold">{Number(i.lineTotal).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <div className="w-64 ml-auto text-xs space-y-1.5 pt-2">
                    <div className="flex justify-between">
                      <span className="text-slate-600">Subtotal:</span>
                      <span>LKR {Number(receiptData.pricing?.subtotal || 0).toFixed(2)}</span>
                    </div>
                    {Number(receiptData.pricing?.discountTotal) > 0 && (
                      <div className="flex justify-between text-emerald-600">
                        <span>Discount:</span>
                        <span>-LKR {Number(receiptData.pricing.discountTotal).toFixed(2)}</span>
                      </div>
                    )}
                    {Number(receiptData.pricing?.taxTotal) > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tax / VAT:</span>
                        <span>LKR {Number(receiptData.pricing.taxTotal).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-black text-sm pt-2 border-t-2 border-slate-900">
                      <span>Total:</span>
                      <span>LKR {Number(receiptData.pricing?.grandTotal || 0).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            {receiptData && (
              <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-wrap items-center justify-between gap-3 print:hidden">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => downloadThermalText(receiptData)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-700"
                    title="Download raw ESC/POS 80mm printable text slip"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-400" />
                    <span>Download Slip (.txt)</span>
                  </button>

                  <button
                    onClick={() => downloadHtmlInvoice(receiptData)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-700"
                    title="Download standalone printable HTML tax invoice"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Download (.html)</span>
                  </button>
                </div>

                <div className="flex items-center space-x-2">
                  {selectedInvoiceId && (
                    <button
                      onClick={() => {
                        const sid = selectedInvoiceId;
                        setSelectedInvoiceId(null);
                        setReceiptData(null);
                        handleOpenReturn(sid);
                      }}
                      className="px-3.5 py-2 bg-amber-950 hover:bg-amber-950 text-amber-300 border border-amber-800 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition"
                      title="Return items from this invoice"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Return Items</span>
                    </button>
                  )}

                  <button
                    onClick={async () => {
                      if (receiptData) {
                        const salePayload = {
                          invoiceNumber: receiptData.receiptNumber,
                          completedAt: receiptData.issuedAt,
                          cashier: { firstName: receiptData.cashier, lastName: '' },
                          customer: receiptData.customer,
                          items: receiptData.items,
                          subtotalAmount: receiptData.pricing?.subtotal,
                          discountAmount: receiptData.pricing?.discountTotal,
                          taxAmount: receiptData.pricing?.taxTotal,
                          totalAmount: receiptData.pricing?.grandTotal,
                          payments: receiptData.payments,
                          changeGiven: receiptData.pricing?.changeGiven,
                        };
                        const branchInfo = {
                          name: receiptData.store?.branchName || receiptData.store?.companyName,
                          address: receiptData.store?.branchAddress,
                          phone: receiptData.store?.branchPhone,
                          taxNumber: receiptData.store?.taxNumber,
                        };
                        await useHardwareStore.getState().printSaleReceipt(salePayload, branchInfo);
                      }
                    }}
                    className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition shadow-sm"
                    title="Send raw ESC/POS binary data to thermal printer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print ESC/POS</span>
                  </button>

                  <button
                    onClick={handlePrint}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Browser Print</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          CUSTOMER RETURN MODAL (Cash, Online Transfer, 24h Item-to-Item Voucher)
          ========================================================================= */}
      <CustomerReturnModal
        isOpen={isReturnModalOpen || isQuickReturnOpen}
        onClose={() => {
          setIsReturnModalOpen(false);
          setIsQuickReturnOpen(false);
          setReturnSale(null);
        }}
        preloadedSaleId={returnSale?.id}
        onReturnProcessed={() => {
          fetchInvoices();
        }}
      />

      {/* Legacy Return Modal (superseded by CustomerReturnModal) */}
      {false && isReturnModalOpen && returnSale && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Return Modal Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-950 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-950 border border-amber-800 text-amber-400 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">
                    Return Invoice Items: <span className="text-blue-400">{returnSale.invoiceNumber}</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Branch: {returnSale.branch?.name} • Customer: {returnSale.customer?.name || 'Walk-in'} • Date: {new Date(returnSale.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsReturnModalOpen(false);
                  setReturnSale(null);
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Return Error Banner */}
            {returnError && (
              <div className="m-4 mb-0 p-3 bg-rose-950 border border-rose-800 rounded-xl text-rose-300 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{returnError}</span>
              </div>
            )}

            {/* Return Modal Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Select Line Items to Return
                  </h3>
                  <span className="text-xs text-slate-400">
                    {selectedItemCount} of {returnItems.length} item(s) selected
                  </span>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">Return?</th>
                        <th className="py-2.5 px-3">Product / SKU</th>
                        <th className="py-2.5 px-3 text-center">Purchased</th>
                        <th className="py-2.5 px-3 text-center">Already Returned</th>
                        <th className="py-2.5 px-3 text-center">Available</th>
                        <th className="py-2.5 px-3 text-center w-32">Return Qty</th>
                        <th className="py-2.5 px-3">Action</th>
                        <th className="py-2.5 px-3 text-right">Refund Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {returnItems.map((item) => {
                        const isAvailable = item.availableQuantity > 0;
                        const lineRefund = item.returnQuantity * item.unitPrice;

                        return (
                          <tr
                            key={item.saleItemId}
                            className={`transition ${
                              item.selected ? 'bg-amber-950' : 'hover:bg-slate-900'
                            } ${!isAvailable ? 'opacity-40' : ''}`}
                          >
                            <td className="py-3 px-3 text-center">
                              <input
                                type="checkbox"
                                disabled={!isAvailable}
                                checked={item.selected}
                                onChange={() => handleToggleItemSelect(item.saleItemId)}
                                className="w-4 h-4 rounded text-blue-600 bg-slate-900 border-slate-700 cursor-pointer disabled:cursor-not-allowed"
                              />
                            </td>

                            <td className="py-3 px-3">
                              <div className="font-semibold text-white">{item.name}</div>
                              <div className="text-[11px] font-mono text-blue-400">{item.sku}</div>
                            </td>

                            <td className="py-3 px-3 text-center font-mono">
                              {item.purchasedQuantity} {item.unit}
                            </td>

                            <td className="py-3 px-3 text-center font-mono text-slate-400">
                              {item.returnedQuantity}
                            </td>

                            <td className="py-3 px-3 text-center font-mono font-bold text-amber-400">
                              {item.availableQuantity}
                            </td>

                            {/* Quantity Stepper */}
                            <td className="py-3 px-3">
                              {isAvailable ? (
                                <div className="flex items-center space-x-1.5 justify-center">
                                  <button
                                    type="button"
                                    onClick={() => handleQuantityChange(item.saleItemId, item.returnQuantity - 1)}
                                    disabled={item.returnQuantity <= 0}
                                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center text-slate-200"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>

                                  <input
                                    type="number"
                                    min="0"
                                    max={item.availableQuantity}
                                    value={item.returnQuantity}
                                    onChange={(e) =>
                                      handleQuantityChange(item.saleItemId, parseFloat(e.target.value) || 0)
                                    }
                                    className="w-12 text-center bg-slate-900 border border-slate-700 rounded py-0.5 text-xs text-white font-bold"
                                  />

                                  <button
                                    type="button"
                                    onClick={() => handleQuantityChange(item.saleItemId, item.returnQuantity + 1)}
                                    disabled={item.returnQuantity >= item.availableQuantity}
                                    className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-40 flex items-center justify-center text-slate-200"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleQuantityChange(item.saleItemId, item.availableQuantity)}
                                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold px-1.5 py-0.5 rounded ml-1"
                                    title="Return all available quantity"
                                  >
                                    All
                                  </button>
                                </div>
                              ) : (
                                <span className="text-center block text-slate-500">Fully Returned</span>
                              )}
                            </td>

                            {/* Return Action */}
                            <td className="py-3 px-3">
                              {isAvailable && item.selected ? (
                                <select
                                  value={item.returnAction}
                                  onChange={(e) =>
                                    handleActionChange(item.saleItemId, e.target.value as any)
                                  }
                                  className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none"
                                >
                                  <option value="RETURN_TO_STOCK">Restock to Warehouse</option>
                                  <option value="DAMAGE_DISPOSAL">Dispose / Damaged</option>
                                </select>
                              ) : (
                                <span className="text-slate-500 text-[11px]">-</span>
                              )}
                            </td>

                            <td className="py-3 px-3 text-right font-bold text-emerald-400 font-mono">
                              {item.selected && item.returnQuantity > 0
                                ? `LKR ${lineRefund.toFixed(2)}`
                                : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Refund Payment Tender & Reason */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Refund Payout Tender Method
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {['CASH', 'CARD', 'STORE_CREDIT'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setRefundTender(t)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold transition border ${
                          refundTender === t
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Cash payouts are deducted from the cash session drawer.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                    Reason for Return
                  </label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {['Defective Product', 'Wrong Item', 'Change of Mind', 'Expired Stock'].map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setReturnReason(r)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border transition ${
                          returnReason === r
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-slate-900 text-slate-400 hover:text-white border-slate-800'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value)}
                    placeholder="Enter customer return reason or details..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Return Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Total Refund Payout</span>
                <span className="text-xl font-black text-emerald-400">
                  LKR {totalRefundAmount.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setIsReturnModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSubmitReturn}
                  disabled={isSubmittingReturn || totalRefundAmount <= 0}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold rounded-xl text-xs flex items-center space-x-2 transition"
                >
                  {isSubmittingReturn ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Return...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Confirm Return & Payout (LKR {totalRefundAmount.toFixed(2)})</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 3: RETURN COMPLETED & REFUND RECEIPT VOUCHER
          ========================================================================= */}
      {isReturnReceiptModalOpen && completedReturn && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            {/* Header with success check */}
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
              <div className="w-10 h-10 rounded-xl bg-emerald-950 text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Sales Return Processed!</h3>
                <p className="text-xs text-slate-400">
                  Inventory has been updated and refund voucher generated.
                </p>
              </div>
            </div>

            {/* Voucher Details Card */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Return Voucher #:</span>
                <span className="font-mono font-bold text-amber-400">
                  {completedReturn.returnNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Original Invoice #:</span>
                <span className="font-mono text-blue-400">
                  {completedReturn.sale?.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Refund Payout Tender:</span>
                <span className="font-bold text-white uppercase">{completedReturn.refundTender}</span>
              </div>
              <div className="flex justify-between border-t border-slate-800 pt-2 text-sm">
                <span className="font-bold text-slate-300">Total Refund Amount:</span>
                <span className="font-black text-emerald-400">
                  LKR {Number(completedReturn.refundAmount).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Actions: Download / Print Slip */}
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => downloadReturnText(completedReturnReceipt || completedReturn)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition border border-slate-700"
                >
                  <Download className="w-4 h-4 text-blue-400" />
                  <span>Download Slip (.txt)</span>
                </button>

                <button
                  onClick={() => downloadReturnHtml(completedReturnReceipt || completedReturn)}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition border border-slate-700"
                >
                  <Download className="w-4 h-4 text-amber-400" />
                  <span>Download Voucher (.html)</span>
                </button>
              </div>

              <button
                onClick={() => {
                  setIsReturnReceiptModalOpen(false);
                  setCompletedReturn(null);
                  setCompletedReturnReceipt(null);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs transition"
              >
                Close & Return to Invoices
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL 4: QUICK RETURN INVOICE LOOKUP MODAL
          ========================================================================= */}
      {isQuickReturnOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <RotateCcw className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Find Invoice to Return</h3>
              </div>
              <button
                onClick={() => setIsQuickReturnOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickLookup} className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  Scan barcode or enter invoice number (e.g. INV-BR-COLOMBO-...)
                </label>
                <input
                  type="text"
                  value={quickInvoiceNumber}
                  onChange={(e) => setQuickInvoiceNumber(e.target.value)}
                  placeholder="INV-BR-..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono"
                  autoFocus
                />
              </div>

              {returnError && (
                <div className="text-xs text-rose-400 flex items-center space-x-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{returnError}</span>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickReturnOpen(false)}
                  className="px-3 py-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLookingUp || !quickInvoiceNumber.trim()}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-slate-950 font-bold rounded-lg text-xs flex items-center space-x-1.5"
                >
                  {isLookingUp ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                  <span>Lookup Invoice</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
