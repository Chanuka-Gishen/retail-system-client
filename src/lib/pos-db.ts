import Dexie, { Table } from 'dexie';
import { apiClient } from './api-client';
import { useAuthStore } from './auth-store';

export interface CachedProduct {
  id: string;
  code: string;
  name: string;
  unit: string;
  taxProfileId?: string;
  taxRate?: number;
  isInclusiveTax?: boolean;
}

export interface CachedBatch {
  id: string;
  batchNumber: string;
  costPrice: number;
  sellingPrice: number;
  quantityOnHand: number;
  manufacturingDate?: string;
  expiryDate?: string;
  receivedDate: string;
}

export interface CachedVariant {
  id: string;
  productId: string;
  sku: string;
  barcode?: string;
  variantName: string;
  costPrice: number;
  sellingPrice: number;
  minSellingPrice?: number;
  discountPercentage?: number;
  discountAmount?: number;
  batches?: CachedBatch[];
}

export interface QueuedOfflineSale {
  clientOperationId: string;
  branchId: string;
  warehouseId?: string;
  posTerminalId?: string;
  cashSessionId?: string;
  customerId?: string;
  offlineInvoiceNumber: string;
  completedAt: string;
  cartDiscountAmount: number;
  items: Array<{
    variantId: string;
    quantity: number;
    unitPrice: number;
    discountAmount?: number;
    batchId?: string;
  }>;
  payments: Array<{
    tenderType: string;
    amount: number;
    referenceNumber?: string;
  }>;
  totalAmount: number;
  syncStatus: 'QUEUED' | 'SYNCED' | 'FAILED';
  errorMessage?: string;
}

export interface QueuedOfflineCashTx {
  clientOperationId: string;
  sessionId: string;
  type: 'CASH_IN' | 'CASH_OUT';
  amount: number;
  reason: string;
  occurredAt: string;
  syncStatus: 'QUEUED' | 'SYNCED' | 'FAILED';
}

export class PosOfflineDatabase extends Dexie {
  products!: Table<CachedProduct, string>;
  variants!: Table<CachedVariant, string>;
  queuedSales!: Table<QueuedOfflineSale, string>;
  queuedCashTx!: Table<QueuedOfflineCashTx, string>;

  constructor() {
    super('RetailPosOfflineDb');
    this.version(1).stores({
      products: 'id, code, name',
      variants: 'id, productId, sku, barcode',
      queuedSales: 'clientOperationId, syncStatus, completedAt',
      queuedCashTx: 'clientOperationId, syncStatus, occurredAt',
    });
  }
}

export const posDb = new PosOfflineDatabase();

export async function pullCatalogDelta(): Promise<{ count: number; watermark: string }> {
  try {
    const localProductCount = await posDb.products.count();
    const lastWatermark =
      localProductCount > 0 && typeof window !== 'undefined'
        ? localStorage.getItem('pos_catalog_watermark')
        : null;
    const queryStr = lastWatermark ? `?since=${encodeURIComponent(lastWatermark)}` : '';
    const res = await apiClient<{ serverTimestamp: string; delta: any }>(`/pos/sync/catalog-delta${queryStr}`);

    if (res?.delta?.products) {
      await posDb.transaction('rw', posDb.products, posDb.variants, async () => {
        for (const prod of res.delta.products) {
          const taxProfile = prod.taxProfile;
          await posDb.products.put({
            id: prod.id,
            code: prod.code,
            name: prod.name,
            unit: prod.unit,
            taxProfileId: prod.taxProfileId,
            taxRate: taxProfile ? Number(taxProfile.ratePercentage) : 0,
            isInclusiveTax: taxProfile ? !!taxProfile.isInclusive : false,
          });

          if (prod.variants) {
            for (const v of prod.variants) {
              await posDb.variants.put({
                id: v.id,
                productId: prod.id,
                sku: v.sku,
                barcode: v.barcode,
                variantName: v.variantName,
                costPrice: Number(v.costPrice),
                sellingPrice: Number(v.sellingPrice),
                minSellingPrice: v.minSellingPrice ? Number(v.minSellingPrice) : undefined,
                discountPercentage: v.discountPercentage ? Number(v.discountPercentage) : 0,
                discountAmount: v.discountAmount ? Number(v.discountAmount) : 0,
                batches: Array.isArray(v.batches)
                  ? v.batches.map((b: any) => ({
                      id: b.id,
                      batchNumber: b.batchNumber,
                      costPrice: Number(b.costPrice),
                      sellingPrice: Number(b.sellingPrice),
                      quantityOnHand: Number(b.quantityOnHand),
                      manufacturingDate: b.manufacturingDate,
                      expiryDate: b.expiryDate,
                      receivedDate: b.receivedDate,
                    }))
                  : [],
              });
            }
          }
        }
      });
    }

    if (res?.serverTimestamp && typeof window !== 'undefined') {
      localStorage.setItem('pos_catalog_watermark', res.serverTimestamp);
    }

    return {
      count: res?.delta?.products?.length || 0,
      watermark: res?.serverTimestamp || '',
    };
  } catch (err) {
    console.warn('Failed to pull catalog delta (offline or server unreachable):', err);
    return { count: 0, watermark: '' };
  }
}

