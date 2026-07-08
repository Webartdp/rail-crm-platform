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
  ocr_status?: 'not_started' | 'pending' | 'done' | string;
  extracted_text?: string | null;
  ocr_processed_at?: string | null;
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

function authHeaders(json = false) {
  const token = authToken();
  return json
    ? { 'Content-Type': 'application/json', Accept: 'application/json', Authorization: token ? `Bearer ${token}` : '' }
    : { Accept: 'application/json', Authorization: token ? `Bearer ${token}` : '' };
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
  const response = await fetch(`${API_URL}/documents`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Could not create document');
  return response.json();
}

export async function uploadDocument(payload: DocumentInput, file: File): Promise<{ data: DocumentRow }> {
  const formData = new FormData();
  formData.append('title', payload.title);
  formData.append('type', payload.type || 'report');
  formData.append('status', payload.status || 'uploaded');
  if (payload.client_id) formData.append('client_id', String(payload.client_id));
  if (payload.work_order_id) formData.append('work_order_id', String(payload.work_order_id));
  formData.append('file', file);

  const response = await fetch(`${API_URL}/documents`, {
    method: 'POST',
    headers: authHeaders(false),
    body: formData,
  });

  if (!response.ok) throw new Error('Could not upload document');
  return response.json();
}

export async function downloadDocument(id: number): Promise<Blob> {
  const response = await fetch(documentDownloadUrl(id), {
    headers: authHeaders(false),
  });

  if (!response.ok) throw new Error('Could not download document');
  return response.blob();
}

export async function startDocumentOcr(id: number): Promise<{ data: DocumentRow }> {
  const response = await fetch(`${API_URL}/documents/${id}/ocr/start`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({}),
  });

  if (!response.ok) throw new Error('Could not start OCR');
  return response.json();
}

export async function saveDocumentOcrText(id: number, extractedText: string): Promise<{ data: DocumentRow }> {
  const response = await fetch(`${API_URL}/documents/${id}/ocr/text`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify({ extracted_text: extractedText }),
  });

  if (!response.ok) throw new Error('Could not save OCR text');
  return response.json();
}
