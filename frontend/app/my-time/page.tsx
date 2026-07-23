'use client';

import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { me } from '../../lib/auth';
import {
  getWorkEvents,
  getWorkOrders,
  type DemoWorkOrder,
  type WorkEvent,
} from '../../lib/api';

type WorkDetails = {
  object_name?: string;
  object_address?: string;
  customer_name?: string;
  work_title?: string;
  leistungsart?: string;
  zugnummer?: string;
  einsatzort?: string;
};

type MyTimeRow = {
  key: string;
  date: string;
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

function parseDetails(order?: DemoWorkOrder | null): WorkDetails {
  if (!order?.details) return {};

  if (typeof order.details === 'object') {
    return order.details as WorkDetails;
  }

  try {
    return JSON.parse(order.details) as WorkDetails;
  } catch {
    return {};
  }
}

function eventDateValue(value?: string | null) {
  if (!value) return '';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function minutesBetween(start?: string | null, stop?: string | null) {
  if (!start || !stop) return null;

  const startTime = new Date(start).getTime();
  const stopTime = new Date(stop).getTime();

  if (Number.isNaN(startTime) || Number.isNaN(stopTime) || stopTime < startTime) return null;

  return Math.round((stopTime - startTime) / 60000);
}

function durationLabel(minutes: number | null | undefined) {
  if (!minutes) return '0 мин';

  if (minutes < 60) {
    return `${minutes} мин`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours} ч ${rest} мин` : `${hours} ч`;
}

function assignmentIdFromEvent(event: WorkEvent) {
  return event.assignment_id ? Number(event.assignment_id) : null;
}

function buildMyTimeRows(events: WorkEvent[], orders: DemoWorkOrder[]): MyTimeRow[] {
  const orderMap = new Map<number, DemoWorkOrder>();

  orders.forEach((order) => {
    orderMap.set(order.id, order);
  });

  const groups = new Map<string, WorkEvent[]>();

  events.forEach((event) => {
    const eventDate = eventDateValue(event.event_time);
    const assignmentId = assignmentIdFromEvent(event);
    const key = `${eventDate || 'unknown'}:${assignmentId || 'none'}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }

    groups.get(key)?.push(event);
  });

  const rows: MyTimeRow[] = [];

  groups.forEach((groupEvents, key) => {
    const sorted = [...groupEvents].sort((a, b) => {
      return new Date(a.event_time || '').getTime() - new Date(b.event_time || '').getTime();
    });

    const first = sorted[0];
    const date = eventDateValue(first?.event_time);
    const assignmentId = first ? assignmentIdFromEvent(first) : null;
    const order = assignmentId ? orderMap.get(assignmentId) : null;
    const details = parseDetails(order);

    const findEvent = (type: string) => sorted.find((event) => event.event_type === type);

    const gasfahrtStart = findEvent('gasfahrt_start');
    const gasfahrtStop = findEvent('gasfahrt_stop');
    const dienstbeginn = findEvent('dienstbeginn');
    const arbeitStop = findEvent('arbeit_stop');
    const dienstfahrtStart = findEvent('dienstfahrt_start');
    const dienstfahrtStop = findEvent('dienstfahrt_stop');

    const gasfahrtMinutes = minutesBetween(gasfahrtStart?.event_time, gasfahrtStop?.event_time) || 0;
    const dienstfahrtMinutes = minutesBetween(dienstfahrtStart?.event_time, dienstfahrtStop?.event_time) || 0;
    const workMinutes = minutesBetween(dienstbeginn?.event_time, arbeitStop?.event_time) || 0;
    const travelMinutes = gasfahrtMinutes + dienstfahrtMinutes;

    let status = 'В процессе';

    if (arbeitStop) {
      status = 'Завершено';
    } else if (dienstbeginn) {
      status = 'В работе';
    } else if (gasfahrtStop) {
      status = 'На объекте';
    } else if (gasfahrtStart) {
      status = 'В дороге';
    }

    rows.push({
      key,
      date,
      assignmentId,
      reference: order?.reference_number || (assignmentId ? `#${assignmentId}` : '—'),
      title: details.work_title || order?.title || (assignmentId ? `Задание #${assignmentId}` : '—'),
      objectName: details.object_name || '—',
      customerName: details.customer_name || '—',
      workMinutes,
      travelMinutes,
      totalMinutes: workMinutes + travelMinutes,
      status,
    });
  });

  return rows.sort((a, b) => b.date.localeCompare(a.date));
}

const cardGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '1rem',
  margin: '1rem 0 1.25rem',
} as const;

const metricCardStyle = {
  display: 'grid',
  gap: '0.45rem',
  padding: '1rem',
  borderRadius: '1rem',
  border: '1px solid rgba(148, 163, 184, 0.22)',
  background: '#ffffff',
  boxShadow: '0 14px 35px rgba(15, 23, 42, 0.07)',
} as const;

const metricValueStyle = {
  margin: 0,
  fontSize: '1.9rem',
  lineHeight: 1,
  letterSpacing: '-0.04em',
} as const;

