const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const TOKEN_KEY = 'rail_crm_token';

export type AuthUser = {
  id: number;
  employee_profile_id?: number | null;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'admin' | string;
  is_active: boolean;
};

export type AuthResponse = {
  message: string;
  token?: string;
  data: AuthUser;
};

export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) throw new Error('Login failed');
  const data = await response.json();
  if (data.token) setStoredToken(data.token);
  return data;
}

export async function register(payload: { name: string; email: string; password: string; role: string; employee_profile_id?: number }): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Register failed');
  const data = await response.json();
  if (data.token) setStoredToken(data.token);
  return data;
}

export async function me(): Promise<{ data: AuthUser }> {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}/auth/me`, {
    headers: { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : '' },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Me failed');
  return response.json();
}

export async function logout(): Promise<void> {
  const token = getStoredToken();
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : '' },
  });
  clearStoredToken();
}
