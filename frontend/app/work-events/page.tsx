'use client';

import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { useI18n } from '../i18n';
import { getWorkEvents, type WorkEvent } from '../../lib/api';
import { getEmployeeProfiles, employeeProfileName, type EmployeeProfile } from '../../lib/employee-profiles';

export default function WorkEventsPage() {
  const { t, fmt } = useI18n();
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getWorkEvents(), getEmployeeProfiles().catch(() => ({ data: [] as EmployeeProfile[] }))])
      .then(([eventsResponse, employeesResponse]) => {
        setEvents(eventsResponse.data);
        setEmployees(employeesResponse.data);
        setMessage(eventsResponse.data.length === 0 ? t('evNone') : '');
      })
      .catch((error) => setMessage(t('commonLoadFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') })))
      .finally(() => setLoading(false));
  }, []);

  const names = useMemo(() => new Map(employees.map((employee) => [employee.id, employeeProfileName(employee)])), [employees]);
  const sorted = useMemo(() => [...events].sort((a, b) => String(b.event_time).localeCompare(String(a.event_time))), [events]);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('workEvents')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('evEyebrow')}</p>
            <h1>{t('workEvents')}</h1>
            <p className="hero-text">{t('evHero')}</p>
          </div>
        </section>

        <section className="panel">
          {loading ? <p className="hint">{t('commonLoadingDots')}</p> : null}
          {message ? <p className="hint">{message}</p> : null}
          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('commonTime')}</th>
                  <th>{t('commonEmployee')}</th>
                  <th>{t('mapsEvent')}</th>
                  <th>{t('commonAssignment')}</th>
                  <th>{t('evLocation')}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((event) => (
                  <tr key={event.id}>
                    <td>{fmt.dateTime(event.event_time)}</td>
                    <td>{event.employee_id ? names.get(Number(event.employee_id)) || t('commonEmployeeNumber', { id: event.employee_id }) : '—'}</td>
                    <td>{fmt.eventType(event.event_type)}</td>
                    <td>{event.assignment_id ? `#${event.assignment_id}` : '—'}</td>
                    <td>
                      {event.latitude && event.longitude ? (
                        <a className="small-button" href={`https://www.google.com/maps?q=${event.latitude},${event.longitude}`} rel="noreferrer" target="_blank">{t('mapsShow')}</a>
                      ) : t('mapsNoCoordinates')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </RoleGuard>
    </main>
  );
}
