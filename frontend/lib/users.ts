import { apiRequest } from './http';

export type CrmUser = {
  id: number;
  employee_profile_id: number | null;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'admin' | string;
  locale: string | null;
  is_active: boolean | number;
  last_login_at: string | null;
  password_set_at: string | null;
  invite_pending_until?: string | null;
  created_at: string;
};

export type AuthLink = {
  type: 'invite' | 'reset';
  url: string;
  expires_at: string;
  email_sent: boolean;
};

export type UserInput = {
  name: string;
  email: string;
  role: string;
  locale?: string;
  employee_profile_id?: number | null;
  password?: string;
};

export function getUsers() {
  return apiRequest<{ data: CrmUser[] }>('/users');
}

export function createUser(input: UserInput) {
  return apiRequest<{ message: string; data: CrmUser; link?: AuthLink }>('/users', { body: input });
}

export function updateUser(id: number, input: Partial<UserInput> & { is_active?: boolean }) {
  return apiRequest<{ message: string; data: CrmUser }>(`/users/${id}`, { method: 'PUT', body: input });
}

export function createInviteLink(id: number) {
  return apiRequest<{ message: string; link: AuthLink }>(`/users/${id}/invite`, { method: 'POST' });
}

export function createResetLink(id: number) {
  return apiRequest<{ message: string; link: AuthLink }>(`/users/${id}/reset-link`, { method: 'POST' });
}
