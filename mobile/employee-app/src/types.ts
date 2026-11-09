export type AuthUser = {
  id: number;
  employee_profile_id?: number | null;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'admin' | string;
  locale?: string | null;
  is_active?: boolean;
};

export type AuthResponse = {
  message?: string;
  token?: string;
  data: AuthUser;
};

export type WorkOrder = {
  id: number;
  employee_id?: number | null;
  employee_ids?: number[];
  title: string;
  reference_number?: string | null;
  status?: string | null;
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  details?: string | Record<string, unknown> | null;
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

export type WorkEvent = {
  id: number;
  event_type: string;
  event_time: string;
  employee_id?: number;
  assignment_id?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  payload?: string | Record<string, unknown> | null;
};

export type FieldState = {
  employee_id: number;
  assignment_id?: number | null;
  last_assignment_id?: number | null;
  last_event_type?: string | null;
  current_state: string;
  allowed_actions: string[];
  next_button?: string;
  required_fields: string[];
  planned_start_at?: string | null;
  planned_end_at?: string | null;
  planned_exceeded: boolean;
  requires_bemerkung: boolean;
  leistungsart_options: string[];
};

export type TimesheetRow = {
  date: string;
  weekday: number;
  holiday: string | null;
  type: 'arbeit' | 'gasfahrt' | 'dienstfahrt' | string;
  assignment_id: number | null;
  reference_number: string | null;
  work_title: string | null;
  leistungsart: string | null;
  zugnummer: string | null;
  client: string | null;
  object: string | null;
  address: string | null;
  planned_start: string | null;
  planned_end: string | null;
  planned_minutes: number;
  actual_start: string;
  actual_end: string | null;
  minutes: number;
  minutes_day: number;
  minutes_night_20_24: number;
  minutes_night_00_04: number;
  minutes_night_04_06: number;
  minutes_sunday_holiday: number;
  bemerkung: string | null;
  corrected: boolean;
  status: 'open' | 'pending' | 'approved' | 'rejected' | string;
  start_event_id: number;
  stop_event_id: number | null;
};

export type Timesheet = {
  employee: { id: number; name: string; home_location: string | null };
  period: { from: string; to: string };
  rows: TimesheetRow[];
  totals: {
    work: number;
    travel: number;
    planned: number;
    day: number;
    night_20_24: number;
    night_00_04: number;
    night_04_06: number;
    sunday_holiday: number;
    days: number;
  };
};

export type WorkEventPayload = {
  employee_id: number;
  assignment_id: number;
  latitude?: number;
  longitude?: number;
  location_accuracy?: number;
  planned_exceeded?: boolean;
  bemerkung?: string;
  recorded_at?: string;
  payload: Record<string, unknown>;
};
