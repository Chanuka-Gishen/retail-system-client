'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, Lock, Mail, ArrowRight, AlertTriangle } from 'lucide-react';
import { apiClient } from '../../lib/api-client';
import { useAuthStore } from '../../lib/auth-store';
import { pullCatalogDelta } from '../../lib/pos-db';

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const setBranch = useAuthStore((s) => s.setBranch);

  const [email, setEmail] = useState('owner@urbanmart.com');
  const [password, setPassword] = useState('UrbanOwner123!');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('expired=1')) {
      setIsSessionExpired(true);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSessionExpired(false);
    setIsLoading(true);

    try {
      const res = await apiClient<any>('/auth/merchant/login', {
        method: 'POST',
        body: { email, password },
      });

      const { accessToken, refreshToken, user } = res;
      setAuth(accessToken, user, refreshToken);

      // Fetch branches for user
      try {
        const branches = await apiClient<any[]>('/merchant/branches', {
          token: accessToken,
        });
        if (branches && branches.length > 0) {
          setBranch(branches[0]);
        }
      } catch {
        // ignore
      }

      // Fetch active POS terminal
      try {
        const terminalsRes = await apiClient<any>('/pos/terminals', { token: accessToken });
        const termList = terminalsRes?.items || terminalsRes || [];
        if (termList && termList.length > 0) {
          useAuthStore.getState().setTerminal(termList[0].id);
        }
      } catch {
        // ignore
      }

      // Pre-warm offline catalog delta cache
      pullCatalogDelta().catch(() => {});

      router.push('/pos');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-950 text-blue-400 mb-3 border border-blue-800">
            <Store className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Merchant Sign In</h1>
          <p className="text-sm text-slate-400 mt-1">Access POS terminal, catalog, and organization</p>
        </div>

        {isSessionExpired && (
          <div className="mb-6 p-3.5 bg-amber-950 border border-amber-800 rounded-xl text-amber-300 text-xs flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Your session expired or was terminated. Please sign in to continue.</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-3.5 bg-rose-950 border border-rose-800 rounded-xl text-rose-300 text-xs leading-relaxed">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                placeholder="cashier@store.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition"
                placeholder="••••••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition"
          >
            <span>{isLoading ? 'Authenticating...' : 'Sign In to POS'}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500">
          Demo Default: <span className="text-slate-400">owner@urbanmart.com</span> / <span className="text-slate-400">UrbanOwner123!</span>
        </div>
      </div>
    </div>
  );
}