const rowStyle = {
  display: 'grid',
  gridTemplateColumns: '120px minmax(260px, 1fr) 150px 150px 130px 130px 120px',
  alignItems: 'center',
  gap: '0.85rem',
  padding: '0.8rem 0',
  borderBottom: '1px solid rgba(148, 163, 184, 0.24)',
} as const;

export default function MyTimePage() {
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [orders, setOrders] = useState<DemoWorkOrder[]>([]);
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('Загрузка времени...');

  const [dateFrom, setDateFrom] = useState(today());
  const [dateTo, setDateTo] = useState(today());
  const [filterObject, setFilterObject] = useState('');
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterAssignmentId, setFilterAssignmentId] = useState('');

  const myTimeRows = useMemo(() => buildMyTimeRows(events, orders), [events, orders]);

  const objectOptions = useMemo(() => {
    return Array.from(new Set(myTimeRows.map((row) => row.objectName).filter((value) => value && value !== '—'))).sort();
  }, [myTimeRows]);

  const customerOptions = useMemo(() => {
    return Array.from(new Set(myTimeRows.map((row) => row.customerName).filter((value) => value && value !== '—'))).sort();
  }, [myTimeRows]);

  const filteredRows = useMemo(() => {
    return myTimeRows.filter((row) => {
      if (dateFrom && row.date < dateFrom) return false;
      if (dateTo && row.date > dateTo) return false;
      if (filterObject && row.objectName !== filterObject) return false;
      if (filterCustomer && row.customerName !== filterCustomer) return false;
      if (filterAssignmentId && String(row.assignmentId || '') !== filterAssignmentId) return false;

      return true;
    });
  }, [myTimeRows, dateFrom, dateTo, filterObject, filterCustomer, filterAssignmentId]);

  const workMinutes = filteredRows.reduce((sum, row) => sum + row.workMinutes, 0);
  const travelMinutes = filteredRows.reduce((sum, row) => sum + row.travelMinutes, 0);
  const totalMinutes = filteredRows.reduce((sum, row) => sum + row.totalMinutes, 0);

  async function load() {
    setLoading(true);
    setMessage('Загрузка времени...');

    try {
      const current = await me();
      const profileId = current.data.employee_profile_id ? Number(current.data.employee_profile_id) : null;

      setEmployeeId(profileId);

      if (!profileId) {
        setOrders([]);
        setEvents([]);
        setMessage('К пользователю не привязан профиль сотрудника.');
        return;
      }

      const [ordersResponse, eventsResponse] = await Promise.all([
        getWorkOrders({ employeeId: profileId }),
        getWorkEvents({ employeeId: profileId }),
      ]);

      setOrders(ordersResponse.data);
      setEvents(eventsResponse.data);
      setMessage(eventsResponse.data.length ? 'Время рассчитано по событиям рабочего дня.' : 'Пока нет событий рабочего дня.');
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setOrders([]);
      setEvents([]);
      setMessage(`Ошибка загрузки: ${errorText}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['employee']} title="Employee time access">
        <section className="hero-card">
          <div>
            <p className="eyebrow">Моё время</p>
            <h1>Мои часы</h1>
            <p className="hero-text">Здесь сотрудник видит только своё время: работа, дорога и общий итог за выбранный период.</p>
            <p className="hint">{loading ? 'Загрузка...' : message}</p>
          </div>

          <button className="action-button primary" onClick={load} type="button">
            Обновить
          </button>
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
            <p className="hint">Дорога до объекта и служебные поездки.</p>
          </div>

          <div style={metricCardStyle}>
            <p className="eyebrow">Всего</p>
            <h2 style={metricValueStyle}>{durationLabel(totalMinutes)}</h2>
            <p className="hint">Работа + дорога.</p>
          </div>
        </section>

        <section className="panel">
          <div className="field-panel-head split-head">
            <div>
              <h2>Фильтры</h2>
              <p className="hint">Можно посмотреть свои часы за конкретный день, период, объект, заказчика или задание.</p>
            </div>
          </div>

          <div className="form-grid">
            <label>Дата от<input value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} type="date" /></label>
            <label>Дата до<input value={dateTo} onChange={(event) => setDateTo(event.target.value)} type="date" /></label>

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

            <label className="wide-field">Задание
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
          </div>
        </section>

        <section className="panel">
          <h2>Мои смены</h2>

          <div style={rowStyle}>
            <strong>Дата</strong>
            <strong>Задание</strong>
            <strong>Объект</strong>
            <strong>Заказчик</strong>
            <strong>Работа</strong>
            <strong>Дорога</strong>
            <strong>Статус</strong>
          </div>

          {filteredRows.map((row) => (
            <div style={rowStyle} key={row.key}>
              <span>{row.date || '—'}</span>

              <span>
                <strong>{row.title}</strong><br />
                <small>{row.reference}</small>
              </span>

              <span>{row.objectName}</span>
              <span>{row.customerName}</span>
              <span>{durationLabel(row.workMinutes)}</span>
              <span>{durationLabel(row.travelMinutes)}</span>
              <span>{row.status}</span>
            </div>
          ))}

          {!filteredRows.length ? (
            <p className="hint">За выбранный период пока нет смен.</p>
          ) : null}
        </section>
      </RoleGuard>
    </main>
  );
}
