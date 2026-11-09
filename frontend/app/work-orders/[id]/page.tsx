'use client';

import { use, useEffect, useState } from 'react';
import RoleGuard from '../../components/RoleGuard';
import { getEmployeeProfiles, employeeProfileName, type EmployeeProfile } from '../../../lib/employee-profiles';
import { getWorkOrder, type WorkOrder } from '../../../lib/work-orders';
import { useI18n } from '../../i18n';
type PageProps = {
  params: Promise<{ id: string }>;
};

function parseDetails(value: unknown): Record<string, string> {
  if (!value) return {};

  if (typeof value === 'object') {
    return value as Record<string, string>;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, string>;
    } catch {
      return {};
    }
  }

  return {};
}

function formatDateTime(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export default function WorkOrderViewPage({ params }: PageProps) {
  const { t } = useI18n();
  const resolvedParams = use(params);
  const id = Number(resolvedParams.id);

  const [item, setItem] = useState<WorkOrder | null>(null);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [message, setMessage] = useState('Загрузка задания...');

  useEffect(() => {
    async function load() {
      try {
        const [employeeResponse, orderResponse] = await Promise.all([
          getEmployeeProfiles(),
          getWorkOrder(id),
        ]);

        setEmployees(employeeResponse.data);
        setItem(orderResponse.data);
        setMessage('Задание загружено.');
      } catch (error) {
        const errorText = error instanceof Error ? error.message : 'Unbekannter Fehler';
        setMessage(`Ошибка загрузки: ${errorText}`);
      }
    }

    load();
  }, [id]);

  const details = parseDetails(item?.details);
  const employee = employees.find((profile) => profile.id === item?.employee_id);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('woViewTitle', { id })}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('woViewEyebrow')}</p>
            <h1>{t('woViewTitle', { id })}</h1>
            <p className="hero-text">{message}</p>
          </div>
          <div className="row-actions-inline">
            <a className="icon-action icon-action-xs" href="/assignments" title={t('commonBack')}>
              <i className="las la-arrow-left" aria-hidden="true" />
            </a>
            <a className="icon-action icon-action-xs" href={`/work-orders/${id}/edit`} title={t('commonEdit')}>
              <i className="las la-pen" aria-hidden="true" />
            </a>
          </div>
        </section>

        {item ? (
          <section className="panel">
            <div className="details-grid">
              <div><strong>Referenznummer</strong><span>{item.reference_number || '—'}</span></div>
              <div><strong>{t('commonStatus')}</strong><span>{item.status || 'planned'}</span></div>
              <div><strong>{t('commonEmployee')}</strong><span>{employee ? employeeProfileName(employee) : item.employee_id ? `Mitarbeiter #${item.employee_id}` : '—'}</span></div>
              <div><strong>{t('asgWorkTitle')}</strong><span>{details.work_title || item.title}</span></div>
              <div><strong>{t('commonCustomer')}</strong><span>{details.customer_name || '—'}</span></div>
              <div><strong>{t('commonObject')}</strong><span>{details.object_name || '—'}</span></div>
              <div><strong>{t('woAddress')}</strong><span>{details.object_address || '—'}</span></div>
              <div><strong>Leistungsart</strong><span>{details.leistungsart || '—'}</span></div>
              <div><strong>Zugnummer</strong><span>{details.zugnummer || '—'}</span></div>
              <div><strong>Einsatzort</strong><span>{details.einsatzort || '—'}</span></div>
              <div><strong>{t('asgPlannedStart')}</strong><span>{formatDateTime(item.planned_start_at)}</span></div>
              <div><strong>{t('asgPlannedStop')}</strong><span>{formatDateTime(item.planned_end_at)}</span></div>
            </div>
          </section>
        ) : null}
      </RoleGuard>
    </main>
  );
}
