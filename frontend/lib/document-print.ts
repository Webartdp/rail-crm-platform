import { getStoredToken } from './auth';
import type { DocumentSignature } from './document-signatures';
import type { DocumentRow } from './documents';
import type { WorkOrder } from './work-orders';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type DocumentPrintData = {
  document: DocumentRow;
  work_order?: WorkOrder | null;
  signatures: DocumentSignature[];
  printed_by: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
  printed_at: string;
};

export async function getDocumentPrintData(id: number): Promise<{ data: DocumentPrintData }> {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}/documents/${id}/print-data`, {
    headers: {
      Accept: 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Could not load document print data');
  return response.json();
}
