import { getStoredToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type EmployeeProfile = {
  id: number;
  first_name?: string;
  last_name?: string;
  phone?: string;
  standard_hourly_rate: string;
  travel_hourly_rate: string;
  night_coefficient: string;
  sunday_coefficient: string;
  holiday_coefficient: string;
  home_location?: string;
  is_active: boolean;
};

export type EmployeeProfileInput = {
  first_name?: string;
  last_name?: string;
  phone?: string;
  standard_hourly_rate?: number;
  travel_hourly_rate?: number;
  night_coefficient?: number;
  sunday_coefficient?: number;
  holiday_coefficient?: number;
  home_location?: string;
};

function authHeaders() {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    Authorization: token ? `Bearer ${token}` : '',
  };
}

export async function getEmployeeProfiles(): Promise<{ data: EmployeeProfile[] }> {
  const response = await fetch(`${API_URL}/employee-profiles`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Could not load employee profiles');
  return response.json();
}

export async function getEmployeeProfile(id: number): Promise<{ data: EmployeeProfile }> {
  const response = await fetch(`${API_URL}/employee-profiles/${id}`, {
    headers: { Accept: 'application/json' },
    cache: 'no-store',
  });

  if (!response.ok) throw new Error('Could not load employee profile');
  return response.json();
}

export async function createEmployeeProfile(payload: EmployeeProfileInput): Promise<{ data: EmployeeProfile }> {
  const response = await fetch(`${API_URL}/employee-profiles`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Could not create employee profile');
  return response.json();
}

export async function updateEmployeeProfile(id: number, payload: EmployeeProfileInput): Promise<{ data: EmployeeProfile }> {
  const response = await fetch(`${API_URL}/employee-profiles/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) throw new Error('Could not update employee profile');
  return response.json();
}
