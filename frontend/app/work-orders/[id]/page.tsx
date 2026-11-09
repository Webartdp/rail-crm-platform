'use client';

import { use, useEffect, useMemo, useState } from 'react';
import RoleGuard from '../../components/RoleGuard';
import { useI18n } from '../../i18n';
import { getWorkEvents, type WorkEvent } from '../../../lib/api';
import { employeeProfileName, getEmployeeProfiles, type EmployeeProfile } from '../../../lib/employee-profiles';
import { orderDetails } from '../../../lib/order-details';
import { closeWorkOrder, deleteWorkOrder, getWorkOrder, orderEmployeeIds, type WorkOrder } from '../../../lib/work-orders';

type PageProps = { params: Promise<{ id: string }> };

type Actual = { employeeId: number; start?: string; stop?: string; minutes: number };

export default function WorkOrderViewPage({ params }: PageProps) {
  const { t, fmt } = useI18n();
  const id = Number(use(params).id);
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [events, setEvents] = useState<WorkEvent[]>([]);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function load() {
    try {
      const [orderResponse, employeesResponse, eventsResponse] = await Promise.all([
        getWorkOrder(id),
        getEmployeeProfiles(),
        getWorkEvents({ assignmentId: id }).catch(() => ({ data: [] as WorkEvent[] })),
      ]);
      setOrder(orderResponse.data);
      setEmployees(employeesResponse.data);
      setEvents(eventsResponse.data);
    } catch (error) {
      setNotice({ tone: 'error', text: t('commonLoadFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') }) });
    }
  }

  useEffect(() => {
    load();
  }, [id]);

  const names = useMemo(() => new Map(employees.map((employee) => [employee.id, employeeProfileName(employee)])), [employees]);
  const details = orderDetails(order);
  const plannedMinutes = order?.planned_start_at && order?.planned_end_at
    ? Math.max(0, Math.round((new Date(order.planned_end_at.replace(' ', 'T')).getTime() - new Date(order.planned_start_at.replace(' ', 'T')).getTime()) / 60000))
    : 0;

  // Actual work per employee: first Dienstbeginn → last Stop on this order.
  const actuals = useMemo<Actual[]>(() => {
    if (!order) return [];
    return orderEmployeeIds(order).map((employeeId) => {
      const own = events.filter((event) => Number(event.employee_id) === employeeId).sort((a, b) => String(a.event_time).localeCompare(String(b.event_time)));
      const start = own.find((event) => event.event_type === 'dienstbeginn')?.event_time;
      const stop = [...own].reverse().find((event) => event.event_type === 'arbeit_stop')?.event_time;
      const minutes = start && stop ? Math.max(0, Math.round((new Date(stop.replace(' ', 'T')).getTime() - new Date(start.replace(' ', 'T')).getTime()) / 60000)) : 0;
      return { employeeId, start, stop, minutes };
    });
  }, [order, events]);

  async function act(action: () => Promise<unknown>, success: string) {
    try {
      await action();
      setNotice({ tone: 'success', text: success });
      await load();
    } catch (error) {
      setNotice({ tone: 'error', text: error instanceof Error ? error.message : t('commonUnknownError') });
    }
  }

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('woViewTitle', { id })}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{order?.reference_number || t('woViewEyebrow')} · {fmt.status(order?.status || 'planned')}</p>
            <h1>{details.work_title || order?.title || t('woViewTitle', { id })}</h1>
            <p className="hero-text">{[details.customer_name, details.object_name].filter(Boolean).join(' — ')}</p>
          </div>
          <div className="row-actions">
            <a className="action-button secondary" href="/assignments">{t('woBackToAssignments')}</a>
            <a className="action-button primary" href={`/work-orders/${id}/edit`}>{t('commonEdit')}</a>
          </div>
        </section>

        {notice ? <p className={`notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p> : null}

        {order ? (
          <>
            <div className="fact-grid">
              <section className="panel">
                <h2>{t('woWhere')}</h2>
                <dl className="facts">
                  <dt>{t('commonCustomer')}</dt><dd>{details.customer_name || '—'}</dd>
                  <dt>{t('commonObject')}</dt><dd>{details.object_name || '—'}</dd>
                  <dt>{t('wdWorkLocation')}</dt>
                  <dd>{details.object_address ? <a className="text-link" href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.object_address)}`} rel="noreferrer" target="_blank">{details.object_address}</a> : '—'}</dd>
                  <dt>{t('asgServiceType')}</dt><dd>{details.leistungsart || '—'}</dd>
                  <dt>{t('wdTrainNumber')}</dt><dd>{details.zugnummer || '—'}</dd>
                  <dt>{t('wdReferenceNumber')}</dt><dd>{order.reference_number || '—'}</dd>
                </dl>
              </section>

              <section className="panel">
                <h2>{t('woPlannedTime')}</h2>
                <p className="big-figure">{fmt.time(order.planned_start_at)}–{fmt.time(order.planned_end_at)}</p>
                <p className="hint">{fmt.date(order.planned_start_at)} · {fmt.duration(plannedMinutes)}</p>
                {String((details as Record<string, unknown>).notes || '') ? <p>{String((details as Record<string, unknown>).notes)}</p> : null}
              </section>
            </div>

            <section className="panel">
              <h2>{t('woPlannedVsActual')}</h2>
              <div className="data-table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>{t('commonEmployee')}</th>
                      <th>{t('woPlanned')}</th>
                      <th>{t('woActual')}</th>
                      <th className="num">{t('woActualDuration')}</th>
                      <th className="num">{t('woDifference')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {actuals.map((row) => {
                      const diff = row.minutes && plannedMinutes ? row.minutes - plannedMinutes : 0;
                      return (
                        <tr key={row.employeeId}>
                          <td><strong>{names.get(row.employeeId) || t('commonEmployeeNumber', { id: row.employeeId })}</strong></td>
                          <td>{fmt.time(order.planned_start_at)}–{fmt.time(order.planned_end_at)}</td>
                          <td>{row.start ? `${fmt.time(row.start)}–${row.stop ? fmt.time(row.stop) : '…'}` : t('woNotStarted')}</td>
                          <td className="num">{row.minutes ? fmt.duration(row.minutes) : '—'}</td>
                          <td className={`num ${diff > 0 ? 'text-warn' : ''}`}>{diff ? `${diff > 0 ? '+' : '−'}${fmt.duration(Math.abs(diff))}` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="panel danger-zone">
              <h2>{t('woActions')}</h2>
              <div className="row-actions">
                {order.status !== 'closed' ? (
                  <button className="action-button secondary" onClick={() => act(() => closeWorkOrder(id), t('docPrintOrderClosed'))} type="button">{t('docPrintCloseOrder')}</button>
                ) : null}
                <button
                  className="action-button secondary danger-button"
                  onClick={() => {
                    if (window.confirm(t('asgDeleteConfirm', { label: order.reference_number || `#${id}` }))) {
                      act(() => deleteWorkOrder(id), t('asgDeleted', { label: order.reference_number || `#${id}` })).then(() => { window.location.href = '/assignments'; });
                    }
                  }}
                  type="button"
                >
                  {t('commonDelete')}
                </button>
              </div>
            </section>
          </>
        ) : null}
      </RoleGuard>
    </main>
  );
}
