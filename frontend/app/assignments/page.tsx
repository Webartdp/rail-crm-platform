'use client';

import { useEffect, useMemo, useState } from 'react';
import RoleGuard from '../components/RoleGuard';
import { useI18n } from '../i18n';
import { employeeProfileName, getEmployeeProfiles, type EmployeeProfile } from '../../lib/employee-profiles';
import { orderDetails } from '../../lib/order-details';
import { monthEndIso, monthStartIso } from '../../lib/period';
import { deleteWorkOrder, getWorkOrders, orderEmployeeIds, type WorkOrder } from '../../lib/work-orders';

const STATUS_CLASS: Record<string, string> = {
  approved: 'is-approved',
  invoiced: 'is-approved',
  closed: 'is-approved',
  waiting_approval: 'is-waiting',
  in_progress: 'is-progress',
  rejected: 'is-rejected',
  cancelled: 'is-rejected',
};

export default function AssignmentsPage() {
  const { t, fmt } = useI18n();
  const [orders, setOrders] = useState<WorkOrder[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [from, setFrom] = useState(monthStartIso());
  const [to, setTo] = useState(monthEndIso());
  const [status, setStatus] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [ordersResponse, employeesResponse] = await Promise.all([
        getWorkOrders({ dateFrom: from || undefined, dateTo: to || undefined }),
        employees.length ? Promise.resolve({ data: employees }) : getEmployeeProfiles(),
      ]);
      setOrders(ordersResponse.data);
      setEmployees(employeesResponse.data);
    } catch (error) {
      setNotice({ tone: 'error', text: t('commonLoadFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') }) });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [from, to]);

  const names = useMemo(() => new Map(employees.map((employee) => [employee.id, employeeProfileName(employee)])), [employees]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return orders
      .filter((order) => !status || order.status === status)
      .filter((order) => !employeeId || orderEmployeeIds(order).includes(Number(employeeId)))
      .filter((order) => {
        if (!needle) return true;
        const details = orderDetails(order);
        return `${order.reference_number || ''} ${details.work_title || order.title} ${details.customer_name || ''} ${details.object_name || ''}`.toLowerCase().includes(needle);
      })
      .sort((a, b) => String(a.planned_start_at || '').localeCompare(String(b.planned_start_at || '')));
  }, [orders, status, employeeId, query]);

  const counts = useMemo(() => ({
    planned: orders.filter((order) => order.status === 'planned').length,
    progress: orders.filter((order) => order.status === 'in_progress').length,
    waiting: orders.filter((order) => order.status === 'waiting_approval').length,
  }), [orders]);

  async function remove(order: WorkOrder) {
    const label = order.reference_number || `#${order.id}`;
    if (!window.confirm(t('asgDeleteConfirm', { label }))) return;
    try {
      await deleteWorkOrder(order.id);
      setNotice({ tone: 'success', text: t('asgDeleted', { label }) });
      await load();
    } catch (error) {
      setNotice({ tone: 'error', text: t('asgDeleteFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') }) });
    }
  }

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('asgTitle')}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('asgEyebrow')}</p>
            <h1>{t('asgTitle')}</h1>
            <p className="hero-text">{t('asgHeroNew', { planned: counts.planned, progress: counts.progress, waiting: counts.waiting })}</p>
          </div>
          <a className="action-button primary" href="/work-orders/new">{t('asgCreate')}</a>
        </section>

        {notice ? <p className={`notice ${notice.tone}`} role={notice.tone === 'error' ? 'alert' : 'status'}>{notice.text}</p> : null}

        <section className="panel">
          <div className="filter-bar">
            <label>{t('commonDateFrom')}<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} /></label>
            <label>{t('commonDateTo')}<input type="date" value={to} onChange={(event) => setTo(event.target.value)} /></label>
            <label>{t('commonEmployee')}
              <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
                <option value="">{t('durAllEmployees')}</option>
                {employees.map((employee) => <option key={employee.id} value={employee.id}>{employeeProfileName(employee)}</option>)}
              </select>
            </label>
            <label>{t('commonStatus')}
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                <option value="">{t('durAllStatuses')}</option>
                {['planned', 'in_progress', 'waiting_approval', 'approved', 'rejected', 'invoiced', 'closed'].map((item) => <option key={item} value={item}>{fmt.status(item)}</option>)}
              </select>
            </label>
            <label className="grow">{t('commonSearch')}<input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('asgSearch')} /></label>
          </div>

          <div className="data-table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th>{t('woPlanned')}</th>
                  <th>{t('commonAssignment')}</th>
                  <th>{t('commonCustomer')} / {t('commonObject')}</th>
                  <th>{t('employees')}</th>
                  <th>{t('commonStatus')}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((order) => {
                  const details = orderDetails(order);
                  const assigned = orderEmployeeIds(order);
                  return (
                    <tr key={order.id}>
                      <td className="nowrap">
                        <strong>{fmt.date(order.planned_start_at)}</strong><br />
                        <small className="hint">{fmt.time(order.planned_start_at)}–{fmt.time(order.planned_end_at)}</small>
                      </td>
                      <td>
                        <a className="text-link strong" href={`/work-orders/${order.id}`}>{details.work_title || order.title}</a><br />
                        <small className="hint">{[order.reference_number, details.leistungsart].filter(Boolean).join(' · ') || `#${order.id}`}</small>
                      </td>
                      <td>
                        {details.customer_name || '—'}<br />
                        <small className="hint">{details.object_name || '—'}</small>
                      </td>
                      <td>
                        {assigned.length ? (
                          <ul className="name-list">
                            {assigned.map((id) => <li key={id}>{names.get(id) || t('commonEmployeeNumber', { id })}</li>)}
                          </ul>
                        ) : '—'}
                      </td>
                      <td><span className={`report-status-badge ${STATUS_CLASS[order.status || ''] || ''}`}>{fmt.status(order.status || 'planned')}</span></td>
                      <td>
                        <div className="row-actions">
                          <a className="small-button" href={`/work-orders/${order.id}/edit`}>{t('commonEdit')}</a>
                          <button className="small-button danger" onClick={() => remove(order)} type="button">{t('commonDelete')}</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {loading ? <p className="hint">{t('commonLoadingDots')}</p> : null}
          {!loading && !rows.length ? <p className="empty-state">{t('asgNoneInPeriod')}</p> : null}
        </section>
      </RoleGuard>
    </main>
  );
}
