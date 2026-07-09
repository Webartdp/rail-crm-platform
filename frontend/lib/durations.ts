import { getStoredToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type WorkEventDuration = {
  type: string;
  start_event: string;
  stop_event: string;
  start_time: string;
  stop_time: string;
  duration_minutes: number;
};

export async function getWorkEventDurations(): Promise<{ data: WorkEventDuration[] }> {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}/work-event-durations`, {
    headers: { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : '' },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error('Could not load work event durations');
  }

  return response.json();
}
