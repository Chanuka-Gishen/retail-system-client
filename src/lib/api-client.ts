import { useAuthStore, isTokenExpired } from './auth-store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

export interface ApiResponse<T = any> {
  responseCode: string;
  responseMessage: string;
  response: T;
  meta?: any;
}

// Mutex / Shared Promise for concurrent token refreshes
let refreshPromise: Promise<string | null> | null = null;

async function performTokenRefresh(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const storedRefreshToken =
        typeof window !== 'undefined' ? localStorage.getItem('retail_refresh_token') : null;

      const refreshUrl = `${API_BASE_URL}/auth/refresh`;
      const res = await fetch(refreshUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          refreshToken: storedRefreshToken || undefined,
        }),
      });

      if (!res.ok) {
        throw new Error(`Refresh token rejected with status ${res.status}`);
      }

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      const payload = data?.response !== undefined ? data.response : data;
      const newAccessToken = payload?.accessToken;
      const newRefreshToken = payload?.refreshToken || storedRefreshToken;

      if (!newAccessToken) {
        throw new Error('No access token in refresh response');
      }

      // Update store and localStorage
      useAuthStore.getState().setTokens(newAccessToken, newRefreshToken);
      return newAccessToken;
    } catch (err) {
      console.warn('[apiClient] Refresh token failed or expired:', err);
      // Hard logout and redirect to login
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=1';
      }
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

export async function apiClient<T = any>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    token?: string;
    headers?: Record<string, string>;
    skipAuthRefresh?: boolean;
  } = {},
): Promise<T> {
  const method = options.method || 'GET';
  const isAuthRoute =
    endpoint.includes('/auth/login') ||
    endpoint.includes('/auth/refresh') ||
    endpoint.includes('/auth/merchant/login') ||
    endpoint.includes('/auth/platform/login');

  let token = options.token;
  if (!token && typeof window !== 'undefined') {
    token = localStorage.getItem('retail_access_token') || undefined;
  }

  // Proactive refresh: if token is expired or expiring in <= 10s and not an auth route
  if (!isAuthRoute && !options.skipAuthRefresh && token && isTokenExpired(token)) {
    const freshToken = await performTokenRefresh();
    if (freshToken) {
      token = freshToken;
    } else {
      throw new Error('Session expired. Please log in again.');
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  const serializedBody = options.body
    ? typeof options.body === 'string'
      ? options.body
      : JSON.stringify(options.body)
    : undefined;

  let res = await fetch(url, {
    method,
    headers,
    credentials: 'include',
    body: serializedBody,
  });

  // Reactive refresh: if request returned 401 Unauthorized and this is not an auth route
  if (res.status === 401 && !isAuthRoute && !options.skipAuthRefresh) {
    const freshToken = await performTokenRefresh();
    if (freshToken) {
      // Retry original request with fresh token
      headers['Authorization'] = `Bearer ${freshToken}`;
      res = await fetch(url, {
        method,
        headers,
        credentials: 'include',
        body: serializedBody,
      });
    } else {
      throw new Error('Session expired. Please log in again.');
    }
  }

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }

  if (!res.ok) {
    // If still 401 after retry or on protected routes, force logout
    if (res.status === 401 && !isAuthRoute) {
      useAuthStore.getState().logout();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login?expired=1';
      }
    }

    const errorMsg =
      json?.responseMessage || json?.message || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  if (json?.meta !== undefined) {
    if (
      json?.response &&
      typeof json.response === 'object' &&
      !Array.isArray(json.response) &&
      'items' in json.response
    ) {
      return {
        ...json.response,
        meta: json.meta,
      } as T;
    }
    return {
      items: Array.isArray(json?.response) ? json.response : json?.response?.items || [],
      meta: json.meta,
      ...(json?.response?.summary ? { summary: json.response.summary } : {}),
    } as T;
  }

  return (json?.response !== undefined ? json.response : json) as T;
}
