import { apiDownload, apiRequest } from './http';

export type Invoice = {
  id: number;
  number: string;
  status: string;
  client_id?: number | null;
  client_name?: string | null;
  client_email?: string | null;
  total_amount: string | number;
  vat_rate?: string | number;
  vat_amount?: string | number;
  gross_amount?: string | number;
  issued_at?: string | null;
  due_at?: string | null;
  period_from?: string | null;
  period_to?: string | null;
  paid_at?: string | null;
  sent_at?: string | null;
  sent_to?: string | null;
  notes?: string | null;
};

export type InvoiceItem = {
  id: number;
  invoice_id: number;
  approval_id?: number | null;
  employee_id: number;
  assignment_id: number;
  type: string;
  tariff_zone?: string | null;
  day_type?: string | null;
  hours: string | number;
  hourly_rate: string | number;
  coefficient: string | number;
  amount: string | number;
};

export type InvoiceLine = {
  id: number;
  date: string | null;
  employee: string;
  employee_id: number;
  assignment_id: number;
  work_title: string;
  reference: string;
  object: string;
  type: string;
  tariff_zone: string | null;
  day_type: string | null;
  label: string;
  hours: number;
  rate: number;
  coefficient: number;
  amount: number;
};

export type BillableGroup = {
  client_id: number | null;
  client_name: string | null;
  lines: number;
  hours: number;
  amount: number;
  from: string | null;
  to: string | null;
};

export type CompanySettings = Record<string, string>;

export const getInvoices = () => apiRequest<{ data: Invoice[] }>('/invoices');
export const getInvoice = (id: number) => apiRequest<{ data: Invoice; items: InvoiceItem[]; lines: InvoiceLine[] }>(`/invoices/${id}`);
export const getBillable = () => apiRequest<{ data: BillableGroup[] }>('/invoices/billable');
export const createInvoiceDraft = (input: { client_id?: number | null; period_from?: string; period_to?: string } = {}) =>
  apiRequest<{ data: Invoice; message: string }>('/invoices', { body: input });
export const updateInvoice = (id: number, input: { status?: string; notes?: string | null; due_at?: string }) =>
  apiRequest<{ data: Invoice; message: string }>(`/invoices/${id}`, { method: 'PUT', body: input });
export const deleteInvoice = (id: number) => apiRequest<{ message: string }>(`/invoices/${id}`, { method: 'DELETE' });
export const sendInvoice = (id: number, input: { to: string; message?: string }) => apiRequest<{ message: string }>(`/invoices/${id}/send`, { body: input });
export const downloadInvoicePdf = (invoice: Pick<Invoice, 'id' | 'number'>) => apiDownload(`/invoices/${invoice.id}/pdf`, `Rechnung_${invoice.number}.pdf`);

export const getCompanySettings = () => apiRequest<{ data: CompanySettings }>('/settings/company');
export const saveCompanySettings = (input: CompanySettings) => apiRequest<{ data: CompanySettings; message: string }>('/settings/company', { method: 'PUT', body: input });
