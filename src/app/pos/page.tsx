'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Barcode,
  Trash2,
  Plus,
  Minus,
  Banknote,
  CheckCircle2,
  Printer,
  X,
  Download,
  ExternalLink,
  RotateCcw,
  Tag,
  Layers,
  Clock,
  AlertTriangle,
  PauseCircle,
  KeyRound,
  FileText,
  CreditCard,
} from 'lucide-react';
import { useAuthStore } from '../../lib/auth-store';
import { usePosCartStore, CartLineItem } from '../../lib/pos-cart-store';
import { posDb, CachedProduct, CachedVariant, CachedBatch, pullCatalogDelta, pushQueuedSync } from '../../lib/pos-db';
import { apiClient } from '../../lib/api-client';
import { TouchNumpad } from './components/TouchNumpad';
import { HeldCartsModal, getStoredHeldCarts } from './components/HeldCartsModal';
import { CashSessionModal, SessionModalView } from './components/CashSessionModal';
import { CategoryTabs, CategoryItem } from './components/CategoryTabs';
import { useHardwareStore } from '../../lib/hardware-store';
import { HardwareSettingsModal } from '../../components/HardwareSettingsModal';
import { CustomerReturnModal } from '../../components/CustomerReturnModal';

// Helper to determine if a unit is weight/length/volume (fractional)
function isDecimalUnit(unit?: string) {
  if (!unit) return false;
  const u = unit.toUpperCase().trim();
  return [
    'KG',
    'KGS',
    'KILOGRAM',
    'KILOGRAMS',
    'G',
    'GM',
    'GRAM',
    'GRAMS',
    'M',
    'MTR',
    'METER',
    'METERS',
    'METRE',
    'METRES',
    'L',
    'LTR',
    'LITER',
    'LITERS',
    'LITRE',
    'LITRES',
    'ML',
    'YARD',
    'YARDS',
    'FT',
    'FEET',
    'FOOT',
    'LB',
    'LBS',
    'POUND',
    'POUNDS',
    'OZ',
    'OUNCE',
  ].includes(u);
}

function CartQuantityControl({ item }: { item: CartLineItem }) {
  const cart = usePosCartStore();
  const [localQty, setLocalQty] = useState(String(item.quantity));
  const isDecimal = isDecimalUnit(item.product?.unit) || !Number.isInteger(item.quantity);

  useEffect(() => {
    setLocalQty(String(item.quantity));
  }, [item.quantity]);

  const commitQty = (valStr: string) => {
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed) && parsed > 0) {
      cart.updateQuantity(item.variant.id, parsed);
    } else if (parsed <= 0) {
      cart.removeItem(item.variant.id);
    } else {
      setLocalQty(String(item.quantity));
    }
  };

  const step = isDecimal ? 0.1 : 1;

  const handleStep = (delta: number) => {
    const current = parseFloat(localQty) || item.quantity;
    const next = Math.round((current + delta) * 1000) / 1000;
    if (next <= 0) {
      cart.removeItem(item.variant.id);
    } else {
      cart.updateQuantity(item.variant.id, next);
    }
  };

  return (
    <div className="flex flex-col space-y-1.5 flex-1 min-w-0 pr-2">
      <div className="flex items-center space-x-1.5 bg-slate-900 rounded-lg p-1 border border-slate-800 w-fit">
        <button
          type="button"
          onClick={() => handleStep(-step)}
          className="p-1 hover:bg-slate-800 text-slate-300 rounded transition"
          title={`Reduce by ${step} ${item.product?.unit || ''}`}
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center">
          <input
            type="text"
            inputMode="decimal"
            value={localQty}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const val = e.target.value;
              if (/^\d*\.?\d*$/.test(val)) {
                setLocalQty(val);
                const p = parseFloat(val);
                if (!isNaN(p) && p > 0) {
                  cart.updateQuantity(item.variant.id, p);
                }
              }
            }}
            onBlur={() => commitQty(localQty)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitQty(localQty);
                (e.target as HTMLElement).blur();
              }
            }}
            className="w-16 px-1.5 py-0.5 text-center text-xs font-bold bg-slate-950 border border-slate-800 rounded text-white focus:outline-none focus:border-emerald-500 font-mono"
            placeholder="0"
          />
          <span className="text-[10px] text-slate-400 uppercase font-semibold ml-1.5 min-w-[24px]">
            {item.product?.unit || 'PCS'}
          </span>
        </div>

        <button
          type="button"
          onClick={() => handleStep(step)}
          className="p-1 hover:bg-slate-800 text-slate-300 rounded transition"
          title={`Add ${step} ${item.product?.unit || ''}`}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Quick Decimal Chips for weighed/fractional items (e.g. 0.25, 0.5, 1.0, +0.1, +0.5) */}
      {isDecimal && (
        <div className="flex items-center flex-wrap gap-1 pt-0.5">
          <span className="text-[9px] text-slate-500 font-medium">Quick:</span>
          {[0.25, 0.5, 1.0].map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => cart.updateQuantity(item.variant.id, preset)}
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-750 transition"
              title={`Set quantity to ${preset} ${item.product?.unit || ''}`}
            >
              {preset}
            </button>
          ))}
          <button
            type="button"
            onClick={() => handleStep(0.1)}
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-750 transition"
            title="Add 0.1"
          >
            +0.1
          </button>
          <button
            type="button"
            onClick={() => handleStep(0.5)}
            className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-750 transition"
            title="Add 0.5"
          >
            +0.5
          </button>
        </div>
      )}
    </div>
  );
}

