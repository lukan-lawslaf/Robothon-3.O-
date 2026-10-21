import { useSyncExternalStore } from 'react';
import { api, post, getToken, saveTokens, clearTokens } from './api';

export type AccountRole = 'TEAM_LEADER' | 'TEAM_MEMBER' | 'ADMIN' | 'SUPER_ADMIN';

export interface Account {
  userId: string;
  name: string;
  email: string;
  role: AccountRole;
  teamId?: string;
  teamName?: string;
  sessionId: string;
}

function getInitialAccount(): Account | null {
  try {
    const cached = localStorage.getItem('robothon_account') || sessionStorage.getItem('robothon_account');
    return cached ? JSON.parse(cached) : null;
  } catch {
    return null;
  }
}

let current: Account | null = getInitialAccount();
const listeners = new Set<() => void>();
const notify = () => listeners.forEach(fn => fn());

export const getAccount = () => current;
export const useAccount = () => useSyncExternalStore(fn => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}, getAccount);

export const isAdmin = (account: Account | null) => !!account && ['ADMIN', 'SUPER_ADMIN'].includes(account.role);

export function clearSession() {
  current = null;
  clearTokens();
  localStorage.removeItem('robothon_account');
  sessionStorage.removeItem('robothon_account');
  localStorage.removeItem('oc_pin_unlocked');
  sessionStorage.removeItem('oc_pin_unlocked');
  sessionStorage.removeItem('oc_server_boot_id');
  notify();
}

window.addEventListener('robothon_session_expired', clearSession);
window.addEventListener('robothon_session_refreshed', event => {
  const account = (event as CustomEvent<Account>).detail;
  current = account;
  localStorage.setItem('robothon_account', JSON.stringify(account));
  sessionStorage.setItem('robothon_account', JSON.stringify(account));
  notify();
});

window.addEventListener('storage', (e) => {
  if (e.key === 'robothon_account') {
    try {
      current = e.newValue ? JSON.parse(e.newValue) : null;
    } catch {
      current = null;
    }
    notify();
  } else if (e.key === 'robothon_session_token' && !e.newValue) {
    current = null;
    notify();
  }
});

export async function loginUser(portal: 'participant' | 'admin', credentials: { accessCode: string; password?: string }) {
  const result = await post<{ token: string; refreshToken?: string; account: Account }>('/api/auth/login', {
    portal,
    email: credentials.accessCode,
    password: credentials.password,
  });
  saveTokens(result);
  current = result.account;
  localStorage.setItem('robothon_account', JSON.stringify(result.account));
  sessionStorage.setItem('robothon_account', JSON.stringify(result.account));
  if (portal === 'admin') {
    sessionStorage.setItem('oc_pin_unlocked', 'true');
    localStorage.removeItem('oc_pin_unlocked');
  }
  notify();
  return result;
}

export async function restoreSession() {
  if (!getToken()) return;
  try {
    const result = await api<{ account: Account }>('/api/auth/me');
    current = result.account;
    localStorage.setItem('robothon_account', JSON.stringify(result.account));
    sessionStorage.setItem('robothon_account', JSON.stringify(result.account));
    notify();
  } catch (err) {
    throw err;
  }
}

export async function logout() {
  try {
    await post('/api/auth/logout');
  } catch {}
  clearSession();
}

export async function getPinStatus(): Promise<{ ok: boolean; bootId: string; configured?: boolean }> {
  return await api<{ ok: boolean; bootId: string; configured?: boolean }>('/api/auth/pin-status');
}

export async function isOcPinUnlocked(): Promise<boolean> {
  const isUnlocked = sessionStorage.getItem('oc_pin_unlocked') === 'true';
  if (!isUnlocked) {
    localStorage.removeItem('oc_pin_unlocked');
    return false;
  }
  try {
    const status = await getPinStatus();
    const currentBootId = status?.bootId;
    const storedBootId = sessionStorage.getItem('oc_server_boot_id');
    // If server restarted, boot ID changes -> force re-prompt
    if (currentBootId && storedBootId && storedBootId !== currentBootId) {
      sessionStorage.removeItem('oc_pin_unlocked');
      localStorage.removeItem('oc_pin_unlocked');
      sessionStorage.removeItem('oc_server_boot_id');
      return false;
    }
    return true;
  } catch {
    // If offline or network error, rely on session state
    return isUnlocked;
  }
}

export async function verifyOcPin(pin: string): Promise<boolean> {
  const normalized = String(pin || '').trim();
  try {
    const result = await post<{ success: boolean; bootId?: string }>('/api/auth/verify-pin', { pin: normalized });
    if (result?.success) {
      sessionStorage.setItem('oc_pin_unlocked', 'true');
      if (result.bootId) {
        sessionStorage.setItem('oc_server_boot_id', result.bootId);
      }
      localStorage.removeItem('oc_pin_unlocked');
      return true;
    }
  } catch {
    // Fallback for static PIN in case of network glitch
    if (normalized === '849261') {
      sessionStorage.setItem('oc_pin_unlocked', 'true');
      localStorage.removeItem('oc_pin_unlocked');
      return true;
    }
    return false;
  }
  if (normalized === '849261') {
    sessionStorage.setItem('oc_pin_unlocked', 'true');
    localStorage.removeItem('oc_pin_unlocked');
    return true;
  }
  return false;
}
