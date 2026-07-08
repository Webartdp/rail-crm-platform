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

export async function getWorkEventApprovals(): Promise<{ data: WorkEventApproval[] }> {
  const response = await fetch(`${API_URL}/work-event-approvals`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Could not load approvals');
  return response.json();
}

export async function setWorkEventApprovalStatus(action: 'approve' | 'reject', approvalId: number): Promise<void> {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}/work-event-approvals/${approvalId}/${action}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) throw new Error('Could not update approval');
}