export interface SyncPushResult {
  syncedSales: number;
  syncedCashTx: number;
  failedSales: number;
  errors: string[];
}

export async function pushQueuedSync(): Promise<SyncPushResult> {
  const pendingSales = await posDb.queuedSales
    .where('syncStatus')
    .anyOf(['QUEUED', 'FAILED'])
    .toArray();
  const pendingCashTx = await posDb.queuedCashTx
    .where('syncStatus')
    .anyOf(['QUEUED', 'FAILED'])
    .toArray();

  if (pendingSales.length === 0 && pendingCashTx.length === 0) {
    return { syncedSales: 0, syncedCashTx: 0, failedSales: 0, errors: [] };
  }

  const fallbackBranchId = useAuthStore.getState().branch?.id;

  try {
    const payloadSales = pendingSales.map((s) => {
      const resolvedBranchId =
        s.branchId && s.branchId !== '00000000-0000-0000-0000-000000000000'
          ? s.branchId
          : fallbackBranchId || s.branchId;

      return {
        clientOperationId: s.clientOperationId,
        branchId: resolvedBranchId,
        warehouseId: s.warehouseId && s.warehouseId.trim() ? s.warehouseId : undefined,
        posTerminalId: s.posTerminalId && s.posTerminalId.trim() ? s.posTerminalId : undefined,
        cashSessionId: s.cashSessionId && s.cashSessionId.trim() ? s.cashSessionId : undefined,
        customerId: s.customerId && s.customerId.trim() ? s.customerId : undefined,
        offlineInvoiceNumber: s.offlineInvoiceNumber,
        completedAt: s.completedAt,
        cartDiscountAmount: Number(s.cartDiscountAmount || 0),
        items: (s.items || []).map((item) => ({
          variantId: item.variantId,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          discountAmount: Number(item.discountAmount || 0),
          batchId: item.batchId,
        })),
        payments: (s.payments || []).map((p) => ({
          tenderType: p.tenderType,
          amount: Number(p.amount),
          referenceNumber: p.referenceNumber && p.referenceNumber.trim() ? p.referenceNumber : undefined,
        })),
      };
    });

    const payloadCash = pendingCashTx.map((c) => ({
      clientOperationId: c.clientOperationId,
      sessionId: c.sessionId,
      type: c.type,
      amount: Number(c.amount),
      reason: c.reason,
      occurredAt: c.occurredAt,
    }));

    const batchRes = await apiClient<any>('/pos/sync/batch', {
      method: 'POST',
      body: {
        sales: payloadSales,
        cashTransactions: payloadCash,
      },
    });

    let syncedSales = 0;
    let failedSales = 0;
    const errors: string[] = [];

    // Mark processed sales
    if (batchRes?.processedSales) {
      for (const ps of batchRes.processedSales) {
        if (ps.status === 'SYNCED' || ps.status === 'ALREADY_SYNCED') {
          await posDb.queuedSales.update(ps.clientOperationId, {
            syncStatus: 'SYNCED',
            errorMessage: undefined,
          });
          syncedSales++;
        } else if (ps.status === 'FAILED') {
          await posDb.queuedSales.update(ps.clientOperationId, {
            syncStatus: 'FAILED',
            errorMessage: ps.error,
          });
          failedSales++;
          if (ps.error) errors.push(ps.error);
        }
      }
    }

    // Mark processed cash transactions
    let syncedCashTx = 0;
    if (batchRes?.processedCashTransactions) {
      for (const pc of batchRes.processedCashTransactions) {
        if (pc.status === 'SYNCED' || pc.status === 'ALREADY_SYNCED') {
          await posDb.queuedCashTx.update(pc.clientOperationId, { syncStatus: 'SYNCED' });
          syncedCashTx++;
        }
      }
    }

    return {
      syncedSales,
      syncedCashTx,
      failedSales,
      errors,
    };
  } catch (err: any) {
    console.warn('Failed to push queued sync to server:', err);
    return {
      syncedSales: 0,
      syncedCashTx: 0,
      failedSales: pendingSales.length,
      errors: [err.message || 'Sync connection failed'],
    };
  }
}
