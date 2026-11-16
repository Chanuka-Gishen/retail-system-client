'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Barcode,
  Printer,
  ArrowUpDown,
  ArrowLeftRight,
  Edit3,
  Warehouse as WarehouseIcon,
  Layers,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  DollarSign,
  TrendingUp,
  History,
  X,
  Check,
  Package,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../lib/auth-store';
import { BarcodeSvg } from '../../../components/BarcodeSvg';

export default function InventoryItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const variantId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [itemData, setItemData] = useState<any | null>(null);

  // Adjustment Modal State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [adjWarehouseId, setAdjWarehouseId] = useState('');
  const [adjType, setAdjType] = useState<'POSITIVE' | 'NEGATIVE'>('POSITIVE');
  const [adjQuantity, setAdjQuantity] = useState('10');
  const [adjReason, setAdjReason] = useState('Stock balance audit reconciliation');
  const [isSubmittingAdj, setIsSubmittingAdj] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    fetchItemDetails();
  }, [isAuthenticated, variantId]);

  const fetchItemDetails = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);
      const res = await apiClient<any>(`/inventory/items/${variantId}`);
      setItemData(res);
      if (res?.variant?.stockBalances?.length > 0 && !adjWarehouseId) {
        setAdjWarehouseId(res.variant.stockBalances[0].warehouseId || res.variant.stockBalances[0].warehouse?.id);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load inventory item details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjWarehouseId) {
      setErrorMsg('Please select a warehouse for adjustment');
      return;
    }
    const qty = parseFloat(adjQuantity);
    if (isNaN(qty) || qty <= 0) {
      setErrorMsg('Quantity must be greater than zero');
      return;
    }

    try {
      setIsSubmittingAdj(true);
      setErrorMsg(null);
      await apiClient('/inventory/adjustments', {
        method: 'POST',
        body: JSON.stringify({
          warehouseId: adjWarehouseId,
          reason: adjReason.trim() || 'Manual stock adjustment',
          items: [
            {
              variantId,
              type: adjType,
              quantity: qty,
            },
          ],
        }),
      });

      setSuccessMsg(`Stock adjustment of ${adjType === 'POSITIVE' ? '+' : '-'}${qty} applied successfully!`);
      setIsAdjustmentModalOpen(false);
      setAdjQuantity('10');
      // Refresh item details
      await fetchItemDetails();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to apply stock adjustment');
    } finally {
      setIsSubmittingAdj(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="flex items-center space-x-3 text-slate-500">
          <div className="w-5 h-5 bg-slate-800 rounded animate-pulse" />
          <div className="w-32 h-4 bg-slate-800 rounded animate-pulse" />
        </div>
        <div className="h-28 bg-slate-900 border border-slate-800 rounded-2xl p-6 animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-slate-900 border border-slate-800 rounded-xl p-4 animate-pulse" />
          ))}
        </div>
        <div className="h-64 bg-slate-900 border border-slate-800 rounded-xl p-6 animate-pulse" />
      </div>
    );
  }

  if (errorMsg && !itemData) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-rose-950/50 border border-rose-800 rounded-2xl p-8 text-center space-y-4">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Item Not Found</h2>
          <p className="text-slate-400 text-sm">{errorMsg}</p>
          <Link
            href="/inventory"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-semibold transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Inventory</span>
          </Link>
        </div>
      </div>
    );
  }

  const { variant, batches = [], recentMovements = [], summary } = itemData;
  const product = variant.product;
  const cost = Number(variant.costPrice || 0);
  const price = Number(variant.sellingPrice || 0);
  const marginPct = price > 0 ? (((price - cost) / price) * 100).toFixed(1) : '0.0';

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb & Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/inventory"
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition shadow-sm"
            title="Back to inventory"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Link href="/inventory" className="hover:underline">
                Inventory
              </Link>
              <span>/</span>
              <span className="text-blue-400 font-mono font-bold">{variant.sku}</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <span>{product.name}</span>
              {variant.variantName && (
                <span className="text-base font-medium text-slate-400">({variant.variantName})</span>
              )}
            </h1>
          </div>
        </div>

        {/* Action Buttons Toolbar - Decoupled from table row */}
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href={`/inventory/labels?variantId=${variant.id}`}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-900/30 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print Labels & Tags</span>
          </Link>

          <button
            type="button"
            onClick={() => setIsAdjustmentModalOpen(true)}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-emerald-900/30 transition"
          >
            <ArrowUpDown className="w-4 h-4" />
            <span>Adjust Stock</span>
          </button>

          <Link
            href={`/inventory/transfers?variantId=${variant.id}`}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs sm:text-sm font-bold transition"
          >
            <ArrowLeftRight className="w-4 h-4 text-blue-400" />
            <span>Transfer</span>
          </Link>

          <Link
            href={`/catalog?search=${encodeURIComponent(variant.sku)}`}
            className="inline-flex items-center space-x-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white rounded-xl text-xs sm:text-sm font-bold transition"
          >
            <Edit3 className="w-4 h-4 text-amber-400" />
            <span>Edit Catalog</span>
          </Link>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Item Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          {/* Column 1: Product Identifiers */}
          <div className="space-y-3 lg:border-r border-slate-800 lg:pr-6">
            <div className="flex flex-wrap gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-950 text-blue-300 border border-blue-800">
                SKU: {variant.sku}
              </span>
              {variant.barcode && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-purple-950 text-purple-300 border border-purple-800">
                  Barcode: {variant.barcode}
                </span>
              )}
              {product.category?.name && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {product.category.name}
                </span>
              )}
              {product.brand?.name && (
                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                  {product.brand.name}
                </span>
              )}
              <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                Unit: {product.unit || 'PCS'}
              </span>
            </div>

            {product.description && (
              <p className="text-xs text-slate-400 line-clamp-2">{product.description}</p>
            )}

            <div className="pt-2 text-xs text-slate-500 flex items-center space-x-4">
              <span>Reorder Point: <strong className="text-slate-300">{variant.reorderPoint || 10}</strong></span>
              <span>Status: <strong className={variant.isActive ? 'text-emerald-400' : 'text-rose-400'}>{variant.isActive ? 'Active' : 'Inactive'}</strong></span>
            </div>
          </div>

          {/* Column 2: Pricing & Margins */}
          <div className="space-y-3 lg:border-r border-slate-800 lg:pr-6">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-400">Commercial Pricing</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Cost Price (COGS)</div>
                <div className="text-base font-black font-mono text-slate-200 mt-0.5">
                  LKR {cost.toFixed(2)}
                </div>
              </div>
              <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Selling Price</div>
                <div className="text-base font-black font-mono text-emerald-400 mt-0.5">
                  LKR {price.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-slate-400">Gross Margin:</span>
              <span className="font-mono font-bold text-teal-400 flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>{marginPct}%</span>
              </span>
            </div>
          </div>

          {/* Column 3: Barcode Vector Preview */}
          <div className="flex flex-col items-center justify-center p-3 bg-slate-950/50 border border-slate-800/80 rounded-xl">
            <div className="text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider">
              Scannable Barcode (Code128)
            </div>
            <div className="bg-white p-3 rounded-lg shadow-inner max-w-full overflow-hidden text-slate-950">
              <BarcodeSvg
                value={variant.barcode || variant.sku}
                height={45}
                width={190}
                showText={true}
              />
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards: Inventory Stock & Valuation */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total On Hand</div>
          <div className="text-2xl font-black text-white mt-1">
            {Number(summary.totalOnHand).toFixed(2)}{' '}
            <span className="text-xs font-normal text-slate-400">{product.unit || 'PCS'}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Across all store warehouses</div>
        </div>

        <div className="bg-slate-900 border border-emerald-900/60 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-emerald-400 uppercase tracking-wider">Available for Sale</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {Number(summary.totalAvailable).toFixed(2)}{' '}
            <span className="text-xs font-normal text-emerald-500/80">{product.unit || 'PCS'}</span>
          </div>
          <div className="text-[10px] text-emerald-500/70 mt-0.5">Ready for checkout</div>
        </div>

        <div className="bg-slate-900 border border-amber-900/60 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider">Allocated Stock</div>
          <div className="text-2xl font-black text-amber-400 mt-1">
            {Number(summary.totalAllocated).toFixed(2)}{' '}
            <span className="text-xs font-normal text-amber-500/80">{product.unit || 'PCS'}</span>
          </div>
          <div className="text-[10px] text-amber-500/70 mt-0.5">Transfers / Reserved orders</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Valuation (At Cost)</div>
          <div className="text-xl font-black font-mono text-slate-100 mt-1">
            LKR {Number(summary.costValuation).toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Total capital invested</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Valuation (Retail)</div>
          <div className="text-xl font-black font-mono text-emerald-400 mt-1">
            LKR {Number(summary.retailValuation).toFixed(2)}
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">Potential revenue value</div>
        </div>
      </div>

      {/* Grid: Warehouse Distribution & Batches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Table 1: Warehouse Stock Distribution */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <WarehouseIcon className="w-5 h-5 text-blue-400" />
              <h3 className="font-bold text-white text-base">Warehouse Stock Distribution</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {variant.stockBalances?.length || 0} locations
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="py-3 px-4">Warehouse</th>
                  <th className="py-3 px-4 text-right">On Hand</th>
                  <th className="py-3 px-4 text-right">Allocated</th>
                  <th className="py-3 px-4 text-right font-extrabold text-emerald-400">Available</th>
                  <th className="py-3 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {(!variant.stockBalances || variant.stockBalances.length === 0) ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 italic">
                      No stock recorded in any warehouse
                    </td>
                  </tr>
                ) : (
                  variant.stockBalances.map((sb: any) => (
                    <tr key={sb.id} className="hover:bg-slate-850 transition">
                      <td className="py-3 px-4 font-sans">
                        <div className="font-bold text-white">{sb.warehouse?.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {sb.warehouse?.code} {sb.warehouse?.isMain && '• Main Store'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        {Number(sb.quantityOnHand).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right text-slate-400">
                        {Number(sb.quantityAllocated).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-extrabold text-emerald-400">
                        {Number(sb.quantityAvailable).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            setAdjWarehouseId(sb.warehouseId || sb.warehouse?.id);
                            setIsAdjustmentModalOpen(true);
                          }}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-white rounded text-[11px] font-sans font-semibold transition"
                        >
                          Adjust
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Active Batches & Expiry Dates */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
          <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <Layers className="w-5 h-5 text-indigo-400" />
              <h3 className="font-bold text-white text-base">Batches & Expiry Dates</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {batches.length} batches
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
                <tr>
                  <th className="py-3 px-4">Batch #</th>
                  <th className="py-3 px-4 text-right">Cost / Sell</th>
                  <th className="py-3 px-4 text-right">Qty</th>
                  <th className="py-3 px-4">Expiry</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {batches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-500 italic">
                      No active batches recorded for this item
                    </td>
                  </tr>
                ) : (
                  batches.map((b: any) => {
                    const now = new Date();
                    const daysLeft = b.expiryDate
                      ? Math.ceil((new Date(b.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                      : null;
                    const isExpired = daysLeft !== null && daysLeft <= 0;
                    const isNearExpiry = daysLeft !== null && daysLeft > 0 && daysLeft <= 30;

                    return (
                      <tr key={b.id} className="hover:bg-slate-850 transition">
                        <td className="py-3 px-4 font-bold text-blue-400">
                          #{b.batchNumber}
                          <div className="text-[10px] font-normal text-slate-400 font-sans">
                            {b.warehouse?.name}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-right text-[11px]">
                          <div className="text-slate-400">C: {Number(b.costPrice).toFixed(0)}</div>
                          <div className="text-emerald-400 font-bold">S: {Number(b.sellingPrice).toFixed(0)}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-white">
                          {Number(b.quantityOnHand).toFixed(2)}
                        </td>
                        <td className="py-3 px-4 font-sans">
                          {b.expiryDate ? (
                            <div>
                              <div className="font-mono text-slate-200">
                                {new Date(b.expiryDate).toISOString().slice(0, 10)}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {daysLeft !== null && daysLeft > 0 ? `${daysLeft}d left` : 'Expired'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic text-[11px]">No expiry</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {isExpired ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                              Expired
                            </span>
                          ) : isNearExpiry ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800">
                              Near Expiry
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                              Healthy
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
        </div>
      </div>

      {/* Movement Audit Ledger: Immutable Ledger History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <History className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-white text-base">Immutable Movement Audit Ledger</h3>
          </div>
          <span className="text-xs text-slate-400">
            Latest 25 transactions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
              <tr>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Movement Type</th>
                <th className="py-3 px-4">Warehouse</th>
                <th className="py-3 px-4 text-right">Quantity</th>
                <th className="py-3 px-4 text-right">Running Balance</th>
                <th className="py-3 px-4">Reference</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {recentMovements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                    No movement records logged for this item yet
                  </td>
                </tr>
              ) : (
                recentMovements.map((m: any) => {
                  const qty = Number(m.quantity || 0);
                  const isPositive = qty > 0;

                  return (
                    <tr key={m.id} className="hover:bg-slate-850 transition">
                      <td className="py-3 px-4 text-slate-400 font-sans text-[11px]">
                        {new Date(m.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-sans">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.movementType === 'GRN_RECEIPT'
                              ? 'bg-blue-950 text-blue-300 border border-blue-800'
                              : m.movementType === 'SALE_DEDUCTION'
                              ? 'bg-purple-950 text-purple-300 border border-purple-800'
                              : m.movementType === 'SALE_RETURN'
                              ? 'bg-teal-950 text-teal-300 border border-teal-800'
                              : m.movementType === 'INVENTORY_ADJUSTMENT'
                              ? isPositive
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-amber-950 text-amber-300 border border-amber-800'
                              : 'bg-slate-800 text-slate-300 border border-slate-700'
                          }`}
                        >
                          {m.movementType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-200">
                        {m.warehouse?.name || 'Warehouse'}
                      </td>
                      <td className={`py-3 px-4 text-right font-black ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isPositive ? `+${qty.toFixed(2)}` : qty.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-white">
                        {Number(m.runningBalance || 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-sans text-slate-400 text-[11px]">
                        {m.referenceType && (
                          <span className="font-semibold text-slate-300 mr-1">
                            [{m.referenceType}]
                          </span>
                        )}
                        {m.notes || m.batchNumber || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {isAdjustmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Adjust Stock</h3>
                <p className="text-xs text-slate-400">{product.name} ({variant.sku})</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAdjustmentModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAdjustment} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Warehouse Location
                </label>
                <select
                  value={adjWarehouseId}
                  onChange={(e) => setAdjWarehouseId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="">Select Warehouse...</option>
                  {(variant.stockBalances || []).map((sb: any) => (
                    <option key={sb.warehouse?.id || sb.id} value={sb.warehouse?.id || sb.warehouseId}>
                      {sb.warehouse?.name} (Current: {Number(sb.quantityOnHand).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Adjustment Direction
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType('POSITIVE')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      adjType === 'POSITIVE'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-900/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    + Add Stock (Overage)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('NEGATIVE')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition ${
                      adjType === 'NEGATIVE'
                        ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-900/30'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-850'
                    }`}
                  >
                    - Deduct Stock (Shortage)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Quantity ({product.unit || 'PCS'})
                </label>
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  value={adjQuantity}
                  onChange={(e) => setAdjQuantity(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white font-mono focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reason for Adjustment
                </label>
                <input
                  type="text"
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="e.g. Cycle count discrepancy, damaged shelf stock"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="pt-2 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAdjustmentModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdj}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-900/30 transition flex items-center space-x-1.5"
                >
                  {isSubmittingAdj ? (
                    <span>Applying...</span>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Apply Adjustment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
