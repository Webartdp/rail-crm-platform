'use client';

import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { useI18n } from '../i18n';
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
  border: '1px solid var(--ink)',
  background: 'var(--ink)',
  color: '#ffffff',
  fontSize: '0.95rem',
  fontWeight: 600,
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
  boxShadow: 'var(--shadow-1)',
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
  const { t, fmt } = useI18n();
  const formatMoney = (value: string | number | null | undefined) => fmt.money(value);
  const formatHours = (value: string | number | null | undefined) => fmt.number(value, 2);
  const typeLabel = (type: string) => t(`costType_${type}`);
  const [costs, setCosts] = useState<WorkEventCost[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [message, setMessage] = useState('');
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
    setMessage(t('billLoading'));

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
        ? t('billReady')
        : t('billNothingReady'));
    } catch (error) {
      const text = error instanceof Error ? error.message : t('commonUnknownError');
      setMessage(t('commonLoadFailed', { error: text }));
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
    setMessage(t('billCreatingDraft'));

    try {
      await createInvoiceDraft();
      await load();
      setMessage(t('billDraftCreated'));
    } catch (error) {
      const text = error instanceof Error ? error.message : t('commonUnknownError');
      setMessage(t('billCreateFailed', { error: text }));
    } finally {
      setCreating(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('billTitle')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('billEyebrow')}</p>
            <h1>{t('billTitle')}</h1>
            <p className="hero-text">{t('billHero')}</p>
            <p className="hint">{loading ? t('commonLoadingDots') : message}</p>
          </div>

          <div style={billingActionsStyle}>
            <button className="action-button secondary" onClick={load} type="button">{t('commonRefresh')}</button>
            <button
              disabled={creating || costs.length === 0}
              onClick={createDraft}
              style={{ ...billingPrimaryButtonStyle, opacity: creating || costs.length === 0 ? 0.55 : 1 }}
              type="button"
            >
              {creating ? t('billCreating') : t('billCreateInvoice')}
            </button>
          </div>
        </section>

        <section style={cardGridStyle}>
          <div style={metricCardStyle}>
            <p className="eyebrow">{t('billReadyCount')}</p>
            <h2 style={metricValueStyle}>{costs.length}</h2>
            <p className="hint">{t('billReadyCountHint')}</p>
          </div>

          <div style={metricCardStyle}>
            <p className="eyebrow">{t('commonWork')}</p>
            <h2 style={metricValueStyle}>{formatMoney(workAmount)}</h2>
            <p className="hint">{t('billWorkHint')}</p>
          </div>

          <div style={metricCardStyle}>
            <p className="eyebrow">{t('durTravel')}</p>
            <h2 style={metricValueStyle}>{formatMoney(travelAmount)}</h2>
            <p className="hint">{t('billTravelHint')}</p>
          </div>

          <div style={metricCardStyle}>
            <p className="eyebrow">{t('commonTotal')}</p>
            <h2 style={metricValueStyle}>{formatMoney(totalAmount)}</h2>
            <p className="hint">{fmt.hours(totalHours)}</p>
          </div>
        </section>

        <section className="panel">
          <div className="field-panel-head">
            <p className="eyebrow">{t('billItemsEyebrow')}</p>
            <h2>{t('billItemsTitle')}</h2>
            <p className="hint">{t('billItemsHint')}</p>
          </div>

          <div className="report-table-scroll">
            <div style={costRowStyle}>
              <strong>{t('commonEmployee')}</strong>
              <strong>{t('commonDate')}</strong>
              <strong>{t('commonAssignment')}</strong>
              <strong>{t('commonType')}</strong>
              <strong>{t('billHours')}</strong>
              <strong>{t('billRate')}</strong>
              <strong>{t('billCoefficient')}</strong>
              <strong>{t('billAmount')}</strong>
            </div>

            {costs.map((item) => {
              const order = orderMap.get(Number(item.assignment_id));
              const details = parseDetails(order);

              return (
                <div
                  style={costRowStyle}
                  key={`${item.employee_id}-${item.assignment_id}-${item.type}-${item.start_time}-${item.stop_time}`}
                >
                  <span>{employeeMap.get(Number(item.employee_id)) || t('commonEmployeeNumber', { id: item.employee_id })}</span>
                  <span>{fmt.date(item.start_time)}</span>

                  <span>
                    <strong>{details.work_title || order?.title || t('commonAssignmentNumber', { id: item.assignment_id })}</strong><br />
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
            <p className="hint">{t('billNoItems')}</p>
          ) : null}
        </section>

        <section className="panel">
          <div className="field-panel-head">
            <p className="eyebrow">{t('billInvoicesEyebrow')}</p>
            <h2>{t('billInvoicesTitle')}</h2>
            <p className="hint">{t('billInvoicesHint')}</p>
          </div>

          <div className="report-table-scroll">
            <div style={invoiceRowStyle}>
              <strong>{t('billNumber')}</strong>
              <strong>{t('commonDate')}</strong>
              <strong>{t('billAmount')}</strong>
              <strong>{t('commonStatus')}</strong>
            </div>

            {invoices.map((invoice) => (
              <div style={invoiceRowStyle} key={invoice.id}>
                <span><a className="action-link" href={`/billing/invoices/${invoice.id}`}><strong>{invoice.number}</strong></a></span>
                <span>{fmt.date(invoice.issued_at)}</span>
                <span>{formatMoney(invoice.total_amount)}</span>
                <span>{fmt.status(invoice.status)}</span>
              </div>
            ))}
          </div>

          {!invoices.length ? (
            <p className="hint">{t('billNoInvoices')}</p>
          ) : null}
        </section>
      </RoleGuard>
    </main>
  );
}
