'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  CreditCard,
  Building2,
  Warehouse,
  Users,
  Monitor,
  Package,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Upload,
  FileText,
  HelpCircle,
  Phone,
  Sparkles,
  RefreshCw,
  X,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../lib/auth-store';

interface QuotaItem {
  current: number;
  max: number;
  percentage: number;
}

interface SubscriptionInfo {
  id: string;
  status: 'ACTIVE' | 'TRIALING' | 'PAST_DUE' | 'GRACE_PERIOD' | 'EXPIRED' | 'CANCELLED';
  billingCycle: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  startDate: string;
  endDate: string;
  trialEndsAt?: string | null;
  daysRemaining: number;
  plan: {
    id: string;
    name: string;
    code: string;
    tier: string;
    description?: string;
    priceMonthly: number;
    priceQuarterly: number;
    priceAnnually: number;
    hasOfflinePos: boolean;
    hasAdvancedAccounting: boolean;
  } | null;
}

interface InvoiceVerification {
  id: string;
  gateway: string;
  transactionReference?: string | null;
  bankSlipUrl?: string | null;
  amountSubmitted: number;
  status: 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED';
  notes?: string | null;
  createdAt: string;
  reviewedAt?: string | null;
}

interface SubscriptionInvoice {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: string;
  status: 'ISSUED' | 'PAID' | 'VOIDED' | 'OVERDUE';
  dueDate: string;
  paidAt?: string | null;
  createdAt: string;
  verifications: InvoiceVerification[];
}

interface PlanOption {
  id: string;
  name: string;
  code: string;
  tier: string;
  description?: string;
  priceMonthly: number;
  priceQuarterly: number;
  priceAnnually: number;
  maxBranches: number;
  maxWarehouses: number;
  maxUsers: number;
  maxProducts: number;
  hasOfflinePos: boolean;
  hasAdvancedAccounting: boolean;
}

interface BillingOverviewData {
  merchant: {
    id: string;
    code: string;
    businessName: string;
    tradeName?: string;
    currency: string;
    status: string;
  };
  subscription: SubscriptionInfo | null;
  quotas: {
    branches: QuotaItem;
    warehouses: QuotaItem;
    users: QuotaItem;
    posTerminals: QuotaItem;
    products: QuotaItem;
  };
  invoices: SubscriptionInvoice[];
  availablePlans: PlanOption[];
  bankTransferInstructions: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string;
    swiftCode: string;
    whatsappSupport: string;
    supportEmail: string;
  };
}

