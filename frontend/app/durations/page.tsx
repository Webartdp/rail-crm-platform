'use client';

import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { getEmployeeProfiles, employeeProfileName, type EmployeeProfile } from '../../lib/employee-profiles';
import { getWorkOrders, type WorkOrder } from '../../lib/work-orders';
import { getWorkEvents, type WorkEvent } from '../../lib/work-events';

type WorkDetails = {
  object_name?: string;
  object_address?: string;
  customer_name?: string;
  work_title?: string;
  leistungsart?: string;
  zugnummer?: string;
  einsatzort?: string;
};

type DurationRow = {
  key: string;
  date: string;
  employeeId: number | null;
  employeeName: string;
  assignmentId: number | null;
  reference: string;
  title: string;
  objectName: string;
  customerName: string;
  workMinutes: number;
  travelMinutes: number;
  totalMinutes: number;
  status: string;
};

function today() {
  return new Date().toISOString().slice(0, 10);
}

function last7Days() {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date.toISOString().slice(0, 10);
}

function parseDetails(order?: WorkOrder | null): WorkDetails {
  const details = order?.details;

  if (!details) return {};

  if (typeof details === 'object') {
    return details as WorkDetails;
  }

  try {
    return JSON.parse(details) as WorkDetails;
  } catch {
    return {};
  }
}

function eventType(event: WorkEvent) {
  return event.event_type || event.type || event.action || '';
}

function eventTime(event: WorkEvent) {
  return event.occurred_at || event.event_time || event.created_at || '';
}

function eventDate(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function assignmentId(event: WorkEvent) {
  return event.assignment_id || event.work_order_id || null;
}

function minutesBetween(start?: string | null, stop?: string | null) {
  if (!start || !stop) return 0;

  const startTime = new Date(start).getTime();
  const stopTime = new Date(stop).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(stopTime) || stopTime < startTime) {
    return 0;
  }

  return Math.round((stopTime - startTime) / 60000);
}

function durationLabel(minutes: number) {
  if (!minutes) return '0 мин';

  if (minutes < 60) {
    return `${minutes} мин`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    planned: 'Запланировано',
    in_progress: 'В работе',
    waiting_approval: 'На согласовании',
    approved: 'Подтверждено',
    rejected: 'Отклонено',
  };

  return labels[status] || status || '—';
}

function statusClass(status: string) {
  if (status === 'approved') return 'report-status-badge is-approved';
  if (status === 'waiting_approval') return 'report-status-badge is-waiting';
  if (status === 'in_progress') return 'report-status-badge is-progress';
  if (status === 'rejected') return 'report-status-badge is-rejected';

  return 'report-status-badge';
}

function csvCell(value: string | number | null | undefined) {
  const text = String(value ?? '');
  return `"${text.replace(/"/g, '""')}"`;
}

