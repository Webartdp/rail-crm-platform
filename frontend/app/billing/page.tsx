'use client';

import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { createInvoiceDraft, getInvoices, type Invoice } from '../../lib/invoices';
import { getWorkEventCosts, type WorkEventCost } from '../../lib/costs';
import { getEmployeeProfiles, employeeProfileName, type EmployeeProfile } from '../../lib/employee-profiles';
import { getWorkOrders, type WorkOrder } from '../../lib/work-orders';

type WorkDetails = {
  object_name?: string;
  customer_name?: string;
  work_title?: string;
  einsatzort?: string;
};

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value || 0);

  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatHours(value: string | number | null | undefined) {
  const hours = Number(value || 0);

  return new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(hours);
}

function typeLabel(type: string) {
  const labels: Record<string, string> = {
    gasfahrt: 'Дорога к объекту',
    arbeit: 'Работа',
    dienstfahrt: 'Служебная поездка',
  };

  return labels[type] || type;
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

function dateLabel(value?: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString('de-DE');
}

function invoiceStatusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: 'Черновик',
    sent: 'Отправлен',
    paid: 'Оплачен',
    cancelled: 'Отменён',
  };

  return labels[status] || status || '—';
}

const billingActionsStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  flexWrap: 'wrap',
  gap: '0.75rem',
} as const;

const billingPrimaryButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '190px',
  height: '46px',
  padding: '0 1.1rem',
  borderRadius: '0.95rem',
  border: '1px solid rgba(37, 99, 235, 0.35)',
  background: '#2554d9',
  color: '#ffffff',
  fontSize: '0.95rem',
  fontWeight: 800,
  lineHeight: 1,
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
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

const costRowStyle = {
  display: 'grid',
  gridTemplateColumns: '170px 170px minmax(260px, 1fr) 160px 110px 110px 110px 130px',
  alignItems: 'center',
  gap: '0.85rem',
  padding: '0.85rem 0',
  borderBottom: '1px solid rgba(148, 163, 184, 0.24)',
} as const;

const invoiceRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(220px, 1fr) 160px 160px 160px',
  alignItems: 'center',
  gap: '0.85rem',
  padding: '0.85rem 0',
  borderBottom: '1px solid rgba(148, 163, 184, 0.24)',
} as const;

