'use client';

import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  UserPlus,
  ShieldCheck,
  ShieldAlert,
  Shield,
  Store,
  Warehouse,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../lib/auth-store';

interface CustomRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  userCount?: number;
  isSystem?: boolean;
}

interface StaffUser {
  id: string;
  merchantId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: string;
  customRoleId?: string;
  isActive: boolean;
  isOwner: boolean;
  lastLoginAt?: string;
  createdAt: string;
  customRole?: CustomRole;
  branchAccess: { branch: { id: string; code: string; name: string; isMain?: boolean } }[];
  warehouseAccess: { warehouse: { id: string; code: string; name: string; isMain?: boolean } }[];
}

interface UserQuota {
  currentUsers: number;
  maxUsers: number;
  planName: string;
  planCode: string;
  isLimitReached: boolean;
  remainingSlots: number;
}

interface Branch {
  id: string;
  code: string;
  name: string;
  isMain?: boolean;
}

interface WarehouseItem {
  id: string;
  code: string;
  name: string;
  isMain?: boolean;
}

interface PermissionDef {
  category: string;
  code: string;
  name: string;
  description: string;
}

const SYSTEM_ROLES_INFO: Record<string, { label: string; color: string; desc: string }> = {
  MERCHANT_OWNER: {
    label: 'Primary Owner',
    color: 'bg-teal-950 text-teal-300 border-teal-800',
    desc: 'Unrestricted master owner privileges over all stores, staff, and financial data',
  },
  MERCHANT_ADMIN: {
    label: 'Administrator',
    color: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    desc: 'Full administrative access to manage inventory, catalog, team, and store branches',
  },
  BRANCH_MANAGER: {
    label: 'Branch Manager',
    color: 'bg-sky-950 text-sky-300 border-sky-800',
    desc: 'Store operations, daily cash register reconciliation, and branch stock transfers',
  },
  CASHIER: {
    label: 'Cashier / POS Staff',
    color: 'bg-emerald-950 text-emerald-300 border-emerald-800',
    desc: 'POS barcode scan, cash register checkout, and customer transaction slips',
  },
  INVENTORY_CLERK: {
    label: 'Inventory Clerk',
    color: 'bg-amber-950 text-amber-300 border-amber-800',
    desc: 'Goods received notes (GRN), warehouse stock counts, and adjustments',
  },
  ACCOUNTANT: {
    label: 'Accountant',
    color: 'bg-teal-950 text-teal-300 border-teal-800',
    desc: 'Double-entry general ledger, chart of accounts, and financial statement reports',
  },
  CUSTOM: {
    label: 'Custom Role',
    color: 'bg-fuchsia-950 text-fuchsia-300 border-fuchsia-800',
    desc: 'Granular tailored permissions configured specifically for your business',
  },
};

