import * as SecureStore from 'expo-secure-store';
import { AuthResponse, AuthUser, WorkEvent, WorkOrder } from './types';

const API_URL = 'https://rlci.ridnovir.in.ua/api/api/v1';
const TOKEN_KEY = 'rail_crm_mobile_token';

export const workEventRoutes = {
  gasfahrtStart: '/work-events/gasfahrt/start',
  gasfahrtStop: '/work-events/gasfahrt/stop',
  dienstbeginn: '/work-events/dienstbeginn',
  arbeitStop: '/work-events/arbeit/stop',
  dienstfahrtStart: '/work-events/dienstfahrt/start',
  dienstfahrtStop: '/work-events/dienstfahrt/stop',
};

export async function getToken() {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function readError(response: any, fallback: string) {
  const data = await response.json().catch(() => null);
  return typeof data?.message === 'string' ? data.message : fallback;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...((options.headers || {}) as Record<string, string>),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Request failed'));
  }

  return response.json();
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(await readError(response, 'Login failed'));
  }

  const data: AuthResponse = await response.json();

  if (data.token) {
    await setToken(data.token);
  }

  return data;
}

export async function me(): Promise<{ data: AuthUser }> {
  return apiRequest<{ data: AuthUser }>('/auth/me');
}

export async function logout() {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } finally {
    await clearToken();
  }
}

export async function getWorkOrders(employeeId?: number): Promise<{ data: WorkOrder[] }> {
  const query = employeeId ? `?employee_id=${encodeURIComponent(String(employeeId))}` : '';
  return apiRequest<{ data: WorkOrder[] }>(`/work-orders${query}`);
}

export async function getWorkEvents(filters: { employeeId?: number; assignmentId?: number } = {}): Promise<{ data: WorkEvent[] }> {
  const params: string[] = [];

  if (filters.employeeId) params.push(`employee_id=${encodeURIComponent(String(filters.employeeId))}`);
  if (filters.assignmentId) params.push(`assignment_id=${encodeURIComponent(String(filters.assignmentId))}`);

  const query = params.length ? `?${params.join('&')}` : '';

  return apiRequest<{ data: WorkEvent[] }>(`/work-events${query}`);
}

export async function postWorkEvent(
  route: string,
  payload: {
    employee_id?: number;
    assignment_id?: number;
    latitude?: number;
    longitude?: number;
    location_accuracy?: number | null;
    bemerkung?: string;
    planned_exceeded?: boolean;
    payload?: Record<string, unknown>;
  }
) {
  return apiRequest(route, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}