function buildRows(events: WorkEvent[], orders: WorkOrder[], employees: EmployeeProfile[]): DurationRow[] {
  const orderMap = new Map<number, WorkOrder>();
  const employeeMap = new Map<number, string>();

  orders.forEach((order) => {
    orderMap.set(order.id, order);
  });

  employees.forEach((employee) => {
    employeeMap.set(employee.id, employeeProfileName(employee));
  });

  const groups = new Map<string, WorkEvent[]>();

  events.forEach((event) => {
    const employeeId = event.employee_id || null;
    const orderId = assignmentId(event);
    const date = eventDate(eventTime(event));
    const key = `${date || 'unknown'}:${employeeId || 'none'}:${orderId || 'none'}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)?.push(event);
  });

  const rows: DurationRow[] = [];

  groups.forEach((groupEvents, key) => {
    const sorted = [...groupEvents].sort((a, b) => {
      return new Date(eventTime(a)).getTime() - new Date(eventTime(b)).getTime();
    });

    const first = sorted[0];
    const employeeId = first?.employee_id || null;
    const orderId = first ? assignmentId(first) : null;
    const order = orderId ? orderMap.get(Number(orderId)) : null;
    const details = parseDetails(order);

    const findEvent = (type: string) => sorted.find((event) => eventType(event) === type);

    const gasfahrtStart = findEvent('gasfahrt_start');
    const gasfahrtStop = findEvent('gasfahrt_stop');
    const dienstbeginn = findEvent('dienstbeginn');
    const arbeitStop = findEvent('arbeit_stop');
    const dienstfahrtStart = findEvent('dienstfahrt_start');
    const dienstfahrtStop = findEvent('dienstfahrt_stop');

    const gasfahrtMinutes = minutesBetween(eventTime(gasfahrtStart || {} as WorkEvent), eventTime(gasfahrtStop || {} as WorkEvent));
    const dienstfahrtMinutes = minutesBetween(eventTime(dienstfahrtStart || {} as WorkEvent), eventTime(dienstfahrtStop || {} as WorkEvent));
    const workMinutes = minutesBetween(eventTime(dienstbeginn || {} as WorkEvent), eventTime(arbeitStop || {} as WorkEvent));
    const travelMinutes = gasfahrtMinutes + dienstfahrtMinutes;

    rows.push({
      key,
      date: eventDate(eventTime(first)),
      employeeId,
      employeeName: employeeId ? employeeMap.get(Number(employeeId)) || `Сотрудник #${employeeId}` : '—',
      assignmentId: orderId ? Number(orderId) : null,
      reference: order?.reference_number || (orderId ? `#${orderId}` : '—'),
      title: details.work_title || order?.title || (orderId ? `Задание #${orderId}` : '—'),
      objectName: details.object_name || '—',
      customerName: details.customer_name || '—',
      workMinutes,
      travelMinutes,
      totalMinutes: workMinutes + travelMinutes,
      status: order?.status || '—',
    });
  });

  return rows.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return a.employeeName.localeCompare(b.employeeName);
  });
}

const refreshButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 'auto',
  minWidth: '132px',
  height: '44px',
  padding: '0 1rem',
  borderRadius: '0.9rem',
  border: '1px solid rgba(37, 99, 235, 0.35)',
  background: '#2554d9',
  color: '#ffffff',
  fontSize: '0.95rem',
  fontWeight: 800,
  lineHeight: 1,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
} as const;

const cardGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
  gap: '1rem',
  margin: '1.25rem 0',
} as const;

const metricCardStyle = {
  display: 'grid',
  gap: '0.45rem',
  padding: '1.15rem',
  borderRadius: '1.15rem',
  border: '1px solid rgba(148, 163, 184, 0.22)',
  background: '#ffffff',
  boxShadow: '0 14px 35px rgba(15, 23, 42, 0.07)',
} as const;

const metricValueStyle = {
  margin: 0,
  fontSize: '1.8rem',
  lineHeight: 1,
  letterSpacing: '-0.04em',
} as const;

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '170px 105px minmax(260px, 1fr) 150px 150px 115px 115px 115px 120px',
  alignItems: 'center',
  gap: '0.85rem',
  padding: '0.85rem 0',
  borderBottom: '1px solid rgba(148, 163, 184, 0.24)',
} as const;

