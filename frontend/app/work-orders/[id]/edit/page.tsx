'use client';

import { use, useEffect, useState } from 'react';
import RoleGuard from '../../../components/RoleGuard';
import { getEmployeeProfiles, employeeProfileName, type EmployeeProfile } from '../../../../lib/employee-profiles';
import { getWorkOrder, updateWorkOrder } from '../../../../lib/work-orders';
import { useI18n } from '../../../i18n';
const leistungsartOptions = ['WTU', 'WSU', 'E-WU', 'Rb', 'Azf', 'RID-Kontrolle', 'Zugbeschtreifung'];
const statusOptions = ['planned', 'in_progress', 'waiting_approval', 'approved', 'rejected', 'closed'];

type PageProps = {
  params: Promise<{ id: string }>;
};

function parseDetails(value: unknown): Record<string, string> {
  if (!value) return {};

  if (typeof value === 'object') {
    return value as Record<string, string>;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as Record<string, string>;
    } catch {
      return {};
    }
  }

  return {};
}

function toDatetimeLocal(value?: string | null) {
  if (!value) return '';

  const normalized = value.replace(' ', 'T');
  return normalized.slice(0, 16);
}

function toSqlDateTime(value: string) {
  return value ? `${value.replace('T', ' ')}:00` : undefined;
}

export default function EditWorkOrderPage({ params }: PageProps) {
  const { t } = useI18n();
  const resolvedParams = use(params);
  const id = Number(resolvedParams.id);

  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [objectName, setObjectName] = useState('');
  const [objectAddress, setObjectAddress] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [workTitle, setWorkTitle] = useState('');
  const [leistungsart, setLeistungsart] = useState('WTU');
  const [referenznummer, setReferenznummer] = useState('');
  const [zugnummer, setZugnummer] = useState('');
  const [einsatzort, setEinsatzort] = useState('');
  const [status, setStatus] = useState('planned');
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedStop, setPlannedStop] = useState('');
  const [message, setMessage] = useState('Загрузка задания...');

  useEffect(() => {
    async function load() {
      try {
        const [employeeResponse, orderResponse] = await Promise.all([
          getEmployeeProfiles(),
          getWorkOrder(id),
        ]);

        setEmployees(employeeResponse.data);

        const order = orderResponse.data;
        const details = parseDetails(order.details);

        setEmployeeId(order.employee_id ? String(order.employee_id) : '');
        setReferenznummer(order.reference_number || '');
        setStatus(order.status || 'planned');
        setWorkTitle(details.work_title || order.title || '');
        setObjectName(details.object_name || '');
        setObjectAddress(details.object_address || '');
        setCustomerName(details.customer_name || '');
        setLeistungsart(details.leistungsart || 'WTU');
        setZugnummer(details.zugnummer || '');
        setEinsatzort(details.einsatzort || '');
        setPlannedStart(toDatetimeLocal(order.planned_start_at));
        setPlannedStop(toDatetimeLocal(order.planned_end_at));

        setMessage('Задание загружено.');
      } catch (error) {
        const errorText = error instanceof Error ? error.message : 'Unbekannter Fehler';
        setMessage(`Ошибка загрузки: ${errorText}`);
      }
    }

    load();
  }, [id]);

  async function submit() {
    if (!employeeId || !workTitle.trim() || !referenznummer.trim()) {
      setMessage(t('woRequired'));
      return;
    }

    try {
      await updateWorkOrder(id, {
        employee_id: Number(employeeId),
        title: workTitle.trim(),
        reference_number: referenznummer.trim(),
        status,
        object_name: objectName.trim(),
        object_address: objectAddress.trim(),
        customer_name: customerName.trim(),
        work_title: workTitle.trim(),
        leistungsart,
        zugnummer: zugnummer.trim(),
        einsatzort: einsatzort.trim(),
        planned_start_at: toSqlDateTime(plannedStart),
        planned_end_at: toSqlDateTime(plannedStop),
      });

      setMessage(`Задание ${referenznummer.trim()} обновлено.`);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setMessage(`Не удалось сохранить: ${errorText}`);
    }
  }

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title={t('woEditTitle', { id })}>
        <section className="hero-card">
          <div>
            <p className="eyebrow">{t('woEditEyebrow')}</p>
            <h1>{t('woEditTitle', { id })}</h1>
            <p className="hero-text">{t('woEditHero')}</p>
          </div>
          <a className="action-link" href="/assignments">{t('woBackToAssignments')}</a>
        </section>

        <section className="panel">
          <div className="form-grid">
            <label>
              {t('commonEmployee')}
              <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
                <option value="">{t('woSelectEmployee')}</option>
                {employees.map((employee) => (
                  <option value={employee.id} key={employee.id}>
                    {employeeProfileName(employee)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              {t('commonStatus')}
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {statusOptions.map((item) => <option value={item} key={item}>{item}</option>)}
              </select>
            </label>

            <label>
              {t('commonObject')}
              <input value={objectName} onChange={(event) => setObjectName(event.target.value)} />
            </label>

            <label>
              {t('asgObjectAddress')}
              <input value={objectAddress} onChange={(event) => setObjectAddress(event.target.value)} />
            </label>

            <label>
              {t('commonCustomer')}
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} />
            </label>

            <label>
              {t('asgWorkTitle')}
              <input value={workTitle} onChange={(event) => setWorkTitle(event.target.value)} />
            </label>

            <label>
              Leistungsart
              <select value={leistungsart} onChange={(event) => setLeistungsart(event.target.value)}>
                {leistungsartOptions.map((item) => <option value={item} key={item}>{item}</option>)}
              </select>
            </label>

            <label>
              Referenznummer
              <input value={referenznummer} onChange={(event) => setReferenznummer(event.target.value)} />
            </label>

            <label>
              Zugnummer
              <input value={zugnummer} onChange={(event) => setZugnummer(event.target.value)} />
            </label>

            <label>
              Einsatzort
              <input value={einsatzort} onChange={(event) => setEinsatzort(event.target.value)} />
            </label>

            <label>
              Geplanter Start
              <input value={plannedStart} onChange={(event) => setPlannedStart(event.target.value)} type="datetime-local" />
            </label>

            <label>
              Geplanter Stop
              <input value={plannedStop} onChange={(event) => setPlannedStop(event.target.value)} type="datetime-local" />
            </label>
          </div>

          <button className="action-button primary" onClick={submit} type="button">{t('woSaveChanges')}</button>
          <p className="hint">{message}</p>
        </section>
      </RoleGuard>
    </main>
  );
}
