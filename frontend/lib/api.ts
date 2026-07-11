import { getStoredToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type WorkEventPayload = {
  employee_id?: number;
  assignment_id?: number;
  latitude?: number;
  longitude?: number;
  location_accuracy?: number;
  address_text?: string;
  planned_exceeded?: boolean;
  bemerkung?: string;
  payload?: Record<string, unknown>;
};

export type WorkEvent = {
  id: number;
  event_type: string;
  event_time: string;
  employee_id?: number;
  assignment_id?: number;
  latitude?: string;
  longitude?: string;
  payload?: string;
};

function authHeaders(json = false): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (json) {
    headers['Content-Type'] = 'application/json';
  }

  const token = getStoredToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

export async function postWorkEvent(path: string, payload: WorkEventPayload) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

export async function getWorkEvents(): Promise<{ data: WorkEvent[] }> {
  const response = await fetch(`${API_URL}/work-events`, {
    headers: authHeaders(false),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Could not load work events');
  }

  return response.json();
}

export const workEventRoutes = {
  gasfahrtStart: '/work-events/gasfahrt/start',
  gasfahrtStop: '/work-events/gasfahrt/stop',
  dienstbeginn: '/work-events/dienstbeginn',
  arbeitStop: '/work-events/arbeit/stop',
  dienstfahrtStart: '/work-events/dienstfahrt/start',
  dienstfahrtStop: '/work-events/dienstfahrt/stop',
};