export default function PosTerminalPage() {
  const router = useRouter();
  const { isAuthenticated, branch, cashSessionId } = useAuthStore();
  const cart = usePosCartStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDrawerOpen = mounted && !!cashSessionId;

  const [products, setProducts] = useState<CachedProduct[]>([]);
  const [variants, setVariants] = useState<CachedVariant[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [cashTenderInput, setCashTenderInput] = useState('');
  const [cardTenderInput, setCardTenderInput] = useState('');
  const [cardRefInput, setCardRefInput] = useState('');
  const [isOnline, setIsOnline] = useState(true);
  const [syncFeedback, setSyncFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Customer Return & Exchange Voucher states
  const [isCustomerReturnModalOpen, setIsCustomerReturnModalOpen] = useState(false);
  const [voucherInput, setVoucherInput] = useState('');
  const [isVerifyingVoucher, setIsVerifyingVoucher] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [verifiedVoucher, setVerifiedVoucher] = useState<any | null>(null);

  // Bill Custom Discount Modal state
  const [isBillDiscountModalOpen, setIsBillDiscountModalOpen] = useState(false);
  const [billDiscountType, setBillDiscountType] = useState<'PERCENT' | 'FIXED'>('FIXED');
  const [billDiscountInput, setBillDiscountInput] = useState('');

  // Line Item Discount Modal state
  const [selectedItemForDiscount, setSelectedItemForDiscount] = useState<CartLineItem | null>(null);
  const [lineDiscountType, setLineDiscountType] = useState<'PERCENT' | 'FIXED'>('FIXED');
  const [lineDiscountInput, setLineDiscountInput] = useState('');

  // Batch Selection Modal state
  const [selectedVariantForBatch, setSelectedVariantForBatch] = useState<CachedVariant | null>(null);

  // Cash Session Modal state
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [sessionModalView, setSessionModalView] = useState<SessionModalView>('OPEN_SHIFT');
  const [activeSessionSummary, setActiveSessionSummary] = useState<{ id: string; expectedDrawerCash: number; openingFloat: number } | null>(null);

  // Held Carts Modal state
  const [isHeldCartsModalOpen, setIsHeldCartsModalOpen] = useState(false);
  const [heldCartsCount, setHeldCartsCount] = useState(0);

  // Hardware & Printer state
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState(false);
  const [hardwareFeedback, setHardwareFeedback] = useState<string | null>(null);

  // Categories Fast-Pick state
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // On-screen touch keypad toggle in payment modal
  const [showNumpad, setShowNumpad] = useState(true);

  const loadActiveSessionSummary = async (sessionId?: string) => {
    try {
      const idToFetch = sessionId || useAuthStore.getState().cashSessionId;
      if (idToFetch) {
        const sess = await apiClient<any>(`/pos/sessions/${idToFetch}`);
        if (sess && sess.id) {
          setActiveSessionSummary({
            id: sess.id,
            expectedDrawerCash: sess.expectedDrawerCash ?? sess.openingFloat ?? 0,
            openingFloat: sess.openingFloat ?? 0,
          });
        }
      } else {
        const active = await apiClient<any>('/pos/sessions/active');
        if (active && active.id) {
          useAuthStore.getState().setCashSession(active.id);
          setActiveSessionSummary({
            id: active.id,
            expectedDrawerCash: active.expectedDrawerCash ?? active.openingFloat ?? 0,
            openingFloat: active.openingFloat ?? 0,
          });
        } else {
          setActiveSessionSummary(null);
        }
      }
    } catch {
      // Offline or no active session
    }
  };

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Ensure branch is initialized if missing
  useEffect(() => {
    const ensureBranchAndTerminal = async () => {
      if (!useAuthStore.getState().branch?.id && isAuthenticated) {
        try {
          const branches = await apiClient<any[]>('/merchant/branches');
          if (branches && branches.length > 0) {
            useAuthStore.getState().setBranch(branches[0]);
          }
        } catch (e) {
          console.warn('Failed to auto-load branch for POS:', e);
        }
      }

      if (!useAuthStore.getState().posTerminalId && isAuthenticated) {
        try {
          const terminalsRes = await apiClient<any>('/pos/terminals');
          const termList = terminalsRes?.items || terminalsRes || [];
          if (termList && termList.length > 0) {
            useAuthStore.getState().setTerminal(termList[0].id);
          }
        } catch {
          // ignore
        }
      }
    };

    ensureBranchAndTerminal();
  }, [isAuthenticated]);

  // Function to perform full sync (push sales + pull catalog)
  const triggerFullSync = async () => {
    setSyncFeedback(null);
    try {
      const pushRes = await pushQueuedSync();
      await pullCatalogDelta();
      const prods = await posDb.products.toArray();
      const vars = await posDb.variants.toArray();
      setProducts(prods);
      setVariants(vars);

      if (pushRes.syncedSales > 0) {
        setSyncFeedback({
          text: `Successfully synchronized ${pushRes.syncedSales} offline sale(s)!`,
          type: 'success',
        });
      } else if (pushRes.failedSales > 0) {
        setSyncFeedback({
          text: `Sync incomplete: ${pushRes.errors[0] || 'Validation error'}`,
          type: 'error',
        });
      }
    } catch (e: any) {
      setSyncFeedback({
        text: `Sync error: ${e.message || 'Server unreachable'}`,
        type: 'error',
      });
    } finally {
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  // Online status listener & catalog preloader
  useEffect(() => {
    setIsOnline(navigator.onLine);
    const onOnline = () => {
      setIsOnline(true);
      triggerFullSync();
    };
    const onOffline = () => setIsOnline(false);

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Initial load from Dexie cache & background delta sync
    const loadCatalog = async () => {
      try {
        if (navigator.onLine) {
          await pullCatalogDelta();
        }
      } catch (e) {
        console.warn('Catalog delta pre-sync error:', e);
      }

      const prods = await posDb.products.toArray();
      const vars = await posDb.variants.toArray();
      setProducts(prods);
      setVariants(vars);
    };

    const loadCategories = async () => {
      try {
        const catsRes = await apiClient<any[]>('/catalog/categories');
        if (catsRes && Array.isArray(catsRes)) {
          setCategories(catsRes);
        }
      } catch {
        // Offline or categories empty
      }
    };

    loadCatalog();
    loadCategories();
    loadActiveSessionSummary();
    setHeldCartsCount(getStoredHeldCarts().length);

    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Filtered variants for POS Grid with Category Fast-Pick support
  const filteredVariants = useMemo(() => {
    let list = variants;
    if (selectedCategoryId) {
      list = list.filter((v) => {
        const prod = products.find((p) => p.id === v.productId);
        return (prod as any)?.categoryId === selectedCategoryId;
      });
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return list.slice(0, 40);

    return list.filter((v) => {
      const prod = products.find((p) => p.id === v.productId);
      const prodName = prod?.name.toLowerCase() || '';
      return (
        v.sku.toLowerCase().includes(q) ||
        v.variantName.toLowerCase().includes(q) ||
        prodName.includes(q) ||
        (v.barcode && v.barcode.toLowerCase().includes(q))
      );
    });
  }, [variants, products, searchQuery, selectedCategoryId]);

  // Handle direct barcode scanner enter or quantity prefix (e.g. "1.5*SKU" or "0.5*BARCODE")
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    let targetQuery = searchQuery.trim();
    let qty = 1;

    if (targetQuery.includes('*')) {
      const parts = targetQuery.split('*');
      const parsedQty = parseFloat(parts[0] || '1');
      if (!isNaN(parsedQty) && parsedQty > 0) {
        qty = parsedQty;
        targetQuery = parts.slice(1).join('*').trim();
      }
    }

    const match = variants.find(
      (v) =>
        (v.barcode && v.barcode.toLowerCase() === targetQuery.toLowerCase()) ||
        v.sku.toLowerCase() === targetQuery.toLowerCase(),
    );

    if (match) {
      const prod = products.find((p) => p.id === match.productId);
      if (prod) {
        cart.addItem(match, prod, qty);
        setSearchQuery('');
      }
    }
  };

  const handleProductClick = (variant: CachedVariant, chosenBatch?: CachedBatch) => {
    const batches = variant.batches || [];
    if (batches.length > 0 && !chosenBatch) {
      const now = new Date();
      const nonExpired = batches.filter((b) => !b.expiryDate || new Date(b.expiryDate) >= now);
      if (nonExpired.length === 0) {
        alert(`Cannot sell "${variant.sku}": All batches have expired!`);
        return;
      }
      // If multiple batches exist with differing selling prices, prompt cashier to pick
      const uniquePrices = new Set(nonExpired.map((b) => b.sellingPrice));
      if (nonExpired.length > 1 && uniquePrices.size > 1) {
        setSelectedVariantForBatch(variant);
        return;
      }
    }

    const prod = products.find((p) => p.id === variant.productId);
    if (prod) {
      cart.addItem(variant, prod, 1, chosenBatch);
    }
  };

  const grandTotal = cart.getGrandTotal();
  const totalPaid = cart.getTotalPaid();
  const balanceDue = cart.getBalanceDue();
  const changeGiven = cart.getChangeGiven();

  // Payment modal triggers
  const handleOpenPayment = () => {
    if (cart.items.length === 0) return;
    setCashTenderInput(grandTotal.toString());
    setIsPaymentModalOpen(true);
  };

  const handleAddCashTender = () => {
    const amt = parseFloat(cashTenderInput);
    if (!isNaN(amt) && amt > 0) {
      cart.addPayment({ tenderType: 'CASH', amount: amt });
      setCashTenderInput('');
    }
  };

  const handleAddCardTender = () => {
    const amt = parseFloat(cardTenderInput);
    if (!isNaN(amt) && amt > 0) {
      cart.addPayment({ tenderType: 'CARD', amount: amt, referenceNumber: cardRefInput });
      setCardTenderInput('');
      setCardRefInput('');
    }
  };

  const handleVerifyVoucher = async () => {
    if (!voucherInput.trim()) return;
    setIsVerifyingVoucher(true);
    setVoucherError(null);
    setVerifiedVoucher(null);
    try {
      const res = await apiClient<any>(
        `/pos/returns/vouchers/${encodeURIComponent(voucherInput.trim().toUpperCase())}`,
      );
      if (!res.isValid) {
        setVoucherError(res.error || 'Invalid or expired exchange voucher.');
      } else {
        setVerifiedVoucher(res);
      }
    } catch (err: any) {
      setVoucherError(err.message || 'Failed to verify voucher.');
    } finally {
      setIsVerifyingVoucher(false);
    }
  };

  const handleApplyVerifiedVoucher = () => {
    if (!verifiedVoucher) return;
    const applicable = Math.min(
      balanceDue > 0 ? balanceDue : grandTotal,
      Number(verifiedVoucher.balance || 0),
    );
    if (applicable <= 0) {
      alert('Order balance is already covered.');
      return;
    }
    cart.addPayment({
      tenderType: 'STORE_CREDIT',
      amount: applicable,
      referenceNumber: verifiedVoucher.voucherCode,
    });
    setVoucherInput('');
    setVerifiedVoucher(null);
  };

  const handleApplyVoucherDirectly = (voucherCode: string, creditAmount: number) => {
    const applicable = Math.min(
      balanceDue > 0 ? balanceDue : grandTotal,
      creditAmount,
    );
    cart.addPayment({
      tenderType: 'STORE_CREDIT',
      amount: applicable > 0 ? applicable : creditAmount,
      referenceNumber: voucherCode,
    });
  };

  const handleExecuteCheckout = async () => {
    if (totalPaid < grandTotal) return;

    let activeBranch = branch || useAuthStore.getState().branch;
    if (!activeBranch?.id) {
      try {
        const branches = await apiClient<any[]>('/merchant/branches');
        if (branches && branches.length > 0) {
          activeBranch = branches[0];
          useAuthStore.getState().setBranch(branches[0]);
        }
      } catch {
        // ignore
      }
    }

    if (!useAuthStore.getState().cashSessionId) {
      const confirmOpen = confirm(
        'Notice: No cash drawer shift session is currently active.\n\nWould you like to open a cash drawer shift now to track cash drawer reconciliation and Z-Reports?\n\nClick "OK" to open a shift, or "Cancel" to proceed without session tracking.'
      );
      if (confirmOpen) {
        setSessionModalView('OPEN_SHIFT');
        setIsSessionModalOpen(true);
        return;
      }
    }

    const res = await cart.processCheckout({
      branchId: activeBranch?.id || '',
      warehouseId: activeBranch?.defaultWarehouseId,
      posTerminalId: useAuthStore.getState().posTerminalId || undefined,
      cashSessionId: useAuthStore.getState().cashSessionId || undefined,
      isOnline,
    });

    if (res.success) {
      setIsPaymentModalOpen(false);
      setIsReceiptModalOpen(true);
      // Auto-kick physical cash drawer if cash was tendered and autoKickDrawer is enabled
      const hw = useHardwareStore.getState();
      const hasCashTender = cart.payments.some((p) => p.tenderType === 'CASH' || !p.tenderType);
      if (hw.autoKickDrawer && hasCashTender) {
        hw.kickCashDrawer();
      }
      // Reload session summary if cash sale occurred
      loadActiveSessionSummary();
    } else {
      alert(`Checkout failed: ${res.error}`);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden bg-slate-950">
      {/* LEFT PANE: CATALOG & PRODUCT BROWSER (65%) */}
      <div className="flex-1 flex flex-col border-r border-slate-800 lg:overflow-hidden">
        {/* POS REGISTER & SHIFT TOP STATUS BAR */}
        <div className="px-3 sm:px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs select-none">
          {/* Left: Terminal & Cash Drawer Status */}
          <div className="flex items-center space-x-3">
            {isDrawerOpen ? (
              <div className="flex items-center space-x-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="font-bold text-white">Drawer Open</span>
                {activeSessionSummary?.expectedDrawerCash !== undefined && (
                  <span className="text-emerald-400 font-mono font-bold">
                    (Rs {activeSessionSummary.expectedDrawerCash.toLocaleString()})
                  </span>
                )}
                <div className="flex items-center space-x-1 pl-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSessionModalView('DRAWER_TX');
                      setIsSessionModalOpen(true);
                    }}
                    className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded transition"
                  >
                    Cash In/Out
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSessionModalView('CLOSE_SHIFT');
                      setIsSessionModalOpen(true);
                    }}
                    className="px-2 py-0.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 font-medium rounded transition border border-rose-900/60"
                  >
                    Close Shift (Z-Report)
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-amber-400"></span>
                <span className="text-amber-400 font-semibold">Shift Closed</span>
                <button
                  type="button"
                  onClick={() => {
                    setSessionModalView('OPEN_SHIFT');
                    setIsSessionModalOpen(true);
                  }}
                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition shadow-sm flex items-center space-x-1"
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Open Shift</span>
                </button>
              </div>
            )}
          </div>

          {/* Right: Parked / Held Carts & Hardware Controls */}
          <div className="flex items-center space-x-2">
            {/* Direct Hardware Cash Drawer Pulse */}
            <button
              type="button"
              onClick={async () => {
                const res = await useHardwareStore.getState().kickCashDrawer();
                setHardwareFeedback(res.message);
                setTimeout(() => setHardwareFeedback(null), 3000);
              }}
              className="px-2.5 py-1 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-800/80 rounded-lg transition flex items-center space-x-1.5"
              title="Send electrical pulse to cash drawer RJ11 port"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Open Drawer</span>
            </button>

            {/* Thermal Printer Hardware Settings */}
            <button
              type="button"
              onClick={() => setIsHardwareModalOpen(true)}
              className="p-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-lg transition"
              title="Thermal Printer & Cash Drawer Hardware Configuration"
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
            </button>

            {/* Customer Return & Exchange Button */}
            <button
              type="button"
              onClick={() => setIsCustomerReturnModalOpen(true)}
              className="px-2.5 py-1 bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border border-amber-800/80 rounded-lg transition flex items-center space-x-1.5"
              title="Process Customer Returns & 24h Item-to-Item Exchanges"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Returns</span>
            </button>

            <button
              type="button"
              onClick={() => setIsHeldCartsModalOpen(true)}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition flex items-center space-x-1.5"
            >
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Held Carts</span>
              {heldCartsCount > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-slate-950 font-black rounded-full text-[10px]">
                  {heldCartsCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Hardware Status Toast Banner */}
        {hardwareFeedback && (
          <div className="px-4 py-1.5 bg-indigo-950 border-b border-indigo-800 text-indigo-300 text-[11px] font-semibold flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Printer className="w-3.5 h-3.5 text-indigo-400" />
              <span>{hardwareFeedback}</span>
            </div>
            <button onClick={() => setHardwareFeedback(null)} className="text-indigo-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Category Fast-Pick Tabs */}
        {categories.length > 0 && (
          <div className="px-4 pt-3 pb-1 bg-slate-900/90 border-b border-slate-800">
            <CategoryTabs
              categories={categories}
              selectedCategoryId={selectedCategoryId}
              onSelectCategory={setSelectedCategoryId}
              totalProductsCount={variants.length}
            />
          </div>
        )}

        {/* Search & Barcode Bar */}
        <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center space-x-3">
          <form onSubmit={handleBarcodeSubmit} className="flex-1 relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Barcode className="w-5 h-5 text-emerald-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Scan barcode or type SKU (e.g. '1.5*SKU' for weighted items)..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
              autoFocus
            />
          </form>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => router.push('/invoices?action=return')}
              title="Process Customer Sales Return"
              className="p-2.5 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-800 rounded-xl transition flex items-center space-x-1.5"
            >
              <RotateCcw className="w-4 h-4" />
              <span className="text-xs font-semibold hidden md:inline">Return Item</span>
            </button>
            <div className="text-xs text-slate-400 bg-slate-800 px-3 py-2.5 rounded-xl border border-slate-700 hidden sm:block whitespace-nowrap">
              {filteredVariants.length} Items Loaded
            </div>
          </div>
        </div>

        {/* Sync Feedback Toast Banner */}
        {syncFeedback && (
          <div
            className={`px-4 py-2 text-xs font-semibold flex items-center justify-between transition-all duration-200 ${
              syncFeedback.type === 'success'
                ? 'bg-emerald-950 text-emerald-300 border-b border-emerald-800'
                : 'bg-rose-950 text-rose-300 border-b border-rose-800'
            }`}
          >
            <span>{syncFeedback.text}</span>
            <button
              onClick={() => setSyncFeedback(null)}
              className="text-slate-400 hover:text-white ml-2 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Products Touch Grid */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
            {filteredVariants.map((v) => {
              const prod = products.find((p) => p.id === v.productId);
              const batches = v.batches || [];
              const now = new Date();
              const nonExpiredBatches = batches.filter((b) => !b.expiryDate || new Date(b.expiryDate) >= now);
              const allExpired = batches.length > 0 && nonExpiredBatches.length === 0;

              // Earliest batch for FEFO preview
              const fefoBatch = nonExpiredBatches[0];
              const displayPrice = fefoBatch ? Number(fefoBatch.sellingPrice) : Number(v.sellingPrice);
              const daysLeft = fefoBatch?.expiryDate
                ? Math.ceil((new Date(fefoBatch.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                : null;

              return (
                <div
                  key={v.id}
                  className={`bg-slate-900 border rounded-xl p-3 text-left transition flex flex-col justify-between group shadow-sm ${
                    allExpired
                      ? 'border-rose-900 opacity-65'
                      : 'border-slate-800 hover:border-emerald-500'
                  }`}
                >
                  <button
                    type="button"
                    disabled={allExpired}
                    onClick={() => handleProductClick(v)}
                    className="w-full text-left"
                  >
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider truncate">
                        {v.sku}
                      </span>
                      {v.discountPercentage && v.discountPercentage > 0 ? (
                        <span className="text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800 px-1 py-0.5 rounded">
                          {v.discountPercentage}% OFF
                        </span>
                      ) : v.discountAmount && v.discountAmount > 0 ? (
                        <span className="text-[9px] font-bold bg-amber-950 text-amber-300 border border-amber-800 px-1 py-0.5 rounded">
                          -LKR {v.discountAmount}
                        </span>
                      ) : null}
                    </div>

                    <div className="font-semibold text-slate-100 text-xs line-clamp-2 leading-snug group-hover:text-white">
                      {prod?.name || v.variantName}
                    </div>

                    {/* Batch & Expiry Tag */}
                    {allExpired ? (
                      <div className="mt-2 text-[9px] font-bold text-rose-400 flex items-center space-x-1 bg-rose-950 border border-rose-800 px-1.5 py-0.5 rounded">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span className="truncate">EXPIRED - DO NOT SELL</span>
                      </div>
                    ) : fefoBatch ? (
                      <div className="mt-2 flex items-center gap-1 flex-wrap">
                        <span className="text-[9px] font-medium bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                          FIFO: #{fefoBatch.batchNumber}
                        </span>
                        {daysLeft !== null && (
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded flex items-center space-x-0.5 ${
                              daysLeft <= 30
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}
                          >
                            <Clock className="w-2.5 h-2.5 inline mr-0.5" />
                            <span>{daysLeft <= 0 ? 'Exp today' : `${daysLeft}d left`}</span>
                          </span>
                        )}
                      </div>
                    ) : null}
                  </button>

                  <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-extrabold text-emerald-400">
                        LKR {displayPrice.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-slate-500 uppercase font-semibold ml-1">
                        / {prod?.unit || 'PCS'}
                      </span>
                    </div>

                    {nonExpiredBatches.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedVariantForBatch(v);
                        }}
                        className="text-[10px] bg-slate-800 hover:bg-slate-700 text-teal-300 px-2 py-1 rounded border border-slate-700 transition flex items-center space-x-1"
                        title="View and choose from multiple batches with different prices"
                      >
                        <Layers className="w-3 h-3" />
                        <span>{nonExpiredBatches.length} Batches</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* RIGHT PANE: CART & TOTALS (35%) */}
      <div className="w-full lg:w-[420px] bg-slate-900 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-800 shrink-0">
        {/* Cart Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-white text-base">Active Order Cart</h2>
            <div className="text-xs text-slate-400">
              {cart.items.length} line item(s) in basket
            </div>
          </div>
          {cart.items.length > 0 && (
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setIsHeldCartsModalOpen(true)}
                className="text-xs text-amber-400 hover:text-amber-300 flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-amber-950/60 border border-amber-800/80 transition"
                title="Hold or park this cart to serve next customer"
              >
                <PauseCircle className="w-3.5 h-3.5" />
                <span>Hold Cart</span>
              </button>
              <button
                onClick={() => cart.clearCart()}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center space-x-1 px-2 py-1 rounded hover:bg-slate-800 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear</span>
              </button>
            </div>
          )}
        </div>

        {/* Cart Line Items List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 py-12">
              <Barcode className="w-12 h-12 text-slate-700 mb-3" />
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs text-slate-600 mt-1 max-w-[200px]">
                Scan a barcode or tap products from the grid to add
              </p>
            </div>
          ) : (
            cart.items.map((item) => (
              <div
                key={item.variant.id + (item.batchId ? `-${item.batchId}` : '')}
                className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex flex-col space-y-2.5 transition shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="pr-2 min-w-0">
                    <div className="text-xs font-semibold text-white line-clamp-1">
                      {item.product.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      SKU: {item.variant.sku} • LKR {item.unitPrice.toFixed(2)} / {item.product.unit || 'unit'}
                    </div>

                    {/* Batch Number & Expiry Badge */}
                    {item.batchNumber && (
                      <div className="flex items-center space-x-1.5 mt-1 text-[9px] flex-wrap gap-y-1">
                        <span className="bg-slate-900 text-teal-300 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
                          Batch #{item.batchNumber}
                        </span>
                        {item.expiryDate && (
                          <span className="bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800">
                            Exp: {new Date(item.expiryDate).toISOString().slice(0, 10)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Line Discount Tag */}
                    {item.discountAmount > 0 && (
                      <div className="text-[10px] font-semibold text-amber-400 mt-1 flex items-center space-x-1">
                        <Tag className="w-3 h-3 text-amber-400" />
                        <span>Discount: -LKR {item.discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold text-emerald-400 font-mono">
                      LKR {item.lineTotal.toFixed(2)}
                    </div>
                    {item.discountAmount > 0 && (
                      <div className="text-[10px] text-slate-500 line-through font-mono">
                        LKR {(item.unitPrice * item.quantity).toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Decimal Quantity Controls & Line Discount / Remove Actions */}
                <div className="flex items-center justify-between pt-1">
                  <CartQuantityControl item={item} />

                  <div className="flex items-center space-x-1 shrink-0 self-start mt-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedItemForDiscount(item);
                        setLineDiscountInput(item.discountAmount > 0 ? String(item.discountAmount) : '');
                        setLineDiscountType('FIXED');
                      }}
                      className="text-slate-400 hover:text-amber-300 p-1 rounded-lg hover:bg-slate-800 transition text-[10px] flex items-center space-x-1 border border-slate-800 px-2"
                      title="Set custom line discount"
                    >
                      <Tag className="w-3 h-3 text-amber-400" />
                      <span>{item.discountAmount > 0 ? 'Edit Disc' : 'Disc'}</span>
                    </button>

                    <button
                      onClick={() => cart.removeItem(item.variant.id)}
                      className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-950 transition"
                      title="Remove item from basket"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pricing Summary & Checkout Button */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          <div className="space-y-1.5 text-xs text-slate-400">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-semibold text-white">LKR {cart.getSubtotal().toFixed(2)}</span>
            </div>

            {/* Total Line Discounts */}
            {cart.items.reduce((sum, i) => sum + i.discountAmount, 0) > 0 && (
              <div className="flex justify-between text-amber-400">
                <span>Item Line Discounts:</span>
                <span>
                  - LKR {cart.items.reduce((sum, i) => sum + i.discountAmount, 0).toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex justify-between">
              <span>Taxes (VAT/NBT):</span>
              <span className="font-semibold text-white">LKR {cart.getTaxTotal().toFixed(2)}</span>
            </div>

            {/* Custom Bill Discount */}
            <div className="flex justify-between items-center py-0.5">
              <span className="flex items-center space-x-1.5 text-amber-300">
                <Tag className="w-3 h-3" />
                <span>Bill Custom Discount:</span>
              </span>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-amber-300">
                  {cart.cartDiscountAmount > 0
                    ? `- LKR ${cart.cartDiscountAmount.toFixed(2)}`
                    : 'LKR 0.00'}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBillDiscountInput(cart.cartDiscountAmount > 0 ? String(cart.cartDiscountAmount) : '');
                    setBillDiscountType('FIXED');
                    setIsBillDiscountModalOpen(true);
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800 hover:bg-amber-900 transition"
                >
                  {cart.cartDiscountAmount > 0 ? 'Edit' : '+ Add'}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline">
            <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Total Due</span>
            <span className="text-2xl font-black text-emerald-400 tracking-tight">
              LKR {grandTotal.toFixed(2)}
            </span>
          </div>

          <button
            onClick={handleOpenPayment}
            disabled={cart.items.length === 0}
            className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition text-sm"
          >
            <Banknote className="w-5 h-5" />
            <span>Pay LKR {grandTotal.toFixed(2)}</span>
          </button>
        </div>
      </div>

      {/* PAYMENT MODAL */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden my-auto">
            {/* Modal Header */}
            <div className="flex justify-between items-center px-5 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Banknote className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base sm:text-lg text-white">Tender Payment</h3>
                  <p className="text-[11px] text-slate-400">Allocate payment tenders to finalize transaction</p>
                </div>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: 2-column layout in desktop view */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 items-start">
                {/* LEFT COLUMN: Cash Tender Input & Touchscreen Keypad (Untill the Number Pad) */}
                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      <Banknote className="w-4 h-4 text-emerald-400" />
                      <label className="text-xs font-bold text-white uppercase tracking-wider">Cash Tender (LKR)</label>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowNumpad(!showNumpad)}
                      className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold transition"
                    >
                      {showNumpad ? 'Hide Keypad' : 'Show Keypad'}
                    </button>
                  </div>

                  {/* Cash Amount Input & Add Cash Button */}
                  <div className="flex space-x-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                        LKR
                      </span>
                      <input
                        type="number"
                        value={cashTenderInput}
                        onChange={(e) => setCashTenderInput(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-3 py-2.5 text-white text-base font-bold font-mono focus:border-emerald-500 focus:outline-none"
                        placeholder="0.00"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCashTender}
                      className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow flex items-center space-x-1 shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Cash</span>
                    </button>
                  </div>

                  {/* Touchscreen On-Screen Numpad */}
                  {showNumpad && (
                    <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl">
                      <TouchNumpad
                        value={cashTenderInput}
                        onChange={setCashTenderInput}
                        onEnter={handleAddCashTender}
                        exactAmount={balanceDue > 0 ? balanceDue : grandTotal}
                        quickAmounts={[100, 500, 1000, 2000, 5000]}
                      />
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Financial Summary, Card Tender, Allocated Tenders & Submit Button */}
                <div className="space-y-4">
                  {/* Financial Summary Card */}
                  <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Grand Total</div>
                      <div className="text-base sm:text-lg font-black text-white font-mono">
                        LKR {grandTotal.toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Total Paid</div>
                      <div className="text-base sm:text-lg font-black text-emerald-400 font-mono">
                        LKR {totalPaid.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400 uppercase font-semibold">Balance Due</div>
                      <div
                        className={`text-base sm:text-lg font-black font-mono ${
                          balanceDue > 0 ? 'text-amber-400' : 'text-emerald-400'
                        }`}
                      >
                        LKR {balanceDue.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Card Tender Input */}
                  <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <CreditCard className="w-4 h-4 text-sky-400" />
                        <label className="text-xs font-bold text-white uppercase tracking-wider">
                          Card Payment (LKR)
                        </label>
                      </div>
                      {balanceDue > 0 && (
                        <button
                          type="button"
                          onClick={() => setCardTenderInput(balanceDue.toFixed(2))}
                          className="text-[10px] text-sky-400 hover:text-sky-300 font-semibold transition"
                        >
                          Exact Due ({balanceDue.toFixed(2)})
                        </button>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <div className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-500">
                          LKR
                        </span>
                        <input
                          type="number"
                          value={cardTenderInput}
                          onChange={(e) => setCardTenderInput(e.target.value)}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-11 pr-3 py-2 text-white text-sm font-mono focus:border-sky-500 focus:outline-none"
                          placeholder="Card Amount"
                        />
                      </div>
                      <input
                        type="text"
                        value={cardRefInput}
                        onChange={(e) => setCardRefInput(e.target.value)}
                        className="w-28 sm:w-32 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                        placeholder="Slip / Ref #"
                      />
                      <button
                        type="button"
                        onClick={handleAddCardTender}
                        className="bg-sky-600 hover:bg-sky-500 active:bg-sky-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center space-x-1 shrink-0"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>
                  </div>

                  {/* 24-Hour Exchange Voucher / Item-to-Item Credit Redemption */}
                  <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5">
                        <Tag className="w-4 h-4 text-amber-400" />
                        <label className="text-xs font-bold text-white uppercase tracking-wider">
                          Redeem 24h Exchange Voucher
                        </label>
                      </div>
                      <span className="text-[10px] text-amber-400 font-semibold">Item-to-Item</span>
                    </div>

                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={voucherInput}
                        onChange={(e) => {
                          setVoucherInput(e.target.value.toUpperCase());
                          setVoucherError(null);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleVerifyVoucher();
                          }
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs font-mono tracking-wider placeholder:text-slate-500 focus:border-amber-500 focus:outline-none"
                        placeholder="Scan / Enter EXC-B01-XXXXXX"
                      />
                      <button
                        type="button"
                        onClick={handleVerifyVoucher}
                        disabled={isVerifyingVoucher || !voucherInput.trim()}
                        className="bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:opacity-40 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center space-x-1 shrink-0"
                      >
                        <Tag className="w-3.5 h-3.5" />
                        <span>{isVerifyingVoucher ? 'Checking...' : 'Verify'}</span>
                      </button>
                    </div>

                    {voucherError && (
                      <div className="p-2 bg-rose-950/60 border border-rose-800 rounded-lg text-[11px] text-rose-300 flex items-center space-x-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{voucherError}</span>
                      </div>
                    )}

                    {verifiedVoucher && (
                      <div className="p-2.5 bg-amber-950/40 border border-amber-800/80 rounded-xl space-y-1.5 animate-in fade-in">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-amber-300 flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Valid Exchange Credit Note</span>
                          </span>
                          <span className="text-[10px] text-amber-400 font-mono">
                            Expires in {verifiedVoucher.hoursRemaining}h {verifiedVoucher.minutesRemaining}m
                          </span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-400">Available Credit Balance:</span>
                          <span className="font-black text-white font-mono">
                            LKR {Number(verifiedVoucher.balance || 0).toFixed(2)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleApplyVerifiedVoucher}
                          className="w-full bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold py-1.5 rounded-lg transition shadow flex items-center justify-center space-x-1"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>
                            Deduct LKR {Math.min(balanceDue > 0 ? balanceDue : grandTotal, Number(verifiedVoucher.balance || 0)).toFixed(2)} from Bill
                          </span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Current Tenders List */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-400">Allocated Payments ({cart.payments.length})</span>
                      {cart.payments.length > 0 && (
                        <span className="text-[10px] text-slate-500">Click &times; to remove</span>
                      )}
                    </div>
                    {cart.payments.length === 0 ? (
                      <div className="p-3 bg-slate-950/40 border border-dashed border-slate-800 rounded-xl text-center text-xs text-slate-500">
                        No payments allocated yet. Add cash, card, or exchange voucher to continue.
                      </div>
                    ) : (
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {cart.payments.map((p, idx) => (
                          <div
                            key={idx}
                            className="flex justify-between items-center text-xs bg-slate-950 px-3 py-2 rounded-lg border border-slate-800"
                          >
                            <div className="flex items-center space-x-2">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  p.tenderType === 'CARD'
                                    ? 'bg-sky-950 text-sky-300 border border-sky-800'
                                    : p.tenderType === 'STORE_CREDIT'
                                    ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                    : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                }`}
                              >
                                {p.tenderType === 'STORE_CREDIT' ? 'EXCHANGE VOUCHER' : p.tenderType}
                              </span>
                              {p.referenceNumber && (
                                <span className="text-slate-400 text-[11px] font-mono">Ref: {p.referenceNumber}</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white font-mono">
                                LKR {Number(p.amount || 0).toFixed(2)}
                              </span>
                              <button
                                onClick={() => cart.removePayment(idx)}
                                className="text-slate-500 hover:text-rose-400 p-0.5 rounded transition"
                                title="Remove Tender"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Change Due Banner */}
                  {changeGiven > 0 && (
                    <div className="bg-emerald-950/80 border border-emerald-700/70 p-3 rounded-xl flex justify-between items-center text-emerald-300 animate-in fade-in">
                      <div>
                        <div className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">
                          Change to Customer
                        </div>
                        <div className="text-[11px] text-emerald-300/80">Return cash change from drawer</div>
                      </div>
                      <span className="text-xl font-black font-mono">LKR {changeGiven.toFixed(2)}</span>
                    </div>
                  )}

                  {/* Submit Checkout Button */}
                  <button
                    onClick={handleExecuteCheckout}
                    disabled={totalPaid < grandTotal || cart.isProcessing}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition shadow-lg shadow-emerald-950/50 text-sm"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    <span>
                      {cart.isProcessing
                        ? 'Finalizing Sale...'
                        : totalPaid >= grandTotal
                        ? 'Complete & Issue Receipt'
                        : `Pay Remaining (LKR ${balanceDue.toFixed(2)})`}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* BILL CUSTOM DISCOUNT MODAL */}
      {isBillDiscountModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-base text-white">Custom Bill Discount</h3>
              </div>
              <button
                onClick={() => setIsBillDiscountModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Order Subtotal:</span>
              <span className="font-bold text-white text-sm">LKR {cart.getSubtotal().toFixed(2)}</span>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setBillDiscountType('FIXED')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  billDiscountType === 'FIXED'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Fixed Amount (LKR)
              </button>
              <button
                type="button"
                onClick={() => setBillDiscountType('PERCENT')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  billDiscountType === 'PERCENT'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Percentage (%)
              </button>
            </div>

            {/* Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {billDiscountType === 'FIXED' ? 'Discount Amount (LKR)' : 'Discount Rate (%)'}
              </label>
              <input
                type="number"
                min="0"
                step={billDiscountType === 'FIXED' ? '1' : '0.5'}
                value={billDiscountInput}
                onChange={(e) => setBillDiscountInput(e.target.value)}
                placeholder={billDiscountType === 'FIXED' ? 'e.g. 250' : 'e.g. 10'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-base font-semibold focus:outline-none focus:border-amber-500"
                autoFocus
              />
            </div>

            {/* Quick Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Quick:</span>
              {(billDiscountType === 'FIXED'
                ? [50, 100, 250, 500, 1000]
                : [5, 10, 15, 20, 25]
              ).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setBillDiscountInput(String(chip))}
                  className="bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 transition"
                >
                  {billDiscountType === 'FIXED' ? `LKR ${chip}` : `${chip}%`}
                </button>
              ))}
            </div>

            {/* Live Preview */}
            {(() => {
              const val = parseFloat(billDiscountInput) || 0;
              const sub = cart.getSubtotal();
              const discountAmt =
                billDiscountType === 'FIXED'
                  ? Math.min(sub, val)
                  : Math.min(sub, Math.round(sub * (val / 100) * 100) / 100);
              const previewGrand = Math.max(0, sub - discountAmt + cart.getTaxTotal());

              return (
                <div className="p-3 bg-amber-950 border border-amber-800 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between text-amber-300">
                    <span>Applied Discount:</span>
                    <span className="font-bold">- LKR {discountAmt.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white font-semibold">
                    <span>Estimated Total Due:</span>
                    <span className="text-emerald-400 font-bold">LKR {previewGrand.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(billDiscountInput) || 0;
                  const sub = cart.getSubtotal();
                  const discountAmt =
                    billDiscountType === 'FIXED'
                      ? Math.min(sub, val)
                      : Math.min(sub, Math.round(sub * (val / 100) * 100) / 100);
                  cart.setCartDiscount(discountAmt);
                  setIsBillDiscountModalOpen(false);
                }}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl transition text-xs"
              >
                Apply Bill Discount
              </button>
              {cart.cartDiscountAmount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    cart.setCartDiscount(0);
                    setIsBillDiscountModalOpen(false);
                  }}
                  className="bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-rose-300 font-semibold py-2.5 px-3 rounded-xl transition text-xs border border-slate-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* LINE ITEM DISCOUNT MODAL */}
      {selectedItemForDiscount && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Tag className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-bold text-sm text-white">Line Item Discount</h3>
                  <p className="text-[10px] text-slate-400 truncate max-w-[280px]">
                    {selectedItemForDiscount.product.name} ({selectedItemForDiscount.variant.sku})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedItemForDiscount(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">
                Gross Line ({selectedItemForDiscount.quantity} x LKR {selectedItemForDiscount.unitPrice.toFixed(2)}):
              </span>
              <span className="font-bold text-white text-sm">
                LKR {(selectedItemForDiscount.unitPrice * selectedItemForDiscount.quantity).toFixed(2)}
              </span>
            </div>

            {/* Mode Switcher */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setLineDiscountType('FIXED')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  lineDiscountType === 'FIXED'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Fixed Amount (LKR)
              </button>
              <button
                type="button"
                onClick={() => setLineDiscountType('PERCENT')}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  lineDiscountType === 'PERCENT'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Percentage (%)
              </button>
            </div>

            {/* Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">
                {lineDiscountType === 'FIXED' ? 'Discount Amount (LKR)' : 'Discount Rate (%)'}
              </label>
              <input
                type="number"
                min="0"
                step={lineDiscountType === 'FIXED' ? '1' : '0.5'}
                value={lineDiscountInput}
                onChange={(e) => setLineDiscountInput(e.target.value)}
                placeholder={lineDiscountType === 'FIXED' ? 'e.g. 50' : 'e.g. 10'}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-white text-base font-semibold focus:outline-none focus:border-amber-500"
                autoFocus
              />
            </div>

            {/* Quick Chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] text-slate-400 uppercase font-semibold">Quick:</span>
              {(lineDiscountType === 'FIXED'
                ? [20, 50, 100, 200, 500]
                : [5, 10, 15, 20, 25]
              ).map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => setLineDiscountInput(String(chip))}
                  className="bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold px-2.5 py-1 rounded-lg border border-slate-700 transition"
                >
                  {lineDiscountType === 'FIXED' ? `LKR ${chip}` : `${chip}%`}
                </button>
              ))}
            </div>

            {/* Live Preview */}
            {(() => {
              const val = parseFloat(lineDiscountInput) || 0;
              const gross = selectedItemForDiscount.unitPrice * selectedItemForDiscount.quantity;
              const disc =
                lineDiscountType === 'FIXED'
                  ? Math.min(gross, val)
                  : Math.min(gross, Math.round(gross * (val / 100) * 100) / 100);
              const net = Math.max(0, gross - disc);

              return (
                <div className="p-3 bg-amber-950 border border-amber-800 rounded-xl space-y-1 text-xs">
                  <div className="flex justify-between text-amber-300">
                    <span>Discount:</span>
                    <span className="font-bold">- LKR {disc.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-white font-semibold">
                    <span>Net Item Line:</span>
                    <span className="text-emerald-400 font-bold">LKR {net.toFixed(2)}</span>
                  </div>
                </div>
              );
            })()}

            {/* Actions */}
            <div className="flex items-center space-x-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  const val = parseFloat(lineDiscountInput) || 0;
                  const gross = selectedItemForDiscount.unitPrice * selectedItemForDiscount.quantity;
                  const disc =
                    lineDiscountType === 'FIXED'
                      ? Math.min(gross, val)
                      : Math.min(gross, Math.round(gross * (val / 100) * 100) / 100);
                  cart.setLineDiscount(selectedItemForDiscount.variant.id, disc);
                  setSelectedItemForDiscount(null);
                }}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 rounded-xl transition text-xs"
              >
                Apply Item Discount
              </button>
              {selectedItemForDiscount.discountAmount > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    cart.setLineDiscount(selectedItemForDiscount.variant.id, 0);
                    setSelectedItemForDiscount(null);
                  }}
                  className="bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-rose-300 font-semibold py-2.5 px-3 rounded-xl transition text-xs border border-slate-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* BATCH SELECTOR MODAL */}
      {selectedVariantForBatch && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Layers className="w-5 h-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-base text-white">Select Product Batch</h3>
                  <p className="text-xs text-slate-400">
                    {selectedVariantForBatch.variantName} ({selectedVariantForBatch.sku})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedVariantForBatch(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Prices and expiry dates can differ across batches. Choose an explicit batch below, or let the system sell the oldest batch (FIFO).
            </p>

            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {(() => {
                const now = new Date();
                const nonExpired = (selectedVariantForBatch.batches || []).filter(
                  (b) => !b.expiryDate || new Date(b.expiryDate) >= now,
                );

                return nonExpired.map((batch, idx) => {
                  const daysLeft = batch.expiryDate
                    ? Math.ceil((new Date(batch.expiryDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                    : null;

                  return (
                    <div
                      key={batch.id}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex items-center justify-between hover:border-teal-500 transition"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-white text-xs font-mono">
                            Batch #{batch.batchNumber}
                          </span>
                          {idx === 0 && (
                            <span className="text-[9px] font-bold bg-teal-950 text-teal-300 border border-teal-800 px-1.5 py-0.5 rounded">
                              FIFO Oldest
                            </span>
                          )}
                          {daysLeft !== null && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                daysLeft <= 30
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              }`}
                            >
                              {daysLeft <= 0 ? 'Exp today' : `${daysLeft}d left`}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          Stock On Hand: <span className="font-semibold text-white">{batch.quantityOnHand}</span>
                          {batch.expiryDate && ` • Exp: ${new Date(batch.expiryDate).toISOString().slice(0, 10)}`}
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <div className="text-right">
                          <div className="text-xs text-slate-500">Batch Price</div>
                          <div className="text-sm font-black text-emerald-400 font-mono">
                            LKR {Number(batch.sellingPrice).toFixed(2)}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const prod = products.find((p) => p.id === selectedVariantForBatch.productId);
                            if (prod) {
                              cart.addItem(selectedVariantForBatch, prod, 1, batch);
                            }
                            setSelectedVariantForBatch(null);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-3 py-2 rounded-xl transition shadow"
                        >
                          Select
                        </button>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const prod = products.find((p) => p.id === selectedVariantForBatch.productId);
                  if (prod) {
                    cart.addItem(selectedVariantForBatch, prod, 1);
                  }
                  setSelectedVariantForBatch(null);
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-2.5 rounded-xl transition text-xs border border-slate-700"
              >
                Use FIFO Default (Auto-allocate Oldest Batch)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      {isReceiptModalOpen && cart.lastCompletedSale && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl w-full max-w-sm p-4 sm:p-5 space-y-4 shadow-2xl font-mono text-xs my-auto print:p-0 print:m-0 print:border-none print:shadow-none print:rounded-none">
            {/* DEDICATED PRINTABLE RECEIPT (ONLY THIS PRINTS) */}
            <div
              id="printable-receipt"
              className="printable-receipt-area bg-white text-slate-950 p-2 sm:p-3 font-mono text-xs space-y-2.5"
            >
              <div className="text-center space-y-1 border-b border-dashed border-slate-400 pb-3">
                <h4 className="font-black text-sm tracking-tight text-slate-950 uppercase">
                  {branch?.name || 'Retail Cloud POS'}
                </h4>
                <p className="text-[10px] text-slate-600">Official Sales Receipt</p>
                <p className="text-[10px] font-bold text-slate-800">
                  Invoice: {cart.lastCompletedSale.invoiceNumber}
                </p>
                <p className="text-[9px] text-slate-500">
                  {new Date().toLocaleString()}
                </p>
              </div>

              <div className="space-y-1.5 py-2 border-b border-dashed border-slate-400">
                {cart.lastCompletedSale.items.map((i: any, idx: number) => {
                  const qtyNum = Number(i.quantity || 0);
                  const qtyFormatted = qtyNum.toLocaleString('en-US', {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 3,
                  });
                  const unit = i.variant?.product?.unit ? ` ${i.variant.product.unit}` : '';
                  return (
                    <div key={idx} className="space-y-0.5">
                      <div className="flex justify-between items-start gap-2">
                        <span className="truncate text-slate-900 font-semibold">
                          {qtyFormatted}{unit} x {i.variant?.product?.name || i.variant?.sku}
                        </span>
                        <span className="shrink-0 font-bold font-mono text-slate-950">
                          LKR {Number(i.lineTotal).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>
                          {i.batchNumber ? `Batch: #${i.batchNumber}` : ''}
                          {i.expiryDate ? ` (Exp: ${new Date(i.expiryDate).toISOString().slice(0, 10)})` : ''}
                        </span>
                        {Number(i.discountAmount || 0) > 0 && (
                          <span className="text-amber-800 font-bold">Disc: -LKR {Number(i.discountAmount).toFixed(2)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-1 text-right border-b border-dashed border-slate-400 pb-2">
                {Number(cart.lastCompletedSale.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-amber-800 font-semibold">
                    <span>Total Discount Savings:</span>
                    <span>- LKR {Number(cart.lastCompletedSale.discountAmount).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-sm text-slate-950 pt-1">
                  <span>TOTAL DUE:</span>
                  <span>LKR {Number(cart.lastCompletedSale.totalAmount).toFixed(2)}</span>
                </div>
                {Number(cart.lastCompletedSale.changeGiven) > 0 && (
                  <div className="flex justify-between font-bold text-slate-700">
                    <span>Change Given:</span>
                    <span>LKR {Number(cart.lastCompletedSale.changeGiven).toFixed(2)}</span>
                  </div>
                )}
              </div>

              <div className="text-center text-[10px] text-slate-600 space-y-0.5 pt-1">
                <p>Thank you for shopping with us!</p>
                <p>Exchange within 7 days with receipt.</p>
                <p className="font-mono text-[9px] pt-1">*** {cart.lastCompletedSale.invoiceNumber} ***</p>
              </div>
            </div>

            {/* ACTION BUTTONS (STRICTLY HIDDEN ON PRINT) */}
            <div className="print:hidden pt-2 border-t border-slate-200 flex flex-col space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await useHardwareStore.getState().printSaleReceipt(cart.lastCompletedSale, branch);
                    setHardwareFeedback(res.message);
                    setTimeout(() => setHardwareFeedback(null), 3000);
                  }}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 text-xs shadow-md transition"
                  title="Direct raw ESC/POS binary print to thermal printer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print ESC/POS</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 text-xs shadow-md transition"
                  title="Open browser print dialog for thermal receipt"
                >
                  <FileText className="w-4 h-4" />
                  <span>Browser Print</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    const res = await useHardwareStore.getState().kickCashDrawer();
                    setHardwareFeedback(res.message);
                    setTimeout(() => setHardwareFeedback(null), 3000);
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 text-xs shadow-md transition"
                  title="Send electrical pulse to kick cash drawer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Kick Drawer</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const sale = cart.lastCompletedSale;
                    let txt = `RETAIL CLOUD POS\n${branch?.name || ''}\n`;
                    txt += `Invoice #: ${sale.invoiceNumber}\n`;
                    txt += `Date: ${new Date().toLocaleString()}\n`;
                    txt += `--------------------------------\n`;
                    (sale.items || []).forEach((i: any) => {
                      const qtyNum = Number(i.quantity || 0);
                      const qtyFormatted = qtyNum.toLocaleString('en-US', {
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 3,
                      });
                      const unit = i.variant?.product?.unit ? ` ${i.variant.product.unit}` : '';
                      txt += `${qtyFormatted}${unit} x ${i.variant?.product?.name || i.variant?.sku} - LKR ${Number(i.lineTotal).toFixed(2)}\n`;
                    });
                    txt += `--------------------------------\n`;
                    txt += `TOTAL DUE: LKR ${Number(sale.totalAmount).toFixed(2)}\n`;
                    const blob = new Blob([txt], { type: 'text/plain' });
                    const a = document.createElement('a');
                    a.href = URL.createObjectURL(blob);
                    a.download = `Receipt-${sale.invoiceNumber}.txt`;
                    a.click();
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2 px-3 rounded-xl flex items-center justify-center space-x-1.5 text-xs transition border border-slate-300"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>

              <div className="flex space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => router.push('/invoices')}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-1.5 rounded-xl flex items-center justify-center space-x-1 text-[11px]"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>View Invoices</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsReceiptModalOpen(false)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold py-1.5 rounded-xl text-[11px]"
                >
                  Done (Next Sale)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CASH DRAWER SHIFT MODAL */}
      <CashSessionModal
        isOpen={isSessionModalOpen}
        onClose={() => setIsSessionModalOpen(false)}
        initialView={sessionModalView}
        onSessionUpdated={(sessionId) => {
          if (sessionId) {
            loadActiveSessionSummary(sessionId);
          } else {
            setActiveSessionSummary(null);
          }
        }}
      />

      {/* HELD CARTS MODAL */}
      <HeldCartsModal
        isOpen={isHeldCartsModalOpen}
        onClose={() => {
          setIsHeldCartsModalOpen(false);
          setHeldCartsCount(getStoredHeldCarts().length);
        }}
        onCartResumed={() => {
          setHeldCartsCount(getStoredHeldCarts().length);
        }}
      />

      {/* HARDWARE PRINTER & CASH DRAWER SETTINGS MODAL */}
      <HardwareSettingsModal
        isOpen={isHardwareModalOpen}
        onClose={() => setIsHardwareModalOpen(false)}
      />

      {/* CUSTOMER RETURN & 24H EXCHANGE VOUCHER MODAL */}
      <CustomerReturnModal
        isOpen={isCustomerReturnModalOpen}
        onClose={() => setIsCustomerReturnModalOpen(false)}
        onApplyVoucherToCart={handleApplyVoucherDirectly}
      />
    </div>
  );
}
