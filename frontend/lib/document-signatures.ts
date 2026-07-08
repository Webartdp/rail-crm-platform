import { getStoredToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type SignatureType = 'typed' | 'canvas';

export type DocumentSignature = {
  id: number;
  document_id: number;
  requested_by?: number | null;
  signed_by?: number | null;
  signer_name?: string | null;
  signer_email?: string | null;
  status: 'pending' | 'signed' | 'rejected' | string;
  signature_type: SignatureType | string;
  signature_data?: string | null;
  comment?: string | null;
  requested_at?: string | null;
  signed_at?: string | null;
  rejected_at?: string | null;
};

function authHeaders() {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
}

export async function getDocumentSignatures(documentId: number): Promise<{ data: DocumentSignature[] }> {
  const response = await fetch(`${API_URL}/documents/${documentId}/signatures`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Could not load document signatures');
  return response.json();
}

export async function requestDocumentSignature(documentId: number, payload: { signer_name: string; signer_email?: string; comment?: string; signature_type?: SignatureType }): Promise<{ data: DocumentSignature }> {
  const response = await fetch(`${API_URL}/documents/${documentId}/signatures`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ ...payload, signature_type: payload.signature_type || 'typed' }),
  });

  if (!response.ok) throw new Error('Could not request document signature');
  return response.json();
}

export async function signDocumentSignature(documentId: number, signatureId: number, signatureData: string, signatureType: SignatureType = 'typed'): Promise<{ data: DocumentSignature }> {
  const response = await fetch(`${API_URL}/documents/${documentId}/signatures/${signatureId}/sign`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ signature_data: signatureData, signature_type: signatureType }),
  });

  if (!response.ok) throw new Error('Could not sign document');
  return response.json();
}

export async function rejectDocumentSignature(documentId: number, signatureId: number, comment: string): Promise<{ data: DocumentSignature }> {
  const response = await fetch(`${API_URL}/documents/${documentId}/signatures/${signatureId}/reject`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ comment }),
  });

  if (!response.ok) throw new Error('Could not reject document signature');
  return response.json();
}
