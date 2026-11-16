import { create } from 'zustand';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  merchantId: string;
}

export interface BranchInfo {
  id: string;
  code: string;
  name: string;
  defaultWarehouseId?: string;
}

export function isTokenExpired(token: string | null): boolean {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const base64Url = parts[1];
    if (!base64Url) return true;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload.exp) return false;
    // Expired or expiring within 10 seconds
    return payload.exp * 1000 <= Date.now() + 10000;
  } catch {
    return true;
  }
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  branch: BranchInfo | null;
  posTerminalId: string | null;
  cashSessionId: string | null;
  isAuthenticated: boolean;
  setAuth: (token: string, user: UserProfile, refreshToken?: string) => void;
  setTokens: (token: string, refreshToken?: string) => void;
  setBranch: (branch: BranchInfo) => void;
  setTerminal: (terminalId: string | null) => void;
  setCashSession: (sessionId: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: typeof window !== 'undefined' ? localStorage.getItem('retail_access_token') : null,
  refreshToken: typeof window !== 'undefined' ? localStorage.getItem('retail_refresh_token') : null,
  user:
    typeof window !== 'undefined' && localStorage.getItem('retail_user')
      ? JSON.parse(localStorage.getItem('retail_user') || '{}')
      : null,
  branch:
    typeof window !== 'undefined' && localStorage.getItem('retail_branch')
      ? JSON.parse(localStorage.getItem('retail_branch') || 'null')
      : null,
  posTerminalId:
    typeof window !== 'undefined' ? localStorage.getItem('retail_terminal_id') : null,
  cashSessionId:
    typeof window !== 'undefined' ? localStorage.getItem('retail_cash_session_id') : null,
  isAuthenticated:
    typeof window !== 'undefined'
      ? !!(localStorage.getItem('retail_access_token') || localStorage.getItem('retail_refresh_token'))
      : false,

  setAuth: (token, user, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('retail_access_token', token);
      if (refreshToken) {
        localStorage.setItem('retail_refresh_token', refreshToken);
      }
      localStorage.setItem('retail_user', JSON.stringify(user));
    }
    set({
      token,
      refreshToken: refreshToken || (typeof window !== 'undefined' ? localStorage.getItem('retail_refresh_token') : null),
      user,
      isAuthenticated: true,
    });
  },

  setTokens: (token, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('retail_access_token', token);
      if (refreshToken) {
        localStorage.setItem('retail_refresh_token', refreshToken);
      }
    }
    set((state) => ({
      token,
      refreshToken: refreshToken || state.refreshToken,
      isAuthenticated: true,
    }));
  },

  setBranch: (branch) => {
    if (typeof window !== 'undefined') {
      if (branch) {
        localStorage.setItem('retail_branch', JSON.stringify(branch));
      } else {
        localStorage.removeItem('retail_branch');
      }
    }
    set({ branch });
  },

  setTerminal: (posTerminalId) => {
    if (typeof window !== 'undefined') {
      if (posTerminalId) {
        localStorage.setItem('retail_terminal_id', posTerminalId);
      } else {
        localStorage.removeItem('retail_terminal_id');
      }
    }
    set({ posTerminalId });
  },

  setCashSession: (cashSessionId) => {
    if (typeof window !== 'undefined') {
      if (cashSessionId) {
        localStorage.setItem('retail_cash_session_id', cashSessionId);
      } else {
        localStorage.removeItem('retail_cash_session_id');
      }
    }
    set({ cashSessionId });
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('retail_access_token');
      localStorage.removeItem('retail_refresh_token');
      localStorage.removeItem('retail_user');
      localStorage.removeItem('retail_branch');
      localStorage.removeItem('retail_terminal_id');
      localStorage.removeItem('retail_cash_session_id');
      localStorage.removeItem('pos_catalog_watermark');
    }
    set({
      token: null,
      refreshToken: null,
      user: null,
      branch: null,
      posTerminalId: null,
      cashSessionId: null,
      isAuthenticated: false,
    });
  },
}));
