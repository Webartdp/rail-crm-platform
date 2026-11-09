import { apiRequest } from './http';

export type WorkObject = {
  id: number;
  client_id: number | null;
  client_name?: string | null;
  name: string;
  address: string | null;
  notes?: string | null;
  status: string;
};

export type Client = {
  id: number;
  name: string;
  address: string | null;
  city: string | null;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  objects: WorkObject[];
  orders_count?: number;
};

export type ClientInput = Partial<Omit<Client, 'id' | 'objects' | 'orders_count'>> & { name: string };
export type ObjectInput = { client_id: number; name: string; address: string; notes?: string | null; status?: string };

export const getClients = () => apiRequest<{ data: Client[] }>('/clients');
export const createClient = (input: ClientInput) => apiRequest<{ data: Client; message: string }>('/clients', { body: input });
export const updateClient = (id: number, input: Partial<ClientInput>) => apiRequest<{ data: Client; message: string }>(`/clients/${id}`, { method: 'PUT', body: input });
export const deleteClient = (id: number) => apiRequest<{ message: string }>(`/clients/${id}`, { method: 'DELETE' });

export const getObjects = (clientId?: number) => apiRequest<{ data: WorkObject[] }>(`/objects${clientId ? `?client_id=${clientId}` : ''}`);
export const createObject = (input: ObjectInput) => apiRequest<{ data: WorkObject; message: string }>('/objects', { body: input });
export const updateObject = (id: number, input: Partial<ObjectInput>) => apiRequest<{ data: WorkObject; message: string }>(`/objects/${id}`, { method: 'PUT', body: input });
export const deleteObject = (id: number) => apiRequest<{ message: string }>(`/objects/${id}`, { method: 'DELETE' });
