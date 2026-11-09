'use client';

import type { FormEvent } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '../i18n';
import { getClients, type Client } from '../../lib/clients';
import { employeeProfileName, getEmployeeProfiles, type EmployeeProfile } from '../../lib/employee-profiles';
import { orderDetails } from '../../lib/order-details';
import { orderEmployeeIds, type WorkOrder, type WorkOrderInput } from '../../lib/work-orders';

export const LEISTUNGSARTEN = ['WTU', 'WSU', 'E-WU', 'Rb', 'Azf', 'RID-Kontrolle', 'Zugbeschtreifung'];
const STATUSES = ['planned', 'in_progress', 'waiting_approval', 'approved', 'rejected', 'invoiced', 'closed', 'cancelled'];

type Props = {
  initial?: WorkOrder | null;
  preset?: { clientId?: number; objectId?: number };
  submitLabel: string;
  onSubmit: (input: WorkOrderInput) => Promise<void>;
};

function datePart(value?: string | null) {
  return value ? value.slice(0, 10) : '';
}

function timePart(value?: string | null) {
  return value ? value.slice(11, 16) : '';
}

function addDay(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  const next = new Date(year, month - 1, day + 1);
  return `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}-${String(next.getDate()).padStart(2, '0')}`;
}

/** Plan a work order: client → object (address = Einsatzort) → employees → planned time. */
export default function WorkOrderForm({ initial, preset, submitLabel, onSubmit }: Props) {
  const { t, fmt } = useI18n();
  const details = orderDetails(initial);
  const [clients, setClients] = useState<Client[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [clientId, setClientId] = useState(String(initial?.client_id ?? preset?.clientId ?? ''));
  const [objectId, setObjectId] = useState(String(initial?.object_id ?? preset?.objectId ?? ''));
  const [employeeIds, setEmployeeIds] = useState<number[]>(initial ? orderEmployeeIds(initial) : []);
  const [employeeQuery, setEmployeeQuery] = useState('');
  const [title, setTitle] = useState(details.work_title || initial?.title || '');
  const [leistungsart, setLeistungsart] = useState(details.leistungsart || '');
  const [reference, setReference] = useState(initial?.reference_number || '');
  const [zugnummer, setZugnummer] = useState(details.zugnummer || '');
  const [plannedDate, setPlannedDate] = useState(datePart(initial?.planned_start_at));
  const [startTime, setStartTime] = useState(timePart(initial?.planned_start_at));
  const [endTime, setEndTime] = useState(timePart(initial?.planned_end_at));
  const [status, setStatus] = useState(initial?.status || 'planned');
  const [notes, setNotes] = useState(String((details as Record<string, unknown>).notes || ''));
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingLists, setLoadingLists] = useState(true);

  useEffect(() => {
    Promise.all([getClients(), getEmployeeProfiles()])
      .then(([clientsResponse, employeesResponse]) => {
        setClients(clientsResponse.data);
        setEmployees(employeesResponse.data);
      })
      .catch((error) => {
        setMessage(t('commonLoadFailed', { error: error instanceof Error ? error.message : t('commonUnknownError') }));
        setIsError(true);
      })
      .finally(() => setLoadingLists(false));
  }, []);

  const activeClients = clients.filter((client) => client.status !== 'inactive' || String(client.id) === clientId);
  const client = clients.find((item) => String(item.id) === clientId) || null;
  const objects = (client?.objects || []).filter((object) => object.status !== 'inactive' || String(object.id) === objectId);
  const object = objects.find((item) => String(item.id) === objectId) || null;
  const overnight = Boolean(startTime && endTime && endTime <= startTime);

  const visibleEmployees = useMemo(() => {
    const needle = employeeQuery.trim().toLowerCase();
    return employees
      .filter((employee) => (employee.is_active !== false && employee.is_active !== 0) || employeeIds.includes(employee.id))
      .filter((employee) => !needle || employeeProfileName(employee).toLowerCase().includes(needle))
      .sort((a, b) => employeeProfileName(a).localeCompare(employeeProfileName(b)));
  }, [employees, employeeQuery, employeeIds]);

  function toggleEmployee(id: number) {
    setEmployeeIds((list) => (list.includes(id) ? list.filter((item) => item !== id) : [...list, id]));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    if (!employeeIds.length) {
      setMessage(t('woPickEmployee'));
      setIsError(true);
      return;
    }

    setSaving(true);
    setIsError(false);
    setMessage(t('commonSavingDots'));

    try {
      await onSubmit({
        client_id: Number(clientId),
        object_id: Number(objectId),
        employee_ids: employeeIds,
        title: title.trim(),
        reference_number: reference.trim() || undefined,
        leistungsart: leistungsart.trim() || undefined,
        zugnummer: zugnummer.trim() || undefined,
        planned_start_at: `${plannedDate} ${startTime}:00`,
        planned_end_at: `${overnight ? addDay(plannedDate) : plannedDate} ${endTime}:00`,
        status: initial ? status : undefined,
        notes: notes.trim() || undefined,
      });
      setMessage(t('commonSaved'));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t('commonUnknownError'));
      setIsError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="wo-form" onSubmit={submit}>
      <section className="panel">
        <h2>{t('woWhere')}</h2>
        <div className="form-grid">
          <label>{t('commonCustomer')}
            <select required value={clientId} onChange={(event) => { setClientId(event.target.value); setObjectId(''); }}>
              <option value="">{loadingLists ? t('commonLoadingDots') : t('woPickClient')}</option>
              {activeClients.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <label>{t('commonObject')}
            <select required value={objectId} disabled={!client} onChange={(event) => setObjectId(event.target.value)}>
              <option value="">{client ? (objects.length ? t('woPickObject') : t('objNoneForClient')) : t('woPickClientFirst')}</option>
              {objects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </label>
          <div className="readonly-field wide-field">
            <span>{t('wdWorkLocation')}</span>
            <strong>{object?.address || '—'}</strong>
          </div>
        </div>
        {client && !objects.length ? <p className="hint">{t('woAddObjectHint')} <a className="text-link" href="/clients">{t('clients')}</a></p> : null}
      </section>

      <section className="panel">
        <h2>{t('woWhat')}</h2>
        <div className="form-grid">
          <label className="wide-field">{t('asgWorkTitle')}<input required value={title} onChange={(event) => setTitle(event.target.value)} placeholder={t('woWorkTitlePlaceholder')} /></label>
          <label>{t('asgServiceType')}
            <input list="leistungsart-options" value={leistungsart} onChange={(event) => setLeistungsart(event.target.value)} placeholder="WTU" />
            <datalist id="leistungsart-options">{LEISTUNGSARTEN.map((item) => <option key={item} value={item} />)}</datalist>
          </label>
          <label>{t('wdReferenceNumber')}<input value={reference} onChange={(event) => setReference(event.target.value)} placeholder={t('woRefPlaceholder')} /></label>
          <label>{t('wdTrainNumber')}<input value={zugnummer} onChange={(event) => setZugnummer(event.target.value)} placeholder={t('woZugPlaceholder')} /></label>
          {initial ? (
            <label>{t('commonStatus')}
              <select value={status} onChange={(event) => setStatus(event.target.value)}>
                {STATUSES.map((item) => <option key={item} value={item}>{fmt.status(item)}</option>)}
              </select>
            </label>
          ) : null}
          <label className="wide-field">{t('commonNotes')}<textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder={t('woNotesPlaceholder')} /></label>
        </div>
      </section>

      <section className="panel">
        <h2>{t('woWhen')}</h2>
        <p className="hint">{t('woWhenHint')}</p>
        <div className="form-grid form-grid-3">
          <label>{t('commonDate')}<input required type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} /></label>
          <label>{t('wdPlannedStart')}<input required type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} /></label>
          <label>{t('wdPlannedEnd')}<input required type="time" value={endTime} onChange={(event) => setEndTime(event.target.value)} /></label>
        </div>
        {overnight ? <p className="hint">{t('woOvernight', { date: fmt.date(addDay(plannedDate)) })}</p> : null}
      </section>

      <section className="panel">
        <div className="detail-subhead">
          <h2>{t('woWho')}</h2>
          <span className="hint">{t('woSelectedCount', { count: employeeIds.length })}</span>
        </div>
        <input className="search-input" type="search" value={employeeQuery} onChange={(event) => setEmployeeQuery(event.target.value)} placeholder={t('commonSearch')} aria-label={t('commonSearch')} />
        <div className="choice-grid">
          {visibleEmployees.map((employee) => (
            <label className={`choice ${employeeIds.includes(employee.id) ? 'checked' : ''}`} key={employee.id}>
              <input type="checkbox" checked={employeeIds.includes(employee.id)} onChange={() => toggleEmployee(employee.id)} />
              <span>
                <strong>{employeeProfileName(employee)}</strong>
                <small>{employee.home_location || ''}</small>
              </span>
            </label>
          ))}
        </div>
        {!loadingLists && !employees.length ? <p className="hint">{t('empNone')}</p> : null}
      </section>

      <div className="form-actions sticky-actions">
        {message ? <p className={`notice ${isError ? 'error' : 'success'}`} role={isError ? 'alert' : 'status'}>{message}</p> : null}
        <button className="action-button primary" disabled={saving} type="submit">{saving ? t('commonSavingDots') : submitLabel}</button>
      </div>
    </form>
  );
}
