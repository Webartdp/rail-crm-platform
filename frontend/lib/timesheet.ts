import { apiRequest } from './http';

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
  generated_at: string;
};

export function getTimesheet(params: { employeeId?: number | null; from: string; to: string }) {
  const query = new URLSearchParams({ date_from: params.from, date_to: params.to });
  if (params.employeeId) query.set('employee_id', String(params.employeeId));
  return apiRequest<{ data: Timesheet }>(`/reports/timesheet?${query.toString()}`);
}

export function correctTime(input: { start_event_id: number; stop_event_id: number; start_time: string; stop_time: string; bemerkung?: string }) {
  return apiRequest<{ message: string }>('/work-events/correct', { body: input });
}
