import { requestJson, RequestTimeoutError } from './requestJson';

export class ApiError extends Error {
  constructor(message: string, public status: number, public code?: string) { super(message); }
}

export const getToken = () => {
  return localStorage.getItem('robothon_session_token') || sessionStorage.getItem('robothon_session_token');
};

export const getRefreshToken = () => {
  return localStorage.getItem('robothon_refresh_token') || sessionStorage.getItem('robothon_refresh_token');
};

let refreshPending: Promise<void> | null = null;

async function request(path: string, options: RequestInit = {}) {
  try { return await requestJson(path, options); }
  catch (error) {
    if (error instanceof RequestTimeoutError) throw new ApiError('The server took too long to respond. Please try again; any saved answers will be kept.', 0, 'REQUEST_TIMEOUT');
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
}

export function saveTokens(result: { token: string; refreshToken?: string }) {
  localStorage.setItem('robothon_session_token', result.token);
  sessionStorage.setItem('robothon_session_token', result.token);
  if (result.refreshToken) {
    localStorage.setItem('robothon_refresh_token', result.refreshToken);
    sessionStorage.setItem('robothon_refresh_token', result.refreshToken);
  } else {
    localStorage.removeItem('robothon_refresh_token');
    sessionStorage.removeItem('robothon_refresh_token');
  }
}

export function clearTokens() {
  localStorage.removeItem('robothon_session_token');
  localStorage.removeItem('robothon_refresh_token');
  sessionStorage.removeItem('robothon_session_token');
  sessionStorage.removeItem('robothon_refresh_token');
}

async function refreshSession() {
  if (!refreshPending) refreshPending = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) throw new ApiError('No refresh token available', 401);
    const { response, data } = await request('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) window.dispatchEvent(new Event('robothon_session_expired'));
      throw new ApiError(data.message || 'Please sign in again.', response.status);
    }
    saveTokens(data);
    window.dispatchEvent(new CustomEvent('robothon_session_refreshed', { detail: data.account }));
  })().finally(() => { refreshPending = null; });
  return refreshPending;
}

export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken();
  const { response, data } = await request(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
      ...options.headers
    }
  });
  if (!response.ok) {
    if (response.status === 401 && retry && !path.endsWith('/login') && getRefreshToken()) {
      await refreshSession();
      return api<T>(path, options, false);
    }
    if (response.status === 401 && !path.endsWith('/login')) window.dispatchEvent(new Event('robothon_session_expired'));
    throw new ApiError(data.message || 'The request could not be completed.', response.status, data.error);
  }
  return data;
}

export const post = <T>(path: string, data = {}) => api<T>(path, { method: 'POST', body: JSON.stringify(data) });
export const patch = <T>(path: string, data = {}) => api<T>(path, { method: 'PATCH', body: JSON.stringify(data) });
export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });
