import { create } from 'zustand';
import { CachedProduct, CachedVariant, CachedBatch, posDb } from './pos-db';
import { apiClient } from './api-client';

export interface CartLineItem {
  variant: CachedVariant;
  product: CachedProduct;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  batchId?: string;
  batchNumber?: string;
  expiryDate?: string;
}

export interface PaymentTender {
  tenderType: string;
  amount: number;
  referenceNumber?: string;
}

export interface SelectedCustomer {
  id: string;
  code: string;
  name: string;
  phone?: string;
  loyaltyPoints: number;
}

interface PosCartState {
  items: CartLineItem[];
  customer: SelectedCustomer | null;
  cartDiscountAmount: number;
  payments: PaymentTender[];
  isProcessing: boolean;
  lastCompletedSale: any | null;

  addItem: (variant: CachedVariant, product: CachedProduct, quantity?: number, batch?: CachedBatch) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  setLineDiscount: (variantId: string, discount: number) => void;
  setCartDiscount: (amount: number) => void;
  setCustomer: (customer: SelectedCustomer | null) => void;
  addPayment: (tender: PaymentTender) => void;
  removePayment: (index: number) => void;
  clearCart: () => void;
  restoreCart: (items: CartLineItem[], customer?: SelectedCustomer | null, cartDiscountAmount?: number) => void;
  setLastCompletedSale: (sale: any | null) => void;

  getSubtotal: () => number;
  getTaxTotal: () => number;
  getGrandTotal: () => number;
  getTotalPaid: () => number;
  getBalanceDue: () => number;
  getChangeGiven: () => number;

  processCheckout: (params: {
    branchId: string;
    warehouseId?: string;
    posTerminalId?: string;
    cashSessionId?: string;
    isOnline: boolean;
  }) => Promise<{ success: boolean; isOffline: boolean; sale?: any; error?: string }>;
}

