const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type WorkOrder = {
  id: number;
  title: string;
  reference_number?: string;
  status?: string;
  planned_start_at?: string;
  planned_end_at?: string;
  details?: string;
};

export type WorkOrderInput = {
  title: string;
  reference_number?: string;
  leistungsart?: string;
  zugnummer?: string;
  einsatzort?: string;
  planned_start_at?: string;
  planned_end_at?: string;
};

export async function getWorkOrders(): Promise<{ data: WorkOrder[] }> {
  const response = await fetch(`${API_URL}/work-orders`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Could not load work orders');
  }

  return response.json();
}

export async function createWorkOrder(payload: WorkOrderInput): Promise<{ data: WorkOrder }> {
  const response = await fetch(`${API_URL}/work-orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Could not create work order');
  }

  return response.json();
}
