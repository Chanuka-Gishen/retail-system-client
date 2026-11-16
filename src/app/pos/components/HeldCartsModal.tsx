'use client';

import React, { useState, useEffect } from 'react';
import { Clock, Trash2, ArrowRight, X, PauseCircle, ShoppingCart, User, AlertCircle } from 'lucide-react';
import { usePosCartStore, CartLineItem } from '../../../lib/pos-cart-store';

export interface HeldCart {
  id: string;
  parkedAt: string;
  reference: string;
  items: CartLineItem[];
  customer: any | null;
  cartDiscountAmount: number;
  subtotal: number;
  grandTotal: number;
}

export const HELD_CARTS_STORAGE_KEY = 'pos_held_carts';

export function getStoredHeldCarts(): HeldCart[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(HELD_CARTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveStoredHeldCarts(carts: HeldCart[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(HELD_CARTS_STORAGE_KEY, JSON.stringify(carts));
  } catch (err) {
    console.error('Failed to save held carts to localStorage:', err);
  }
}

interface HeldCartsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCartResumed?: () => void;
}

export function HeldCartsModal({ isOpen, onClose, onCartResumed }: HeldCartsModalProps) {
  const cart = usePosCartStore();
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [newHoldNote, setNewHoldNote] = useState('');
  const [conflictParkNote, setConflictParkNote] = useState('');
  const [isParkMode, setIsParkMode] = useState(false);
  const [resumeConflictCart, setResumeConflictCart] = useState<HeldCart | null>(null);

  useEffect(() => {
    if (isOpen) {
      setHeldCarts(getStoredHeldCarts());
      setIsParkMode(false);
      setNewHoldNote('');
      setConflictParkNote('');
      setResumeConflictCart(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Park current active cart
  const handleParkActiveCart = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.items.length === 0) return;

    const currentHeld = getStoredHeldCarts();
    const newCart: HeldCart = {
      id: `HOLD-${Date.now().toString().slice(-6)}`,
      parkedAt: new Date().toISOString(),
      reference: newHoldNote.trim() || `Customer Order #${currentHeld.length + 1}`,
      items: cart.items.map((i) => ({ ...i })),
      customer: cart.customer ? { ...cart.customer } : null,
      cartDiscountAmount: cart.cartDiscountAmount || 0,
      subtotal: cart.getSubtotal(),
      grandTotal: cart.getGrandTotal(),
    };

    const updated = [newCart, ...currentHeld];
    saveStoredHeldCarts(updated);
    setHeldCarts(updated);

    // Clear active cart
    cart.clearCart();
    setIsParkMode(false);
    setNewHoldNote('');
    onClose();
  };

  // Resume a held cart
  const handleResumeCart = (targetCart: HeldCart) => {
    if (cart.items.length > 0) {
      // Conflict: active cart has items. Prompt cashier to choose action
      setConflictParkNote(`Swapped cart (${cart.items.length} items)`);
      setResumeConflictCart(targetCart);
      return;
    }

    executeResume(targetCart, false);
  };

  /**
   * Executes resuming the target cart.
   * If parkCurrentFirst is true, snapshots and saves the active cart into held carts before loading the target cart.
   */
  const executeResume = (targetCart: HeldCart, parkCurrentFirst: boolean) => {
    const currentHeld = getStoredHeldCarts();

    let updatedHeldCarts: HeldCart[];

    if (parkCurrentFirst && cart.items.length > 0) {
      const currentParked: HeldCart = {
        id: `HOLD-${Date.now().toString().slice(-6)}`,
        parkedAt: new Date().toISOString(),
        reference: conflictParkNote.trim() || `Swapped cart (${cart.items.length} item${cart.items.length === 1 ? '' : 's'})`,
        items: cart.items.map((i) => ({ ...i })),
        customer: cart.customer ? { ...cart.customer } : null,
        cartDiscountAmount: cart.cartDiscountAmount || 0,
        subtotal: cart.getSubtotal(),
        grandTotal: cart.getGrandTotal(),
      };

      // Exclude targetCart and include newly parked active cart
      updatedHeldCarts = [currentParked, ...currentHeld.filter((c) => c.id !== targetCart.id)];
    } else {
      // Just remove targetCart from held carts
      updatedHeldCarts = currentHeld.filter((c) => c.id !== targetCart.id);
    }

    // 1. Persist the updated held carts list FIRST
    saveStoredHeldCarts(updatedHeldCarts);
    setHeldCarts(updatedHeldCarts);

    // 2. Atomically restore targetCart into the active POS register
    cart.restoreCart(
      targetCart.items,
      targetCart.customer,
      targetCart.cartDiscountAmount,
    );

    // 3. Reset conflict state and notify parent
    setResumeConflictCart(null);
    setConflictParkNote('');
    onClose();
    if (onCartResumed) onCartResumed();
  };

  // Discard a held cart
  const handleDeleteHeldCart = (id: string) => {
    if (!confirm('Are you sure you want to discard this held cart?')) return;
    const currentHeld = getStoredHeldCarts();
    const updated = currentHeld.filter((c) => c.id !== id);
    saveStoredHeldCarts(updated);
    setHeldCarts(updated);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-amber-950/60 border border-amber-800/80 rounded-xl text-amber-400">
              <PauseCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Parked & Held Carts</h2>
              <p className="text-xs text-slate-400">
                Multi-queue order holding. Switch between customers without losing active items.
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

        {/* Conflict Warning View */}
        {resumeConflictCart && (
          <div className="p-5 bg-amber-950/40 border-b border-amber-800/80 space-y-3">
            <div className="flex items-start space-x-3 text-amber-300">
              <AlertCircle className="w-5 h-5 mt-0.5 shrink-0 text-amber-400" />
              <div>
                <h4 className="font-bold text-sm text-white">Active Cart is Not Empty!</h4>
                <p className="text-xs text-amber-200 mt-0.5">
                  Your register currently has <strong className="text-white">{cart.items.length} item{cart.items.length === 1 ? '' : 's'}</strong> (Total: Rs {cart.getGrandTotal().toLocaleString()}). What would you like to do before resuming &ldquo;<span className="text-white font-semibold">{resumeConflictCart.reference}</span>&rdquo;?
                </p>
              </div>
            </div>

            <div className="bg-slate-950/90 border border-slate-800 rounded-xl p-3">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Name for Current Cart Being Parked (Optional)
              </label>
              <input
                type="text"
                value={conflictParkNote}
                onChange={(e) => setConflictParkNote(e.target.value)}
                placeholder="e.g. Waiting for cash, Customer in blue shirt..."
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setResumeConflictCart(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeResume(resumeConflictCart, false)}
                className="px-3.5 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 text-xs font-bold rounded-xl transition"
              >
                Discard Current & Resume Held
              </button>
              <button
                type="button"
                onClick={() => executeResume(resumeConflictCart, true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl transition shadow flex items-center space-x-1.5"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Park Current & Resume Held</span>
              </button>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Quick Park Active Cart Box */}
          {cart.items.length > 0 && !isParkMode && !resumeConflictCart && (
            <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-xl">
              <div>
                <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider">
                  Active Register Cart
                </span>
                <p className="text-sm font-bold text-white mt-0.5">
                  {cart.items.length} items &bull; Total: Rs {cart.getGrandTotal().toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsParkMode(true)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center space-x-1.5"
              >
                <PauseCircle className="w-4 h-4" />
                <span>Park Active Cart</span>
              </button>
            </div>
          )}

          {/* Park Mode Form */}
          {isParkMode && (
            <form onSubmit={handleParkActiveCart} className="p-4 bg-slate-950 border border-amber-800/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
                  Hold Active Cart #{heldCarts.length + 1}
                </span>
                <button
                  type="button"
                  onClick={() => setIsParkMode(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
              </div>
              <div>
                <label className="block text-xs text-slate-300 font-medium mb-1">
                  Queue Note / Customer Identifier (Optional)
                </label>
                <input
                  type="text"
                  value={newHoldNote}
                  onChange={(e) => setNewHoldNote(e.target.value)}
                  placeholder="e.g. Customer in red cap, Queue #2, Phone 077..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  autoFocus
                />
              </div>
              <div className="flex justify-end space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsParkMode(false)}
                  className="px-3.5 py-2 bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg transition shadow"
                >
                  Confirm Park
                </button>
              </div>
            </form>
          )}

          {/* Held Carts List */}
          {heldCarts.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full bg-slate-800/60 flex items-center justify-center text-slate-500 mb-3">
                <ShoppingCart className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-300">No Carts on Hold</h3>
              <p className="text-xs text-slate-500 max-w-sm mt-1">
                When a customer steps away or is waiting to pay, park their cart here to serve the next customer in queue.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>{heldCarts.length} cart{heldCarts.length === 1 ? '' : 's'} on hold</span>
                <span className="text-[11px] text-slate-500">Sorted by most recently parked</span>
              </div>

              {heldCarts.map((h) => {
                const elapsedMin = Math.round((Date.now() - new Date(h.parkedAt).getTime()) / 60000);
                return (
                  <div
                    key={h.id}
                    className="p-4 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="px-2 py-0.5 bg-amber-950/80 border border-amber-800/80 text-amber-300 text-[10px] font-bold rounded font-mono">
                          {h.id}
                        </span>
                        <h4 className="text-sm font-bold text-white truncate">{h.reference}</h4>
                      </div>

                      <div className="flex items-center space-x-3 text-xs text-slate-400">
                        <span className="flex items-center space-x-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>{elapsedMin <= 0 ? 'Just now' : `${elapsedMin}m ago`}</span>
                        </span>
                        <span>&bull;</span>
                        <span>{h.items.length} line item{h.items.length === 1 ? '' : 's'}</span>
                        {h.customer && (
                          <>
                            <span>&bull;</span>
                            <span className="flex items-center space-x-1 text-slate-300">
                              <User className="w-3 h-3 text-slate-500" />
                              <span>{h.customer.name || h.customer.phone}</span>
                            </span>
                          </>
                        )}
                      </div>

                      {/* Items preview */}
                      <p className="text-[11px] text-slate-500 truncate max-w-md pt-0.5">
                        {h.items.map((i) => `${i.product.name} (${i.quantity})`).join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center space-x-3 shrink-0 self-end sm:self-center">
                      <div className="text-right">
                        <div className="text-xs text-slate-500">Total</div>
                        <div className="text-sm font-bold text-emerald-400 font-mono">
                          Rs {h.grandTotal.toLocaleString()}
                        </div>
                      </div>

                      <div className="flex items-center space-x-1.5 pl-2 border-l border-slate-800">
                        <button
                          type="button"
                          onClick={() => handleResumeCart(h)}
                          className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition shadow-sm flex items-center space-x-1"
                        >
                          <span>Resume</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHeldCart(h.id)}
                          className="p-2 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 rounded-xl transition"
                          title="Discard held cart"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950 flex justify-between items-center text-xs text-slate-500">
          <span>Held carts are preserved across page refreshes.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
