import { getStoredToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type Invoice = {
  id: number;
  number: string;
  status: string;
  total_amount: string | number;
  issued_at?: string | null;
};

export type InvoiceItem = {
  id: number;
  invoice_id: number;
  approval_id?: number | null;
  employee_id: number;
  assignment_id: number;
  type: string;
  hours: string | number;
  hourly_rate: string | number;
  coefficient: string | number;
  amount: string | number;
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

export async function getInvoices(): Promise<{ data: Invoice[] }> {
  const response = await fetch(`${API_URL}/invoices`, {
    headers: authHeaders(false),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not load invoices'));
  }

  return response.json();
}

export async function createInvoiceDraft(): Promise<{ data: Invoice; items: InvoiceItem[] }> {
  const response = await fetch(`${API_URL}/invoices`, {
    method: 'POST',
    headers: authHeaders(false),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not create invoice draft'));
  }

  return response.json();
}