export const usePosCartStore = create<PosCartState>((set, get) => ({
  items: [],
  customer: null,
  cartDiscountAmount: 0,
  payments: [],
  isProcessing: false,
  lastCompletedSale: null,

  addItem: (variant, product, quantity = 1, batch) => {
    const items = [...get().items];
    const targetBatchId = batch?.id;
    const existingIndex = items.findIndex(
      (i) => i.variant.id === variant.id && (targetBatchId ? i.batchId === targetBatchId : true),
    );

    if (existingIndex >= 0) {
      const existing = items[existingIndex]!;
      const newQty = Math.round((existing.quantity + quantity) * 1000) / 1000;
      const unitPrice = existing.unitPrice;

      // Recalculate discount proportionally if variant had discount percentage or amount
      let discount = existing.discountAmount;
      if (variant.discountPercentage && variant.discountPercentage > 0) {
        discount = Math.round(unitPrice * newQty * (variant.discountPercentage / 100) * 100) / 100;
      } else if (variant.discountAmount && variant.discountAmount > 0) {
        discount = Math.min(unitPrice * newQty, Math.round(variant.discountAmount * newQty * 100) / 100);
      }

      const netLine = Math.round(Math.max(0, unitPrice * newQty - discount) * 100) / 100;

      let tax = 0;
      if (product.taxRate && product.taxRate > 0) {
        if (product.isInclusiveTax) {
          tax = netLine - netLine / (1 + product.taxRate / 100);
        } else {
          tax = netLine * (product.taxRate / 100);
        }
      }

      items[existingIndex] = {
        ...existing,
        quantity: newQty,
        discountAmount: discount,
        taxAmount: Math.round(tax * 100) / 100,
        lineTotal: Math.round((netLine + (product.isInclusiveTax ? 0 : tax)) * 100) / 100,
      };
    } else {
      // Resolve batch and unit price
      let selectedBatch = batch;
      if (!selectedBatch && variant.batches && variant.batches.length > 0) {
        // Find first non-expired batch (FEFO order)
        const now = new Date();
        const nonExpired = variant.batches.filter((b) => !b.expiryDate || new Date(b.expiryDate) >= now);
        if (nonExpired.length > 0) {
          selectedBatch = nonExpired[0];
        }
      }

      const unitPrice = selectedBatch ? Number(selectedBatch.sellingPrice) : Number(variant.sellingPrice);
      const roundedQty = Math.round(quantity * 1000) / 1000;

      // Auto-calculate initial variant discount
      let initialDiscount = 0;
      if (variant.discountPercentage && variant.discountPercentage > 0) {
        initialDiscount = Math.round(unitPrice * roundedQty * (variant.discountPercentage / 100) * 100) / 100;
      } else if (variant.discountAmount && variant.discountAmount > 0) {
        initialDiscount = Math.min(unitPrice * roundedQty, Math.round(variant.discountAmount * roundedQty * 100) / 100);
      }

      const netLine = Math.round(Math.max(0, unitPrice * roundedQty - initialDiscount) * 100) / 100;
      let tax = 0;
      if (product.taxRate && product.taxRate > 0) {
        if (product.isInclusiveTax) {
          tax = netLine - netLine / (1 + product.taxRate / 100);
        } else {
          tax = netLine * (product.taxRate / 100);
        }
      }

      items.push({
        variant,
        product,
        quantity: roundedQty,
        unitPrice,
        discountAmount: initialDiscount,
        taxAmount: Math.round(tax * 100) / 100,
        lineTotal: Math.round((netLine + (product.isInclusiveTax ? 0 : tax)) * 100) / 100,
        batchId: selectedBatch?.id,
        batchNumber: selectedBatch?.batchNumber,
        expiryDate: selectedBatch?.expiryDate,
      });
    }

    set({ items });
  },

  updateQuantity: (variantId, quantity) => {
    const roundedQty = Math.round(quantity * 1000) / 1000;
    if (roundedQty <= 0) {
      get().removeItem(variantId);
      return;
    }
    const items = get().items.map((item) => {
      if (item.variant.id !== variantId) return item;

      let discount = item.discountAmount;
      if (item.variant.discountPercentage && item.variant.discountPercentage > 0) {
        discount = Math.round(item.unitPrice * roundedQty * (item.variant.discountPercentage / 100) * 100) / 100;
      } else if (item.variant.discountAmount && item.variant.discountAmount > 0) {
        discount = Math.min(item.unitPrice * roundedQty, Math.round(item.variant.discountAmount * roundedQty * 100) / 100);
      }

      const netLine = Math.round(Math.max(0, item.unitPrice * roundedQty - discount) * 100) / 100;
      let tax = 0;
      if (item.product.taxRate && item.product.taxRate > 0) {
        tax = item.product.isInclusiveTax
          ? netLine - netLine / (1 + item.product.taxRate / 100)
          : netLine * (item.product.taxRate / 100);
      }
      return {
        ...item,
        quantity: roundedQty,
        discountAmount: discount,
        taxAmount: Math.round(tax * 100) / 100,
        lineTotal: Math.round((netLine + (item.product.isInclusiveTax ? 0 : tax)) * 100) / 100,
      };
    });
    set({ items });
  },

  removeItem: (variantId) => {
    set({ items: get().items.filter((i) => i.variant.id !== variantId) });
  },

  setLineDiscount: (variantId, discount) => {
    const items = get().items.map((item) => {
      if (item.variant.id !== variantId) return item;
      const netLine = Math.round(Math.max(0, item.unitPrice * item.quantity - discount) * 100) / 100;
      let tax = 0;
      if (item.product.taxRate && item.product.taxRate > 0) {
        tax = item.product.isInclusiveTax
          ? netLine - netLine / (1 + item.product.taxRate / 100)
          : netLine * (item.product.taxRate / 100);
      }
      return {
        ...item,
        discountAmount: discount,
        taxAmount: Math.round(tax * 100) / 100,
        lineTotal: Math.round((netLine + (item.product.isInclusiveTax ? 0 : tax)) * 100) / 100,
      };
    });
    set({ items });
  },

  setCartDiscount: (cartDiscountAmount) => set({ cartDiscountAmount }),
  setCustomer: (customer) => set({ customer }),

  addPayment: (tender) => {
    set({ payments: [...get().payments, tender] });
  },

  removePayment: (index) => {
    set({ payments: get().payments.filter((_, i) => i !== index) });
  },

  clearCart: () => {
    set({
      items: [],
      customer: null,
      cartDiscountAmount: 0,
      payments: [],
    });
  },

  restoreCart: (items, customer = null, cartDiscountAmount = 0) => {
    set({
      items: items.map((i) => ({ ...i })),
      customer: customer ? { ...customer } : null,
      cartDiscountAmount: cartDiscountAmount || 0,
      payments: [],
      isProcessing: false,
    });
  },

  setLastCompletedSale: (sale) => set({ lastCompletedSale: sale }),

  getSubtotal: () => {
    return Math.round(get().items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0) * 100) / 100;
  },

  getTaxTotal: () => {
    return Math.round(get().items.reduce((sum, i) => sum + i.taxAmount, 0) * 100) / 100;
  },

  getGrandTotal: () => {
    const sub = get().items.reduce((sum, i) => sum + i.lineTotal, 0);
    return Math.max(0, Math.round((sub - get().cartDiscountAmount) * 100) / 100);
  },

  getTotalPaid: () => {
    return Math.round(get().payments.reduce((sum, p) => sum + p.amount, 0) * 100) / 100;
  },

  getBalanceDue: () => {
    const grand = get().getGrandTotal();
    const paid = get().getTotalPaid();
    return Math.max(0, Math.round((grand - paid) * 100) / 100);
  },

  getChangeGiven: () => {
    const grand = get().getGrandTotal();
    const paid = get().getTotalPaid();
    const hasCash = get().payments.some((p) => p.tenderType === 'CASH');
    return paid > grand && hasCash ? Math.round((paid - grand) * 100) / 100 : 0;
  },

  processCheckout: async ({ branchId, warehouseId, posTerminalId, cashSessionId, isOnline }) => {
    const { items, customer, cartDiscountAmount, payments } = get();
    if (items.length === 0) {
      return { success: false, isOffline: !isOnline, error: 'Cart is empty' };
    }

    const grandTotal = get().getGrandTotal();
    const totalPaid = get().getTotalPaid();
    if (totalPaid < grandTotal) {
      return {
        success: false,
        isOffline: !isOnline,
        error: `Insufficient payment tendered (Due: LKR ${grandTotal.toFixed(2)}, Paid: LKR ${totalPaid.toFixed(2)})`,
      };
    }

    set({ isProcessing: true });
    const clientOpId = `op-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    const checkoutPayload = {
      branchId,
      warehouseId,
      posTerminalId,
      cashSessionId,
      customerId: customer?.id,
      clientOperationId: clientOpId,
      cartDiscountAmount,
      items: items.map((i) => ({
        variantId: i.variant.id,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        discountAmount: i.discountAmount,
        batchId: i.batchId,
      })),
      payments,
    };

    if (isOnline) {
      try {
        const sale = await apiClient<any>('/pos/checkout', {
          method: 'POST',
          body: checkoutPayload,
        });

        get().setLastCompletedSale(sale);
        get().clearCart();
        set({ isProcessing: false });
        return { success: true, isOffline: false, sale };
      } catch (err: any) {
        // Fall back to offline queue on network failure
        console.warn('Online checkout failed, falling back to local offline Dexie queue:', err);
      }
    }

    // Queue in Offline Dexie DB
    try {
      const offlineInvoiceNumber = `OFFLINE-${Date.now().toString().slice(-6)}`;
      await posDb.queuedSales.put({
        clientOperationId: clientOpId,
        branchId,
        warehouseId: warehouseId && warehouseId.trim() ? warehouseId : undefined,
        posTerminalId: posTerminalId && posTerminalId.trim() ? posTerminalId : undefined,
        cashSessionId: cashSessionId && cashSessionId.trim() ? cashSessionId : undefined,
        customerId: customer?.id && customer.id.trim() ? customer.id : undefined,
        offlineInvoiceNumber,
        completedAt: new Date().toISOString(),
        cartDiscountAmount: Number(cartDiscountAmount || 0),
        items: checkoutPayload.items,
        payments,
        totalAmount: grandTotal,
        syncStatus: 'QUEUED',
      });

      const offlineSaleReceipt = {
        invoiceNumber: offlineInvoiceNumber,
        totalAmount: grandTotal,
        paidAmount: totalPaid,
        changeGiven: get().getChangeGiven(),
        items: items.map((i) => ({
          variant: { sku: i.variant.sku, product: { name: i.product.name } },
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discountAmount: i.discountAmount,
          lineTotal: i.lineTotal,
          batchNumber: i.batchNumber,
          expiryDate: i.expiryDate,
        })),
        payments,
        isOfflineSync: true,
      };

      get().setLastCompletedSale(offlineSaleReceipt);
      get().clearCart();
      set({ isProcessing: false });
      return { success: true, isOffline: true, sale: offlineSaleReceipt };
    } catch (dbErr: any) {
      set({ isProcessing: false });
      return { success: false, isOffline: true, error: dbErr.message };
    }
  },
}));
