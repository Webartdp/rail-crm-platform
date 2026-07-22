import { getStoredToken } from './auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export type EmployeeProfile = {
  id: number;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  standard_hourly_rate?: number | string | null;
  travel_hourly_rate?: number | string | null;
  night_coefficient?: number | string | null;
  sunday_coefficient?: number | string | null;
  holiday_coefficient?: number | string | null;
  home_location?: string | null;
  is_active?: boolean | number;
  created_at?: string | null;
  updated_at?: string | null;
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
  is_active?: boolean;
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

export function employeeProfileName(profile: EmployeeProfile) {
  const name = `${profile.first_name || ''} ${profile.last_name || ''}`.trim();
  return name || `Mitarbeiter #${profile.id}`;
}

export async function getEmployeeProfiles(): Promise<{ data: EmployeeProfile[] }> {
  const response = await fetch(`${API_URL}/employee-profiles`, {
    headers: authHeaders(false),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not load employees'));
  }

  return response.json();
}

export async function getEmployeeProfile(id: number): Promise<{ data: EmployeeProfile }> {
  const response = await fetch(`${API_URL}/employee-profiles/${id}`, {
    headers: authHeaders(false),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not load employee'));
  }

  return response.json();
}

export async function createEmployeeProfile(payload: EmployeeProfileInput): Promise<{ data: EmployeeProfile }> {
  const response = await fetch(`${API_URL}/employee-profiles`, {
    method: 'POST',
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not create employee'));
  }

  return response.json();
}

export async function updateEmployeeProfile(id: number, payload: EmployeeProfileInput): Promise<{ data: EmployeeProfile }> {
  const response = await fetch(`${API_URL}/employee-profiles/${id}`, {
    method: 'PUT',
    headers: authHeaders(true),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, 'Could not update employee'));
  }

  return response.json();
}
