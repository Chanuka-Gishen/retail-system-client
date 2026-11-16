'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Edit2, X, Check, RefreshCw, AlertCircle, Layers } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../lib/auth-store';
import { pullCatalogDelta } from '../../lib/pos-db';
import { Pagination } from '../../components/Pagination';
import { TableSkeleton } from '../../components/TableSkeleton';
import { EmptyState } from '../../components/EmptyState';

export default function CatalogPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [products, setProducts] = useState<any[]>([]);
  const [taxProfiles, setTaxProfiles] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add Product Form fields
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('PCS');
  const [newBarcode, setNewBarcode] = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newSellingPrice, setNewSellingPrice] = useState('');
  const [newTaxProfileId, setNewTaxProfileId] = useState('');

  // Edit Product Form fields
  const [editName, setEditName] = useState('');
  const [editUnit, setEditUnit] = useState('PCS');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editSellingPrice, setEditSellingPrice] = useState('');
  const [editBarcode, setEditBarcode] = useState('');

  // 1. Auth Guard
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // 2. Fetch Catalog and Tax Profiles
  const fetchCatalog = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const q = new URLSearchParams();
      q.set('page', String(page));
      q.set('limit', String(limit));
      if (search) q.set('search', search);

      const res = await apiClient<any>(`/catalog/products?${q.toString()}`);
      setProducts(res?.items || (Array.isArray(res) ? res : []));
      if (res?.meta) {
        setTotalPages(res.meta.totalPages || 1);
        setTotalItems(res.meta.total || 0);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load catalog');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTaxProfiles = async () => {
    try {
      const res = await apiClient<any[]>('/catalog/tax-profiles');
      setTaxProfiles(res || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchCatalog();
      fetchTaxProfiles();
    }
  }, [page, limit, search, isAuthenticated]);

  // Open Edit Modal
  const openEditModal = (p: any) => {
    setEditingProduct(p);
    const mainVariant = p.variants?.[0];
    setEditName(p.name || '');
    setEditUnit(p.unit || 'PCS');
    setEditSellingPrice(mainVariant ? String(mainVariant.sellingPrice) : '0');
    setEditCostPrice(mainVariant ? String(mainVariant.costPrice) : '0');
    setEditBarcode(mainVariant?.barcode || '');
    setIsEditModalOpen(true);
  };

  // Submit Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const payload: any = {
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        unit: newUnit,
        barcode: newBarcode.trim() || undefined,
        costPrice: parseFloat(newCostPrice) || 0,
        sellingPrice: parseFloat(newSellingPrice) || 0,
        taxProfileId: newTaxProfileId || undefined,
      };

      await apiClient('/catalog/products', {
        method: 'POST',
        body: payload,
      });

      setSuccessMsg(`Product "${newName}" created successfully!`);
      setIsAddModalOpen(false);

      // Reset form
      setNewCode('');
      setNewName('');
      setNewBarcode('');
      setNewCostPrice('');
      setNewSellingPrice('');
      setNewTaxProfileId('');

      // Refresh data & offline cache
      await fetchCatalog();
      pullCatalogDelta().catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to create product');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Submit Edit Product
  const handleEditProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      // Update master product
      await apiClient(`/catalog/products/${editingProduct.id}`, {
        method: 'PUT',
        body: {
          name: editName.trim(),
          unit: editUnit,
        },
      });

      // Update variant prices and barcode if variant exists
      const mainVariant = editingProduct.variants?.[0];
      if (mainVariant) {
        await apiClient(`/catalog/variants/${mainVariant.id}`, {
          method: 'PUT',
          body: {
            variantName: editName.trim(),
            costPrice: parseFloat(editCostPrice) || 0,
            sellingPrice: parseFloat(editSellingPrice) || 0,
            barcode: editBarcode.trim() || undefined,
          },
        });
      }

      setSuccessMsg(`Product "${editName}" updated successfully!`);
      setIsEditModalOpen(false);
      setEditingProduct(null);

      // Refresh data & offline cache
      await fetchCatalog();
      pullCatalogDelta().catch(() => {});
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to update product');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 bg-slate-950 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Product Catalog</h1>
          <p className="text-sm text-slate-400 mt-1">Manage SKUs, variants, prices, and tax rates</p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchCatalog()}
            disabled={isLoading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition"
            title="Refresh Catalog"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-xl flex items-center space-x-2 transition text-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
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

      {/* Search Input */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between space-x-3">
        <div className="flex items-center space-x-3 flex-1">
          <Search className="w-5 h-5 text-slate-500 shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter catalog by product title, SKU, or barcode..."
            className="bg-transparent w-full text-white placeholder-slate-500 text-sm focus:outline-none"
          />
        </div>
        {search && (
          <button
            onClick={() => setSearch('')}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs flex items-center gap-1 transition"
            title="Clear search"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Products Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
              <tr>
                <th className="py-3 px-4">Code / SKU</th>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Unit</th>
                <th className="py-3 px-4">Selling Price (LKR)</th>
                <th className="py-3 px-4">Cost Price (LKR)</th>
                <th className="py-3 px-4">Tax Profile</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-200">
              {isLoading ? (
                <TableSkeleton columns={7} rows={6} theme="dark" />
              ) : products.length === 0 ? (
                <EmptyState
                  colSpan={7}
                  theme="dark"
                  icon={Layers}
                  isSearchActive={Boolean(search)}
                  searchQuery={search}
                  title={search ? 'No products match your search' : 'Your catalog is empty'}
                  description={
                    search
                      ? `No products or barcodes match "${search}". Try checking for spelling mistakes or clear the filter.`
                      : 'You haven’t added any products or services yet. Create your first product to begin sales and inventory tracking.'
                  }
                  onResetFilters={() => setSearch('')}
                  actionLabel="Add New Product"
                  onAction={() => setIsAddModalOpen(true)}
                />
              ) : (
                products.map((p) => {
                  const mainVariant = p.variants?.[0];
                  return (
                    <tr key={p.id} className="hover:bg-slate-850 transition">
                      <td className="py-3 px-4 font-mono text-blue-400 font-medium">
                        {p.code}
                        {mainVariant?.barcode && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            BC: {mainVariant.barcode}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-white">
                        {p.name}
                        {mainVariant?.variantName && mainVariant.variantName !== p.name && (
                          <div className="text-[10px] text-slate-400 font-normal">
                            Variant: {mainVariant.variantName}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-400 uppercase">{p.unit || 'PCS'}</td>
                      <td className="py-3 px-4 font-bold text-emerald-400">
                        {mainVariant ? Number(mainVariant.sellingPrice).toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {mainVariant ? Number(mainVariant.costPrice).toFixed(2) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        {p.taxProfile ? (
                          <span className="bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded text-[10px]">
                            {p.taxProfile.name} ({Number(p.taxProfile.ratePercentage)}%)
                          </span>
                        ) : (
                          <span className="text-slate-500">None</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openEditModal(p)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 hover:text-blue-300 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
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

      {/* MODAL 1: ADD NEW PRODUCT */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-lg font-bold text-white">Create New Catalog Product</h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Product Code / SKU *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="PRD-MILK-1L"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Unit of Measure *
                  </label>
                  <select
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="LTR">LTR (Liters)</option>
                    <option value="BOX">BOX (Cartons)</option>
                    <option value="PACK">PACK (Packets)</option>
                    <option value="MTR">MTR (Meters)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Title / Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Highland Pure Milk 1 Liter"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Cost Price (LKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="380.00"
                    value={newCostPrice}
                    onChange={(e) => setNewCostPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Selling Price (LKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="480.00"
                    value={newSellingPrice}
                    onChange={(e) => setNewSellingPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Barcode (EAN-13 / Code128)
                  </label>
                  <input
                    type="text"
                    placeholder="4791234567890"
                    value={newBarcode}
                    onChange={(e) => setNewBarcode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Tax Profile
                  </label>
                  <select
                    value={newTaxProfileId}
                    onChange={(e) => setNewTaxProfileId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="">None (0% Exempt)</option>
                    {taxProfiles.map((tp) => (
                      <option key={tp.id} value={tp.id}>
                        {tp.name} ({Number(tp.ratePercentage)}%)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition"
                >
                  {isSubmitting ? 'Creating Product...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: EDIT PRODUCT */}
      {isEditModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <h2 className="text-lg font-bold text-white">Edit Product Details</h2>
                <div className="text-xs text-blue-400 font-mono mt-0.5">{editingProduct.code}</div>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Unit of Measure *
                  </label>
                  <select
                    value={editUnit}
                    onChange={(e) => setEditUnit(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="PCS">PCS (Pieces)</option>
                    <option value="KG">KG (Kilograms)</option>
                    <option value="LTR">LTR (Liters)</option>
                    <option value="BOX">BOX (Cartons)</option>
                    <option value="PACK">PACK (Packets)</option>
                    <option value="MTR">MTR (Meters)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={editBarcode}
                    onChange={(e) => setEditBarcode(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Cost Price (LKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editCostPrice}
                    onChange={(e) => setEditCostPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Selling Price (LKR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editSellingPrice}
                    onChange={(e) => setEditSellingPrice(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-sm text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-semibold px-5 py-2 rounded-xl text-sm transition"
                >
                  {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
