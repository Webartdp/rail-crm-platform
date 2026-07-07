const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type FieldState = {
  employee_id: number;
  assignment_id?: number;
  last_event_type?: string;
  current_state: string;
  allowed_actions: string[];
  next_button: string;
  required_fields: string[];
  leistungsart_options: string[];
};

export async function getFieldState(employeeId: number, assignmentId?: number): Promise<FieldState> {
  const params = new URLSearchParams({ employee_id: String(employeeId) });
  if (assignmentId) params.set('assignment_id', String(assignmentId));

  const response = await fetch(`${API_URL}/employee/field-state?${params.toString()}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Could not load field state');
  }

  return response.json();
}