export default function DurationsPage() {
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Загрузка отчёта...');

  const [dateFrom, setDateFrom] = useState(last7Days());
  const [dateTo, setDateTo] = useState(today());
  const [filterEmployeeId, setFilterEmployeeId] = useState('');
  const [filterObject, setFilterObject] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterAssignmentId, setFilterAssignmentId] = useState('');
  const [filterTimeType, setFilterTimeType] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const rows = useMemo(() => buildRows(events, orders, employees), [events, orders, employees]);

  const objectOptions = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.objectName).filter((item) => item && item !== '—'))).sort();
  }, [rows]);

  const customerOptions = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.customerName).filter((item) => item && item !== '—'))).sort();
  }, [rows]);

  const statusOptions = useMemo(() => {
    return Array.from(new Set(rows.map((row) => row.status).filter((item) => item && item !== '—'))).sort();
  }, [rows]);

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      if (dateFrom && row.date < dateFrom) return false;
      if (dateTo && row.date > dateTo) return false;
      if (filterEmployeeId && String(row.employeeId || '') !== filterEmployeeId) return false;
      if (filterObject && row.objectName !== filterObject) return false;
      if (filterCustomer && row.customerName !== filterCustomer) return false;
      if (filterAssignmentId && String(row.assignmentId || '') !== filterAssignmentId) return false;
      if (filterStatus && row.status !== filterStatus) return false;
      if (filterTimeType === 'work' && row.workMinutes <= 0) return false;
      if (filterTimeType === 'travel' && row.travelMinutes <= 0) return false;

      return true;
    });
  }, [rows, dateFrom, dateTo, filterEmployeeId, filterObject, filterCustomer, filterAssignmentId, filterStatus, filterTimeType]);

  const workMinutes = filteredRows.reduce((sum, row) => sum + row.workMinutes, 0);
  const travelMinutes = filteredRows.reduce((sum, row) => sum + row.travelMinutes, 0);
  const totalMinutes = filteredRows.reduce((sum, row) => sum + row.totalMinutes, 0);
  const employeeCount = new Set(filteredRows.map((row) => row.employeeId).filter(Boolean)).size;

  async function load() {
    setLoading(true);
    setMessage('Загрузка отчёта...');

    try {
      const [eventsResponse, ordersResponse, employeesResponse] = await Promise.all([
        getWorkEvents(),
        getWorkOrders(),
        getEmployeeProfiles(),
      ]);

      setEvents(eventsResponse.data);
      setOrders(ordersResponse.data);
      setEmployees(employeesResponse.data);
      setMessage(eventsResponse.data.length ? 'Отчёт рассчитан по событиям сотрудников.' : 'Пока нет событий для отчёта.');
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setEvents([]);
      setOrders([]);
      setEmployees([]);
      setMessage(`Ошибка загрузки отчёта: ${errorText}`);
    } finally {
      setLoading(false);
    }
  }

  function resetFilters() {
    setDateFrom(last7Days());
    setDateTo(today());
    setFilterEmployeeId('');
    setFilterObject('');
    setFilterCustomer('');
    setFilterAssignmentId('');
    setFilterTimeType('');
    setFilterStatus('');
  }

  function exportCsv() {
    const header = [
      'Сотрудник',
      'Дата',
      'Задание',
      'Объект',
      'Заказчик',
      'Работа',
      'Дорога',
      'Всего',
      'Статус',
    ];

    const body = filteredRows.map((row) => [
      row.employeeName,
      row.date,
      row.title,
      row.objectName,
      row.customerName,
      durationLabel(row.workMinutes),
      durationLabel(row.travelMinutes),
      durationLabel(row.totalMinutes),
      statusLabel(row.status),
    ]);

    const csv = [header, ...body]
      .map((row) => row.map(csvCell).join(';'))
      .join('\n');

    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `durations-${dateFrom || 'all'}-${dateTo || 'all'}.csv`;
    link.click();

    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title="Durations access">
        <section className="hero-card">
          <div>
            <p className="eyebrow">DU / Dauer</p>
            <h1>Время сотрудников</h1>
            <p className="hero-text">Отчёт по рабочему времени, дороге и итоговой длительности по сотрудникам.</p>
            <p className="hint">{loading ? 'Загрузка...' : message}</p>
          </div>

          <div className="report-actions">
            <button className="action-button secondary" onClick={resetFilters} type="button">Сбросить</button>
            <button className="action-button secondary" onClick={exportCsv} type="button">Экспорт CSV</button>
            <button style={refreshButtonStyle} onClick={load} type="button">Обновить</button>
          </div>
        </section>

        <section style={cardGridStyle}>
          <div style={metricCardStyle}>
            <p className="eyebrow">Работа</p>
            <h2 style={metricValueStyle}>{durationLabel(workMinutes)}</h2>
            <p className="hint">Время на объекте.</p>
          </div>

          <div style={metricCardStyle}>
            <p className="eyebrow">Дорога</p>
            <h2 style={metricValueStyle}>{durationLabel(travelMinutes)}</h2>
            <p className="hint">Дорога и служебные поездки.</p>
          </div>

          <div style={metricCardStyle}>
            <p className="eyebrow">Всего</p>
            <h2 style={metricValueStyle}>{durationLabel(totalMinutes)}</h2>
            <p className="hint">Работа + дорога.</p>
          </div>

          <div style={metricCardStyle}>
            <p className="eyebrow">Сотрудники</p>
            <h2 style={metricValueStyle}>{employeeCount}</h2>
            <p className="hint">В выбранном отчёте.</p>
          </div>
        </section>

        <section className="panel">
          <div className="field-panel-head split-head">
            <div>
              <h2>Фильтры</h2>
              <p className="hint">Можно отфильтровать отчёт по сотруднику, периоду, объекту, заказчику и статусу.</p>
            </div>
          </div>

          <div className="form-grid">
            <label>Дата от<input value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} type="date" /></label>
            <label>Дата до<input value={dateTo} onChange={(event) => setDateTo(event.target.value)} type="date" /></label>

            <label>Сотрудник
              <select value={filterEmployeeId} onChange={(event) => setFilterEmployeeId(event.target.value)}>
                <option value="">Все сотрудники</option>
                {employees.map((employee) => (
                  <option key={employee.id} value={employee.id}>{employeeProfileName(employee)}</option>
                ))}
              </select>
            </label>

            <label>Объект
              <select value={filterObject} onChange={(event) => setFilterObject(event.target.value)}>
                <option value="">Все объекты</option>
                {objectOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label>Заказчик
              <select value={filterCustomer} onChange={(event) => setFilterCustomer(event.target.value)}>
                <option value="">Все заказчики</option>
                {customerOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>

            <label>Задание
              <select value={filterAssignmentId} onChange={(event) => setFilterAssignmentId(event.target.value)}>
                <option value="">Все задания</option>
                {orders.map((order) => {
                  const details = parseDetails(order);

                  return (
                    <option key={order.id} value={order.id}>
                      {(details.work_title || order.title)} · {order.reference_number || `#${order.id}`}
                    </option>
                  );
                })}
              </select>
            </label>

            <label>Тип времени
              <select value={filterTimeType} onChange={(event) => setFilterTimeType(event.target.value)}>
                <option value="">Всё время</option>
                <option value="work">Только работа</option>
                <option value="travel">Только дорога</option>
              </select>
            </label>

            <label>Статус
              <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
                <option value="">Все статусы</option>
                {statusOptions.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="panel">
          <h2>Расчёт времени</h2>

          <div className="report-table-scroll">
            <div style={rowStyle}>
              <strong>Сотрудник</strong>
              <strong>Дата</strong>
              <strong>Задание</strong>
              <strong>Объект</strong>
              <strong>Заказчик</strong>
              <strong>Работа</strong>
              <strong>Дорога</strong>
              <strong>Всего</strong>
              <strong>Статус</strong>
            </div>

            {filteredRows.map((row) => (
              <div style={rowStyle} key={row.key}>
                <span>{row.employeeName}</span>
                <span>{row.date || '—'}</span>

                <span>
                  <strong>{row.title}</strong><br />
                  <small>{row.reference}</small>
                </span>

                <span>{row.objectName}</span>
                <span>{row.customerName}</span>
                <span>{durationLabel(row.workMinutes)}</span>
                <span>{durationLabel(row.travelMinutes)}</span>
                <span><strong>{durationLabel(row.totalMinutes)}</strong></span>
                <span><span className={statusClass(row.status)}>{statusLabel(row.status)}</span></span>
              </div>
            ))}
          </div>

          {!filteredRows.length ? (
            <p className="hint">По выбранным фильтрам пока нет данных.</p>
          ) : null}
        </section>
      </RoleGuard>
    </main>
  );
}
