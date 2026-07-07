'use client';

import { useState } from 'react';
import { createWorkOrder } from '../../../lib/work-orders';

const leistungsartOptions = ['WTU', 'WSU', 'E-WU', 'Rb', 'Azf', 'RID-Kontrolle', 'Zugbeschtreifung'];

export default function NewWorkOrderPage() {
  const [employeeId, setEmployeeId] = useState('1');
  const [leistungsart, setLeistungsart] = useState('WTU');
  const [referenznummer, setReferenznummer] = useState('REF-2026-001');
  const [zugnummer, setZugnummer] = useState('ICE 204');
  const [einsatzort, setEinsatzort] = useState('Gleis 12');
  const [plannedStart, setPlannedStart] = useState('2026-07-06T07:30');
  const [plannedStop, setPlannedStop] = useState('2026-07-06T15:30');
  const [message, setMessage] = useState('Bereit.');

  async function submit() {
    const title = `${leistungsart} / ${zugnummer} / ${einsatzort}`;

    try {
      await createWorkOrder({
        employee_id: Number(employeeId),
        title,
        reference_number: referenznummer,
        leistungsart,
        zugnummer,
        einsatzort,
        planned_start_at: plannedStart,
        planned_end_at: plannedStop,
      });
      setMessage('Auftrag gespeichert.');
    } catch (error) {
      setMessage('API nicht erreichbar. Auftrag wurde nicht gespeichert.');
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Work Order</p>
          <h1>Neuer Auftrag</h1>
          <p className="hero-text">Create a planned assignment for employee workflow.</p>
        </div>
        <div className="status-pill">Planning</div>
      </section>

      <section className="panel">
        <div className="form-grid">
          <label>Employee ID<input value={employeeId} onChange={(event) => setEmployeeId(event.target.value)} /></label>
          <label>Leistungsart<select value={leistungsart} onChange={(event) => setLeistungsart(event.target.value)}>{leistungsartOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>Referenznummer<input value={referenznummer} onChange={(event) => setReferenznummer(event.target.value)} /></label>
          <label>Zugnummer<input value={zugnummer} onChange={(event) => setZugnummer(event.target.value)} /></label>
          <label>Einsatzort<input value={einsatzort} onChange={(event) => setEinsatzort(event.target.value)} /></label>
          <label>Geplanter Start<input value={plannedStart} onChange={(event) => setPlannedStart(event.target.value)} type="datetime-local" /></label>
          <label>Geplanter Stop<input value={plannedStop} onChange={(event) => setPlannedStop(event.target.value)} type="datetime-local" /></label>
        </div>
        <button className="action-button primary" onClick={submit} type="button">Auftrag speichern</button>
        <p className="hint">{message}</p>
      </section>
    </main>
  );
}
