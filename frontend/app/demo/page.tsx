'use client';

import { useState } from 'react';
import { postWorkEvent } from '../../lib/api';
import { workflowSteps } from '../../lib/workflow';

export default function DemoPage() {
  const [step, setStep] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const [plannedExceeded, setPlannedExceeded] = useState(false);
  const [bemerkung, setBemerkung] = useState('');
  const [message, setMessage] = useState('Bereit.');
  const [saving, setSaving] = useState(false);

  const current = workflowSteps[step] || workflowSteps[workflowSteps.length - 1];
  const stopBlocked = current.label === 'Stop' && plannedExceeded && bemerkung.trim() === '';

  async function next() {
    if (stopBlocked) {
      setMessage('Stop ist blockiert: Bemerkung ist Pflicht.');
      return;
    }

    setSaving(true);

    try {
      await postWorkEvent(current.route, {
        employee_id: 1,
        assignment_id: 1,
        planned_exceeded: plannedExceeded,
        bemerkung,
        payload: {
          source: 'demo',
          action_label: current.label,
        },
      });

      setLog((items) => [...items, `${current.label} gespeichert in API`]);
      setMessage(`${current.label} gespeichert.`);
    } catch (error) {
      setLog((items) => [...items, `${current.label} lokal protokolliert`]);
      setMessage('API nicht erreichbar. Aktion lokal im Demo protokolliert.');
    } finally {
      setStep((value) => Math.min(value + 1, workflowSteps.length - 1));
      setSaving(false);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">Demo</p>
          <h1>Button Flow</h1>
          <p className="hero-text">Interaktiver Test für Gasfahrt, Dienstbeginn, Stop und Dienstfahrt.</p>
        </div>
        <div className="status-pill">Next: {current.label}</div>
      </section>

      <section className="grid">
        <div className="panel action-panel">
          <button className="action-button primary" onClick={next} type="button" disabled={stopBlocked || saving}>
            {saving ? 'Speichern...' : current.label}
          </button>
          <p className="hint">{message}</p>
        </div>

        <div className="panel">
          <h2>Stop-Regel</h2>
          <label>
            Geplante Zeit überschritten?
            <select value={plannedExceeded ? 'yes' : 'no'} onChange={(event) => setPlannedExceeded(event.target.value === 'yes')}>
              <option value="no">Nein</option>
              <option value="yes">Ja</option>
            </select>
          </label>
          <label>
            Bemerkung
            <textarea value={bemerkung} onChange={(event) => setBemerkung(event.target.value)} placeholder="Pflicht, wenn Zeit überschritten ist" />
          </label>
        </div>
      </section>

      <section className="panel">
        <h2>Log</h2>
        {log.length === 0 ? <p className="hint">No actions yet.</p> : null}
        {log.map((item, index) => <p key={`${item}-${index}`}>{index + 1}. {item}</p>)}
      </section>
    </main>
  );
}
