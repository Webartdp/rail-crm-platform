import { API_URL } from './config';
import type { Locale } from './i18n';
import { tokenStore } from './storage';
import type { AuthResponse, AuthUser, FieldState, Timesheet, WorkEvent, WorkEventPayload, WorkOrder } from './types';

/** The server answered with an error (validation, forbidden, …). Message is already translated. */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** No answer from the server: no connection, timeout. */
export class NetworkError extends Error {}

let locale: Locale = 'de';
let onUnauthorized: (() => void) | null = null;

export function setApiLocale(next: Locale) {
  locale = next;
}

export function setUnauthorizedHandler(handler: (() => void) | null) {
  onUnauthorized = handler;
}

type Options = { method?: string; body?: unknown; auth?: boolean; timeoutMs?: number };

async function request<T>(path: string, options: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json', 'Accept-Language': locale };
  if (options.body !== undefined) headers['Content-Type'] = 'application/json';
  if (options.auth !== false) {
    const token = await tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 20000);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method: options.method || (options.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    throw new NetworkError(error instanceof Error ? error.message : 'Network request failed');
  } finally {
    clearTimeout(timer);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && options.auth !== false) onUnauthorized?.();
    const errors = data && typeof data.errors === 'object' ? (Object.values(data.errors) as string[][]) : [];
    const first = errors[0]?.[0];
    throw new ApiError(first || (typeof data?.message === 'string' ? data.message : `HTTP ${response.status}`), response.status);
  }

  return data as T;
}

/* ---------- Auth ---------- */

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await request<AuthResponse>('/auth/login', { body: { email, password, client: 'mobile' }, auth: false });
  if (data.token) await tokenStore.set(data.token);
  return data.data;
}

export async function logout() {
  try {
    await request('/auth/logout', { body: {}, timeoutMs: 5000 });
  } catch {
    // token is removed locally anyway
  }
  await tokenStore.clear();
}

export const me = () => request<{ data: AuthUser }>('/auth/me');
export const forgotPassword = (email: string) => request<{ message: string }>('/auth/forgot-password', { body: { email }, auth: false });
export const changePassword = (current: string, password: string, confirmation: string) =>
  request<{ message: string }>('/auth/change-password', {
    body: { current_password: current, password, password_confirmation: confirmation },
  });
export const saveUserLocale = (value: Locale) => request('/auth/locale', { method: 'PUT', body: { locale: value } });

/* ---------- Work ---------- */

export const getWorkOrders = (employeeId: number) =>
  request<{ data: WorkOrder[] }>(`/work-orders?employee_id=${employeeId}`);

export const getWorkEvents = (employeeId: number, assignmentId?: number) =>
  request<{ data: WorkEvent[] }>(`/work-events?employee_id=${employeeId}${assignmentId ? `&assignment_id=${assignmentId}` : ''}`);

export const getFieldState = (employeeId: number, assignmentId: number) =>
  request<FieldState>(`/employee/field-state?employee_id=${employeeId}&assignment_id=${assignmentId}`);

export const postWorkEvent = (path: string, payload: WorkEventPayload) => request<{ message?: string }>(path, { body: payload });

export const getTimesheet = (from: string, to: string) =>
  request<{ data: Timesheet }>(`/reports/timesheet?date_from=${from}&date_to=${to}`);

export const correctTime = (input: { start_event_id: number; stop_event_id: number; start_time: string; stop_time: string; bemerkung?: string }) =>
  request<{ message: string }>('/work-events/correct', { body: input });

export const ACTION_ROUTES: Record<string, string> = {
  gasfahrt_start: '/work-events/gasfahrt/start',
  gasfahrt_stop: '/work-events/gasfahrt/stop',
  dienstbeginn: '/work-events/dienstbeginn',
  arbeit_stop: '/work-events/arbeit/stop',
  dienstfahrt_start: '/work-events/dienstfahrt/start',
  dienstfahrt_stop: '/work-events/dienstfahrt/stop',
};

/** What the button turns into after an action (used while offline). */
export const NEXT_ACTION: Record<string, string> = {
  gasfahrt_start: 'gasfahrt_stop',
  gasfahrt_stop: 'dienstbeginn',
  dienstbeginn: 'arbeit_stop',
  arbeit_stop: 'dienstfahrt_start',
  dienstfahrt_start: 'dienstfahrt_stop',
  dienstfahrt_stop: 'dienstbeginn',
};

export const STATE_AFTER: Record<string, string> = {
  gasfahrt_start: 'gasfahrt_active',
  gasfahrt_stop: 'arrived',
  dienstbeginn: 'work_active',
  arbeit_stop: 'work_finished',
  dienstfahrt_start: 'dienstfahrt_active',
  dienstfahrt_stop: 'dienstfahrt_finished',
};

export function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}
