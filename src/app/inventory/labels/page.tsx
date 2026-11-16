'use client';

import React, { useEffect, useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Printer,
  Barcode,
  Tag,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Settings2,
  Sliders,
  Check,
  Package,
  Layers,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../../lib/api-client';
import { useAuthStore } from '../../../lib/auth-store';
import { BarcodeSvg } from '../../../components/BarcodeSvg';

interface PrintItem {
  variantId: string;
  sku: string;
  barcode: string;
  productName: string;
  variantName?: string;
  price: number;
  cost?: number;
  unit: string;
  category?: string;
  labelCount: number;
}

type LabelTemplate = 'SHELF_TAG' | 'PRODUCT_STICKER' | 'A4_SHEET_24' | 'COMPACT_TAG';

function BarcodeLabelGeneratorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialVariantId = searchParams.get('variantId');
  const { isAuthenticated, user } = useAuthStore();

  // Print Queue
  const [printItems, setPrintItems] = useState<PrintItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Search & Catalog picker
  const [searchQuery, setSearchQuery] = useState('');
  const [catalogSearchResults, setCatalogSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Label Design Settings
  const [template, setTemplate] = useState<LabelTemplate>('SHELF_TAG');
  const [storeName, setStoreName] = useState(user?.merchantId ? 'RETAIL STORE' : 'RETAIL POS');
  const [showStoreName, setShowStoreName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);
  const [showBarcode, setShowBarcode] = useState(true);
  const [showSku, setShowSku] = useState(true);
  const [showUnit, setShowUnit] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState('LKR');
  const [promoText, setPromoText] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (initialVariantId) {
      loadInitialVariant(initialVariantId);
    } else {
      loadSampleCatalog();
    }
  }, [isAuthenticated, initialVariantId]);

  const loadInitialVariant = async (vid: string) => {
    try {
      setIsLoading(true);
      const res = await apiClient<any>(`/inventory/items/${vid}`);
      if (res?.variant) {
        const v = res.variant;
        setPrintItems([
          {
            variantId: v.id,
            sku: v.sku,
            barcode: v.barcode || v.sku,
            productName: v.product?.name || v.variantName || 'Item',
            variantName: v.variantName,
            price: Number(v.sellingPrice || 0),
            cost: Number(v.costPrice || 0),
            unit: v.product?.unit || 'PCS',
            category: v.product?.category?.name,
            labelCount: 12,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load initial variant for barcode generator', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSampleCatalog = async () => {
    try {
      setIsLoading(true);
      const res = await apiClient<any>('/catalog/products?limit=8');
      const items: PrintItem[] = [];
      const products = res?.items || res?.products || [];

      for (const p of products) {
        if (p.variants && p.variants.length > 0) {
          const v = p.variants[0];
          items.push({
            variantId: v.id,
            sku: v.sku,
            barcode: v.barcode || v.sku,
            productName: p.name,
            variantName: v.variantName,
            price: Number(v.sellingPrice || 0),
            cost: Number(v.costPrice || 0),
            unit: p.unit || 'PCS',
            category: p.category?.name,
            labelCount: 6,
          });
        }
      }

      if (items.length > 0) {
        setPrintItems(items.slice(0, 3));
      }
    } catch (err) {
      console.error('Failed to load sample catalog items', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchCatalog = async (q: string) => {
    setSearchQuery(q);
    if (!q || q.trim().length < 2) {
      setCatalogSearchResults([]);
      return;
    }

    try {
      setIsSearching(true);
      const res = await apiClient<any>(`/catalog/products?search=${encodeURIComponent(q.trim())}&limit=10`);
      setCatalogSearchResults(res?.items || res?.products || []);
    } catch (err) {
      console.error('Catalog search error', err);
    } finally {
      setIsSearching(false);
    }
  };

  const addItemToQueue = (product: any, variant: any) => {
    const existingIndex = printItems.findIndex((i) => i.variantId === variant.id);
    if (existingIndex >= 0) {
      const copy = [...printItems];
      copy[existingIndex].labelCount += 6;
      setPrintItems(copy);
    } else {
      setPrintItems([
        ...printItems,
        {
          variantId: variant.id,
          sku: variant.sku,
          barcode: variant.barcode || variant.sku,
          productName: product.name,
          variantName: variant.variantName,
          price: Number(variant.sellingPrice || 0),
          cost: Number(variant.costPrice || 0),
          unit: product.unit || 'PCS',
          category: product.category?.name,
          labelCount: 6,
        },
      ]);
    }
    setSearchQuery('');
    setCatalogSearchResults([]);
  };

  const updateItemCount = (index: number, count: number) => {
    const safeCount = Math.max(1, count);
    const copy = [...printItems];
    copy[index].labelCount = safeCount;
    setPrintItems(copy);
  };

  const removeItem = (index: number) => {
    setPrintItems(printItems.filter((_, i) => i !== index));
  };

  // Flattened array of individual labels to render in print preview
  const flattenedLabels = useMemo(() => {
    const labels: Array<PrintItem & { labelIndex: number }> = [];
    printItems.forEach((item) => {
      for (let i = 0; i < item.labelCount; i++) {
        labels.push({ ...item, labelIndex: i });
      }
    });
    return labels;
  }, [printItems]);

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Screen Header (Hidden on Print) */}
      <div className="print:hidden flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            href="/inventory"
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-400 hover:text-white transition shadow-sm"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center space-x-2 text-xs text-slate-400">
              <Link href="/inventory" className="hover:underline">
                Inventory
              </Link>
              <span>/</span>
              <span className="text-indigo-400 font-bold">Barcode & Label Generator</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Printer className="w-6 h-6 text-indigo-400" />
              <span>Barcode & Shelf Price Tag Studio</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={handleTriggerPrint}
            disabled={flattenedLabels.length === 0}
            className="inline-flex items-center space-x-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold shadow-xl shadow-indigo-900/30 transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print {flattenedLabels.length} Labels</span>
          </button>
        </div>
      </div>

      {/* Screen Workspace Layout: Left Sidebar Controls + Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 print:block">
        {/* LEFT COLUMN: Controls & Print Queue (Hidden during browser window.print()) */}
        <div className="print:hidden lg:col-span-5 space-y-6">
          {/* Panel 1: Template Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center space-x-2 text-sm font-bold text-white">
              <Tag className="w-4 h-4 text-indigo-400" />
              <span>Label Format & Template</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setTemplate('SHELF_TAG')}
                className={`p-3 rounded-xl border text-left transition ${
                  template === 'SHELF_TAG'
                    ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md shadow-indigo-950/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <div className="font-bold text-xs text-white">Shelf Price Tag</div>
                <div className="text-[10px] text-slate-400 mt-0.5">70x40mm • Large Retail Price</div>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('PRODUCT_STICKER')}
                className={`p-3 rounded-xl border text-left transition ${
                  template === 'PRODUCT_STICKER'
                    ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md shadow-indigo-950/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <div className="font-bold text-xs text-white">Product Sticker</div>
                <div className="text-[10px] text-slate-400 mt-0.5">50x25mm • Packaging Adhesive</div>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('A4_SHEET_24')}
                className={`p-3 rounded-xl border text-left transition ${
                  template === 'A4_SHEET_24'
                    ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md shadow-indigo-950/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <div className="font-bold text-xs text-white">A4 Label Sheet (24-up)</div>
                <div className="text-[10px] text-slate-400 mt-0.5">3x8 Grid • Standard Adhesive Paper</div>
              </button>

              <button
                type="button"
                onClick={() => setTemplate('COMPACT_TAG')}
                className={`p-3 rounded-xl border text-left transition ${
                  template === 'COMPACT_TAG'
                    ? 'bg-indigo-950/80 border-indigo-500 text-white shadow-md shadow-indigo-950/50'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:bg-slate-850'
                }`}
              >
                <div className="font-bold text-xs text-white">Compact / Jewelry Tag</div>
                <div className="text-[10px] text-slate-400 mt-0.5">30x15mm • Small Items</div>
              </button>
            </div>

            {/* Customization Options */}
            <div className="pt-2 border-t border-slate-800/80 space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Display Elements
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Store / Header Name</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {template === 'SHELF_TAG' && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    Promotional Tag (Optional)
                  </label>
                  <input
                    type="text"
                    value={promoText}
                    onChange={(e) => setPromoText(e.target.value)}
                    placeholder="e.g. SPECIAL OFFER, HOT DEAL"
                    className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span>Show Price</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showBarcode}
                    onChange={(e) => setShowBarcode(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span>Show Barcode</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showSku}
                    onChange={(e) => setShowSku(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span>Show SKU</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showUnit}
                    onChange={(e) => setShowUnit(e.target.checked)}
                    className="rounded bg-slate-950 border-slate-800 text-indigo-600 focus:ring-0"
                  />
                  <span>Show Unit</span>
                </label>
              </div>
            </div>
          </div>

          {/* Panel 2: Product Queue & Search */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm font-bold text-white">
                <Package className="w-4 h-4 text-emerald-400" />
                <span>Label Items Queue ({printItems.length})</span>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-400">
                {flattenedLabels.length} labels total
              </span>
            </div>

            {/* Catalog Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search catalog by name or SKU to add items..."
                value={searchQuery}
                onChange={(e) => handleSearchCatalog(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500 placeholder-slate-500"
              />

              {/* Autocomplete Dropdown */}
              {catalogSearchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-11 z-30 bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto divide-y divide-slate-800/80">
                  {catalogSearchResults.map((p) =>
                    (p.variants || []).map((v: any) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => addItemToQueue(p, v)}
                        className="w-full p-2.5 text-left hover:bg-slate-850 flex items-center justify-between text-xs transition"
                      >
                        <div>
                          <div className="font-bold text-white">{p.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            SKU: {v.sku} {v.variantName && `• ${v.variantName}`}
                          </div>
                        </div>
                        <div className="text-right font-mono font-bold text-emerald-400">
                          LKR {Number(v.sellingPrice || 0).toFixed(2)}
                        </div>
                      </button>
                    )),
                  )}
                </div>
              )}
            </div>

            {/* Items Queue List */}
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {printItems.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500 italic">
                  No items in label queue. Search above to add items.
                </div>
              ) : (
                printItems.map((item, idx) => (
                  <div
                    key={item.variantId}
                    className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="font-bold text-white truncate">{item.productName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.sku} • LKR {item.price.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <div className="flex items-center space-x-1 bg-slate-900 border border-slate-800 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => updateItemCount(idx, item.labelCount - 1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max="500"
                          value={item.labelCount}
                          onChange={(e) => updateItemCount(idx, parseInt(e.target.value) || 1)}
                          className="w-10 text-center font-mono text-xs font-bold bg-transparent text-white focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateItemCount(idx, item.labelCount + 1)}
                          className="w-5 h-5 flex items-center justify-center text-slate-400 hover:text-white rounded hover:bg-slate-800 text-xs font-bold"
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-slate-900 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Print Preview Sheet */}
        <div className="lg:col-span-7 space-y-4 print:col-span-12">
          <div className="print:hidden flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Live Print Sheet Preview
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {flattenedLabels.length} stickers
              </span>
            </div>

            <button
              type="button"
              onClick={handleTriggerPrint}
              disabled={flattenedLabels.length === 0}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold shadow-md transition flex items-center space-x-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Preview</span>
            </button>
          </div>

          {/* Printable Sheet Canvas */}
          <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 sm:p-6 min-h-[500px] overflow-x-auto shadow-inner print:p-0 print:border-none print:bg-white">
            {flattenedLabels.length === 0 ? (
              <div className="py-20 text-center text-slate-500 italic text-sm">
                Queue is empty. Select products on the left to preview labels.
              </div>
            ) : (
              <div
                className={`grid gap-3 print:gap-1 ${
                  template === 'SHELF_TAG'
                    ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3'
                    : template === 'PRODUCT_STICKER'
                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'
                    : template === 'A4_SHEET_24'
                    ? 'grid-cols-3'
                    : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5'
                }`}
              >
                {flattenedLabels.map((lbl, i) => (
                  <div
                    key={`${lbl.variantId}-${lbl.labelIndex}-${i}`}
                    className="break-inside-avoid"
                  >
                    {/* TEMPLATE 1: SHELF PRICE TAG */}
                    {template === 'SHELF_TAG' && (
                      <div className="w-full bg-white text-slate-950 border-2 border-slate-900 rounded-xl p-3 flex flex-col justify-between shadow-sm h-44 select-none relative overflow-hidden">
                        {promoText && (
                          <div className="absolute top-0 right-0 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-bl uppercase tracking-wider">
                            {promoText}
                          </div>
                        )}

                        <div>
                          {showStoreName && (
                            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">
                              {storeName}
                            </div>
                          )}
                          <div className="font-black text-sm text-slate-900 leading-tight mt-0.5 line-clamp-2">
                            {lbl.productName}
                          </div>
                          {lbl.variantName && (
                            <div className="text-[10px] text-slate-600 font-semibold">
                              {lbl.variantName}
                            </div>
                          )}
                        </div>

                        {showPrice && (
                          <div className="my-1 border-y border-dashed border-slate-300 py-1">
                            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                              Retail Price {showUnit && `(${lbl.unit})`}
                            </div>
                            <div className="text-2xl font-black text-slate-950 font-mono tracking-tight leading-none mt-0.5">
                              {currencySymbol} {lbl.price.toFixed(2)}
                            </div>
                          </div>
                        )}

                        <div className="flex items-end justify-between gap-1">
                          {showBarcode && (
                            <div className="flex-1 max-w-[140px]">
                              <BarcodeSvg
                                value={lbl.barcode || lbl.sku}
                                height={32}
                                width="100%"
                                showText={false}
                              />
                            </div>
                          )}
                          {showSku && (
                            <div className="text-[10px] font-mono font-bold text-slate-700 text-right">
                              {lbl.sku}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* TEMPLATE 2: PRODUCT STICKER (50x25mm) */}
                    {template === 'PRODUCT_STICKER' && (
                      <div className="w-full bg-white text-slate-950 border border-slate-800 rounded-lg p-2 flex flex-col justify-between shadow-sm h-32 select-none">
                        <div className="text-center">
                          {showStoreName && (
                            <div className="text-[8px] font-bold tracking-widest text-slate-600 uppercase">
                              {storeName}
                            </div>
                          )}
                          <div className="font-extrabold text-[11px] text-slate-950 leading-tight truncate">
                            {lbl.productName}
                          </div>
                        </div>

                        {showBarcode && (
                          <div className="my-1">
                            <BarcodeSvg
                              value={lbl.barcode || lbl.sku}
                              height={28}
                              width="100%"
                              showText={true}
                            />
                          </div>
                        )}

                        {showPrice && (
                          <div className="flex items-center justify-between text-center pt-0.5 border-t border-slate-200">
                            <span className="text-[9px] font-mono font-bold text-slate-600">{lbl.sku}</span>
                            <span className="text-xs font-black font-mono text-slate-950">
                              {currencySymbol} {lbl.price.toFixed(2)}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* TEMPLATE 3: A4 24-UP STICKER SHEET */}
                    {template === 'A4_SHEET_24' && (
                      <div className="w-full bg-white text-slate-950 border border-slate-300 rounded p-2 flex flex-col justify-between h-28 select-none">
                        <div className="flex items-start justify-between">
                          <div className="font-bold text-[10px] text-slate-900 truncate max-w-[120px]">
                            {lbl.productName}
                          </div>
                          {showPrice && (
                            <div className="text-xs font-black font-mono text-slate-950">
                              {currencySymbol} {lbl.price.toFixed(0)}
                            </div>
                          )}
                        </div>

                        {showBarcode && (
                          <div className="my-0.5">
                            <BarcodeSvg
                              value={lbl.barcode || lbl.sku}
                              height={25}
                              width="100%"
                              showText={false}
                            />
                          </div>
                        )}

                        <div className="flex items-center justify-between text-[9px] font-mono text-slate-600">
                          <span>{lbl.sku}</span>
                          <span>{lbl.unit}</span>
                        </div>
                      </div>
                    )}

                    {/* TEMPLATE 4: COMPACT JEWELRY / ACCESSORY TAG */}
                    {template === 'COMPACT_TAG' && (
                      <div className="w-full bg-white text-slate-950 border border-slate-400 rounded p-1.5 flex flex-col justify-between h-20 select-none">
                        <div className="text-[9px] font-black truncate">{lbl.productName}</div>
                        {showBarcode && (
                          <BarcodeSvg
                            value={lbl.barcode || lbl.sku}
                            height={20}
                            width="100%"
                            showText={false}
                          />
                        )}
                        <div className="flex items-center justify-between text-[9px] font-mono font-black">
                          <span>{lbl.sku}</span>
                          <span>{currencySymbol} {lbl.price.toFixed(0)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Embedded Print Stylesheet for Browser window.print() */}
      <style jsx global>{`
        @media print {
          @page {
            size: auto;
            margin: 4mm;
          }
          body {
            background-color: white !important;
            color: black !important;
          }
          nav, aside, header, footer, button, .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

export default function BarcodeLabelGeneratorPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-center text-slate-500 font-medium">
          Loading Barcode & Shelf Price Tag Studio...
        </div>
      }
    >
      <BarcodeLabelGeneratorContent />
    </Suspense>
  );
}
