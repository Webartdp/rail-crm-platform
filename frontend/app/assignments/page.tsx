'use client';

import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { getEmployeeProfiles, employeeProfileName, type EmployeeProfile } from '../../lib/employee-profiles';
import { deleteWorkOrder, getWorkOrders, type WorkOrder } from '../../lib/work-orders';

function parseDetails(item?: WorkOrder | null): Record<string, string> {
  if (!item?.details) return {};

  if (typeof item.details === 'object') {
    return item.details as Record<string, string>;
  }

  try {
    return JSON.parse(item.details) as Record<string, string>;
  } catch {
    return {};
  }
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

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '180px minmax(380px, 1fr) 170px 110px 120px',
  alignItems: 'center',
  gap: '1rem',
  padding: '0.9rem 0',
  borderBottom: '1px solid rgba(148, 163, 184, 0.28)',
} as const;

const actionStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '1.35rem',
  height: '1.35rem',
  minWidth: '1.35rem',
  minHeight: '1.35rem',
  padding: 0,
  borderRadius: '0.35rem',
  border: '1px solid rgba(148, 163, 184, 0.45)',
  background: 'rgba(15, 23, 42, 0.06)',
  color: '#111827',
  textDecoration: 'none',
  lineHeight: 1,
  cursor: 'pointer',
} as const;

const actionsWrapStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.32rem',
  whiteSpace: 'nowrap',
} as const;

const modalBackdropStyle = {
  position: 'fixed',
  inset: 0,
  zIndex: 1000,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: '1.5rem',
  background: 'rgba(15, 23, 42, 0.55)',
  backdropFilter: 'blur(8px)',
} as const;

const modalStyle = {
  width: 'min(760px, 100%)',
  maxHeight: '86vh',
  overflow: 'auto',
  borderRadius: '1.25rem',
  border: '1px solid rgba(148, 163, 184, 0.3)',
  background: '#ffffff',
  boxShadow: '0 24px 80px rgba(15, 23, 42, 0.35)',
  padding: '1.4rem',
} as const;

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: '1rem',
  marginBottom: '1.1rem',
} as const;

const modalGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: '0.75rem',
} as const;

const modalFieldStyle = {
  display: 'grid',
  gap: '0.25rem',
  padding: '0.8rem',
  borderRadius: '0.75rem',
  border: '1px solid rgba(148, 163, 184, 0.2)',
  background: 'rgba(248, 250, 252, 0.9)',
} as const;

