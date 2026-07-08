import { getStoredToken } from './auth';
import type { DocumentSignature } from './document-signatures';
import type { WorkEventApproval } from './approvals';
import type { WorkOrder } from './work-orders';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type DashboardDocumentSignature = DocumentSignature & {
  signature_id: number;
  document_title: string;
  document_status: string;
};

export type ManagerDashboard = {
  counts: {
    pending_approvals: number;
    approved_uninvoiced: number;
    documents_needing_signature: number;
    open_work_orders: number;
  };
  pending_approvals: WorkEventApproval[];
  approved_uninvoiced: WorkEventApproval[];
  documents_needing_signature: DashboardDocumentSignature[];
  open_work_orders: WorkOrder[];
  generated_at: string;
  generated_for: {
    id: number;
    name: string;
    role: string;
  };
};

export async function getManagerDashboard(): Promise<{ data: ManagerDashboard }> {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}/dashboard/manager`, {
    headers: {
      Accept: 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Could not load manager dashboard');
  return response.json();
}
