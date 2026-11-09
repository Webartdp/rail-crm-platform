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
import { useI18n } from '../i18n';
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
  const { t, fmt } = useI18n();
  const formatDateTime = (value?: string | null) => fmt.dateTime(value);
  const pairLabel = (pairType: string) => t(`costType_${pairType}`);
  const [items, setItems] = useState<WorkEventApproval[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [message, setMessage] = useState('');
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
      setMessage(approvalResponse.data.length ? '' : t('apprNoItems'));
    } catch (error) {
      const errorText = error instanceof Error ? error.message : t('commonUnknownError');
      setItems([]);
      setMessage(t('commonLoadFailed', { error: errorText }));
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(action: 'approve' | 'reject', approval: WorkEventApproval) {
    try {
      await setWorkEventApprovalStatus(action, approval.id);
      setMessage(action === 'approve' ? t('apprApproved') : t('apprRejected'));
      await load();
    } catch (error) {
      const errorText = error instanceof Error ? error.message : t('commonUnknownError');
      setMessage(t('apprActionFailed', { error: errorText }));
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
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('apprTitle')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('apprEyebrow')}</p>
            <h1>{t('apprTitle')}</h1>
            <p className="hero-text">{t('apprHero')}</p>
          </div>
          <div className="field-status-stack">
            <div className="status-pill">{t('apprTotal', { count: items.length })}</div>
            <span>{fmt.status('pending')}: {pending} · {fmt.status('approved')}: {approved} · {fmt.status('rejected')}: {rejected}</span>
          </div>
        </section>

        <section className="panel">
          <div className="field-panel-head split-head">
            <div>
              <h2>{t('apprQueue')}</h2>
              <p className="hint">{loading ? t('commonLoading') : message || t('apprHint')}</p>
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
                border: '1px solid var(--ink)',
                background: 'var(--ink)',
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
              <span>{t('commonRefresh')}</span>
            </button>
          </div>

          <div style={rowStyle}>
            <strong>{t('commonEmployee')}</strong>
            <strong>{t('commonAssignment')}</strong>
            <strong>{t('commonType')}</strong>
            <strong>{t('commonTime')}</strong>
            <strong>{t('commonStatus')}</strong>
            <strong>{t('commonActions')}</strong>
          </div>

          {items.map((item) => {
            const order = orderMap.get(item.assignment_id);
            const details = parseDetails(order);
            const employeeName = employeeMap.get(item.employee_id) || t('commonEmployeeNumber', { id: item.employee_id });

            return (
              <div style={rowStyle} key={item.id}>
                <span>
                  <strong>{employeeName}</strong><br />
                  <small>ID: {item.employee_id}</small>
                </span>

                <span>
                  <strong>{details.work_title || order?.title || t('commonAssignmentNumber', { id: item.assignment_id })}</strong><br />
                  <small>{order?.reference_number || `#${item.assignment_id}`}</small><br />
                  <small>{details.customer_name || '—'} · {details.object_name || '—'}</small>
                </span>

                <span>{pairLabel(item.pair_type)}</span>

                <span>
                  <small>{formatDateTime(item.start_time)}</small><br />
                  <small>{formatDateTime(item.stop_time)}</small>
                  {item.minutes ? <><br /><strong>{fmt.duration(item.minutes)}</strong></> : null}
                  {item.corrected ? (
                    <><br /><small className="ts-note" title={t('apprOriginal', { from: formatDateTime(item.original_start_time), to: formatDateTime(item.original_stop_time) })}>{t('tsCorrected')}</small></>
                  ) : null}
                  {item.bemerkung ? <><br /><small className="hint">{item.bemerkung}</small></> : null}
                </span>

                <span>{fmt.status(item.status)}</span>

                <span style={actionsWrapStyle}>
                  {item.status === 'pending' ? (
                    <>
                      <button style={actionStyle} onClick={() => updateStatus('approve', item)} type="button" title={t('apprApprove')}>
                        <i className="las la-check" aria-hidden="true" />
                      </button>

                      <button style={actionStyle} onClick={() => updateStatus('reject', item)} type="button" title={t('apprReject')}>
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
            <p className="hint">{t('apprNoItems')}</p>
          ) : null}
        </section>
      </RoleGuard>
    </main>
  );
}
