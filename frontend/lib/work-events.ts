import { getStoredToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type WorkEvent = {
  id: number;
  employee_id?: number | null;
  assignment_id?: number | null;
  work_order_id?: number | null;
  event_type?: string | null;
  type?: string | null;
  action?: string | null;
  occurred_at?: string | null;
  event_time?: string | null;
  created_at?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  accuracy_m?: number | string | null;
  payload?: string | Record<string, unknown> | null;
};

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = { Accept: 'application/json' };
  const token = getStoredToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function readErrorMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  return typeof data?.message === 'string' ? data.message : fallback;
}

export async function getWorkEvents(
  filters: { employeeId?: number; assignmentId?: number } = {}
): Promise<{ data: WorkEvent[] }> {
  const params = new URLSearchParams();

  if (filters.employeeId) {
    params.set('employee_id', String(filters.employeeId));
  }

  if (filters.assignmentId) {
    params.set('assignment_id', String(filters.assignmentId));
  }

  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await fetch(`${API_URL}/work-events${query}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not load work events'));
  }

  return response.json();
}