export default function BillingPage() {
  const [costs, setCosts] = useState<WorkEventCost[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [message, setMessage] = useState('Загрузка расчёта...');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

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

  const workAmount = costs
    .filter((item) => item.type === 'arbeit')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const travelAmount = costs
    .filter((item) => item.type !== 'arbeit')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalAmount = costs.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const totalHours = costs.reduce((sum, item) => sum + Number(item.hours || 0), 0);

  async function load() {
    setLoading(true);
    setMessage('Загрузка расчёта...');

    try {
      const [costsResponse, invoicesResponse, employeesResponse, ordersResponse] = await Promise.all([
        getWorkEventCosts(),
        getInvoices(),
        getEmployeeProfiles(),
        getWorkOrders(),
      ]);

      setCosts(costsResponse.data);
      setInvoices(invoicesResponse.data);
      setEmployees(employeesResponse.data);
      setOrders(ordersResponse.data);

      setMessage(costsResponse.data.length
        ? 'Расчёт готов по подтверждённым и ещё не выставленным в счёт событиям.'
        : 'Нет подтверждённых событий, готовых к счёту.');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setMessage(`Ошибка загрузки billing: ${text}`);
      setCosts([]);
      setInvoices([]);
      setEmployees([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }

  async function createDraft() {
    setCreating(true);
    setMessage('Создаём черновик счёта...');

    try {
      await createInvoiceDraft();
      await load();
      setMessage('Черновик счёта создан. Позиции больше не отображаются как готовые к счёту.');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setMessage(`Не удалось создать счёт: ${text}`);
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title="Billing access">
        <section className="hero-card">
          <div>
            <p className="eyebrow">Billing</p>
            <h1>Расчёт оплаты</h1>
            <p className="hero-text">
              Счёт формируется по подтверждённому времени. Ставки и коэффициенты берутся из профиля сотрудника.
            </p>
            <p className="hint">{loading ? 'Загрузка...' : message}</p>
          </div>

          <div style={billingActionsStyle}>
            <button className="action-button secondary" onClick={load} type="button">Обновить</button>
            <button
              disabled={creating || costs.length === 0}
              onClick={createDraft}
              style={{ ...billingPrimaryButtonStyle, opacity: creating || costs.length === 0 ? 0.55 : 1 }}
              type="button"
            >
              {creating ? 'Создаём...' : 'Создать счёт'}
            </button>
          </div>
        </section>

        <section style={cardGridStyle}>
          <div style={metricCardStyle}>
            <p className="eyebrow">Готово к счёту</p>
            <h2 style={metricValueStyle}>{costs.length}</h2>
            <p className="hint">Approved + не выставлено.</p>
          </div>

          <div style={metricCardStyle}>
            <p className="eyebrow">Работа</p>
            <h2 style={metricValueStyle}>{formatMoney(workAmount)}</h2>
            <p className="hint">По стандартной ставке сотрудника.</p>
          </div>

          <div style={metricCardStyle}>
            <p className="eyebrow">Дорога</p>
            <h2 style={metricValueStyle}>{formatMoney(travelAmount)}</h2>
            <p className="hint">По ставке дороги сотрудника.</p>
          </div>

          <div style={metricCardStyle}>
            <p className="eyebrow">Итого</p>
            <h2 style={metricValueStyle}>{formatMoney(totalAmount)}</h2>
            <p className="hint">{formatHours(totalHours)} часов.</p>
          </div>
        </section>

        <section className="panel">
          <div className="field-panel-head">
            <p className="eyebrow">Approved / uninvoiced</p>
            <h2>Позиции к оплате</h2>
            <p className="hint">Ставка, ставка дороги и коэффициенты подтягиваются из профиля конкретного сотрудника.</p>
          </div>

          <div className="report-table-scroll">
            <div style={costRowStyle}>
              <strong>Сотрудник</strong>
              <strong>Дата</strong>
              <strong>Задание</strong>
              <strong>Тип</strong>
              <strong>Часы</strong>
              <strong>Ставка</strong>
              <strong>Коэф.</strong>
              <strong>Сумма</strong>
            </div>

            {costs.map((item) => {
              const order = orderMap.get(Number(item.assignment_id));
              const details = parseDetails(order);

              return (
                <div
                  style={costRowStyle}
                  key={`${item.employee_id}-${item.assignment_id}-${item.type}-${item.start_time}-${item.stop_time}`}
                >
                  <span>{employeeMap.get(Number(item.employee_id)) || `Сотрудник #${item.employee_id}`}</span>
                  <span>{dateLabel(item.start_time)}</span>

                  <span>
                    <strong>{details.work_title || order?.title || `Задание #${item.assignment_id}`}</strong><br />
                    <small>{details.object_name || '—'} · {details.customer_name || '—'}</small>
                  </span>

                  <span>{typeLabel(item.type)}</span>
                  <span>{formatHours(item.hours)}</span>
                  <span>{formatMoney(item.hourly_rate)}</span>
                  <span>× {formatHours(item.coefficient)}</span>
                  <span><strong>{formatMoney(item.amount)}</strong></span>
                </div>
              );
            })}
          </div>

          {!costs.length ? (
            <p className="hint">Пока нет подтверждённых позиций для нового счёта.</p>
          ) : null}
        </section>

        <section className="panel">
          <div className="field-panel-head">
            <p className="eyebrow">Invoices</p>
            <h2>Созданные счета</h2>
            <p className="hint">После создания счёта work orders переходят в статус invoiced.</p>
          </div>

          <div className="report-table-scroll">
            <div style={invoiceRowStyle}>
              <strong>Номер</strong>
              <strong>Дата</strong>
              <strong>Сумма</strong>
              <strong>Статус</strong>
            </div>

            {invoices.map((invoice) => (
              <div style={invoiceRowStyle} key={invoice.id}>
                <span><strong>{invoice.number}</strong></span>
                <span>{invoice.issued_at || '—'}</span>
                <span>{formatMoney(invoice.total_amount)}</span>
                <span>{invoiceStatusLabel(invoice.status)}</span>
              </div>
            ))}
          </div>

          {!invoices.length ? (
            <p className="hint">Счета ещё не создавались.</p>
          ) : null}
        </section>
      </RoleGuard>
    </main>
  );
}
