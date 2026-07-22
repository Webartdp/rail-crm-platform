'use client';

import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { getEmployeeProfiles, employeeProfileName, type EmployeeProfile } from '../../lib/employee-profiles';
import { getWorkOrders, type WorkOrder } from '../../lib/work-orders';
import {
  getWorkEventApprovals,
  setWorkEventApprovalStatus,
  type WorkEventApproval,
} from '../../lib/approvals';

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

function pairLabel(pairType: WorkEventApproval['pair_type']) {
  if (pairType === 'gasfahrt') return 'An-/Abfahrt';
  if (pairType === 'arbeit') return 'Arbeitszeit';
  if (pairType === 'dienstfahrt') return 'Dienstfahrt';
  return pairType;
}

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '170px minmax(300px, 1fr) 160px 160px 130px 150px',
  alignItems: 'center',
  gap: '1rem',
  padding: '0.9rem 0',
  borderBottom: '1px solid rgba(148, 163, 184, 0.28)',
} as const;

const actionsWrapStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.35rem',
  whiteSpace: 'nowrap',
} as const;

const actionStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '1.55rem',
  height: '1.55rem',
  minWidth: '1.55rem',
  minHeight: '1.55rem',
  padding: 0,
  borderRadius: '0.4rem',
  border: '1px solid rgba(148, 163, 184, 0.45)',
  background: 'rgba(15, 23, 42, 0.06)',
  color: '#111827',
  textDecoration: 'none',
  lineHeight: 1,
  cursor: 'pointer',
} as const;

export default function ApprovalsPage() {
  const [items, setItems] = useState<WorkEventApproval[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [message, setMessage] = useState('Lade Freigaben...');
  const [loading, setLoading] = useState(true);

  const employeeMap = useMemo(() => {
    const map = new Map<number, string>();

    employees.forEach((employee) => {
      map.set(employee.id, employeeProfileName(employee));
    });

    return map;
  }, [employees]);

  const orderMap = useMemo(() => {
    const map = new Map<number, WorkOrder>();

    orders.forEach((order) => {
      map.set(order.id, order);
    });

    return map;
  }, [orders]);

  async function load() {
    setLoading(true);

    try {
      const [approvalResponse, employeeResponse, orderResponse] = await Promise.all([
        getWorkEventApprovals(),
        getEmployeeProfiles(),
        getWorkOrders(),
      ]);

      setItems(approvalResponse.data);
      setEmployees(employeeResponse.data);
      setOrders(orderResponse.data);
      setMessage(approvalResponse.data.length ? 'Freigaben aus API geladen.' : 'Noch keine Freigaben vorhanden.');
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setItems([]);
      setMessage(`API-Fehler: ${errorText}`);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(action: 'approve' | 'reject', approval: WorkEventApproval) {
    try {
      await setWorkEventApprovalStatus(action, approval.id);
      setMessage(action === 'approve' ? 'Freigabe bestätigt.' : 'Freigabe abgelehnt.');
      await load();
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setMessage(`Aktion fehlgeschlagen: ${errorText}`);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pending = items.filter((item) => item.status === 'pending').length;
  const approved = items.filter((item) => item.status === 'approved').length;
  const rejected = items.filter((item) => item.status === 'rejected').length;

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title="Approvals access">
        <section className="hero-card">
          <div>
            <p className="eyebrow">OK / Freigabe</p>
            <h1>Согласование</h1>
            <p className="hero-text">Проверка пар событий рабочего дня: дорога, рабочее время и служебные поездки.</p>
          </div>
          <div className="field-status-stack">
            <div className="status-pill">{items.length} total</div>
            <span>pending: {pending} · approved: {approved} · rejected: {rejected}</span>
          </div>
        </section>

        <section className="panel">
          <div className="field-panel-head split-head">
            <div>
              <h2>Очередь согласования</h2>
              <p className="hint">{loading ? 'Загрузка...' : message}</p>
            </div>
            <button
              className="small-refresh-button"
              onClick={load}
              type="button"
              style={{
                width: 'auto',
                maxWidth: 'max-content',
                minWidth: 0,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.45rem',
                padding: '0.55rem 0.9rem',
                borderRadius: '0.75rem',
                border: '1px solid rgba(37, 99, 235, 0.35)',
                background: '#2554d9',
                color: '#ffffff',
                fontWeight: 700,
                lineHeight: 1,
                whiteSpace: 'nowrap',
                cursor: 'pointer',
                flex: '0 0 auto',
                justifySelf: 'end',
                alignSelf: 'center',
              }}
            >
              <i className="las la-sync-alt" aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1 }} />
              <span>Обновить</span>
            </button>
          </div>

          <div style={rowStyle}>
            <strong>Сотрудник</strong>
            <strong>Задание</strong>
            <strong>Тип</strong>
            <strong>Время</strong>
            <strong>Статус</strong>
            <strong>Действия</strong>
          </div>

          {items.map((item) => {
            const order = orderMap.get(item.assignment_id);
            const details = parseDetails(order);
            const employeeName = employeeMap.get(item.employee_id) || `Mitarbeiter #${item.employee_id}`;

            return (
              <div style={rowStyle} key={item.id}>
                <span>
                  <strong>{employeeName}</strong><br />
                  <small>ID: {item.employee_id}</small>
                </span>

                <span>
                  <strong>{details.work_title || order?.title || `Auftrag #${item.assignment_id}`}</strong><br />
                  <small>{order?.reference_number || `#${item.assignment_id}`}</small><br />
                  <small>{details.customer_name || '—'} · {details.object_name || '—'}</small>
                </span>

                <span>{pairLabel(item.pair_type)}</span>

                <span>
                  <small>{formatDateTime(item.start_time)}</small><br />
                  <small>{formatDateTime(item.stop_time)}</small>
                </span>

                <span>{item.status}</span>

                <span style={actionsWrapStyle}>
                  {item.status === 'pending' ? (
                    <>
                      <button style={actionStyle} onClick={() => updateStatus('approve', item)} type="button" title="Согласовать">
                        <i className="las la-check" aria-hidden="true" />
                      </button>

                      <button style={actionStyle} onClick={() => updateStatus('reject', item)} type="button" title="Отклонить">
                        <i className="las la-times" aria-hidden="true" />
                      </button>
                    </>
                  ) : (
                    <span className="hint">—</span>
                  )}
                </span>
              </div>
            );
          })}

          {!loading && !items.length ? (
            <p className="hint">Пока нет событий для согласования. Они появятся после рабочего дня сотрудника.</p>
          ) : null}
        </section>
      </RoleGuard>
    </main>
  );
}
