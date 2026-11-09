const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
const TOKEN_KEY = 'rail_crm_token';

export const AUTH_CHANGED_EVENT = 'rail-crm-auth-changed';

export type AuthUser = {
  id: number;
  employee_profile_id?: number | null;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'admin' | string;
  locale?: string | null;
  is_active: boolean;
};

export type AuthResponse = {
  message: string;
  token?: string;
  data: AuthUser;
};

function emitAuthChanged() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(TOKEN_KEY, token);
  emitAuthChanged();
}

export function clearStoredToken() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  emitAuthChanged();
}

async function readErrorMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  return typeof data?.message === 'string' ? data.message : fallback;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Login failed'));
  }

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

  if (!response.ok) throw new Error(await readErrorMessage(response, 'Me failed'));
  return response.json();
}

export async function logout(): Promise<void> {
  const token = getStoredToken();

  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : '' },
    });
  } finally {
    clearStoredToken();
  }
}

export type LinkInfo = { type: 'invite' | 'reset'; email: string; name: string; expires_at: string };

async function postJson<T>(path: string, body: unknown, withToken = false): Promise<T> {
  const token = withToken ? getStoredToken() : null;
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const errors = data?.errors && typeof data.errors === 'object' ? Object.values(data.errors as Record<string, string[]>) : [];
    const first = errors[0]?.[0];
    throw new Error(first || (typeof data?.message === 'string' ? data.message : `HTTP ${response.status}`));
  }

  return data as T;
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return postJson('/auth/forgot-password', { email });
}

export async function getLinkInfo(token: string): Promise<{ data: LinkInfo }> {
  const response = await fetch(`${API_URL}/auth/link?token=${encodeURIComponent(token)}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(await readErrorMessage(response, `HTTP ${response.status}`));
  return response.json();
}

export async function setPasswordFromLink(token: string, password: string, passwordConfirmation: string): Promise<AuthResponse> {
  const data = await postJson<AuthResponse>('/auth/set-password', {
    token,
    password,
    password_confirmation: passwordConfirmation,
  });
  if (data.token) setStoredToken(data.token);
  return data;
}

export async function changePassword(currentPassword: string, password: string, passwordConfirmation: string): Promise<{ message: string }> {
  return postJson('/auth/change-password', {
    current_password: currentPassword,
    password,
    password_confirmation: passwordConfirmation,
  }, true);
}

export async function saveUserLocale(locale: string): Promise<void> {
  const token = getStoredToken();
  if (!token) return;
  await fetch(`${API_URL}/auth/locale`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ locale }),
  }).catch(() => undefined);
}
