'use client';

import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { me, type AuthUser } from '../../lib/auth';
import { getEmployeeProfiles, employeeProfileName, type EmployeeProfile } from '../../lib/employee-profiles';
import { getWorkOrders, type WorkOrder } from '../../lib/work-orders';
import { getWorkEvents, type WorkEvent } from '../../lib/work-events';
import { getWorkEventApprovals, type WorkEventApproval } from '../../lib/approvals';

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

function eventType(event: WorkEvent) {
  return event.event_type || event.type || event.action || '—';
}

function eventTime(event: WorkEvent) {
  return event.occurred_at || event.event_time || event.created_at || null;
}

function assignmentId(event: WorkEvent) {
  return event.assignment_id || event.work_order_id || null;
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

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    gasfahrt_start: 'Anfahrt Start',
    gasfahrt_stop: 'Anfahrt Stop',
    dienstbeginn: 'Dienstbeginn',
    arbeit_stop: 'Arbeit Stop',
    dienstfahrt_start: 'Dienstfahrt Start',
    dienstfahrt_stop: 'Dienstfahrt Stop',
  };

  return labels[type] || type;
}

const smallButtonStyle = {
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
} as const;

const cardGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: '1.15rem',
  marginTop: '1rem',
  marginBottom: '1.4rem',
} as const;

const miniCardStyle = {
  display: 'grid',
  alignContent: 'start',
  gap: '0.75rem',
  minHeight: '165px',
  padding: '1.25rem',
  borderRadius: '1.25rem',
  border: '1px solid rgba(148, 163, 184, 0.22)',
  background: '#ffffff',
  boxShadow: '0 18px 45px rgba(15, 23, 42, 0.08)',
} as const;

const metricHeadStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '0.75rem',
} as const;

const metricIconStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '2.35rem',
  height: '2.35rem',
  borderRadius: '0.9rem',
  background: 'rgba(37, 99, 235, 0.1)',
  color: '#2554d9',
  fontSize: '1.25rem',
  lineHeight: 1,
} as const;

const metricValueStyle = {
  margin: 0,
  fontSize: '2.35rem',
  lineHeight: 1,
  letterSpacing: '-0.045em',
} as const;

const metricTextStyle = {
  margin: 0,
  color: '#64748b',
  fontSize: '0.92rem',
  lineHeight: 1.45,
} as const;

const twoColumnStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)',
  gap: '1.25rem',
  marginBottom: '1.4rem',
} as const;

const listItemStyle = {
  display: 'grid',
  gap: '0.25rem',
  padding: '0.85rem 0',
  borderBottom: '1px solid rgba(148, 163, 184, 0.22)',
} as const;

