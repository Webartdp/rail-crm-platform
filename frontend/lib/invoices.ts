import { getStoredToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type Invoice = {
  id: number;
  number: string;
  status: string;
  total_amount: string;
  issued_at?: string | null;
};

export type InvoiceItem = {
  id: number;
  invoice_id: number;
  approval_id?: number | null;
  employee_id: number;
  assignment_id: number;
  type: string;
  hours: string;
  hourly_rate: string;
  coefficient: string;
  amount: string;
};

export async function getInvoices(): Promise<{ data: Invoice[] }> {
  const response = await fetch(`${API_URL}/invoices`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Could not load invoices');
  return response.json();
}

export async function createInvoiceDraft(): Promise<{ data: Invoice; items: InvoiceItem[] }> {
  const token = getStoredToken();
  const response = await fetch(`${API_URL}/invoices`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: token ? `Bearer ${token}` : '',
    },
  });

  if (!response.ok) throw new Error('Could not create invoice draft');
  return response.json();
}
