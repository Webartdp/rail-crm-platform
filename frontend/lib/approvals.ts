const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type WorkEventApproval = {
  employee_id: number;
  assignment_id: number;
  pair_type: 'gasfahrt' | 'arbeit' | 'dienstfahrt';
  start_time: string;
  stop_time: string;
  minutes: number;
  status: 'pending' | 'approved' | 'rejected';
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

export async function setWorkEventApprovalStatus(action: 'approve' | 'reject', payload: WorkEventApproval): Promise<void> {
  const response = await fetch(`${API_URL}/work-event-approvals/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ...payload, approved_by: 1 }),
  });

  if (!response.ok) throw new Error('Could not update approval');
}