export default function ManagerDashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [approvals, setApprovals] = useState<WorkEventApproval[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [message, setMessage] = useState('Lade Manager-Dashboard...');
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
      const [userResponse, ordersResponse, approvalsResponse, eventsResponse, employeesResponse] = await Promise.all([
        me(),
        getWorkOrders(),
        getWorkEventApprovals(),
        getWorkEvents(),
        getEmployeeProfiles(),
      ]);

      const currentUser = userResponse.data;

      setUser(currentUser);
      setOrders(ordersResponse.data);
      setApprovals(approvalsResponse.data);
      setEvents(eventsResponse.data);
      setEmployees(employeesResponse.data);
      setMessage(`Загружено для ${currentUser.name || currentUser.email} (${currentUser.role}).`);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setMessage(`API-Fehler: ${errorText}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const pendingApprovals = approvals.filter((item) => item.status === 'pending');
  const approvedApprovals = approvals.filter((item) => item.status === 'approved');
  const openOrders = orders.filter((item) => !['approved', 'closed', 'rejected'].includes(item.status || ''));
  const activeOrders = orders.filter((item) => ['planned', 'in_progress', 'waiting_approval'].includes(item.status || ''));

  const latestApprovals = approvals.slice(0, 5);
  const latestEvents = events.slice(0, 6);
  const latestOpenOrders = activeOrders.slice(0, 5);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title="Manager dashboard access">
        <section className="hero-card">
          <div>
            <p className="eyebrow">Менеджер</p>
            <h1>Панель менеджера</h1>
            <p className="hero-text">Обзор согласований, открытых заданий и событий смены.</p>
            <p className="hint">{loading ? 'Загрузка...' : message}</p>
          </div>

          <button
            className="small-refresh-button"
            onClick={load}
            type="button"
            style={smallButtonStyle}
          >
            <i className="las la-sync-alt" aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1 }} />
            <span>Обновить</span>
          </button>
        </section>

        <section style={cardGridStyle}>
          <div style={miniCardStyle}>
            <div style={metricHeadStyle}>
              <p className="eyebrow">Ждут проверки</p>
              <i className="las la-hourglass-half" aria-hidden="true" style={metricIconStyle} />
            </div>
            <h2 style={metricValueStyle}>{pendingApprovals.length}</h2>
            <p style={metricTextStyle}>Новые отрезки времени, которые менеджер ещё не подтвердил.</p>
          </div>

          <div style={miniCardStyle}>
            <div style={metricHeadStyle}>
              <p className="eyebrow">Проверено</p>
              <i className="las la-check-circle" aria-hidden="true" style={metricIconStyle} />
            </div>
            <h2 style={metricValueStyle}>{approvedApprovals.length}</h2>
            <p style={metricTextStyle}>Уже подтверждённые отрезки рабочего времени.</p>
          </div>

          <div style={miniCardStyle}>
            <div style={metricHeadStyle}>
              <p className="eyebrow">Активные задания</p>
              <i className="las la-clipboard-list" aria-hidden="true" style={metricIconStyle} />
            </div>
            <h2 style={metricValueStyle}>{openOrders.length}</h2>
            <p style={metricTextStyle}>Назначены сотрудникам и ещё не закрыты.</p>
          </div>

          <div style={miniCardStyle}>
            <div style={metricHeadStyle}>
              <p className="eyebrow">События смены</p>
              <i className="las la-stream" aria-hidden="true" style={metricIconStyle} />
            </div>
            <h2 style={metricValueStyle}>{events.length}</h2>
            <p style={metricTextStyle}>Дорога, начало работы, завершение работы и служебные поездки.</p>
          </div>
        </section>

        <section style={twoColumnStyle}>
          <div className="panel">
            <div className="field-panel-head split-head">
              <div>
                <h2>Последние согласования</h2>
                <p className="hint">Очередь OK / Freigabe.</p>
              </div>
              <a className="small-create-button" href="/approvals" style={{ ...smallButtonStyle, textDecoration: 'none' }}>
                <i className="las la-external-link-alt" aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1 }} />
                <span>Открыть</span>
              </a>
            </div>

            {latestApprovals.map((approval) => {
              const order = orderMap.get(approval.assignment_id);
              const details = parseDetails(order);
              const employeeName = employeeMap.get(approval.employee_id) || `Mitarbeiter #${approval.employee_id}`;

              return (
                <div style={listItemStyle} key={approval.id}>
                  <strong>{employeeName}</strong>
                  <span>{details.work_title || order?.title || `Auftrag #${approval.assignment_id}`}</span>
                  <small>{pairLabel(approval.pair_type)} · {approval.status}</small>
                </div>
              );
            })}

            {!latestApprovals.length ? <p className="hint">Пока нет согласований.</p> : null}
          </div>

          <div className="panel">
            <div className="field-panel-head split-head">
              <div>
                <h2>Открытые задания</h2>
                <p className="hint">AS / Aufträge.</p>
              </div>
              <a className="small-create-button" href="/assignments" style={{ ...smallButtonStyle, textDecoration: 'none' }}>
                <i className="las la-external-link-alt" aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1 }} />
                <span>Открыть</span>
              </a>
            </div>

            {latestOpenOrders.map((order) => {
              const details = parseDetails(order);
              const employeeName = order.employee_id ? employeeMap.get(order.employee_id) || `Mitarbeiter #${order.employee_id}` : '—';

              return (
                <div style={listItemStyle} key={order.id}>
                  <strong>{details.work_title || order.title}</strong>
                  <span>{order.reference_number || `#${order.id}`} · {order.status || 'planned'}</span>
                  <small>{employeeName} · {details.customer_name || '—'} · {details.object_name || '—'}</small>
                </div>
              );
            })}

            {!latestOpenOrders.length ? <p className="hint">Нет открытых заданий.</p> : null}
          </div>
        </section>

        <section className="panel">
          <div className="field-panel-head split-head">
            <div>
              <h2>Последние события смены</h2>
              <p className="hint">EV / Ereignisse.</p>
            </div>
            <a className="small-create-button" href="/work-events" style={{ ...smallButtonStyle, textDecoration: 'none' }}>
              <i className="las la-external-link-alt" aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1 }} />
              <span>Открыть</span>
            </a>
          </div>

          {latestEvents.map((event) => {
            const orderId = assignmentId(event);
            const order = orderId ? orderMap.get(orderId) : null;
            const details = parseDetails(order);
            const employeeName = event.employee_id ? employeeMap.get(event.employee_id) || `Mitarbeiter #${event.employee_id}` : '—';

            return (
              <div style={listItemStyle} key={event.id}>
                <strong>{eventLabel(eventType(event))}</strong>
                <span>{employeeName} · {details.work_title || order?.title || (orderId ? `Auftrag #${orderId}` : '—')}</span>
                <small>{formatDateTime(eventTime(event))}</small>
              </div>
            );
          })}

          {!latestEvents.length ? <p className="hint">Пока нет событий смены.</p> : null}
        </section>
      </RoleGuard>
    </main>
  );
}
