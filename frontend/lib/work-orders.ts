import { getStoredToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type WorkOrder = {
  id: number;
  employee_id?: number | null;
  title: string;
  reference_number?: string | null;
  status?: string | null;
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  details?: string | Record<string, unknown> | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type WorkOrderInput = {
  employee_id: number;
  title: string;
  reference_number?: string;
  status?: string;
  object_name?: string;
  object_address?: string;
  customer_name?: string;
  work_title?: string;
  leistungsart?: string;
  zugnummer?: string;
  einsatzort?: string;
  planned_start_at?: string;
  planned_end_at?: string;
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

async function readErrorMessage(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  return typeof data?.message === 'string' ? data.message : fallback;
}

export async function getWorkOrders(filters: { employeeId?: number } | number = {}): Promise<{ data: WorkOrder[] }> {
  const params = new URLSearchParams();
  const employeeId = typeof filters === 'number' ? filters : filters.employeeId;

  if (employeeId) {
    params.set('employee_id', String(employeeId));
  }

  const query = params.toString() ? `?${params.toString()}` : '';

  const response = await fetch(`${API_URL}/work-orders${query}`, {
    headers: authHeaders(false),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not load work orders'));
  }

  return response.json();
}

export async function getWorkOrder(id: number): Promise<{ data: WorkOrder }> {
  const response = await fetch(`${API_URL}/work-orders/${id}`, {
    headers: authHeaders(false),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not load work order'));
  }

  return response.json();
}

export async function createWorkOrder(payload: WorkOrderInput): Promise<{ data: WorkOrder }> {
  const response = await fetch(`${API_URL}/work-orders`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not create work order'));
  }

  return response.json();
}

export async function updateWorkOrder(id: number, payload: WorkOrderInput): Promise<{ data: WorkOrder }> {
  const response = await fetch(`${API_URL}/work-orders/${id}`, {
    method: 'PUT',
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not update work order'));
  }

  return response.json();
}


export async function deleteWorkOrder(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/work-orders/${id}`, {
    method: 'DELETE',
    headers: authHeaders(false),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not delete work order'));
  }
}

export async function closeWorkOrder(id: number, source = 'manual'): Promise<{ data: WorkOrder }> {
  const response = await fetch(`${API_URL}/work-orders/${id}/close`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ source }),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not close work order'));
  }

  return response.json();
}
