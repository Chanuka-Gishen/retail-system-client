'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Store,
  ShoppingBag,
  Receipt,
  LayoutDashboard,
  Layers,
  Warehouse,
  Users,
  ShieldCheck,
  BookOpen,
  Truck,
  FileText,
  PackageCheck,
  FileCheck,
  Undo2,
  CreditCard,
  BarChart3,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Wifi,
  WifiOff,
  RefreshCw,
  LogOut,
  ArrowLeftRight,
  LineChart,
  ScanLine,
  Printer,
} from 'lucide-react';
import { useAuthStore } from '../lib/auth-store';
import { pushQueuedSync, pullCatalogDelta, posDb } from '../lib/pos-db';
import { ThemeToggle } from './ThemeToggle';
import { BranchSwitcher } from './BranchSwitcher';

export interface NavChildItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  description?: string;
}

export interface NavParentSection {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | null;
  description?: string;
  items: NavChildItem[];
}

export const navSections: NavParentSection[] = [
  {
    id: 'operations',
    title: 'Sales & Operations',
    icon: ShoppingBag,
    badge: 'POS',
    description: 'Cash register, sales slips & daily dashboard',
    items: [
      {
        name: 'POS Terminal',
        href: '/pos',
        icon: ShoppingBag,
        badge: 'POS',
        description: 'Cash register & checkout',
      },
      {
        name: 'Invoices & Sales',
        href: '/invoices',
        icon: Receipt,
        badge: null,
        description: 'Sales slips & tax invoices',
      },
      {
        name: 'Customer Returns',
        href: '/returns',
        icon: Undo2,
        badge: 'New',
        description: 'Refunds & 24h item exchange vouchers',
      },
      {
        name: 'Sales Reports',
        href: '/reports',
        icon: LineChart,
        badge: null,
        description: 'Sales trends, cashier stats & CSV exports',
      },
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: LayoutDashboard,
        badge: null,
        description: 'Performance & store metrics',
      },
    ],
  },
  {
    id: 'catalog',
    title: 'Catalog & Inventory',
    icon: Warehouse,
    badge: null,
    description: 'Product SKUs, barcodes & warehouse balances',
    items: [
      {
        name: 'Product Catalog',
        href: '/catalog',
        icon: Layers,
        badge: null,
        description: 'SKUs, pricing & barcodes',
      },
      {
        name: 'Inventory Balances',
        href: '/inventory',
        icon: Warehouse,
        badge: null,
        description: 'Stock on hand & adjustments',
      },
      {
        name: 'Stock Transfers',
        href: '/inventory/transfers',
        icon: ArrowLeftRight,
        badge: null,
        description: 'Inter-branch transfers, dispatch & receive',
      },
      {
        name: 'Stocktake & Audit',
        href: '/inventory/stocktake',
        icon: ScanLine,
        badge: null,
        description: 'Physical inventory counting & variance audit',
      },
      {
        name: 'Barcode & Shelf Tags',
        href: '/inventory/labels',
        icon: Printer,
        badge: null,
        description: 'Printable barcode stickers & shelf price tags',
      },
    ],
  },
  {
    id: 'procurement',
    title: 'Procurement & Suppliers',
    icon: Truck,
    badge: '7',
    description: 'Vendors, POs, GRN, bills & returns',
    items: [
      {
        name: 'Suppliers',
        href: '/suppliers',
        icon: Truck,
        badge: null,
        description: 'Supplier directory & profiles',
      },
      {
        name: 'Purchase Orders',
        href: '/purchasing/orders',
        icon: FileText,
        badge: null,
        description: 'Procurement orders & PRs',
      },
      {
        name: 'Goods Receipt (GRN)',
        href: '/purchasing/grn',
        icon: PackageCheck,
        badge: null,
        description: 'Receiving inspection & stock in',
      },
      {
        name: 'Supplier Invoices',
        href: '/purchasing/invoices',
        icon: FileCheck,
        badge: null,
        description: 'Bills & 3-way matching',
      },
      {
        name: 'Supplier Returns',
        href: '/purchasing/returns',
        icon: Undo2,
        badge: null,
        description: 'Damaged goods & credit notes',
      },
      {
        name: 'Payments & Cheques',
        href: '/purchasing/payments',
        icon: CreditCard,
        badge: null,
        description: 'Settlements & cheque register',
      },
      {
        name: 'Procurement Reports',
        href: '/purchasing/reports',
        icon: BarChart3,
        badge: null,
        description: 'Ageing analysis & spend stats',
      },
    ],
  },
  {
    id: 'finance',
    title: 'Finance & Customers',
    icon: BookOpen,
    badge: null,
    description: 'General ledger, P&L & customer accounts',
    items: [
      {
        name: 'Customer Directory',
        href: '/customers',
        icon: Users,
        badge: null,
        description: 'Loyalty points & accounts',
      },
      {
        name: 'Financial Ledger',
        href: '/accounting',
        icon: BookOpen,
        badge: null,
        description: 'General ledger, P&L & Balance Sheet',
      },
    ],
  },
  {
    id: 'team',
    title: 'Organization & Billing',
    icon: Users,
    badge: null,
    description: 'Staff members, security roles, subscription & billing',
    items: [
      {
        name: 'Staff & Roles',
        href: '/staff',
        icon: ShieldCheck,
        badge: null,
        description: 'Staff directory, roles & permissions',
      },
      {
        name: 'Subscription & Billing',
        href: '/billing',
        icon: CreditCard,
        badge: null,
        description: 'Subscription plan, quotas & deposit slips',
      },
    ],
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, branch, isAuthenticated, logout } = useAuthStore();

  const [mounted, setMounted] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [queuedCount, setQueuedCount] = useState(0);

  // Collapsible section state dictionary: default all sections open
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    operations: true,
    catalog: true,
    procurement: true,
    finance: true,
    team: true,
  });

  const isRouteActive = (href: string) => {
    if (href === '/pos' && (pathname === '/pos' || pathname === '/')) return true;
    return pathname === href || pathname.startsWith(href + '/');
  };

  const isSectionActive = (section: NavParentSection) => {
    return section.items.some((item) => isRouteActive(item.href));
  };

  // Hydration & persisted sidebar state
  useEffect(() => {
    setMounted(true);
    setIsOnline(navigator.onLine);

    try {
      const savedCollapsed = localStorage.getItem('retail_pos_sidebar_collapsed');
      if (savedCollapsed !== null) {
        setIsCollapsed(savedCollapsed === 'true');
      }

      const savedOpen = localStorage.getItem('retail_pos_sidebar_open_sections');
      if (savedOpen) {
        const parsed = JSON.parse(savedOpen);
        // Guarantee currently active route's parent section is always opened
        navSections.forEach((sec) => {
          if (sec.items.some((item) => isRouteActive(item.href))) {
            parsed[sec.id] = true;
          }
        });
        setOpenSections(parsed);
      }
    } catch {
      // ignore
    }

    // Ensure branch is initialized if missing
    if (!useAuthStore.getState().branch?.id && useAuthStore.getState().isAuthenticated) {
      import('../lib/api-client')
        .then(({ apiClient }) => apiClient<any[]>('/merchant/branches'))
        .then((branches) => {
          if (branches && branches.length > 0) {
            useAuthStore.getState().setBranch(branches[0]);
          }
        })
        .catch(() => {});
    }

    const handleOnline = () => {
      setIsOnline(true);
      handleSync();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(async () => {
      try {
        const count = await posDb.queuedSales
          .where('syncStatus')
          .anyOf(['QUEUED', 'FAILED'])
          .count();
        setQueuedCount(count);
      } catch {
        // ignore
      }
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  // When pathname changes, ensure the active section is automatically expanded
  useEffect(() => {
    navSections.forEach((sec) => {
      if (sec.items.some((item) => isRouteActive(item.href))) {
        setOpenSections((prev) => {
          if (prev[sec.id]) return prev;
          const updated = { ...prev, [sec.id]: true };
          try {
            localStorage.setItem('retail_pos_sidebar_open_sections', JSON.stringify(updated));
          } catch {
            // ignore
          }
          return updated;
        });
      }
    });
  }, [pathname]);

  // Keyboard shortcut Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapse();
      }
      if (e.key === 'Escape' && isMobileOpen) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileOpen, isCollapsed]);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileOpen(false);
  }, [pathname]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('retail_pos_sidebar_collapsed', String(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => {
      const next = { ...prev, [sectionId]: !prev[sectionId] };
      try {
        localStorage.setItem('retail_pos_sidebar_open_sections', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const areAllSectionsOpen = navSections.every((sec) => openSections[sec.id]);

  const toggleAllSections = () => {
    const shouldOpenAll = !areAllSectionsOpen;
    const next: Record<string, boolean> = {};
    navSections.forEach((sec) => {
      next[sec.id] = shouldOpenAll;
    });
    setOpenSections(next);
    try {
      localStorage.setItem('retail_pos_sidebar_open_sections', JSON.stringify(next));
    } catch {
      // ignore
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await pushQueuedSync();
      await pullCatalogDelta();
      const count = await posDb.queuedSales
        .where('syncStatus')
        .anyOf(['QUEUED', 'FAILED'])
        .count();
      setQueuedCount(count);
    } catch (err) {
      console.warn('Sync failed:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/login');
  };

  // If on login page or unauthenticated, render clean fullscreen layout
  if (!mounted) {
    return <main className="min-h-screen flex flex-col bg-slate-950 text-slate-100">{children}</main>;
  }

  if (pathname === '/login' || !isAuthenticated) {
    return <main className="min-h-screen flex flex-col bg-slate-950 text-slate-100">{children}</main>;
  }

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-950 text-slate-100 select-none">
      {/* =========================================================================
          1. DESKTOP SIDEBAR (Visible on lg: screens and above)
          ========================================================================= */}
      <aside
        className={`hidden lg:flex flex-col bg-slate-900 border-r border-slate-800 transition-all duration-300 ease-in-out shrink-0 z-30 ${
          isCollapsed ? 'w-20' : 'w-72'
        }`}
      >
        {/* Sidebar Header: Brand & Collapse Toggle */}
        <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <Link
            href="/pos"
            className={`flex items-center space-x-3 overflow-hidden transition-all ${
              isCollapsed ? 'justify-center w-full' : ''
            }`}
            title="Retail Cloud POS"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center shrink-0 text-white">
              <Store className="w-5 h-5" />
            </div>
            {!isCollapsed && (
              <div className="truncate">
                <span className="font-bold text-base tracking-tight text-white block leading-tight">
                  Retail Cloud
                </span>
                <span className="text-[10px] font-semibold text-emerald-400 block tracking-wider uppercase">
                  POS & ERP System
                </span>
              </div>
            )}
          </Link>

          {!isCollapsed && (
            <div className="flex items-center space-x-1">
              <ThemeToggle />
              <button
                onClick={toggleCollapse}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                title="Collapse sidebar (Ctrl+B)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Collapsed expand button banner */}
        {isCollapsed && (
          <div className="px-2 pt-2 flex justify-center">
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition w-full flex items-center justify-center"
              title="Expand sidebar (Ctrl+B)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Active Branch Display (When Expanded) */}
        {!isCollapsed && (
          <div className="px-3.5 py-2 mx-3 mt-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
            <div className="min-w-0">
              <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Active Branch</div>
              <div className="text-xs font-semibold text-slate-200 truncate mt-0.5">
                {branch?.name || 'Flagship Store Colombo'}
              </div>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 ml-2" title="Store Online" />
          </div>
        )}

        {/* Navigation Sections */}
        {!isCollapsed ? (
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
            {/* Quick action bar: section expand/collapse toggle */}
            <div className="flex items-center justify-between px-2 pt-1 pb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Navigation
              </span>
              <button
                type="button"
                onClick={toggleAllSections}
                className="text-[10px] font-medium text-slate-400 hover:text-emerald-400 transition"
                title={areAllSectionsOpen ? 'Collapse all sections' : 'Expand all sections'}
              >
                {areAllSectionsOpen ? 'Collapse All' : 'Expand All'}
              </button>
            </div>

            {/* Parent-Child Collapsible Sections */}
            {navSections.map((section) => {
              const ParentIcon = section.icon;
              const isOpen = !!openSections[section.id];
              const hasActiveChild = isSectionActive(section);

              return (
                <div key={section.id} className="space-y-1">
                  {/* Collapsible Parent Header Button */}
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all select-none group ${
                      hasActiveChild
                        ? 'text-emerald-300 bg-emerald-950 border border-emerald-800'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className={`p-1.5 rounded-lg transition-colors ${
                          hasActiveChild
                            ? 'bg-emerald-950 text-emerald-400'
                            : 'bg-slate-800 text-slate-400 group-hover:text-slate-200'
                        }`}
                      >
                        <ParentIcon className="w-4 h-4 shrink-0" />
                      </div>
                      <span className="truncate uppercase text-[11px] font-bold tracking-wider">
                        {section.title}
                      </span>
                    </div>

                    <div className="flex items-center space-x-1.5 shrink-0 ml-1">
                      {section.badge ? (
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                            hasActiveChild
                              ? 'bg-emerald-600 text-emerald-200'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {section.badge}
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-500">
                          {section.items.length}
                        </span>
                      )}
                      <ChevronDown
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          isOpen ? 'rotate-0 text-slate-300' : '-rotate-90 text-slate-500'
                        }`}
                      />
                    </div>
                  </button>

                  {/* Child Links List with Visual Tree Guide */}
                  {isOpen && (
                    <div className="ml-3.5 pl-3 border-l border-slate-800 space-y-1 py-0.5">
                      {section.items.map((item) => {
                        const ChildIcon = item.icon;
                        const active = isRouteActive(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center rounded-xl transition-all font-medium text-xs group px-2.5 py-2 space-x-2.5 ${
                              active
                                ? 'bg-emerald-950 text-emerald-300 font-semibold border-l-2 border-emerald-500 shadow-sm'
                                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
                            }`}
                          >
                            <ChildIcon
                              className={`w-4 h-4 shrink-0 transition-colors ${
                                active ? 'text-emerald-400' : 'text-slate-500 group-hover:text-slate-300'
                              }`}
                            />
                            <div className="flex-1 flex items-center justify-between min-w-0">
                              <span className="truncate">{item.name}</span>
                              {item.badge && (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                                    active
                                      ? 'bg-emerald-950 text-emerald-300'
                                      : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* Collapsed Desktop View (Icon Mode with Hover Flyout) */
          <div className="flex-1 overflow-y-auto px-2 py-4 space-y-3">
            {navSections.map((section) => {
              const ParentIcon = section.icon;
              const hasActiveChild = isSectionActive(section);

              return (
                <div key={section.id} className="relative group flex justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCollapsed(false);
                      setOpenSections((prev) => ({ ...prev, [section.id]: true }));
                    }}
                    className={`p-3 rounded-xl transition-all relative flex items-center justify-center ${
                      hasActiveChild
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                    title={section.title}
                  >
                    <ParentIcon className="w-5 h-5 shrink-0" />
                    {hasActiveChild && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
                    )}
                  </button>

                  {/* Hover Flyout Dropdown */}
                  <div className="hidden group-hover:block absolute left-full top-0 ml-2 w-64 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3 py-2 text-xs font-bold text-slate-200 border-b border-slate-800 flex items-center justify-between mb-1">
                      <span className="uppercase tracking-wider">{section.title}</span>
                      <span className="text-[10px] text-slate-500 font-normal">
                        {section.items.length} items
                      </span>
                    </div>
                    <div className="space-y-0.5">
                      {section.items.map((item) => {
                        const ChildIcon = item.icon;
                        const active = isRouteActive(item.href);

                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center space-x-2.5 px-2.5 py-1.5 rounded-lg text-xs transition ${
                              active
                                ? 'bg-emerald-950 text-emerald-300 font-semibold'
                                : 'text-slate-400 hover:text-white hover:bg-slate-800'
                            }`}
                          >
                            <ChildIcon
                              className={`w-3.5 h-3.5 shrink-0 ${
                                active ? 'text-emerald-400' : 'text-slate-400'
                              }`}
                            />
                            <span className="truncate">{item.name}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Sidebar Footer: Connectivity, Sync, User Profile */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 shrink-0 space-y-2">
          {/* Online/Offline Status Indicator */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between px-2 py-1 text-xs">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isOnline ? 'bg-emerald-400' : 'bg-rose-400'
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isOnline ? 'bg-emerald-500' : 'bg-rose-500'
                    }`}
                  />
                </span>
                <span className={`text-[11px] font-semibold ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {isOnline ? 'ONLINE' : 'OFFLINE MODE'}
                </span>
              </div>

              {/* Sync Button */}
              <button
                onClick={handleSync}
                disabled={isSyncing || !isOnline}
                className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-700 transition"
                title="Synchronize offline sales and update catalog cache"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                <span className="text-[11px]">Sync</span>
                {queuedCount > 0 && (
                  <span className="bg-amber-500 text-slate-950 font-extrabold px-1.5 rounded-full text-[10px]">
                    {queuedCount}
                  </span>
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-2">
              <ThemeToggle size="sm" />
              <div
                className={`w-2.5 h-2.5 rounded-full ${isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'}`}
                title={isOnline ? 'Connected (Online)' : 'Offline Mode'}
              />
              <button
                onClick={handleSync}
                disabled={isSyncing || !isOnline}
                className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 relative transition"
                title="Synchronize data"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                {queuedCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-amber-500 text-slate-950 font-bold px-1 rounded-full text-[9px]">
                    {queuedCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* User Profile & Logout */}
          <div
            className={`flex items-center rounded-xl bg-slate-950 border border-slate-800 ${
              isCollapsed ? 'justify-center p-2' : 'p-2.5 justify-between'
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                {user?.firstName ? user.firstName[0] : 'U'}
                {user?.lastName ? user.lastName[0] : 'M'}
              </div>

              {!isCollapsed && (
                <div className="min-w-0 truncate">
                  <div className="text-xs font-semibold text-slate-100 truncate">
                    {user?.firstName} {user?.lastName}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate capitalize">
                    {user?.role?.toLowerCase() || 'Cashier'}
                  </div>
                </div>
              )}
            </div>

            {!isCollapsed && (
              <button
                onClick={handleLogout}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950 transition shrink-0 ml-1"
                title="Sign out of Retail Cloud POS"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>

          {isCollapsed && (
            <button
              onClick={handleLogout}
              className="w-full p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950 transition flex justify-center"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN CONTENT AREA (Includes Mobile Header for < lg screens)
          ========================================================================= */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden bg-slate-950">
        {/* Mobile Top Header Bar (lg:hidden) */}
        <header className="lg:hidden h-16 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 z-20 gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3 min-w-0 shrink-0">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition shrink-0"
              aria-label="Open mobile navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <Link href="/pos" className="flex items-center space-x-2 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-white shrink-0">
                <Store className="w-4 h-4" />
              </div>
              <span className="font-bold text-sm sm:text-base tracking-tight text-white truncate hidden xs:inline sm:inline">
                Retail Cloud POS
              </span>
            </Link>
          </div>

          {/* Mobile Right Controls: Online status, Branch & User */}
          <div className="flex items-center space-x-1.5 sm:space-x-2 shrink-0">
            <BranchSwitcher />

            <div
              className={`flex items-center space-x-1 px-2 py-1 rounded-full text-[11px] font-bold ${
                isOnline
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse'
              }`}
              title={isOnline ? 'Cloud Online' : 'Offline Mode'}
            >
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} />
              <span className="hidden md:inline">{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
            </div>

            <ThemeToggle />

            <button
              onClick={handleLogout}
              className="p-1.5 sm:p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Desktop Top Header Bar (hidden on mobile, visible on lg) */}
        <header className="hidden lg:flex h-14 bg-slate-900 border-b border-slate-800 px-6 items-center justify-between shrink-0 z-20">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Store:</span>
            <BranchSwitcher />
          </div>

          <div className="flex items-center space-x-3">
            <div
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                isOnline
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800 animate-pulse'
              }`}
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'Cloud Synced' : 'Offline Mode'}</span>
            </div>

            <ThemeToggle />
          </div>
        </header>

        {/* Primary Page Content Container */}
        <div
          className={`flex-1 min-w-0 ${
            pathname === '/pos' ? 'h-full overflow-hidden flex flex-col' : 'overflow-y-auto'
          }`}
        >
          {children}
        </div>
      </div>

      {/* =========================================================================
          3. RESPONSIVE MOBILE DRAWER (For smartphones and tablets < lg)
          ========================================================================= */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop with smooth blur */}
          <div
            className="fixed inset-0 bg-slate-950 transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />

          {/* Slide-out Drawer Menu */}
          <div className="relative w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800 h-full flex flex-col shadow-2xl z-50">
            {/* Drawer Header */}
            <div className="h-16 px-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-base text-white">Retail Cloud POS</div>
                  <div className="text-[10px] text-emerald-400 font-semibold tracking-wider uppercase">
                    Merchant Platform
                  </div>
                </div>
              </div>

              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Active Branch Display */}
            <div className="px-4 py-2.5 mx-4 mt-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[9px] uppercase font-bold text-slate-500 tracking-wider">Branch</div>
                <div className="text-xs font-semibold text-slate-200 truncate mt-0.5">
                  {branch?.name || 'Flagship Store Colombo'}
                </div>
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            </div>

            {/* Collapsible Mobile Navigation Links */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Navigation
                </span>
                <button
                  type="button"
                  onClick={toggleAllSections}
                  className="text-[10px] font-medium text-slate-400 hover:text-emerald-400 transition"
                >
                  {areAllSectionsOpen ? 'Collapse All' : 'Expand All'}
                </button>
              </div>

              {navSections.map((section) => {
                const ParentIcon = section.icon;
                const isOpen = !!openSections[section.id];
                const hasActiveChild = isSectionActive(section);

                return (
                  <div key={section.id} className="space-y-1">
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition select-none ${
                        hasActiveChild
                          ? 'text-emerald-300 bg-emerald-950 border border-emerald-800'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div
                          className={`p-1.5 rounded-lg ${
                            hasActiveChild ? 'bg-emerald-950 text-emerald-400' : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          <ParentIcon className="w-4 h-4 shrink-0" />
                        </div>
                        <span className="uppercase text-xs font-bold tracking-wider truncate">
                          {section.title}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2 shrink-0">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400">
                          {section.items.length}
                        </span>
                        <ChevronDown
                          className={`w-4 h-4 transition-transform duration-200 ${
                            isOpen ? 'rotate-0 text-slate-300' : '-rotate-90 text-slate-500'
                          }`}
                        />
                      </div>
                    </button>

                    {isOpen && (
                      <div className="ml-4 pl-3 border-l border-slate-800 space-y-1 pt-1">
                        {section.items.map((item) => {
                          const ChildIcon = item.icon;
                          const active = isRouteActive(item.href);

                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => setIsMobileOpen(false)}
                              className={`flex items-center justify-between px-3 py-2.5 rounded-xl transition text-xs font-medium ${
                                active
                                  ? 'bg-emerald-950 text-emerald-300 font-semibold border-l-2 border-emerald-500'
                                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
                              }`}
                            >
                              <div className="flex items-center space-x-3 min-w-0">
                                <ChildIcon
                                  className={`w-4 h-4 shrink-0 ${active ? 'text-emerald-400' : 'text-slate-400'}`}
                                />
                                <div className="truncate">
                                  <div className="truncate">{item.name}</div>
                                  {item.description && (
                                    <div className="text-[10px] text-slate-500 font-normal truncate">
                                      {item.description}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {item.badge && (
                                <span
                                  className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0 ml-2 ${
                                    active ? 'bg-emerald-950 text-emerald-300' : 'bg-slate-800 text-slate-400'
                                  }`}
                                >
                                  {item.badge}
                                </span>
                              )}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Drawer Footer */}
            <div className="p-4 border-t border-slate-800 bg-slate-900 space-y-3 shrink-0">
              <ThemeToggle showLabel className="w-full justify-center py-2" />

              <div className="flex items-center justify-between px-2 py-1 text-xs">
                <div className="flex items-center space-x-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${
                      isOnline ? 'bg-emerald-500' : 'bg-rose-500 animate-pulse'
                    }`}
                  />
                  <span className={`text-[11px] font-semibold ${isOnline ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isOnline ? 'ONLINE' : 'OFFLINE MODE'}
                  </span>
                </div>

                <button
                  onClick={handleSync}
                  disabled={isSyncing || !isOnline}
                  className="flex items-center space-x-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs px-2.5 py-1 rounded-lg border border-slate-700 transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-400' : ''}`} />
                  <span>Sync Now</span>
                  {queuedCount > 0 && (
                    <span className="bg-amber-500 text-slate-950 font-bold px-1.5 rounded-full text-[10px]">
                      {queuedCount}
                    </span>
                  )}
                </button>
              </div>

              {/* User Bar */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-9 h-9 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {user?.firstName ? user.firstName[0] : 'U'}
                    {user?.lastName ? user.lastName[0] : 'M'}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-semibold text-slate-100 truncate">
                      {user?.firstName} {user?.lastName}
                    </div>
                    <div className="text-[10px] text-slate-400 capitalize truncate">
                      {user?.role?.toLowerCase() || 'Cashier'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950 transition shrink-0 ml-1"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
