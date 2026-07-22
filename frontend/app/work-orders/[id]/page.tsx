'use client';

import { use, useEffect, useState } from 'react';
import RoleGuard from '../../components/RoleGuard';
import { getEmployeeProfiles, employeeProfileName, type EmployeeProfile } from '../../../lib/employee-profiles';
import { getWorkOrder, type WorkOrder } from '../../../lib/work-orders';

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
      <RoleGuard allowedRoles={['manager', 'admin']} title="Work order view access">
        <section className="hero-card">
          <div>
            <p className="eyebrow">AS / Auftrag</p>
            <h1>Просмотр задания #{id}</h1>
            <p className="hero-text">{message}</p>
          </div>
          <div className="row-actions-inline">
            <a className="icon-action icon-action-xs" href="/assignments" title="Назад">
              <i className="las la-arrow-left" aria-hidden="true" />
            </a>
            <a className="icon-action icon-action-xs" href={`/work-orders/${id}/edit`} title="Редактировать">
              <i className="las la-pen" aria-hidden="true" />
            </a>
          </div>
        </section>

        {item ? (
          <section className="panel">
            <div className="details-grid">
              <div><strong>Referenznummer</strong><span>{item.reference_number || '—'}</span></div>
              <div><strong>Статус</strong><span>{item.status || 'planned'}</span></div>
              <div><strong>Сотрудник</strong><span>{employee ? employeeProfileName(employee) : item.employee_id ? `Mitarbeiter #${item.employee_id}` : '—'}</span></div>
              <div><strong>Название работы</strong><span>{details.work_title || item.title}</span></div>
              <div><strong>Клиент</strong><span>{details.customer_name || '—'}</span></div>
              <div><strong>Объект</strong><span>{details.object_name || '—'}</span></div>
              <div><strong>Адрес</strong><span>{details.object_address || '—'}</span></div>
              <div><strong>Leistungsart</strong><span>{details.leistungsart || '—'}</span></div>
              <div><strong>Zugnummer</strong><span>{details.zugnummer || '—'}</span></div>
              <div><strong>Einsatzort</strong><span>{details.einsatzort || '—'}</span></div>
              <div><strong>Плановый старт</strong><span>{formatDateTime(item.planned_start_at)}</span></div>
              <div><strong>Плановый стоп</strong><span>{formatDateTime(item.planned_end_at)}</span></div>
            </div>
          </section>
        ) : null}
      </RoleGuard>
    </main>
  );
}