export default function AssignmentsPage() {
  const [items, setItems] = useState<WorkOrder[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [selectedItem, setSelectedItem] = useState<WorkOrder | null>(null);
  const [message, setMessage] = useState('Lade Aufträge...');
  const [loading, setLoading] = useState(true);

  const employeeMap = useMemo(() => {
    const map = new Map<number, string>();

    employees.forEach((employee) => {
      map.set(employee.id, employeeProfileName(employee));
    });

    return map;
  }, [employees]);

  async function load() {
    setLoading(true);

    try {
      const [ordersResponse, employeesResponse] = await Promise.all([
        getWorkOrders(),
        getEmployeeProfiles(),
      ]);

      setItems(ordersResponse.data);
      setEmployees(employeesResponse.data);
      setMessage(ordersResponse.data.length ? 'Aufträge aus API geladen.' : 'Noch keine Aufträge vorhanden.');
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setItems([]);
      setMessage(`API-Fehler: ${errorText}`);
    } finally {
      setLoading(false);
    }
  }

  async function deleteOrder(item: WorkOrder) {
    const label = item.reference_number || `#${item.id}`;

    if (!window.confirm(`Удалить задание ${label}?`)) {
      return;
    }

    try {
      await deleteWorkOrder(item.id);
      setMessage(`Задание ${label} удалено.`);
      await load();
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setMessage(`Не удалось удалить: ${errorText}`);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pending = items.filter((item) => item.status === 'planned').length;
  const waiting = items.filter((item) => item.status === 'waiting_approval').length;
  const approved = items.filter((item) => item.status === 'approved').length;

  const selectedDetails = parseDetails(selectedItem);
  const selectedEmployeeName = selectedItem?.employee_id
    ? employeeMap.get(selectedItem.employee_id) || `Mitarbeiter #${selectedItem.employee_id}`
    : '—';

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title="Assignments access">
        <section className="hero-card">
          <div>
            <p className="eyebrow">AS / Aufträge</p>
            <h1>Задания</h1>
            <p className="hero-text">Реальные задания из work_orders: сотрудник, объект, клиент, работа, плановое время и статус.</p>
          </div>
          <div className="field-status-stack">
            <div className="status-pill">{items.length} total</div>
            <span>planned: {pending} · waiting: {waiting} · approved: {approved}</span>
          </div>
        </section>

        <section className="panel">
          <div className="field-panel-head split-head">
            <div>
              <h2>Список заданий</h2>
              <p className="hint">{loading ? 'Загрузка...' : message}</p>
            </div>
            <a className="action-button primary" href="/work-orders/new">Создать задание</a>
          </div>

          <div style={rowStyle}>
            <strong>Referenz</strong>
            <strong>Задание</strong>
            <strong>Сотрудник</strong>
            <strong>Статус</strong>
            <strong>Действия</strong>
          </div>

          {items.map((item) => {
            const details = parseDetails(item);
            const employeeName = item.employee_id ? employeeMap.get(item.employee_id) || `Mitarbeiter #${item.employee_id}` : '—';

            return (
              <div style={rowStyle} key={item.id}>
                <span>
                  <strong>{item.reference_number || `#${item.id}`}</strong><br />
                  <small>{formatDateTime(item.planned_start_at)} → {formatDateTime(item.planned_end_at)}</small>
                </span>

                <span>
                  <strong>{details.work_title || item.title}</strong><br />
                  <small>{details.customer_name || '—'} · {details.object_name || '—'}</small><br />
                  <small>{details.leistungsart || '—'} · {details.zugnummer || '—'} · {details.einsatzort || '—'}</small>
                </span>

                <span>{employeeName}</span>

                <span>{item.status || 'planned'}</span>

                <span style={actionsWrapStyle}>
                  <button style={actionStyle} onClick={() => setSelectedItem(item)} type="button" aria-label="Посмотреть задание" title="Посмотреть">
                    <i className="las la-eye" aria-hidden="true" />
                  </button>

                  <a style={actionStyle} href={`/work-orders/${item.id}/edit`} aria-label="Редактировать задание" title="Редактировать">
                    <i className="las la-pen" aria-hidden="true" />
                  </a>

                  <button style={actionStyle} onClick={() => deleteOrder(item)} type="button" aria-label="Удалить задание" title="Удалить">
                    <i className="las la-trash" aria-hidden="true" />
                  </button>
                </span>
              </div>
            );
          })}

          {!loading && !items.length ? (
            <p className="hint">Заданий пока нет. Нажми “Создать задание”.</p>
          ) : null}
        </section>

        {selectedItem ? (
          <div style={modalBackdropStyle} onClick={() => setSelectedItem(null)}>
            <div style={modalStyle} role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
              <div style={modalHeaderStyle}>
                <div>
                  <p className="eyebrow">AS / Auftrag anzeigen</p>
                  <h2>{selectedDetails.work_title || selectedItem.title}</h2>
                  <p className="hint">{selectedItem.reference_number || `#${selectedItem.id}`} · {selectedItem.status || 'planned'}</p>
                </div>

                <span style={actionsWrapStyle}>
                  <a style={actionStyle} href={`/work-orders/${selectedItem.id}/edit`} title="Редактировать">
                    <i className="las la-pen" aria-hidden="true" />
                  </a>

                  <button style={actionStyle} onClick={() => setSelectedItem(null)} type="button" title="Закрыть">
                    <i className="las la-times" aria-hidden="true" />
                  </button>
                </span>
              </div>

              <div style={modalGridStyle}>
                <div style={modalFieldStyle}>
                  <strong>Referenznummer</strong>
                  <span>{selectedItem.reference_number || '—'}</span>
                </div>

                <div style={modalFieldStyle}>
                  <strong>Статус</strong>
                  <span>{selectedItem.status || 'planned'}</span>
                </div>

                <div style={modalFieldStyle}>
                  <strong>Сотрудник</strong>
                  <span>{selectedEmployeeName}</span>
                </div>

                <div style={modalFieldStyle}>
                  <strong>Название работы</strong>
                  <span>{selectedDetails.work_title || selectedItem.title}</span>
                </div>

                <div style={modalFieldStyle}>
                  <strong>Клиент</strong>
                  <span>{selectedDetails.customer_name || '—'}</span>
                </div>

                <div style={modalFieldStyle}>
                  <strong>Объект</strong>
                  <span>{selectedDetails.object_name || '—'}</span>
                </div>

                <div style={modalFieldStyle}>
                  <strong>Адрес объекта</strong>
                  <span>{selectedDetails.object_address || '—'}</span>
                </div>

                <div style={modalFieldStyle}>
                  <strong>Leistungsart</strong>
                  <span>{selectedDetails.leistungsart || '—'}</span>
                </div>

                <div style={modalFieldStyle}>
                  <strong>Zugnummer</strong>
                  <span>{selectedDetails.zugnummer || '—'}</span>
                </div>

                <div style={modalFieldStyle}>
                  <strong>Einsatzort</strong>
                  <span>{selectedDetails.einsatzort || '—'}</span>
                </div>

                <div style={modalFieldStyle}>
                  <strong>Плановый старт</strong>
                  <span>{formatDateTime(selectedItem.planned_start_at)}</span>
                </div>

                <div style={modalFieldStyle}>
                  <strong>Плановый стоп</strong>
                  <span>{formatDateTime(selectedItem.planned_end_at)}</span>
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </RoleGuard>
    </main>
  );
}
