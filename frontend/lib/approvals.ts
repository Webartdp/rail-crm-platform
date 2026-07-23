import { getStoredToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type WorkEventApproval = {
  id: number;
  employee_id: number;
  assignment_id: number;
  pair_type: 'gasfahrt' | 'arbeit' | 'dienstfahrt';
  start_time: string;
  stop_time: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by?: number | null;
  approved_at?: string | null;
  comment?: string | null;
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

export async function getWorkEventApprovals(): Promise<{ data: WorkEventApproval[] }> {
  const response = await fetch(`${API_URL}/work-event-approvals`, {
    headers: authHeaders(false),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not load approvals'));
  }

  return response.json();
}

export async function setWorkEventApprovalStatus(action: 'approve' | 'reject', approvalId: number): Promise<void> {
  const response = await fetch(`${API_URL}/work-event-approvals/${approvalId}/${action}`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not update approval'));
  }
}
