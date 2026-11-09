import { apiRequest } from './http';

export type WorkOrder = {
  id: number;
  client_id?: number | null;
  object_id?: number | null;
  employee_id?: number | null;
  employee_ids?: number[];
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
  client_id: number;
  object_id: number;
  employee_ids: number[];
  title: string;
  reference_number?: string;
  leistungsart?: string;
  zugnummer?: string;
  planned_start_at: string;
  planned_end_at: string;
  status?: string;
  notes?: string;
};

type Filters = { employeeId?: number; clientId?: number; dateFrom?: string; dateTo?: string };

export function getWorkOrders(filters: Filters | number = {}): Promise<{ data: WorkOrder[] }> {
  const normalized: Filters = typeof filters === 'number' ? { employeeId: filters } : filters;
  const params = new URLSearchParams();
  if (normalized.employeeId) params.set('employee_id', String(normalized.employeeId));
  if (normalized.clientId) params.set('client_id', String(normalized.clientId));
  if (normalized.dateFrom) params.set('date_from', normalized.dateFrom);
  if (normalized.dateTo) params.set('date_to', normalized.dateTo);
  const query = params.toString() ? `?${params.toString()}` : '';
  return apiRequest(`/work-orders${query}`);
}

export function getWorkOrder(id: number): Promise<{ data: WorkOrder }> {
  return apiRequest(`/work-orders/${id}`);
}

export function createWorkOrder(payload: WorkOrderInput): Promise<{ data: WorkOrder; message: string }> {
  return apiRequest('/work-orders', { body: payload });
}

export function updateWorkOrder(id: number, payload: WorkOrderInput): Promise<{ data: WorkOrder; message: string }> {
  return apiRequest(`/work-orders/${id}`, { method: 'PUT', body: payload });
}

export async function deleteWorkOrder(id: number): Promise<void> {
  await apiRequest(`/work-orders/${id}`, { method: 'DELETE' });
}

export function closeWorkOrder(id: number, source = 'manual'): Promise<{ data: WorkOrder }> {
  return apiRequest(`/work-orders/${id}/close`, { body: { source } });
}

/** Employees assigned to an order (several since multi-employee orders). */
export function orderEmployeeIds(order: Pick<WorkOrder, 'employee_ids' | 'employee_id'>): number[] {
  if (order.employee_ids && order.employee_ids.length) return order.employee_ids;
  return order.employee_id ? [Number(order.employee_id)] : [];
}
