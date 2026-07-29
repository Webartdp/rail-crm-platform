'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import RoleGuard from '../../../components/RoleGuard';
import { getInvoice, type Invoice, type InvoiceItem } from '../../../../lib/invoices';
import { getEmployeeProfiles, employeeProfileName, type EmployeeProfile } from '../../../../lib/employee-profiles';
import { getWorkOrders, type WorkOrder } from '../../../../lib/work-orders';

type WorkDetails = {
  object_name?: string;
  customer_name?: string;
  work_title?: string;
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

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    draft: 'Черновик',
    sent: 'Отправлен',
    paid: 'Оплачен',
    cancelled: 'Отменён',
  };

  return labels[status] || status || '—';
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
  gridTemplateColumns: '180px minmax(280px, 1fr) 170px 110px 110px 110px 130px',
  alignItems: 'center',
  gap: '0.85rem',
  padding: '0.85rem 0',
  borderBottom: '1px solid rgba(148, 163, 184, 0.24)',
} as const;

export default function InvoiceViewPage() {
  const params = useParams();
  const invoiceId = Number(params.id);

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [items, setItems] = useState<InvoiceItem[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [message, setMessage] = useState('Загрузка счёта...');
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

  const workAmount = items
    .filter((item) => item.type === 'arbeit')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const travelAmount = items
    .filter((item) => item.type !== 'arbeit')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalHours = items.reduce((sum, item) => sum + Number(item.hours || 0), 0);

  async function load() {
    setLoading(true);
    setMessage('Загрузка счёта...');

    try {
      const [invoiceResponse, employeesResponse, ordersResponse] = await Promise.all([
        getInvoice(invoiceId),
        getEmployeeProfiles(),
        getWorkOrders(),
      ]);

      setInvoice(invoiceResponse.data);
      setItems(invoiceResponse.items);
      setEmployees(employeesResponse.data);
      setOrders(ordersResponse.data);
      setMessage('Счёт загружен.');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setInvoice(null);
      setItems([]);
      setEmployees([]);
      setOrders([]);
      setMessage(`Ошибка загрузки счёта: ${text}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (invoiceId) {
      load();
    }
  }, [invoiceId]);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title="Invoice access">
        <section className="hero-card">
          <div>
            <p className="eyebrow">Invoice</p>
            <h1>{invoice?.number || `Счёт #${invoiceId}`}</h1>
            <p className="hero-text">Детальный просмотр строк счёта по подтверждённому времени сотрудников.</p>
            <p className="hint">{loading ? 'Загрузка...' : message}</p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <a className="action-button secondary" href="/billing">Назад к billing</a>
            <button className="action-button primary" onClick={load} type="button">Обновить</button>
          </div>
        </section>

        <section style={cardGridStyle}>
          <div style={metricCardStyle}>
            <p className="eyebrow">Статус</p>
            <h2 style={metricValueStyle}>{statusLabel(invoice?.status || '')}</h2>
            <p className="hint">Текущий статус счёта.</p>
          </div>

          <div style={metricCardStyle}>
            <p className="eyebrow">Работа</p>
            <h2 style={metricValueStyle}>{formatMoney(workAmount)}</h2>
            <p className="hint">Рабочие позиции.</p>
          </div>

          <div style={metricCardStyle}>
            <p className="eyebrow">Дорога</p>
            <h2 style={metricValueStyle}>{formatMoney(travelAmount)}</h2>
            <p className="hint">Дорожные позиции.</p>
          </div>

          <div style={metricCardStyle}>
            <p className="eyebrow">Итого</p>
            <h2 style={metricValueStyle}>{formatMoney(invoice?.total_amount || 0)}</h2>
            <p className="hint">{formatHours(totalHours)} часов.</p>
          </div>
        </section>

        <section className="panel">
          <div className="field-panel-head">
            <p className="eyebrow">Invoice items</p>
            <h2>Строки счёта</h2>
            <p className="hint">Ставки и коэффициенты зафиксированы в момент создания счёта.</p>
          </div>

          <div className="report-table-scroll">
            <div style={rowStyle}>
              <strong>Сотрудник</strong>
              <strong>Задание</strong>
              <strong>Тип</strong>
              <strong>Часы</strong>
              <strong>Ставка</strong>
              <strong>Коэф.</strong>
              <strong>Сумма</strong>
            </div>

            {items.map((item) => {
              const order = orderMap.get(Number(item.assignment_id));
              const details = parseDetails(order);

              return (
                <div style={rowStyle} key={item.id}>
                  <span>{employeeMap.get(Number(item.employee_id)) || `Сотрудник #${item.employee_id}`}</span>

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

          {!items.length ? (
            <p className="hint">В этом счёте пока нет строк.</p>
          ) : null}
        </section>
      </RoleGuard>
    </main>
  );
}
