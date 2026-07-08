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
  original_filename?: string | null;
  mime_type?: string | null;
  size_bytes?: number | null;
  uploaded_by?: number | null;
};

export type DocumentInput = {
  client_id?: number;
  work_order_id?: number;
  title: string;
  type?: string;
  status?: string;
  file_path?: string;
};

function authToken() {
  return getStoredToken();
}

export function documentDownloadUrl(id: number) {
  return `${API_URL}/documents/${id}/download`;
}

export async function getDocuments(): Promise<{ data: DocumentRow[] }> {
  const response = await fetch(`${API_URL}/documents`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Could not load documents');
  return response.json();
}

export async function createDocument(payload: DocumentInput): Promise<{ data: DocumentRow }> {
  const token = authToken();
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

export async function uploadDocument(payload: DocumentInput, file: File): Promise<{ data: DocumentRow }> {
  const token = authToken();
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('type', payload.type || 'report');
  formData.append('status', payload.status || 'uploaded');
  if (payload.client_id) formData.append('client_id', String(payload.client_id));
  if (payload.work_order_id) formData.append('work_order_id', String(payload.work_order_id));
  formData.append('file', file);

  const response = await fetch(`${API_URL}/documents`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
    body: formData,
  });

  if (!response.ok) throw new Error('Could not upload document');
  return response.json();
}

export async function downloadDocument(id: number): Promise<Blob> {
  const token = authToken();
  const response = await fetch(documentDownloadUrl(id), {
    headers: { Authorization: token ? `Bearer ${token}` : '' },
  });

  if (!response.ok) throw new Error('Could not download document');
  return response.blob();
}
