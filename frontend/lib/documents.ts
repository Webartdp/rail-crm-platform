import { getStoredToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type DocumentRow = {
  id: number;
  client_id?: number | null;
  work_order_id?: number | null;
  title: string;
  type: string;
  status: string;
  file_path?: string | null;
};

export type DocumentInput = {
  client_id?: number;
  work_order_id?: number;
  title: string;
  type?: string;
  status?: string;
  file_path?: string;
};

export async function getDocuments(): Promise<{ data: DocumentRow[] }> {
  const response = await fetch(`${API_URL}/documents`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Could not load documents');
  return response.json();
}

export async function createDocument(payload: DocumentInput): Promise<{ data: DocumentRow }> {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}/documents`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Could not create document');
  return response.json();
}
