export type AuthUser = {
  id: number;
  employee_profile_id?: number | null;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export type AuthResponse = {
  message: string;
  token?: string;
  data: AuthUser;
};

export type WorkOrder = {
  id: number;
  employee_id?: number;
  title: string;
  reference_number?: string;
  status?: string;
  planned_start_at?: string;
  planned_end_at?: string;
  details?: string | Record<string, unknown> | null;
};

export type WorkEvent = {
  id: number;
  event_type: string;
  event_time: string;
  employee_id?: number;
  assignment_id?: number;
  latitude?: string | number | null;
  longitude?: string | number | null;
  location_accuracy?: string | number | null;
  payload?: string | Record<string, unknown> | null;
};

export type WorkDetails = {
  object_name?: string;
  object_address?: string;
  customer_name?: string;
  work_title?: string;
  leistungsart?: string;
  referenznummer?: string;
  zugnummer?: string;
  einsatzort?: string;
};
