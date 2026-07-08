import { getStoredToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type WorkOrder = {
  id: number;
  employee_id?: number;
  title: string;
  reference_number?: string;
  status?: string;
  planned_start_at?: string;
  planned_end_at?: string;
  details?: string;
};

export type WorkOrderInput = {
  employee_id?: number;
  title: string;
  reference_number?: string;
  leistungsart?: string;
  zugnummer?: string;
  einsatzort?: string;
  planned_start_at?: string;
  planned_end_at?: string;
};

export async function getWorkOrders(employeeId?: number): Promise<{ data: WorkOrder[] }> {
  const query = employeeId ? `?employee_id=${employeeId}` : '';
  const response = await fetch(`${API_URL}/work-orders${query}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Could not load work orders');
  }

  return response.json();
}

export async function createWorkOrder(payload: WorkOrderInput): Promise<{ data: WorkOrder }> {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}/work-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Could not create work order');
  }

  return response.json();
}
