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
  latitude?: string | number | null;
  longitude?: string | number | null;
  location_accuracy?: string | number | null;
  address_text?: string | null;
  payload?: string | Record<string, unknown> | null;
};

export type DemoWorkOrder = {
  id: number;
  employee_id?: number;
  title: string;
  reference_number?: string;
  status?: string;
  planned_start_at?: string;
  planned_end_at?: string;
  details?: string | Record<string, unknown> | null;
};

export type DemoSeedResponse = {
  message: string;
  object: {
    name: string;
    address: string;
  };
  orders: DemoWorkOrder[];
};

function authHeaders(json = false): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'X-Local-Dev-Bypass': 'rail-crm-dev',
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

export async function seedFieldDemo(employeeId = 1): Promise<DemoSeedResponse> {
  const response = await fetch(`${API_URL}/dev/field-demo-seed`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ employee_id: employeeId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Field demo seed failed');
  }

  return response.json();
}

export async function resetDemoWorkEvents(employeeId = 1): Promise<{ message: string; employee_id: number; deleted: number }> {
  const response = await fetch(`${API_URL}/dev/reset-work-events`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ employee_id: employeeId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Reset failed');
  }

  return response.json();
}

export async function getWorkEvents(filters: { employeeId?: number; assignmentId?: number } = {}): Promise<{ data: WorkEvent[] }> {
  const params = new URLSearchParams();

  if (filters.employeeId) params.set('employee_id', String(filters.employeeId));
  if (filters.assignmentId) params.set('assignment_id', String(filters.assignmentId));

  const query = params.toString() ? `?${params.toString()}` : '';
  const response = await fetch(`${API_URL}/work-events${query}`, {
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
