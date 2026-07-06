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

export async function postWorkEvent(path: string, payload: WorkEventPayload) {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Request failed');
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
