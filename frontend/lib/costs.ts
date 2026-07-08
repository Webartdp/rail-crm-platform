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
};

export async function getWorkEventCosts(): Promise<{ data: WorkEventCost[] }> {
  const response = await fetch(`${API_URL}/work-event-costs`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Could not load work event costs');
  return response.json();
}
