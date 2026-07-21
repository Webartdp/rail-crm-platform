import { getStoredToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type FieldState = {
  employee_id: number;
  assignment_id?: number;
  last_event_type?: string;
  current_state: string;
  allowed_actions: string[];
  next_button: string;
  required_fields: string[];
  planned_end_at?: string | null;
  planned_exceeded: boolean;
  requires_bemerkung: boolean;
  leistungsart_options: string[];
};

function authHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

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

export async function getFieldState(employeeId: number, assignmentId?: number): Promise<FieldState> {
  const params = new URLSearchParams({ employee_id: String(employeeId) });

  if (assignmentId) {
    params.set('assignment_id', String(assignmentId));
  }

  const response = await fetch(`${API_URL}/employee/field-state?${params.toString()}`, {
    headers: authHeaders(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not load field state'));
  }

  return response.json();
}
