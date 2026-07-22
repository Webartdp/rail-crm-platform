'use client';

import { useEffect, useState } from 'react';
import RoleGuard from '../../components/RoleGuard';
import { getEmployeeProfiles, employeeProfileName, type EmployeeProfile } from '../../../lib/employee-profiles';
import { createWorkOrder } from '../../../lib/work-orders';

const leistungsartOptions = ['WTU', 'WSU', 'E-WU', 'Rb', 'Azf', 'RID-Kontrolle', 'Zugbeschtreifung'];

function toSqlDateTime(value: string) {
  return value ? `${value.replace('T', ' ')}:00` : undefined;
}

export default function NewWorkOrderPage() {
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
  const [plannedStart, setPlannedStart] = useState('');
  const [plannedStop, setPlannedStop] = useState('');
  const [message, setMessage] = useState('Заполни данные задания.');

  useEffect(() => {
    async function loadEmployees() {
      try {
        const response = await getEmployeeProfiles();
        setEmployees(response.data);

        if (response.data[0]) {
          setEmployeeId(String(response.data[0].id));
        }
      } catch (error) {
        const errorText = error instanceof Error ? error.message : 'Unbekannter Fehler';
        setMessage(`Не удалось загрузить сотрудников: ${errorText}`);
      }
    }

    loadEmployees();
  }, []);

  async function submit() {
    if (!employeeId || !workTitle.trim() || !referenznummer.trim()) {
      setMessage('Сотрудник, название работы и Referenznummer обязательны.');
      return;
    }

    try {
      await createWorkOrder({
        employee_id: Number(employeeId),
        title: workTitle.trim(),
        reference_number: referenznummer.trim(),
        status: 'planned',
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

      setMessage(`Задание ${referenznummer.trim()} сохранено.`);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : 'Unbekannter Fehler';
      setMessage(`Не удалось сохранить задание: ${errorText}`);
    }
  }

  return (
    <main className="page-shell">
      <RoleGuard allowedRoles={['manager', 'admin']} title="New work order access">
        <section className="hero-card">
          <div>
            <p className="eyebrow">AS / Neuer Auftrag</p>
            <h1>Создать задание</h1>
            <p className="hero-text">Задание попадёт в work_orders и будет доступно сотруднику на странице “Рабочий день”.</p>
          </div>
          <a className="action-link" href="/assignments">Назад к заданиям</a>
        </section>

        <section className="panel">
          <div className="form-grid">
            <label>
              Сотрудник
              <select value={employeeId} onChange={(event) => setEmployeeId(event.target.value)}>
                {employees.map((employee) => (
                  <option value={employee.id} key={employee.id}>
                    {employeeProfileName(employee)}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Объект
              <input value={objectName} onChange={(event) => setObjectName(event.target.value)} placeholder="Например RLCI Objekt 2" />
            </label>

            <label>
              Адрес объекта
              <input value={objectAddress} onChange={(event) => setObjectAddress(event.target.value)} placeholder="Адрес" />
            </label>

            <label>
              Клиент
              <input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Название клиента" />
            </label>

            <label>
              Название работы
              <input value={workTitle} onChange={(event) => setWorkTitle(event.target.value)} placeholder="Например Sicherheitskontrolle" />
            </label>

            <label>
              Leistungsart
              <select value={leistungsart} onChange={(event) => setLeistungsart(event.target.value)}>
                {leistungsartOptions.map((item) => <option value={item} key={item}>{item}</option>)}
              </select>
            </label>

            <label>
              Referenznummer
              <input value={referenznummer} onChange={(event) => setReferenznummer(event.target.value)} placeholder="Например RLCI-WORK-002" />
            </label>

            <label>
              Zugnummer
              <input value={zugnummer} onChange={(event) => setZugnummer(event.target.value)} placeholder="Например ICE 101" />
            </label>

            <label>
              Einsatzort
              <input value={einsatzort} onChange={(event) => setEinsatzort(event.target.value)} placeholder="Например Berlin / Gleis 2" />
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

          <button className="action-button primary" onClick={submit} type="button">Сохранить задание</button>
          <p className="hint">{message}</p>
        </section>
      </RoleGuard>
    </main>
  );
}