export default function StaffManagementPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  const [activeTab, setActiveTab] = useState<'staff' | 'roles'>('staff');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Core Data
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [quota, setQuota] = useState<UserQuota | null>(null);
  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [warehouses, setWarehouses] = useState<WarehouseItem[]>([]);
  const [allPermissions, setAllPermissions] = useState<PermissionDef[]>([]);

  // Filtering & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  // Add User Modal State
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [addUserForm, setAddUserForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    role: 'CASHIER',
    customRoleId: '',
    allBranches: true,
    branchIds: [] as string[],
    allWarehouses: true,
    warehouseIds: [] as string[],
  });

  // Edit User Modal State
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<StaffUser | null>(null);
  const [editUserForm, setEditUserForm] = useState({
    firstName: '',
    lastName: '',
    phone: '',
    role: 'CASHIER',
    customRoleId: '',
    isActive: true,
    resetPassword: '',
    allBranches: true,
    branchIds: [] as string[],
    allWarehouses: true,
    warehouseIds: [] as string[],
  });

  // Custom Role Modal State (Create / Edit)
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleForm, setRoleForm] = useState({
    name: '',
    description: '',
    permissions: [] as string[],
  });

  // Check auth
  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, router]);

  // Load all initial staff & metadata
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const [usersRes, quotaRes, rolesRes, branchesRes, warehousesRes, permsRes] =
        await Promise.allSettled([
          apiClient<StaffUser[]>('/merchant/users'),
          apiClient<UserQuota>('/merchant/users/quota'),
          apiClient<{ systemRoles: any[]; customRoles: CustomRole[] }>('/merchant/roles'),
          apiClient<Branch[]>('/merchant/branches'),
          apiClient<WarehouseItem[]>('/merchant/warehouses'),
          apiClient<PermissionDef[]>('/merchant/roles/permissions'),
        ]);

      if (usersRes.status === 'fulfilled') {
        setUsers(Array.isArray(usersRes.value) ? usersRes.value : []);
      }
      if (quotaRes.status === 'fulfilled') {
        setQuota(quotaRes.value);
      }
      if (rolesRes.status === 'fulfilled') {
        setCustomRoles(rolesRes.value?.customRoles || []);
      }
      if (branchesRes.status === 'fulfilled') {
        setBranches(Array.isArray(branchesRes.value) ? branchesRes.value : []);
      }
      if (warehousesRes.status === 'fulfilled') {
        setWarehouses(Array.isArray(warehousesRes.value) ? warehousesRes.value : []);
      }
      if (permsRes.status === 'fulfilled') {
        setAllPermissions(Array.isArray(permsRes.value) ? permsRes.value : []);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load staff data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Grouped Permissions by Category
  const permissionsByCategory = useMemo(() => {
    const map = new Map<string, PermissionDef[]>();
    allPermissions.forEach((p) => {
      const cat = p.category || 'General';
      if (!map.has(cat)) {
        map.set(cat, []);
      }
      map.get(cat)!.push(p);
    });
    return Array.from(map.entries());
  }, [allPermissions]);

  // Filtered Staff List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesQuery = !q || fullName.includes(q) || email.includes(q) || phone.includes(q);
      const matchesRole = !roleFilter || u.role === roleFilter;

      return matchesQuery && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // ==========================================
  // ADD STAFF USER
  // ==========================================
  const handleOpenAddUserModal = () => {
    if (quota && quota.isLimitReached) {
      setErrorMessage(
        `Staff subscription limit reached (${quota.currentUsers}/${quota.maxUsers} on ${quota.planName}). Please upgrade your plan to add more staff.`,
      );
      return;
    }
    setAddUserForm({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
      role: 'CASHIER',
      customRoleId: customRoles[0]?.id || '',
      allBranches: true,
      branchIds: branches.map((b) => b.id),
      allWarehouses: true,
      warehouseIds: warehouses.map((w) => w.id),
    });
    setShowPassword(false);
    setErrorMessage(null);
    setIsAddUserModalOpen(true);
  };

  const handleAddUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quota && quota.isLimitReached) {
      alert(`Plan limit reached (${quota.maxUsers} staff maximum). Please upgrade your plan.`);
      return;
    }

    if (!addUserForm.firstName.trim() || !addUserForm.lastName.trim() || !addUserForm.email.trim()) {
      alert('First Name, Last Name and Email are required.');
      return;
    }

    if (!addUserForm.password || addUserForm.password.length < 8) {
      alert('Password must be at least 8 characters long.');
      return;
    }

    if (addUserForm.role === 'CUSTOM' && !addUserForm.customRoleId) {
      alert('Please select a Custom Role.');
      return;
    }

    setActionLoading('add-user');
    setErrorMessage(null);
    try {
      const payload: any = {
        firstName: addUserForm.firstName.trim(),
        lastName: addUserForm.lastName.trim(),
        email: addUserForm.email.trim().toLowerCase(),
        phone: addUserForm.phone.trim() || undefined,
        password: addUserForm.password,
        role: addUserForm.role,
        customRoleId: addUserForm.role === 'CUSTOM' ? addUserForm.customRoleId : undefined,
        branchIds: addUserForm.allBranches ? undefined : addUserForm.branchIds,
        warehouseIds: addUserForm.allWarehouses ? undefined : addUserForm.warehouseIds,
      };

      await apiClient('/merchant/users', {
        method: 'POST',
        body: payload,
      });

      setIsAddUserModalOpen(false);
      setSuccessMessage(`Staff member "${addUserForm.firstName} ${addUserForm.lastName}" created successfully!`);
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create staff member');
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================
  // EDIT STAFF USER
  // ==========================================
  const handleOpenEditUserModal = (u: StaffUser) => {
    setEditingUser(u);
    const assignedBranchIds = (u.branchAccess || []).map((b) => b.branch?.id || (b as any).branchId);
    const assignedWarehouseIds = (u.warehouseAccess || []).map((w) => w.warehouse?.id || (w as any).warehouseId);

    const hasAllBranches = assignedBranchIds.length === 0 || assignedBranchIds.length === branches.length;
    const hasAllWarehouses = assignedWarehouseIds.length === 0 || assignedWarehouseIds.length === warehouses.length;

    setEditUserForm({
      firstName: u.firstName || '',
      lastName: u.lastName || '',
      phone: u.phone || '',
      role: u.role || 'CASHIER',
      customRoleId: u.customRoleId || customRoles[0]?.id || '',
      isActive: u.isActive,
      resetPassword: '',
      allBranches: hasAllBranches,
      branchIds: hasAllBranches ? branches.map((b) => b.id) : assignedBranchIds,
      allWarehouses: hasAllWarehouses,
      warehouseIds: hasAllWarehouses ? warehouses.map((w) => w.id) : assignedWarehouseIds,
    });
    setErrorMessage(null);
    setIsEditUserModalOpen(true);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setActionLoading('edit-user');
    setErrorMessage(null);
    try {
      const payload: any = {
        firstName: editUserForm.firstName.trim() || undefined,
        lastName: editUserForm.lastName.trim() || undefined,
        phone: editUserForm.phone.trim() || undefined,
        role: editingUser.isOwner ? undefined : editUserForm.role,
        customRoleId:
          !editingUser.isOwner && editUserForm.role === 'CUSTOM'
            ? editUserForm.customRoleId
            : undefined,
        isActive: editingUser.isOwner ? true : editUserForm.isActive,
        branchIds: editUserForm.allBranches ? [] : editUserForm.branchIds,
        warehouseIds: editUserForm.allWarehouses ? [] : editUserForm.warehouseIds,
      };

      if (editUserForm.resetPassword.trim()) {
        if (editUserForm.resetPassword.trim().length < 8) {
          alert('New password must be at least 8 characters long.');
          setActionLoading(null);
          return;
        }
        payload.password = editUserForm.resetPassword.trim();
      }

      await apiClient(`/merchant/users/${editingUser.id}`, {
        method: 'PUT',
        body: payload,
      });

      setIsEditUserModalOpen(false);
      setSuccessMessage(`Staff member "${editUserForm.firstName} ${editUserForm.lastName}" updated successfully!`);
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update staff member');
    } finally {
      setActionLoading(null);
    }
  };

  // Toggle user active status
  const handleToggleUserStatus = async (u: StaffUser) => {
    if (u.isOwner) {
      alert('The primary organization owner cannot be deactivated.');
      return;
    }

    const nextState = !u.isActive;
    const confirmMsg = nextState
      ? `Re-activate staff login for ${u.firstName} ${u.lastName}?`
      : `Deactivate ${u.firstName} ${u.lastName}? They will be blocked from logging into the POS and back-office immediately.`;

    if (!window.confirm(confirmMsg)) return;

    setActionLoading(`toggle-${u.id}`);
    try {
      await apiClient(`/merchant/users/${u.id}`, {
        method: 'PUT',
        body: { isActive: nextState },
      });
      setSuccessMessage(`User status updated to ${nextState ? 'ACTIVE' : 'INACTIVE'}.`);
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update user status');
    } finally {
      setActionLoading(null);
    }
  };

  // ==========================================
  // CUSTOM ROLES & PERMISSIONS
  // ==========================================
  const handleOpenCreateRoleModal = () => {
    setEditingRoleId(null);
    setRoleForm({
      name: '',
      description: '',
      permissions: ['pos.sale.create', 'pos.sale.view', 'catalog.product.view'],
    });
    setErrorMessage(null);
    setIsRoleModalOpen(true);
  };

  const handleOpenEditRoleModal = (role: CustomRole) => {
    setEditingRoleId(role.id);
    setRoleForm({
      name: role.name || '',
      description: role.description || '',
      permissions: Array.isArray(role.permissions) ? role.permissions : [],
    });
    setErrorMessage(null);
    setIsRoleModalOpen(true);
  };

  const handleTogglePermission = (permCode: string) => {
    setRoleForm((prev) => {
      const exists = prev.permissions.includes(permCode);
      return {
        ...prev,
        permissions: exists
          ? prev.permissions.filter((p) => p !== permCode)
          : [...prev.permissions, permCode],
      };
    });
  };

  const handleToggleCategory = (categoryPerms: PermissionDef[], shouldSelectAll: boolean) => {
    setRoleForm((prev) => {
      const catCodes = categoryPerms.map((p) => p.code);
      if (shouldSelectAll) {
        const set = new Set([...prev.permissions, ...catCodes]);
        return { ...prev, permissions: Array.from(set) };
      } else {
        return {
          ...prev,
          permissions: prev.permissions.filter((p) => !catCodes.includes(p)),
        };
      }
    });
  };

  const handleRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleForm.name.trim()) {
      alert('Role Name is required.');
      return;
    }

    setActionLoading('save-role');
    setErrorMessage(null);
    try {
      const payload = {
        name: roleForm.name.trim(),
        description: roleForm.description.trim() || undefined,
        permissions: roleForm.permissions,
      };

      if (editingRoleId) {
        await apiClient(`/merchant/roles/${editingRoleId}`, {
          method: 'PUT',
          body: payload,
        });
        setSuccessMessage(`Custom role "${roleForm.name}" updated successfully!`);
      } else {
        await apiClient('/merchant/roles', {
          method: 'POST',
          body: payload,
        });
        setSuccessMessage(`Custom role "${roleForm.name}" created successfully!`);
      }

      setIsRoleModalOpen(false);
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save custom role');
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteRole = async (role: CustomRole) => {
    if ((role.userCount || 0) > 0) {
      alert(
        `Cannot delete role "${role.name}" because ${role.userCount} staff member(s) are currently assigned to it. Reassign them first.`,
      );
      return;
    }

    if (!window.confirm(`Are you sure you want to permanently delete custom role "${role.name}"?`)) {
      return;
    }

    setActionLoading(`delete-role-${role.id}`);
    try {
      await apiClient(`/merchant/roles/${role.id}`, { method: 'DELETE' });
      setSuccessMessage(`Custom role "${role.name}" deleted successfully.`);
      await fetchData();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to delete custom role');
    } finally {
      setActionLoading(null);
    }
  };

  // Quota percentage for progress bar
  const quotaPercent = quota
    ? Math.min(100, Math.round((quota.currentUsers / quota.maxUsers) * 100))
    : 0;

  return (
    <div className="flex-1 bg-slate-950 p-6 max-w-7xl mx-auto w-full space-y-6">
      {/* Alert Messages */}
      {errorMessage && (
        <div className="bg-rose-950 border border-rose-800 text-rose-300 px-4 py-3 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="bg-emerald-950 border border-emerald-800 text-emerald-300 px-4 py-3 rounded-xl flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Subscription Limit Warning Banner */}
      {quota && quota.isLimitReached && (
        <div className="bg-amber-950 border border-amber-800 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-in fade-in">
          <div className="flex items-start space-x-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-900 border border-amber-700 text-amber-300 flex items-center justify-center flex-shrink-0 mt-0.5">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-bold text-white">Staff Member Quota Limit Reached</h4>
                <span className="bg-amber-900 text-amber-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border border-amber-700">
                  {quota.currentUsers} / {quota.maxUsers} Users
                </span>
              </div>
              <p className="text-xs text-amber-200 mt-1 max-w-2xl leading-relaxed">
                Your current <strong className="text-white">{quota.planName}</strong> plan allows a maximum of{' '}
                <strong className="text-white font-mono">{quota.maxUsers} staff accounts</strong>. To register additional store cashiers, branch managers, or accountants, please request a plan upgrade from platform administration.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Page Header & Top Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-950 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Staff & Team Access</h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Provision cashier logins, assign store branches, and configure granular role permissions
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 rounded-xl transition"
            title="Refresh staff list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
          </button>

          <button
            onClick={handleOpenCreateRoleModal}
            className="inline-flex items-center space-x-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition"
          >
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>New Custom Role</span>
          </button>

          <button
            onClick={handleOpenAddUserModal}
            disabled={quota ? quota.isLimitReached : false}
            className={`inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-lg ${
              quota && quota.isLimitReached
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
            }`}
            title={quota?.isLimitReached ? 'Staff user limit reached for your plan' : 'Add new staff member'}
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff Member</span>
          </button>
        </div>
      </div>

      {/* KPI & Quota Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Subscription Quota */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
            <span>Staff Quota Limit</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="text-2xl font-black text-white">{quota ? quota.currentUsers : users.length}</span>
            <span className="text-xs text-slate-400">/ {quota ? quota.maxUsers : '—'} users allowed</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                quotaPercent >= 100
                  ? 'bg-rose-500'
                  : quotaPercent >= 80
                  ? 'bg-amber-400'
                  : 'bg-emerald-500'
              }`}
              style={{ width: `${quotaPercent}%` }}
            ></div>
          </div>
          <div className="text-[11px] text-slate-400 pt-0.5">
            Plan: <strong className="text-slate-200">{quota?.planName || 'Standard Plan'}</strong>
            {quota && quota.remainingSlots > 0 ? (
              <span className="text-emerald-400 font-semibold ml-1">({quota.remainingSlots} slots free)</span>
            ) : quota?.isLimitReached ? (
              <span className="text-rose-400 font-semibold ml-1">(Limit Reached)</span>
            ) : null}
          </div>
        </div>

        {/* Card 2: Active Operators */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
            <span>Active Staff</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {users.filter((u) => u.isActive).length}
          </div>
          <div className="text-[11px] text-slate-400">
            {users.filter((u) => !u.isActive).length} accounts deactivated / suspended
          </div>
        </div>

        {/* Card 3: Physical Branches */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
            <span>Store Branches</span>
            <Store className="w-4 h-4 text-sky-400" />
          </div>
          <div className="text-2xl font-black text-white">{branches.length}</div>
          <div className="text-[11px] text-slate-400">
            Assigned across cashier and manager permissions
          </div>
        </div>

        {/* Card 4: Security Roles */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-slate-400">
            <span>Security Roles</span>
            <Shield className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-black text-white">{customRoles.length + 5}</div>
          <div className="text-[11px] text-slate-400">
            5 Standard System + {customRoles.length} Custom Roles
          </div>
        </div>
      </div>

      {/* Tabs Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-1.5 flex items-center space-x-1 text-xs font-semibold">
        <button
          onClick={() => setActiveTab('staff')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition ${
            activeTab === 'staff'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff Directory ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('roles')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition ${
            activeTab === 'roles'
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4" />
          <span>Roles & Granular Permissions ({customRoles.length + 5})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: STAFF DIRECTORY                                   */}
      {/* ======================================================== */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3 rounded-2xl">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff name, email, phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl pl-9 pr-8 py-2 focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Staff Roles</option>
                <option value="MERCHANT_OWNER">Primary Owner</option>
                <option value="MERCHANT_ADMIN">Administrator</option>
                <option value="BRANCH_MANAGER">Branch Manager</option>
                <option value="CASHIER">Cashier</option>
                <option value="INVENTORY_CLERK">Inventory Clerk</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="CUSTOM">Custom Roles</option>
              </select>
            </div>
          </div>

          {/* Staff Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 border-b border-slate-800 text-slate-400 uppercase font-semibold">
                  <tr>
                    <th className="py-3 px-4">Staff Member</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Role & Permissions</th>
                    <th className="py-3 px-4">Store Access Scoping</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-emerald-400 mb-2" />
                        <span>Loading staff members...</span>
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                        <p className="font-semibold text-slate-400">No staff members found</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {searchQuery || roleFilter ? 'Try clearing your filters' : 'Add your first staff member to get started'}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => {
                      const roleConfig = SYSTEM_ROLES_INFO[u.role] || {
                        label: u.role,
                        color: 'bg-slate-800 text-slate-300 border-slate-700',
                        desc: '',
                      };
                      const customRoleName = u.customRole?.name;
                      const hasBranchAccess = u.branchAccess && u.branchAccess.length > 0;
                      const initials = `${(u.firstName || '').charAt(0)}${(u.lastName || '').charAt(0)}`.toUpperCase() || 'U';

                      return (
                        <tr key={u.id} className="hover:bg-slate-850 transition">
                          {/* Staff Member Avatar & Name */}
                          <td className="py-3 px-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {initials}
                              </div>
                              <div>
                                <div className="font-semibold text-white flex items-center space-x-1.5">
                                  <span>{u.firstName} {u.lastName}</span>
                                  {u.isOwner && (
                                    <span className="bg-teal-950 text-teal-300 border border-teal-800 text-[9px] font-extrabold px-1.5 py-0.2 rounded uppercase">
                                      Owner
                                    </span>
                                  )}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  Added {new Date(u.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Contact Info */}
                          <td className="py-3 px-4">
                            <div className="text-slate-300 font-mono text-[11px]">{u.email}</div>
                            {u.phone && <div className="text-slate-500 text-[11px] mt-0.5">{u.phone}</div>}
                          </td>

                          {/* Role Badge */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${roleConfig.color}`}>
                                {u.role === 'CUSTOM' && customRoleName ? `CUSTOM: ${customRoleName}` : roleConfig.label}
                              </span>
                              {u.role === 'CUSTOM' && u.customRole?.permissions && (
                                <div className="text-[10px] text-slate-500">
                                  {u.customRole.permissions.length} granular permissions
                                </div>
                              )}
                            </div>
                          </td>

                          {/* Store Scoping */}
                          <td className="py-3 px-4">
                            <div className="space-y-1">
                              {hasBranchAccess ? (
                                <div className="flex items-center flex-wrap gap-1">
                                  {u.branchAccess.map((b) => (
                                    <span
                                      key={b.branch?.id || Math.random()}
                                      className="inline-flex items-center space-x-1 bg-slate-950 text-sky-400 border border-slate-800 px-1.5 py-0.5 rounded text-[10px] font-mono"
                                    >
                                      <Store className="w-2.5 h-2.5 text-sky-400" />
                                      <span>{b.branch?.code || b.branch?.name}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[11px] flex items-center space-x-1">
                                  <Store className="w-3 h-3 text-slate-500" />
                                  <span>All Branches</span>
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 text-center">
                            <button
                              onClick={() => handleToggleUserStatus(u)}
                              disabled={u.isOwner || actionLoading === `toggle-${u.id}`}
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition border ${
                                u.isActive
                                  ? 'bg-emerald-950 text-emerald-400 border-emerald-800 hover:bg-emerald-900'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750'
                              } ${u.isOwner ? 'cursor-default' : 'cursor-pointer'}`}
                              title={u.isOwner ? 'Owner cannot be deactivated' : 'Click to toggle status'}
                            >
                              {u.isActive ? 'ACTIVE' : 'INACTIVE'}
                            </button>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleOpenEditUserModal(u)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition"
                              title="Edit staff member permissions"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
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
      )}

      {/* ======================================================== */}
      {/* TAB 2: ROLES & GRANULAR PERMISSIONS                     */}
      {/* ======================================================== */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          {/* Custom Roles List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-teal-400" />
                  <span>Custom Organization Roles ({customRoles.length})</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Granular security roles customized for your shop workflows
                </p>
              </div>
              <button
                onClick={handleOpenCreateRoleModal}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-xl text-xs font-bold transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Create Role</span>
              </button>
            </div>

            {customRoles.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center space-y-3">
                <Shield className="w-8 h-8 text-slate-600 mx-auto" />
                <h4 className="text-sm font-bold text-white">No Custom Roles Created Yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Create roles like "Shift Supervisor", "Head Cashier", or "Stock Auditor" with tailored access permissions.
                </p>
                <button
                  onClick={handleOpenCreateRoleModal}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Create First Custom Role</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {customRoles.map((role) => (
                  <div
                    key={role.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 hover:border-slate-700 transition flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{role.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-teal-300">
                          {role.userCount || 0} {(role.userCount || 0) === 1 ? 'user' : 'users'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {role.description || 'No description provided'}
                      </p>

                      <div className="pt-2 border-t border-slate-800">
                        <div className="text-[11px] font-semibold text-slate-400 mb-1.5">
                          Permissions ({role.permissions?.length || 0}):
                        </div>
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {(role.permissions || []).slice(0, 6).map((perm) => (
                            <span
                              key={perm}
                              className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-mono text-slate-300"
                            >
                              {perm}
                            </span>
                          ))}
                          {(role.permissions?.length || 0) > 6 && (
                            <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] text-slate-400 font-semibold">
                              +{(role.permissions?.length || 0) - 6} more
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleOpenEditRoleModal(role)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition"
                      >
                        Edit Role
                      </button>
                      <button
                        onClick={() => handleDeleteRole(role)}
                        disabled={actionLoading === `delete-role-${role.id}`}
                        className="p-1.5 bg-rose-950 hover:bg-rose-900 text-rose-300 rounded-lg border border-rose-800 transition"
                        title="Delete custom role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Standard System Roles Reference */}
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Predefined System Roles</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Standard role templates ready for immediate assignment
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {Object.entries(SYSTEM_ROLES_INFO)
                .filter(([key]) => key !== 'CUSTOM' && key !== 'MERCHANT_OWNER')
                .map(([key, info]) => (
                  <div key={key} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{info.label}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-950 text-slate-400 border border-slate-800">
                        {key}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-relaxed">{info.desc}</p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD NEW STAFF USER                              */}
      {/* ======================================================== */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl my-8 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Add Staff Member</h3>
                  <p className="text-xs text-slate-400">
                    Provision credentials and assign store branches for this user
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddUserSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Quota Notice in Modal */}
              <div className="bg-emerald-950 border border-emerald-800 rounded-xl p-3 text-xs text-emerald-200 flex items-center justify-between">
                <span>Subscription Plan: <strong>{quota?.planName || 'Standard'}</strong></span>
                <span className="font-mono font-bold text-emerald-300">
                  Using slot {(quota?.currentUsers || 0) + 1} of {quota?.maxUsers || '∞'}
                </span>
              </div>

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    First Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Nimal"
                    value={addUserForm.firstName}
                    onChange={(e) => setAddUserForm({ ...addUserForm, firstName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Last Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Perera"
                    value={addUserForm.lastName}
                    onChange={(e) => setAddUserForm({ ...addUserForm, lastName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Email & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Email Address (Login) <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="cashier1@yourstore.com"
                    value={addUserForm.email}
                    onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. +94771234567"
                    value={addUserForm.phone}
                    onChange={(e) => setAddUserForm({ ...addUserForm, phone: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Initial Password <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    placeholder="Minimum 8 characters..."
                    value={addUserForm.password}
                    onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500 pr-9"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Assigned Security Role <span className="text-rose-400">*</span>
                </label>
                <select
                  value={addUserForm.role}
                  onChange={(e) => setAddUserForm({ ...addUserForm, role: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="CASHIER">CASHIER (POS Sales, Checkout & Slips)</option>
                  <option value="BRANCH_MANAGER">BRANCH_MANAGER (Store Operations & Daily Sessions)</option>
                  <option value="INVENTORY_CLERK">INVENTORY_CLERK (GRN Receiving & Stock Adjustments)</option>
                  <option value="ACCOUNTANT">ACCOUNTANT (General Ledger & Reports)</option>
                  <option value="MERCHANT_ADMIN">MERCHANT_ADMIN (Full Organization Administration)</option>
                  {customRoles.length > 0 && <option value="CUSTOM">CUSTOM ROLE (Tailored Permissions)</option>}
                </select>
              </div>

              {/* If Custom Role is chosen */}
              {addUserForm.role === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-semibold text-teal-300 mb-1">
                    Select Custom Role <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={addUserForm.customRoleId}
                    onChange={(e) => setAddUserForm({ ...addUserForm, customRoleId: e.target.value })}
                    className="w-full bg-slate-950 border border-teal-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    {customRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.permissions?.length || 0} permissions)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Store Branch Scoping */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold text-white flex items-center space-x-1.5">
                    <Store className="w-3.5 h-3.5 text-sky-400" />
                    <span>Store Branch Access</span>
                  </span>
                  <label className="flex items-center space-x-1.5 cursor-pointer text-slate-400 hover:text-white">
                    <input
                      type="checkbox"
                      checked={addUserForm.allBranches}
                      onChange={(e) =>
                        setAddUserForm({
                          ...addUserForm,
                          allBranches: e.target.checked,
                          branchIds: e.target.checked ? branches.map((b) => b.id) : [],
                        })
                      }
                      className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0"
                    />
                    <span>All Branches</span>
                  </label>
                </div>

                {!addUserForm.allBranches && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850">
                    {branches.map((b) => (
                      <label key={b.id} className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={addUserForm.branchIds.includes(b.id)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...addUserForm.branchIds, b.id]
                              : addUserForm.branchIds.filter((id) => id !== b.id);
                            setAddUserForm({ ...addUserForm, branchIds: next });
                          }}
                          className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0"
                        />
                        <span className="truncate">{b.name} ({b.code})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Warehouse Scoping */}
              {warehouses.length > 0 && (
                <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-300">
                    <span className="font-semibold text-white flex items-center space-x-1.5">
                      <Warehouse className="w-3.5 h-3.5 text-amber-400" />
                      <span>Warehouse Inventory Access</span>
                    </span>
                    <label className="flex items-center space-x-1.5 cursor-pointer text-slate-400 hover:text-white">
                      <input
                        type="checkbox"
                        checked={addUserForm.allWarehouses}
                        onChange={(e) =>
                          setAddUserForm({
                            ...addUserForm,
                            allWarehouses: e.target.checked,
                            warehouseIds: e.target.checked ? warehouses.map((w) => w.id) : [],
                          })
                        }
                        className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0"
                      />
                      <span>All Warehouses</span>
                    </label>
                  </div>

                  {!addUserForm.allWarehouses && (
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850">
                      {warehouses.map((w) => (
                        <label key={w.id} className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={addUserForm.warehouseIds.includes(w.id)}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...addUserForm.warehouseIds, w.id]
                                : addUserForm.warehouseIds.filter((id) => id !== w.id);
                              setAddUserForm({ ...addUserForm, warehouseIds: next });
                            }}
                            className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0"
                          />
                          <span className="truncate">{w.name} ({w.code})</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'add-user'}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                >
                  {actionLoading === 'add-user' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{actionLoading === 'add-user' ? 'Creating...' : 'Create Staff Member'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: EDIT STAFF USER                                 */}
      {/* ======================================================== */}
      {isEditUserModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl my-8 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center">
                  <Pencil className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Edit Staff Member</h3>
                  <p className="text-xs text-slate-400">
                    {editingUser.firstName} {editingUser.lastName} ({editingUser.email})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditUserModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    First Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editUserForm.firstName}
                    onChange={(e) => setEditUserForm({ ...editUserForm, firstName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Last Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={editUserForm.lastName}
                    onChange={(e) => setEditUserForm({ ...editUserForm, lastName: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={editUserForm.phone}
                  onChange={(e) => setEditUserForm({ ...editUserForm, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Role */}
              {!editingUser.isOwner ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Security Role
                  </label>
                  <select
                    value={editUserForm.role}
                    onChange={(e) => setEditUserForm({ ...editUserForm, role: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="CASHIER">CASHIER (POS Sales, Checkout & Slips)</option>
                    <option value="BRANCH_MANAGER">BRANCH_MANAGER (Store Operations & Daily Sessions)</option>
                    <option value="INVENTORY_CLERK">INVENTORY_CLERK (GRN Receiving & Stock Adjustments)</option>
                    <option value="ACCOUNTANT">ACCOUNTANT (General Ledger & Reports)</option>
                    <option value="MERCHANT_ADMIN">MERCHANT_ADMIN (Full Organization Administration)</option>
                    {customRoles.length > 0 && <option value="CUSTOM">CUSTOM ROLE (Tailored Permissions)</option>}
                  </select>
                </div>
              ) : (
                <div className="bg-teal-950 border border-teal-800 p-3 rounded-xl text-xs text-teal-200">
                  <strong>Primary Organization Owner:</strong> Master administrative role cannot be modified.
                </div>
              )}

              {/* Custom Role picker */}
              {!editingUser.isOwner && editUserForm.role === 'CUSTOM' && (
                <div>
                  <label className="block text-xs font-semibold text-teal-300 mb-1">
                    Select Custom Role
                  </label>
                  <select
                    value={editUserForm.customRoleId}
                    onChange={(e) => setEditUserForm({ ...editUserForm, customRoleId: e.target.value })}
                    className="w-full bg-slate-950 border border-teal-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  >
                    {customRoles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.permissions?.length || 0} permissions)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Password Reset */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Reset Password (Optional)
                </label>
                <input
                  type="password"
                  placeholder="Leave empty to keep existing password..."
                  value={editUserForm.resetPassword}
                  onChange={(e) => setEditUserForm({ ...editUserForm, resetPassword: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status Toggle */}
              {!editingUser.isOwner && (
                <div className="flex items-center space-x-2 pt-1">
                  <label className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300">
                    <input
                      type="checkbox"
                      checked={editUserForm.isActive}
                      onChange={(e) => setEditUserForm({ ...editUserForm, isActive: e.target.checked })}
                      className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0"
                    />
                    <span>Active Account (Permit POS and portal login)</span>
                  </label>
                </div>
              )}

              {/* Store Branch Scoping */}
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold text-white flex items-center space-x-1.5">
                    <Store className="w-3.5 h-3.5 text-sky-400" />
                    <span>Store Branch Access</span>
                  </span>
                  <label className="flex items-center space-x-1.5 cursor-pointer text-slate-400 hover:text-white">
                    <input
                      type="checkbox"
                      checked={editUserForm.allBranches}
                      onChange={(e) =>
                        setEditUserForm({
                          ...editUserForm,
                          allBranches: e.target.checked,
                          branchIds: e.target.checked ? branches.map((b) => b.id) : [],
                        })
                      }
                      className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0"
                    />
                    <span>All Branches</span>
                  </label>
                </div>

                {!editUserForm.allBranches && (
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-850">
                    {branches.map((b) => (
                      <label key={b.id} className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editUserForm.branchIds.includes(b.id)}
                          onChange={(e) => {
                            const next = e.target.checked
                              ? [...editUserForm.branchIds, b.id]
                              : editUserForm.branchIds.filter((id) => id !== b.id);
                            setEditUserForm({ ...editUserForm, branchIds: next });
                          }}
                          className="rounded bg-slate-900 border-slate-700 text-emerald-600 focus:ring-0"
                        />
                        <span className="truncate">{b.name} ({b.code})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'edit-user'}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                >
                  {actionLoading === 'edit-user' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{actionLoading === 'edit-user' ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CREATE / EDIT CUSTOM ROLE                       */}
      {/* ======================================================== */}
      {isRoleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl my-8 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-950 border border-teal-800 text-teal-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {editingRoleId ? 'Edit Custom Role' : 'Create Custom Role'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Configure granular permissions to create a tailored staff access profile
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsRoleModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRoleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Role Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Shift Supervisor"
                    value={roleForm.name}
                    onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Can open/close shifts and approve discounts"
                    value={roleForm.description}
                    onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Granular Permissions Matrix */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-white uppercase tracking-wider">
                    Permissions Matrix ({roleForm.permissions.length} selected)
                  </label>
                  <div className="flex items-center space-x-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() =>
                        setRoleForm({
                          ...roleForm,
                          permissions: allPermissions.map((p) => p.code),
                        })
                      }
                      className="text-teal-400 hover:text-teal-300 font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-slate-600">•</span>
                    <button
                      type="button"
                      onClick={() => setRoleForm({ ...roleForm, permissions: [] })}
                      className="text-slate-500 hover:text-slate-300"
                    >
                      Clear All
                    </button>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {permissionsByCategory.map(([category, perms]) => {
                    const allCatSelected = perms.every((p) => roleForm.permissions.includes(p.code));
                    const selectedCount = perms.filter((p) => roleForm.permissions.includes(p.code)).length;

                    return (
                      <div
                        key={category}
                        className="bg-slate-950 rounded-xl border border-slate-850 p-3.5 space-y-2.5"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-850">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-bold text-white">{category}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-slate-400">
                              {selectedCount}/{perms.length}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleCategory(perms, !allCatSelected)}
                            className="text-[10px] text-teal-400 hover:underline font-semibold"
                          >
                            {allCatSelected ? 'Deselect Category' : 'Select Category'}
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {perms.map((p) => {
                            const isChecked = roleForm.permissions.includes(p.code);
                            return (
                              <label
                                key={p.code}
                                className={`flex items-start space-x-2 p-2 rounded-lg border cursor-pointer transition ${
                                  isChecked
                                    ? 'bg-teal-950 border-teal-800 text-white'
                                    : 'bg-slate-900 border-slate-850 text-slate-400 hover:border-slate-750'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleTogglePermission(p.code)}
                                  className="mt-0.5 rounded bg-slate-900 border-slate-700 text-teal-600 focus:ring-0"
                                />
                                <div className="space-y-0.5">
                                  <div className="text-[11px] font-semibold leading-tight text-white">
                                    {p.name}
                                  </div>
                                  <div className="text-[10px] text-slate-500 font-mono leading-tight">
                                    {p.code}
                                  </div>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsRoleModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading === 'save-role'}
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center space-x-1.5"
                >
                  {actionLoading === 'save-role' && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{actionLoading === 'save-role' ? 'Saving Role...' : 'Save Custom Role'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
