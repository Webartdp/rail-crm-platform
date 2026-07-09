import { getStoredToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type WorkEventCost = {
  type: 'gasfahrt' | 'arbeit' | 'dienstfahrt';
  employee_id: number;
  assignment_id: number;
  start_time: string;
  stop_time: string;
  hours: number;
  hourly_rate: number;
  coefficient: number;
  amount: number;
  approval_status?: 'approved';
};

export async function getWorkEventCosts(): Promise<{ data: WorkEventCost[] }> {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}/work-event-costs`, {
    headers: { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : '' },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Could not load work event costs');
  return response.json();
}