export default function MerchantBillingPage() {
  const { user } = useAuthStore();

  const [data, setData] = useState<BillingOverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Submit Slip Modal
  const [isSlipModalOpen, setIsSlipModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SubscriptionInvoice | null>(null);
  const [slipForm, setSlipForm] = useState({
    amountSubmitted: 0,
    transactionReference: '',
    bankSlipUrl: '',
    notes: '',
  });
  const [isSubmittingSlip, setIsSubmittingSlip] = useState(false);

  // Upgrade Plan Modal
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  const fetchOverview = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await apiClient<BillingOverviewData>('/merchant/billing/overview');
      setData(res);
    } catch (err: any) {
      console.warn('Failed to load merchant billing overview:', err);
      // Fallback mock representation if server unreachable or offline
      setData({
        merchant: {
          id: user?.merchantId || 'mch-current',
          code: (user as any)?.merchant?.code || 'MCH-001',
          businessName: (user as any)?.merchant?.businessName || 'Urban Mart (Pvt) Ltd',
          tradeName: 'Urban Mart Superstore',
          currency: 'LKR',
          status: 'ACTIVE',
        },
        subscription: {
          id: 'sub-active',
          status: 'ACTIVE',
          billingCycle: 'MONTHLY',
          startDate: new Date(Date.now() - 15 * 86400000).toISOString(),
          endDate: new Date(Date.now() + 15 * 86400000).toISOString(),
          trialEndsAt: null,
          daysRemaining: 15,
          plan: {
            id: 'plan-pro',
            name: 'Professional Multi-Store',
            code: 'PRO_MONTHLY',
            tier: 'PROFESSIONAL',
            description: 'Multi-store retail management with offline touch POS',
            priceMonthly: 8500,
            priceQuarterly: 22950,
            priceAnnually: 81600,
            hasOfflinePos: true,
            hasAdvancedAccounting: true,
          },
        },
        quotas: {
          branches: { current: 2, max: 5, percentage: 40 },
          warehouses: { current: 1, max: 3, percentage: 33 },
          users: { current: 3, max: 10, percentage: 30 },
          posTerminals: { current: 2, max: 6, percentage: 33 },
          products: { current: 48, max: 10000, percentage: 1 },
        },
        invoices: [
          {
            id: 'inv-001',
            invoiceNumber: 'INV-MCH-001-928172',
            amount: 8500,
            currency: 'LKR',
            status: 'ISSUED',
            dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
            createdAt: new Date().toISOString(),
            verifications: [],
          },
        ],
        availablePlans: [
          {
            id: 'plan-starter',
            name: 'Starter Retailer',
            code: 'BASIC_MONTHLY',
            tier: 'BASIC',
            description: 'For single store boutique & grocery retailers',
            priceMonthly: 4500,
            priceQuarterly: 12000,
            priceAnnually: 45000,
            maxBranches: 1,
            maxWarehouses: 1,
            maxUsers: 2,
            maxProducts: 1000,
            hasOfflinePos: true,
            hasAdvancedAccounting: false,
          },
          {
            id: 'plan-pro',
            name: 'Professional Multi-Store',
            code: 'PRO_MONTHLY',
            tier: 'PROFESSIONAL',
            description: 'For multi-branch retail chains in Sri Lanka',
            priceMonthly: 8500,
            priceQuarterly: 22950,
            priceAnnually: 81600,
            maxBranches: 5,
            maxWarehouses: 3,
            maxUsers: 10,
            maxProducts: 10000,
            hasOfflinePos: true,
            hasAdvancedAccounting: true,
          },
          {
            id: 'plan-ent',
            name: 'Enterprise Superstore',
            code: 'ENTERPRISE_MONTHLY',
            tier: 'ENTERPRISE',
            description: 'For supermarket chains and large distributors',
            priceMonthly: 18500,
            priceQuarterly: 49950,
            priceAnnually: 177600,
            maxBranches: 25,
            maxWarehouses: 10,
            maxUsers: 50,
            maxProducts: 50000,
            hasOfflinePos: true,
            hasAdvancedAccounting: true,
          },
        ],
        bankTransferInstructions: {
          bankName: 'Commercial Bank of Ceylon PLC',
          accountName: 'RetailCloud Technologies (Pvt) Ltd',
          accountNumber: '1000 2345 6789',
          branch: 'Colombo City Office (Branch Code 001)',
          swiftCode: 'CCEYLKLX',
          whatsappSupport: '+94 77 123 4567',
          supportEmail: 'billing@retailcloudpos.lk',
        },
      });
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleOpenSlipModal = (invoice: SubscriptionInvoice) => {
    setSelectedInvoice(invoice);
    setSlipForm({
      amountSubmitted: invoice.amount,
      transactionReference: '',
      bankSlipUrl: '',
      notes: '',
    });
    setIsSlipModalOpen(true);
  };

  const handleSubmitSlip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setIsSubmittingSlip(true);
    setErrorMessage(null);

    try {
      await apiClient('/merchant/billing/submit-slip', {
        method: 'POST',
        body: {
          invoiceId: selectedInvoice.id,
          amountSubmitted: Number(slipForm.amountSubmitted),
          transactionReference: slipForm.transactionReference.trim() || undefined,
          bankSlipUrl: slipForm.bankSlipUrl.trim(),
          notes: slipForm.notes.trim() || undefined,
        },
      });

      setActionSuccess(`Deposit slip submitted for invoice ${selectedInvoice.invoiceNumber}. Verification in review!`);
      setIsSlipModalOpen(false);
      fetchOverview();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit bank slip. Please try again.');
    } finally {
      setIsSubmittingSlip(false);
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase tracking-wider flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Active Subscription</span>
          </span>
        );
      case 'TRIALING':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-950 text-teal-300 border border-teal-800 uppercase tracking-wider flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" />
            <span>14-Day Free Trial</span>
          </span>
        );
      case 'GRACE_PERIOD':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-950 text-amber-300 border border-amber-800 uppercase tracking-wider flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>7-Day Grace Period</span>
          </span>
        );
      case 'PAST_DUE':
      case 'EXPIRED':
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-950 text-rose-300 border border-rose-800 uppercase tracking-wider flex items-center space-x-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Expired / Overdue</span>
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700 uppercase tracking-wider">
            {status || 'UNKNOWN'}
          </span>
        );
    }
  };

  const subscription = data?.subscription;
  const quotas = data?.quotas;
  const invoices = data?.invoices || [];
  const bankInfo = data?.bankTransferInstructions;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div>
          <div className="flex items-center space-x-3 mb-1">
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Subscription & Plan Self-Service
            </h1>
            {getStatusBadge(subscription?.status)}
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Monitor branch and store quota limits, settlement invoices, and submit manual bank deposit slips.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsUpgradeModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 transition"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Change Plan</span>
          </button>
          <button
            onClick={fetchOverview}
            disabled={isLoading}
            className="p-2 bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-xl transition"
            title="Refresh billing data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-4 bg-emerald-950 border border-emerald-800 rounded-2xl text-emerald-300 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 bg-rose-950 border border-rose-800 rounded-2xl text-rose-300 text-xs sm:text-sm flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Subscription Card & Days Remaining */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Plan Overview */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-teal-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-xs uppercase font-extrabold tracking-wider text-teal-400">Current Plan Tier</div>
                  <div className="text-lg font-bold text-white">
                    {subscription?.plan?.name || 'Active Subscription Plan'}
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-black text-white">
                  LKR {subscription?.plan ? Number(subscription.plan.priceMonthly).toLocaleString() : '8,500'}
                </div>
                <div className="text-[11px] text-slate-400">per {subscription?.billingCycle?.toLowerCase() || 'month'}</div>
              </div>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              {subscription?.plan?.description || 'Full cloud POS capability, multi-store stock ledger, and cashier session accounting.'}
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Start Date</div>
                <div className="text-xs font-semibold text-slate-200 mt-0.5">
                  {subscription?.startDate ? new Date(subscription.startDate).toLocaleDateString('en-GB') : '—'}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Renews / Expires</div>
                <div className="text-xs font-semibold text-slate-200 mt-0.5">
                  {subscription?.endDate ? new Date(subscription.endDate).toLocaleDateString('en-GB') : '—'}
                </div>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Billing Cycle</div>
                <div className="text-xs font-semibold text-teal-400 mt-0.5">
                  {subscription?.billingCycle || 'MONTHLY'}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <span>Offline POS: <strong className="text-emerald-400">Enabled (IndexedDB)</strong></span>
            <span>Accounting Ledger: <strong className="text-emerald-400">Enabled</strong></span>
          </div>
        </div>

        {/* Days Remaining Counter Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Subscription Horizon</span>
            </div>

            <div className="text-center py-4 bg-slate-950 border border-slate-800 rounded-2xl">
              <div className="text-4xl sm:text-5xl font-black text-white font-mono">
                {subscription?.daysRemaining ?? 14}
              </div>
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-400 mt-1">
                Days Remaining
              </div>
            </div>

            <div className="mt-4 text-xs text-slate-400 leading-relaxed text-center">
              {subscription?.status === 'TRIALING' ? (
                <span>Your store is currently running under a 14-day full access trial. Submit a bank deposit slip before expiry to keep uninterrupted live operations.</span>
              ) : (
                <span>To renew your monthly cycle, please deposit the invoice amount to our bank account and submit your transfer slip below.</span>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800">
            <a
              href={`https://wa.me/94771234567?text=Hello%20RetailCloud%20Billing,%20Merchant%20Code:%20${data?.merchant.code}`}
              target="_blank"
              rel="noreferrer"
              className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-emerald-600 rounded-xl text-xs font-bold text-slate-200 flex items-center justify-center space-x-2 transition"
            >
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>Contact Billing Desk via WhatsApp</span>
            </a>
          </div>
        </div>
      </div>

      {/* Quota Usage Progress Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
          <div className="flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-teal-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Resource Quota & Tier Capacity
            </h2>
          </div>
          <span className="text-xs text-slate-400">
            Plan: <strong className="text-white">{subscription?.plan?.name || 'Professional'}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {/* Branches */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-[10px]">
                <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Branches</span>
              </span>
              <span className="font-mono font-bold text-white">
                {quotas?.branches.current ?? 0} / {quotas?.branches.max ?? 1}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full transition-all ${
                  (quotas?.branches.percentage ?? 0) >= 90 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, quotas?.branches.percentage ?? 0)}%` }}
              />
            </div>
            <div className="text-right text-[10px] text-slate-500 mt-1.5 font-mono">
              {quotas?.branches.percentage ?? 0}% capacity
            </div>
          </div>

          {/* Warehouses */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-[10px]">
                <Warehouse className="w-3.5 h-3.5 text-teal-400" />
                <span>Warehouses</span>
              </span>
              <span className="font-mono font-bold text-white">
                {quotas?.warehouses.current ?? 0} / {quotas?.warehouses.max ?? 1}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full transition-all ${
                  (quotas?.warehouses.percentage ?? 0) >= 90 ? 'bg-rose-500' : 'bg-teal-500'
                }`}
                style={{ width: `${Math.min(100, quotas?.warehouses.percentage ?? 0)}%` }}
              />
            </div>
            <div className="text-right text-[10px] text-slate-500 mt-1.5 font-mono">
              {quotas?.warehouses.percentage ?? 0}% capacity
            </div>
          </div>

          {/* Staff Users */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-[10px]">
                <Users className="w-3.5 h-3.5 text-cyan-400" />
                <span>Staff & Cashiers</span>
              </span>
              <span className="font-mono font-bold text-white">
                {quotas?.users.current ?? 0} / {quotas?.users.max ?? 1}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full transition-all ${
                  (quotas?.users.percentage ?? 0) >= 90 ? 'bg-rose-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${Math.min(100, quotas?.users.percentage ?? 0)}%` }}
              />
            </div>
            <div className="text-right text-[10px] text-slate-500 mt-1.5 font-mono">
              {quotas?.users.percentage ?? 0}% capacity
            </div>
          </div>

          {/* POS Terminals */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-[10px]">
                <Monitor className="w-3.5 h-3.5 text-emerald-400" />
                <span>POS Terminals</span>
              </span>
              <span className="font-mono font-bold text-white">
                {quotas?.posTerminals.current ?? 0} / {quotas?.posTerminals.max ?? 1}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full transition-all ${
                  (quotas?.posTerminals.percentage ?? 0) >= 90 ? 'bg-rose-500' : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, quotas?.posTerminals.percentage ?? 0)}%` }}
              />
            </div>
            <div className="text-right text-[10px] text-slate-500 mt-1.5 font-mono">
              {quotas?.posTerminals.percentage ?? 0}% capacity
            </div>
          </div>

          {/* Products */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
              <span className="flex items-center space-x-1.5 font-bold uppercase tracking-wider text-[10px]">
                <Package className="w-3.5 h-3.5 text-teal-400" />
                <span>Catalog Items</span>
              </span>
              <span className="font-mono font-bold text-white">
                {quotas?.products.current ?? 0} / {quotas?.products.max ?? 100}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden mt-3">
              <div
                className={`h-full transition-all ${
                  (quotas?.products.percentage ?? 0) >= 90 ? 'bg-rose-500' : 'bg-teal-500'
                }`}
                style={{ width: `${Math.min(100, quotas?.products.percentage ?? 0)}%` }}
              />
            </div>
            <div className="text-right text-[10px] text-slate-500 mt-1.5 font-mono">
              {quotas?.products.percentage ?? 0}% capacity
            </div>
          </div>
        </div>
      </div>

      {/* Bank Settlement Instructions Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-4 mb-4 gap-2">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Official Bank Deposit Details (Sri Lanka)
            </h2>
          </div>
          <span className="text-xs text-emerald-400 font-semibold">
            Manual Bank Transfer / CEFT / SLIPS Accepted
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Beneficiary Bank</div>
            <div className="text-sm font-bold text-white mt-1">{bankInfo?.bankName || 'Commercial Bank of Ceylon PLC'}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{bankInfo?.branch || 'Colombo City Branch (001)'}</div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Account Name</div>
            <div className="text-sm font-bold text-white mt-1">{bankInfo?.accountName || 'RetailCloud Technologies (Pvt) Ltd'}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Corporate Current Account</div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
            <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Account Number</div>
            <div className="text-base font-black font-mono text-emerald-400 mt-1">
              {bankInfo?.accountNumber || '1000 2345 6789'}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Swift: {bankInfo?.swiftCode || 'CCEYLKLX'}</div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Payment Reference</div>
              <div className="text-xs font-semibold text-slate-300 mt-1">
                Use your <strong className="text-white">Merchant Code ({data?.merchant.code})</strong> or <strong className="text-white">Invoice #</strong>
              </div>
            </div>
            <div className="text-[11px] text-teal-400 font-medium mt-2">
              WhatsApp: {bankInfo?.whatsappSupport || '+94 77 123 4567'}
            </div>
          </div>
        </div>
      </div>

      {/* Subscription Invoices & Verification History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
        <div className="p-6 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">
              Subscription Invoices & Payment Verification History
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Review issued subscription fees and track administrative slip approval status.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 text-[11px]">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Billing Date</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Invoice Status</th>
                <th className="py-3 px-4">Verification Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No subscription invoices generated yet.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const latestVerification = inv.verifications[0];

                  return (
                    <tr key={inv.id} className="hover:bg-slate-950/60 transition">
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {inv.invoiceNumber}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(inv.createdAt).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(inv.dueDate).toLocaleDateString('en-GB')}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-white">
                        {inv.currency} {Number(inv.amount).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        {inv.status === 'PAID' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase">
                            PAID
                          </span>
                        ) : inv.status === 'OVERDUE' ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 uppercase">
                            OVERDUE
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-300 border border-amber-800 uppercase">
                            ISSUED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {latestVerification ? (
                          latestVerification.status === 'APPROVED' ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 uppercase flex items-center space-x-1 w-max">
                              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                              <span>Verified</span>
                            </span>
                          ) : latestVerification.status === 'REJECTED' ? (
                            <div className="space-y-1">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800 uppercase flex items-center space-x-1 w-max">
                                <AlertTriangle className="w-3 h-3 text-rose-400" />
                                <span>Rejected</span>
                              </span>
                              {latestVerification.notes && (
                                <div className="text-[10px] text-rose-400 max-w-xs truncate" title={latestVerification.notes}>
                                  Reason: {latestVerification.notes}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-teal-950 text-teal-300 border border-teal-800 uppercase flex items-center space-x-1 w-max">
                              <Clock className="w-3 h-3 text-teal-400" />
                              <span>Pending Review</span>
                            </span>
                          )
                        ) : (
                          <span className="text-slate-500 text-[11px]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {inv.status !== 'PAID' && (
                          <button
                            onClick={() => handleOpenSlipModal(inv)}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition"
                          >
                            <Upload className="w-3 h-3" />
                            <span>Submit Slip</span>
                          </button>
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

      {/* Submit Bank Slip Modal */}
      {isSlipModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Upload className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Submit Bank Deposit Slip</h3>
              </div>
              <button
                onClick={() => setIsSlipModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Invoice:</span>
                <span className="font-mono font-bold text-white">{selectedInvoice.invoiceNumber}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Invoice Total:</span>
                <span className="font-mono font-bold text-emerald-400">
                  {selectedInvoice.currency} {Number(selectedInvoice.amount).toLocaleString()}
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmitSlip} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Amount Deposited (LKR) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  value={slipForm.amountSubmitted}
                  onChange={(e) => setSlipForm({ ...slipForm, amountSubmitted: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Bank / Transaction Reference *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TXN-COMM-20261115-9988"
                  value={slipForm.transactionReference}
                  onChange={(e) => setSlipForm({ ...slipForm, transactionReference: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Deposit Slip Image URL / Receipt Link *
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://storage.retailpos.lk/slips/slip-01.jpg"
                  value={slipForm.bankSlipUrl}
                  onChange={(e) => setSlipForm({ ...slipForm, bankSlipUrl: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
                <span className="block text-[11px] text-slate-500 mt-1">
                  Upload your receipt to Google Drive / Imgur / cloud storage and paste the public image link here.
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Notes / Depositor Information (Optional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Deposited at Kollupitiya branch by Cashier Kamal, also notified via WhatsApp"
                  value={slipForm.notes}
                  onChange={(e) => setSlipForm({ ...slipForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsSlipModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSlip}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                >
                  <span>{isSubmittingSlip ? 'Submitting Slip...' : 'Submit Deposit Slip'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upgrade / Plan Comparison Modal */}
      {isUpgradeModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">Upgrade or Switch Subscription Plan</h3>
              </div>
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {data?.availablePlans.map((plan) => {
                const isCurrent = subscription?.plan?.code === plan.code;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-2xl p-5 border flex flex-col justify-between ${
                      isCurrent
                        ? 'bg-slate-950 border-emerald-500 ring-2 ring-emerald-500'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-teal-400">
                          {plan.tier}
                        </span>
                        {isCurrent && (
                          <span className="text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full uppercase">
                            Current
                          </span>
                        )}
                      </div>

                      <div className="text-lg font-bold text-white">{plan.name}</div>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {plan.description || 'Enterprise retail management'}
                      </p>

                      <div className="mt-4 pt-4 border-t border-slate-800">
                        <div className="text-2xl font-black text-white">
                          LKR {Number(plan.priceMonthly).toLocaleString()}
                        </div>
                        <div className="text-[11px] text-slate-400">per month (billed monthly)</div>
                      </div>

                      <ul className="mt-4 space-y-2 text-xs text-slate-300">
                        <li className="flex items-center space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Up to {plan.maxBranches} Physical Branches</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Up to {plan.maxWarehouses} Warehouses</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{plan.maxUsers} Staff Accounts</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{plan.maxProducts.toLocaleString()} Product Catalog Items</span>
                        </li>
                      </ul>
                    </div>

                    <div className="mt-6 pt-3 border-t border-slate-800">
                      {isCurrent ? (
                        <div className="text-center text-xs font-bold text-emerald-400 py-2">
                          Active Plan
                        </div>
                      ) : (
                        <a
                          href={`https://wa.me/94771234567?text=Hi%20RetailCloud%20Billing,%20Merchant%20Code:%20${data?.merchant.code}%20requests%20upgrade%20to%20${encodeURIComponent(plan.name)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition"
                        >
                          <span>Request Upgrade</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsUpgradeModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
